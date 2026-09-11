import 'server-only'
import type { Difficulty, Exam, PteSection, Prisma } from '@prisma/client'
import { prisma } from './db'
import { assertQuota, consumeQuota, getEntitlements, type Entitlements } from './access'
import { badRequest, notFound } from './http'
import { questionType, type RendererKey } from './pte/question-types'
import {
  parseBlankOptions,
  parseChoiceOptions,
  segmentPassage,
  tokenizeWords,
  type BlankOption,
  type ChoiceOption,
} from './pte/schemas'
import { resolveMediaUrl } from './storage'

/**
 * Practice session service.
 *
 * The single most important rule in this file: `toPublicQuestion` is the only
 * way a question reaches the browser, and it never includes `correctAnswer`,
 * `explanation` or `sampleAnswer`. Those are returned by the submit endpoint
 * *after* an answer has been recorded, so the answer key is never sitting in
 * the page source waiting to be read.
 */

export interface PublicQuestion {
  id: string
  code: string
  title: string
  prompt: string | null
  passage: string | null
  imageUrl: string | null
  audioUrl: string | null
  typeCode: string
  typeName: string
  shortName: string
  section: PteSection
  renderer: RendererKey
  difficulty: Difficulty
  timeLimitSeconds: number | null
  preparationSeconds: number | null
  wordLimitMin: number | null
  wordLimitMax: number | null
  isPremium: boolean
  /** Choice options, with any `isCorrect` flag already stripped. */
  choices: ChoiceOption[]
  blanks: BlankOption[]
  /** Pre-split passage for the fill-in-the-blanks renderers. */
  segments: ReturnType<typeof segmentPassage> | null
  /** Pre-tokenised transcript for Highlight Incorrect Words. */
  words: string[] | null
  /** Shuffled boxes for Re-order Paragraphs — order is decided server-side. */
  reorderItems: ChoiceOption[] | null
}

const questionSelect = {
  id: true,
  code: true,
  title: true,
  prompt: true,
  passage: true,
  imageUrl: true,
  audioUrl: true,
  audioTranscript: true,
  options: true,
  difficulty: true,
  timeLimitSeconds: true,
  preparationSeconds: true,
  wordLimitMin: true,
  wordLimitMax: true,
  isPremium: true,
  questionType: {
    select: {
      code: true,
      name: true,
      shortName: true,
      section: true,
      renderer: true,
      defaultTimeLimitSeconds: true,
      defaultPreparationSeconds: true,
    },
  },
} satisfies Prisma.QuestionSelect

type QuestionRow = Prisma.QuestionGetPayload<{ select: typeof questionSelect }>

/**
 * Deterministic shuffle seeded by the question id, so Re-order Paragraphs shows
 * the same starting arrangement if a student reloads mid-question — but a
 * different one per question, and never the correct order.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0

  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    hash = (hash * 1_664_525 + 1_013_904_223) >>> 0
    const j = hash % (i + 1)
    ;[out[i], out[j]] = [out[j]!, out[i]!]
  }
  return out
}

export async function toPublicQuestion(row: QuestionRow): Promise<PublicQuestion> {
  const definition = questionType(row.questionType.code)
  const renderer = (definition?.renderer ?? row.questionType.renderer) as RendererKey

  const choices = parseChoiceOptions(row.options)
  const blanks = parseBlankOptions(row.options)

  const needsSegments =
    renderer === 'fill-blanks-dropdown' || renderer === 'fill-blanks-typed'
  const highlightSource = renderer === 'highlight-words' ? (row.passage ?? row.audioTranscript) : null

  return {
    id: row.id,
    code: row.code,
    title: row.title,
    prompt: row.prompt,
    // The transcript is the answer key for Highlight Incorrect Words, so the
    // passage the student reads is the only text that may be sent.
    passage: renderer === 'dictation' ? null : row.passage,
    imageUrl: await resolveMediaUrl(row.imageUrl),
    audioUrl: await resolveMediaUrl(row.audioUrl),
    typeCode: row.questionType.code,
    typeName: row.questionType.name,
    shortName: row.questionType.shortName,
    section: row.questionType.section,
    renderer,
    difficulty: row.difficulty,
    timeLimitSeconds: row.timeLimitSeconds ?? row.questionType.defaultTimeLimitSeconds,
    preparationSeconds: row.preparationSeconds ?? row.questionType.defaultPreparationSeconds,
    wordLimitMin: row.wordLimitMin,
    wordLimitMax: row.wordLimitMax,
    isPremium: row.isPremium,
    choices: renderer === 'reorder' ? [] : choices,
    blanks,
    segments: needsSegments && row.passage ? segmentPassage(row.passage) : null,
    words: highlightSource ? tokenizeWords(highlightSource) : null,
    reorderItems: renderer === 'reorder' ? seededShuffle(choices, row.id) : null,
  }
}

// --- session lifecycle --------------------------------------------------------

export interface StartSessionInput {
  userId: string
  /** Defaults to PTE so existing callers keep their behaviour. */
  exam?: Exam | null
  section?: PteSection | null
  typeCode?: string | null
  difficulty?: Difficulty | null
  count: number
}

