import 'server-only'
import type { Prisma, PteSection, ScoreSource } from '@prisma/client'
import { prisma } from './db'
import { assertQuota, consumeQuota, type Entitlements } from './access'
import { HttpError, notFound } from './http'
import { runAi, isSimulated, type SpeakingScore, type WritingScore } from './ai'
import { transcriptionProvider } from './ai'
import { storage } from './storage'
import { questionType } from './pte/question-types'
import { parseCorrectAnswer, parseSelection } from './pte/schemas'
import { contentOverlap, scoreByRules, type RuleScore } from './pte/scoring'
import { refreshProgressForAttempt } from './progress'
import { clamp, countWords } from './utils'

/**
 * The scoring pipeline.
 *
 * Rule-scorable tasks never reach an AI provider — the published PTE marking
 * rules are both cheaper and more accurate than a language model for them.
 * Speaking and Writing go to the provider abstraction, and every field of the
 * provider's reply is re-validated and clamped here before it is written: a
 * model response is untrusted input, not a database patch.
 */

export interface ScoredAttempt {
  attemptId: string
  overall: number
  source: ScoreSource
  isCorrect: boolean | null
  breakdown: Record<string, number>
  /** True when the score came from the simulated provider, not a real one. */
  simulated: boolean
  feedback: {
    summary: string[]
    strengths: string[]
    improvements: string[]
    suggestions: string[]
    suggestedRewrite?: string | null
  } | null
  /** Per-item verdicts for rule-scored tasks, so review can show what went wrong. */
  detail: RuleScore['detail'] | null
  correctAnswer: unknown
  explanation: string | null
  sampleAnswer: string | null
}

const attemptInclude = {
  answer: true,
  question: { include: { questionType: true } },
} satisfies Prisma.AttemptInclude

type AttemptWithQuestion = Prisma.AttemptGetPayload<{ include: typeof attemptInclude }>

/** Clamps every numeric trait a provider returned into the 0–90 reporting band. */
function clampTraits(source: Record<string, unknown>, keys: string[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const key of keys) {
    const value = source[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = Math.round(clamp(value, 0, 90))
    }
  }
  return out
}

function toStringList(value: unknown, max = 8): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .slice(0, max)
    .map((item) => item.trim().slice(0, 400))
}

export async function scoreAttempt(
  attemptId: string,
  userId: string,
  entitlements?: Entitlements,
): Promise<ScoredAttempt> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: attemptId, userId },
    include: attemptInclude,
  })
  if (!attempt) throw notFound('That attempt does not exist.')
  if (!attempt.answer) throw new HttpError(400, 'This attempt has no submitted answer yet.', 'no_answer')

  const type = attempt.question.questionType
  const definition = questionType(type.code)
  const section = type.section

  await prisma.attempt.update({ where: { id: attempt.id }, data: { status: 'SCORING' } })

  try {
    const scored = definition?.autoScorable
      ? await scoreWithRules(attempt)
      : section === 'SPEAKING'
        ? await scoreSpeakingAttempt(attempt, userId, entitlements)
        : await scoreWritingAttempt(attempt, userId, entitlements)

    await refreshProgressForAttempt(userId, section)
    await bumpQuestionStats(attempt.questionId, scored.overall)

    return {
      ...scored,
      correctAnswer: attempt.question.correctAnswer,
      explanation: attempt.question.explanation,
      sampleAnswer: attempt.question.sampleAnswer,
    }
  } catch (error) {
    await prisma.attempt.update({ where: { id: attempt.id }, data: { status: 'FAILED' } })
    throw error
  }
}

// --- rule-scored tasks --------------------------------------------------------

async function scoreWithRules(
  attempt: AttemptWithQuestion,
): Promise<Omit<ScoredAttempt, 'correctAnswer' | 'explanation' | 'sampleAnswer'>> {
  const result = scoreByRules({
    typeCode: attempt.question.questionType.code,
    correctAnswer: parseCorrectAnswer(attempt.question.correctAnswer),
    selection: parseSelection(attempt.answer?.selection),
    text: attempt.answer?.text ?? null,
  })

  if (!result) {
    throw new HttpError(500, 'This question type has no scoring rules configured.', 'no_scorer')
  }

  await persistScore(attempt.id, {
    source: 'RULE',
    overall: result.scaled,
    rawScore: result.raw,
    maxRawScore: result.max,
    isCorrect: result.isCorrect,
    breakdown: result.breakdown,
  })

  return {
    attemptId: attempt.id,
    overall: result.scaled,
    source: 'RULE',
    isCorrect: result.isCorrect,
    breakdown: result.breakdown,
    simulated: false,
    feedback: null,
    detail: result.detail,
  }
}

// --- speaking -----------------------------------------------------------------

