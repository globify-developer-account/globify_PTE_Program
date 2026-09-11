import 'server-only'
import type { IeltsVariant, Prisma, PteSection, ScoreScale, ScoreSource } from '@prisma/client'
import { prisma } from './db'
import { assertQuota, consumeQuota, type Entitlements } from './access'
import { HttpError, notFound } from './http'
import { runAi, isSimulated, type IeltsWritingScore, type SpeakingScore, type WritingScore } from './ai'
import { transcriptionProvider } from './ai'
import { storage } from './storage'
import { questionType } from './pte/question-types'
import { ieltsQuestionType, type IeltsQuestionTypeDefinition } from './exams/ielts/question-types'
import { bandToNormalized, criteriaBand, roundToHalfBand } from './exams/ielts/bands'
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
  /** Which scale `overall` is reported on. */
  scale: ScoreScale
  /** IELTS band, when this attempt was scored on the band scale. */
  band: number | null
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
    // IELTS tasks are dispatched first: the PTE catalogue does not know their
    // codes, so `definition` is undefined for them and the PTE branches below
    // would silently treat an IELTS essay as a PTE one.
    const ielts = ieltsQuestionType(type.code)
    const scored = ielts
      ? await scoreIeltsAttempt(attempt, ielts, userId, entitlements)
      : definition?.autoScorable
        ? await scoreWithRules(attempt)
        : section === 'SPEAKING'
          ? await scoreSpeakingAttempt(attempt, userId, entitlements)
          : await scoreWritingAttempt(attempt, userId, entitlements)

    await refreshProgressForAttempt(userId, section, type.exam)
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
    scale: 'PTE_10_90' as ScoreScale,
    band: null,
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
    scale: 'PTE_10_90' as ScoreScale,
    band: null,
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
    scale: 'PTE_10_90' as ScoreScale,
    band: null,
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


// --- IELTS --------------------------------------------------------------------

/**
 * IELTS attempts.
 *
 * Only Writing is wired up today. The other sections have catalogue entries so
 * content can be authored against them, but no renderer and no scorer, so they
 * fail loudly here rather than being quietly marked by the PTE rules — which
 * would report a 10-90 score for a task assessed in bands.
 */
async function scoreIeltsAttempt(
  attempt: AttemptWithQuestion,
  definition: IeltsQuestionTypeDefinition,
  userId: string,
  entitlements?: Entitlements,
): Promise<Omit<ScoredAttempt, 'correctAnswer' | 'explanation' | 'sampleAnswer'>> {
  if (definition.section === 'WRITING') {
    return scoreIeltsWritingAttempt(attempt, definition, userId, entitlements)
  }
  throw new HttpError(
    501,
    `IELTS ${definition.section.toLowerCase()} is not available yet. Only Writing is scored in this release.`,
    'not_implemented',
  )
}

async function scoreIeltsWritingAttempt(
  attempt: AttemptWithQuestion,
  definition: IeltsQuestionTypeDefinition,
  userId: string,
  entitlements?: Entitlements,
): Promise<Omit<ScoredAttempt, 'correctAnswer' | 'explanation' | 'sampleAnswer'>> {
  const answer = attempt.answer!
  const response = (answer.text ?? '').trim()
  if (!response) throw new HttpError(400, 'No written response was saved for this attempt.', 'no_text')

  await assertQuota(userId, 'ai_writing', entitlements)

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { targetBand: true, ieltsVariant: true },
  })

  const taskNumber = definition.code === 'IELTS_WRITING_TASK2' ? 2 : 1
  const variant: IeltsVariant | null = attempt.question.variant ?? definition.variant
  const wordLimitMin = attempt.question.wordLimitMin ?? definition.wordLimitMin

  const result = await runAi('IELTS_WRITING_SCORE', userId, (provider) =>
    provider.scoreIeltsWriting({
      questionType: definition.code,
      questionTitle: attempt.question.title,
      prompt: attempt.question.prompt ?? attempt.question.title,
      figureDescription: attempt.question.passage,
      variant,
      taskNumber,
      response,
      wordLimitMin,
      targetBand: profile?.targetBand ?? 7,
    }),
  )

  const payload: IeltsWritingScore = result.data
  const words = countWords(response)

  // Every band the provider returned is re-derived here rather than trusted:
  // a model response is untrusted input, and a band that is not a half step is
  // not a band a student can be shown.
  const task = roundToHalfBand(clamp(payload.task, 0, 9))
  const coherence = roundToHalfBand(clamp(payload.coherence_cohesion, 0, 9))
  const lexical = roundToHalfBand(clamp(payload.lexical_resource, 0, 9))
  const grammar = roundToHalfBand(clamp(payload.grammatical_range_accuracy, 0, 9))

  // Under-length is a rule, not an opinion: IELTS caps the task criterion at
  // band 5 for a short response however good the prose is.
  const underLength = wordLimitMin !== null && words < wordLimitMin
  const cappedTask = underLength ? Math.min(5, task) : task

  const band = criteriaBand([cappedTask, coherence, lexical, grammar])
  const overall = bandToNormalized(band)

  const breakdown: Record<string, number> = {
    task: cappedTask,
    coherenceCohesion: coherence,
    lexicalResource: lexical,
    grammaticalRangeAccuracy: grammar,
  }

  await persistScore(attempt.id, {
    source: 'AI',
    overall,
    scale: 'IELTS_BAND',
    band,
    isCorrect: null,
    breakdown,
  })

  await persistAnalysis(attempt.id, {
    provider: result.provider,
    model: result.model,
    feature: 'IELTS_WRITING_SCORE',
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

  const summary = toStringList(payload.feedback)
  if (underLength) {
    summary.unshift(
      `Your response is ${words} words. This task requires at least ${wordLimitMin}, and an under-length answer cannot score above band 5 for ${taskNumber === 2 ? 'Task Response' : 'Task Achievement'}.`,
    )
  }

  return {
    attemptId: attempt.id,
    overall,
    scale: 'IELTS_BAND',
    band,
    source: 'AI',
    isCorrect: null,
    breakdown,
    simulated: isSimulated(result.provider),
    feedback: {
      summary,
      strengths: toStringList(payload.strengths),
      improvements: toStringList(payload.improvements),
      suggestions: toStringList(payload.how_to_improve),
      suggestedRewrite: payload.suggested_rewrite ?? null,
    },
    detail: null,
  }
}

interface ScoreRecord {
  source: ScoreSource
  overall: number
  scale?: ScoreScale
  band?: number | null
  rawScore?: number
  maxRawScore?: number
  isCorrect: boolean | null
  breakdown: Record<string, number>
}

async function persistScore(attemptId: string, record: ScoreRecord): Promise<void> {
  const data = {
    source: record.source,
    overall: record.overall,
    scale: record.scale ?? ('PTE_10_90' as ScoreScale),
    band: record.band ?? null,
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
  feature: 'SPEAKING_SCORE' | 'WRITING_SCORE' | 'IELTS_WRITING_SCORE' | 'IELTS_SPEAKING_SCORE'
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