/**
 * Creates a practice session and picks its questions.
 *
 * Selection intentionally prefers questions the student has not seen: repeating
 * the same five Read Alouds inflates the estimate without improving anything.
 */
export async function startPracticeSession(
  input: StartSessionInput,
  entitlements?: Entitlements,
): Promise<{ sessionId: string; questionIds: string[] }> {
  const ent = entitlements ?? (await getEntitlements(input.userId))
  await assertQuota(input.userId, 'practice', ent)

  const where: Prisma.QuestionWhereInput = {
    status: 'PUBLISHED',
    ...(input.typeCode ? { questionType: { code: input.typeCode } } : {}),
    // A section alone is ambiguous now that two exams share the section names,
    // so a section-wide session is always scoped to one exam.
    ...(input.section && !input.typeCode
      ? { questionType: { section: input.section, exam: input.exam ?? 'PTE' } }
      : {}),
    ...(input.difficulty ? { difficulty: input.difficulty } : {}),
    // Free accounts only ever see free questions — enforced here, on the server.
    ...(ent.isPremium ? {} : { isPremium: false }),
  }

  const attempted = await prisma.attempt.findMany({
    where: { userId: input.userId },
    select: { questionId: true },
    distinct: ['questionId'],
    take: 1000,
  })
  const seen = attempted.map((row) => row.questionId)

  const fresh = await prisma.question.findMany({
    where: seen.length > 0 ? { ...where, id: { notIn: seen } } : where,
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: input.count,
  })

  // Fall back to previously-seen questions once the fresh pool is exhausted.
  let questionIds = fresh.map((row) => row.id)
  if (questionIds.length < input.count) {
    const filler = await prisma.question.findMany({
      where: { ...where, id: { notIn: questionIds } },
      select: { id: true },
      orderBy: { timesAttempted: 'asc' },
      take: input.count - questionIds.length,
    })
    questionIds = [...questionIds, ...filler.map((row) => row.id)]
  }

  if (questionIds.length === 0) {
    throw notFound('There are no published questions available for this selection yet.')
  }

  const { sessionId } = await createSessionForQuestions({
    userId: input.userId,
    questionIds,
    section: input.section ?? null,
    typeCode: input.typeCode ?? null,
  })

  return { sessionId, questionIds }
}

/**
 * Creates a session over an explicit list of questions.
 *
 * Lesson drills use this: there the questions are the ones the lesson author
 * attached, not the ones the selection heuristic above would have picked.
 * Quota is the caller's responsibility, since a drill still counts against the
 * same daily practice allowance.
 */
export async function createSessionForQuestions(input: {
  userId: string
  questionIds: string[]
  section?: PteSection | null
  typeCode?: string | null
}): Promise<{ sessionId: string }> {
  if (input.questionIds.length === 0) {
    throw notFound('There are no published questions available for this selection yet.')
  }

  const definition = input.typeCode ? questionType(input.typeCode) : undefined
  const session = await prisma.practiceSession.create({
    data: {
      userId: input.userId,
      kind: 'PRACTICE',
      section: input.section ?? definition?.section ?? null,
      questionTypeCode: input.typeCode ?? null,
      totalQuestions: input.questionIds.length,
    },
    select: { id: true },
  })

  // Attempts are created up front so the player can resume exactly where it
  // stopped, and so a refresh never silently starts a new question.
  await prisma.attempt.createMany({
    data: input.questionIds.map((questionId) => ({
      userId: input.userId,
      questionId,
      sessionId: session.id,
    })),
  })

  return { sessionId: session.id }
}

export interface SessionQuestionState {
  attemptId: string
  status: string
  question: PublicQuestion
  score: { overall: number; isCorrect: boolean | null } | null
}

export interface SessionState {
  id: string
  kind: string
  status: string
  section: PteSection | null
  questionTypeCode: string | null
  totalQuestions: number
  completedQuestions: number
  startedAt: Date
  items: SessionQuestionState[]
}