async function scoreSpeakingAttempt(
  attempt: AttemptWithQuestion,
  userId: string,
  entitlements?: Entitlements,
): Promise<Omit<ScoredAttempt, 'correctAnswer' | 'explanation' | 'sampleAnswer'>> {
  const answer = attempt.answer!
  if (!answer.audioUrl) {
    throw new HttpError(400, 'No recording was saved for this attempt.', 'no_audio')
  }

  // Quota is checked before any paid work, and only consumed once it succeeded.
  await assertQuota(userId, 'ai_speaking', entitlements)

  const transcript = answer.transcript ?? (await transcribeAnswer(attempt))
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { targetScore: true },
  })

  const expected = attempt.question.passage ?? attempt.question.audioTranscript ?? null

  const result = await runAi('SPEAKING_SCORE', userId, (provider) =>
    provider.scoreSpeaking({
      questionType: attempt.question.questionType.name,
      questionTitle: attempt.question.title,
      expectedText: expected,
      imageDescription: attempt.question.prompt,
      transcript,
      audioDurationMs: answer.audioDurationMs,
      targetScore: profile?.targetScore ?? 79,
    }),
  )

  const payload: SpeakingScore = result.data
  const breakdown = clampTraits(payload as unknown as Record<string, unknown>, [
    'content',
    'pronunciation',
    'fluency',
    'grammar',
    'vocabulary',
  ])

  // A Read Aloud transcript that barely overlaps the prompt is almost always a
  // recording problem, not an 80-scoring performance. Cap it rather than
  // reporting a confident score we do not believe.
  let overall = Math.round(clamp(payload.overall_score, 0, 90))
  if (expected && attempt.question.questionType.code === 'READ_ALOUD') {
    const overlap = contentOverlap(expected, transcript)
    if (overlap < 0.4) overall = Math.min(overall, 10 + Math.round(overlap * 60))
  }

  await persistScore(attempt.id, {
    source: 'AI',
    overall,
    isCorrect: null,
    breakdown,
  })

  await persistAnalysis(attempt.id, {
    provider: result.provider,
    model: result.model,
    feature: 'SPEAKING_SCORE',
    result: payload as unknown as Prisma.InputJsonValue,
    strengths: toStringList(payload.strengths),
    improvements: toStringList(payload.improvements),
    suggestions: toStringList(payload.recommendations),
    suggestedRewrite: null,
    usage: result.usage,
    latencyMs: result.latencyMs,
  })

  await prisma.answer.update({ where: { attemptId: attempt.id }, data: { transcript } })
  await consumeQuota(userId, 'ai_speaking')

  return {
    attemptId: attempt.id,
    overall,
    source: 'AI',
    isCorrect: null,
    breakdown,
    simulated: isSimulated(result.provider),
    feedback: {
      summary: toStringList(payload.feedback),
      strengths: toStringList(payload.strengths),
      improvements: toStringList(payload.improvements),
      suggestions: toStringList(payload.recommendations),
    },
    detail: null,
  }
}

async function transcribeAnswer(attempt: AttemptWithQuestion): Promise<string> {
  const key = attempt.answer?.audioUrl
  if (!key) return ''
  try {
    const audio = await storage().get(key)
    const provider = transcriptionProvider()
    const result = await provider.transcribe({
      audio,
      mimeType: 'audio/webm',
      hint: attempt.question.passage ?? attempt.question.audioTranscript,
    })
    return result.data.text
  } catch (error) {
    console.error('[scoring] transcription failed:', error instanceof Error ? error.message : error)
    // An empty transcript is still scoreable — it simply scores very low, which
    // is the honest outcome when we could not hear anything.
    return ''
  }
}

// --- writing ------------------------------------------------------------------

async function scoreWritingAttempt(
  attempt: AttemptWithQuestion,
  userId: string,
  entitlements?: Entitlements,
): Promise<Omit<ScoredAttempt, 'correctAnswer' | 'explanation' | 'sampleAnswer'>> {
  const answer = attempt.answer!
  const response = (answer.text ?? '').trim()
  if (!response) throw new HttpError(400, 'No written response was saved for this attempt.', 'no_text')

  await assertQuota(userId, 'ai_writing', entitlements)

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { targetScore: true },
  })

  const result = await runAi('WRITING_SCORE', userId, (provider) =>
    provider.scoreWriting({
      questionType: attempt.question.questionType.name,
      questionTitle: attempt.question.title,
      prompt: attempt.question.prompt ?? attempt.question.title,
      passage: attempt.question.passage ?? attempt.question.audioTranscript,
      response,
      wordLimitMin: attempt.question.wordLimitMin,
      wordLimitMax: attempt.question.wordLimitMax,
      targetScore: profile?.targetScore ?? 79,
    }),
  )

  const payload: WritingScore = result.data
  const breakdown = clampTraits(payload as unknown as Record<string, unknown>, [
    'content',
    'form',
    'grammar',
    'vocabulary',
    'coherence',
    'development',
    'spelling',
  ])

  // Form is a hard rule in PTE, not a matter of opinion: a response outside the
  // word limit is capped regardless of what the model thought of the prose.
  let overall = Math.round(clamp(payload.overall_score, 0, 90))
  const words = countWords(response)
  const { wordLimitMin, wordLimitMax } = attempt.question
  const outOfRange =
    (wordLimitMin !== null && words < wordLimitMin) || (wordLimitMax !== null && words > wordLimitMax)
  if (outOfRange) {
    breakdown.form = 0
    overall = Math.min(overall, 40)
  }

  await persistScore(attempt.id, {
    source: 'AI',
    overall,
    isCorrect: null,
    breakdown,
  })

  await persistAnalysis(attempt.id, {
    provider: result.provider,
    model: result.model,
    feature: 'WRITING_SCORE',
    result: payload as unknown as Prisma.InputJsonValue,
    strengths: toStringList(payload.strengths),
    improvements: toStringList(payload.improvements),
    suggestions: toStringList(payload.how_to_improve),
    suggestedRewrite: payload.suggested_rewrite?.slice(0, 4000) ?? null,
    usage: result.usage,
    latencyMs: result.latencyMs,
  })

  await prisma.answer.update({ where: { attemptId: attempt.id }, data: { wordCount: words } })
  await consumeQuota(userId, 'ai_writing')

  const feedbackSummary = toStringList(payload.feedback)
  if (outOfRange) {
    feedbackSummary.unshift(
      `Your response is ${words} words. This task requires ${wordLimitMin ?? 0}–${wordLimitMax ?? '∞'} words, and responses outside that range lose the Form mark.`,
    )
  }

  return {
    attemptId: attempt.id,
    overall,
    source: 'AI',
    isCorrect: null,
    breakdown,
    simulated: isSimulated(result.provider),
    feedback: {
      summary: feedbackSummary,
      strengths: toStringList(payload.strengths),
      improvements: toStringList(payload.improvements),
      suggestions: toStringList(payload.how_to_improve),
      suggestedRewrite: payload.suggested_rewrite ?? null,
    },
    detail: null,
  }
}

// --- persistence --------------------------------------------------------------

interface ScoreRecord {
  source: ScoreSource
  overall: number
  rawScore?: number
  maxRawScore?: number
  isCorrect: boolean | null
  breakdown: Record<string, number>
}

async function persistScore(attemptId: string, record: ScoreRecord): Promise<void> {
  const data = {
    source: record.source,
    overall: record.overall,
    rawScore: record.rawScore ?? null,
    maxRawScore: record.maxRawScore ?? null,
    isCorrect: record.isCorrect,
    breakdown: record.breakdown as Prisma.InputJsonValue,
  }

  await prisma.$transaction([
    prisma.score.upsert({
      where: { attemptId },
      create: { attemptId, ...data },
      update: data,
    }),
    prisma.attempt.update({ where: { id: attemptId }, data: { status: 'SCORED' } }),
  ])
}

interface AnalysisRecord {
  provider: string
  model: string
  feature: 'SPEAKING_SCORE' | 'WRITING_SCORE'
  result: Prisma.InputJsonValue
  strengths: string[]
  improvements: string[]
  suggestions: string[]
  suggestedRewrite: string | null
  usage: { promptTokens: number; completionTokens: number; costMicros: number }
  latencyMs: number
}

async function persistAnalysis(attemptId: string, record: AnalysisRecord): Promise<void> {
  const data = {
    provider: record.provider,
    model: record.model,
    feature: record.feature,
    result: record.result,
    strengths: record.strengths,
    improvements: record.improvements,
    suggestions: record.suggestions,
    suggestedRewrite: record.suggestedRewrite,
    promptTokens: record.usage.promptTokens,
    completionTokens: record.usage.completionTokens,
    costMicros: record.usage.costMicros,
    latencyMs: record.latencyMs,
  }

  await prisma.aIAnalysis.upsert({
    where: { attemptId },
    create: { attemptId, ...data },
    update: data,
  })
}

/** Keeps the per-question difficulty stats admins sort by roughly current. */
async function bumpQuestionStats(questionId: string, overall: number): Promise<void> {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    select: { timesAttempted: true, averageScore: true },
  })
  if (!question) return

  const attempts = question.timesAttempted + 1
  const previous = question.averageScore ?? 0
  const averageScore = (previous * question.timesAttempted + overall) / attempts

  await prisma.question.update({
    where: { id: questionId },
    data: { timesAttempted: attempts, averageScore },
  })
}

export function sectionOf(typeCode: string): PteSection {
  return questionType(typeCode)?.section ?? 'SPEAKING'
}