export async function loadSession(sessionId: string, userId: string): Promise<SessionState> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    include: {
      attempts: {
        orderBy: { createdAt: 'asc' },
        include: {
          score: { select: { overall: true, isCorrect: true } },
          question: { select: questionSelect },
        },
      },
    },
  })
  if (!session) throw notFound('That practice session does not exist.')

  const items: SessionQuestionState[] = []
  for (const attempt of session.attempts) {
    items.push({
      attemptId: attempt.id,
      status: attempt.status,
      question: await toPublicQuestion(attempt.question),
      score: attempt.score ? { overall: attempt.score.overall, isCorrect: attempt.score.isCorrect } : null,
    })
  }

  return {
    id: session.id,
    kind: session.kind,
    status: session.status,
    section: session.section,
    questionTypeCode: session.questionTypeCode,
    totalQuestions: session.totalQuestions,
    completedQuestions: session.completedQuestions,
    startedAt: session.startedAt,
    items,
  }
}

/** Records the submitted answer. Scoring is a separate, explicit step. */
export interface RecordAnswerInput {
  attemptId: string
  userId: string
  text?: string
  selection?: Prisma.InputJsonValue
  audioUrl?: string
  audioDurationMs?: number
  transcript?: string
  timeSpentSeconds?: number
}

export async function recordAnswer(input: RecordAnswerInput): Promise<void> {
  const attempt = await prisma.attempt.findFirst({
    where: { id: input.attemptId, userId: input.userId },
    select: { id: true, sessionId: true, status: true },
  })
  if (!attempt) throw notFound('That attempt does not exist.')
  if (attempt.status === 'SCORED') throw badRequest('This question has already been answered.')

  const answerData = {
    text: input.text ?? null,
    selection: input.selection ?? {},
    audioUrl: input.audioUrl ?? null,
    audioDurationMs: input.audioDurationMs ?? null,
    transcript: input.transcript ?? null,
    wordCount: input.text ? input.text.trim().split(/\s+/).filter(Boolean).length : null,
  }

  await prisma.$transaction([
    prisma.answer.upsert({
      where: { attemptId: attempt.id },
      create: { attemptId: attempt.id, ...answerData },
      update: answerData,
    }),
    prisma.attempt.update({
      where: { id: attempt.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        timeSpentSeconds: input.timeSpentSeconds ?? 0,
      },
    }),
  ])
}

/** Marks progress on the parent session and closes it when everything is done. */
export async function advanceSession(sessionId: string | null, userId: string): Promise<void> {
  if (!sessionId) return

  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true, totalQuestions: true, startedAt: true },
  })
  if (!session) return

  const completed = await prisma.attempt.count({
    where: { sessionId, status: { in: ['SCORED', 'SKIPPED'] } },
  })

  const finished = completed >= session.totalQuestions
  await prisma.practiceSession.update({
    where: { id: sessionId },
    data: {
      completedQuestions: completed,
      ...(finished
        ? {
            status: 'COMPLETED',
            completedAt: new Date(),
            durationSeconds: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
          }
        : {}),
    },
  })
}

/** Counts one practice question against the daily free allowance. */
export async function countPracticeUsage(userId: string): Promise<void> {
  await consumeQuota(userId, 'practice')
}

// --- catalogue reads used by the practice browser -----------------------------

export interface TypeSummary {
  code: string
  name: string
  shortName: string
  section: PteSection
  description: string | null
  questionCount: number
  attemptedCount: number
  averageScore: number | null
}

export async function getTypeSummaries(
  userId: string,
  section?: PteSection,
  exam: Exam = 'PTE',
): Promise<TypeSummary[]> {
  const types = await prisma.questionType.findMany({
    where: { isActive: true, exam, ...(section ? { section } : {}) },
    orderBy: { displayOrder: 'asc' },
    select: {
      code: true,
      name: true,
      shortName: true,
      section: true,
      description: true,
      _count: { select: { questions: { where: { status: 'PUBLISHED' } } } },
    },
  })

  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'SCORED',
      question: { questionType: { exam, ...(section ? { section } : {}) } },
    },
    select: {
      score: { select: { overall: true } },
      question: { select: { questionType: { select: { code: true } } } },
    },
    take: 1000,
    orderBy: { submittedAt: 'desc' },
  })

  const stats = new Map<string, { count: number; total: number }>()
  for (const attempt of attempts) {
    if (!attempt.score) continue
    const code = attempt.question.questionType.code
    const current = stats.get(code) ?? { count: 0, total: 0 }
    stats.set(code, { count: current.count + 1, total: current.total + attempt.score.overall })
  }

  return types.map((type) => {
    const stat = stats.get(type.code)
    return {
      code: type.code,
      name: type.name,
      shortName: type.shortName,
      section: type.section,
      description: type.description,
      questionCount: type._count.questions,
      attemptedCount: stat?.count ?? 0,
      averageScore: stat && stat.count > 0 ? Math.round(stat.total / stat.count) : null,
    }
  })
}
