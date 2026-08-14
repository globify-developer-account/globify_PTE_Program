import 'server-only'
import type { PteSection, Prisma } from '@prisma/client'
import { prisma } from './db'
import { assertPremiumContent, assertQuota, consumeQuota, getEntitlements, type Entitlements } from './access'
import { badRequest, notFound } from './http'
import { toPublicQuestion, type PublicQuestion } from './practice'
import { SECTIONS } from './pte/question-types'
import { notifyUser, NOTIFICATION_TYPES } from './notifications'
import { refreshProgressForAttempt } from './progress'

/**
 * Mock test engine.
 *
 * A mock is a practice session with `kind: MOCK` and a fixed, ordered question
 * list drawn from the test definition. Reusing the attempt and scoring
 * machinery means a mock answer is scored by exactly the same code as a
 * practice answer — a result a student can trust against their practice history.
 */

export interface MockSectionView {
  id: string
  section: PteSection
  title: string
  instructions: string | null
  durationSeconds: number
  order: number
  questions: Array<{ attemptId: string; question: PublicQuestion }>
}

export interface MockRunState {
  sessionId: string
  mockTestId: string
  slug: string
  title: string
  status: string
  startedAt: Date
  totalQuestions: number
  completedQuestions: number
  sections: MockSectionView[]
}

/** Starts a mock test, or resumes the one already in progress. */
export async function startMockTest(
  userId: string,
  slug: string,
  entitlements?: Entitlements,
): Promise<{ sessionId: string; resumed: boolean }> {
  const ent = entitlements ?? (await getEntitlements(userId))

  const mock = await prisma.mockTest.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: { questions: { orderBy: { order: 'asc' }, select: { questionId: true } } },
      },
    },
  })
  if (!mock) throw notFound('That mock test is not available.')

  if (mock.isPremium) await assertPremiumContent(ent, mock.title)

  // Resume rather than start a second copy — a student who reloads mid-test
  // must not lose their answers or burn another monthly allowance.
  const existing = await prisma.practiceSession.findFirst({
    where: { userId, mockTestId: mock.id, status: 'IN_PROGRESS' },
    select: { id: true },
  })
  if (existing) return { sessionId: existing.id, resumed: true }

  await assertQuota(userId, 'mock_test', ent)

  const questionIds = mock.sections.flatMap((section) => section.questions.map((item) => item.questionId))
  if (questionIds.length === 0) throw badRequest('This mock test has no questions yet.')

  const session = await prisma.practiceSession.create({
    data: {
      userId,
      kind: 'MOCK',
      status: 'IN_PROGRESS',
      mockTestId: mock.id,
      totalQuestions: questionIds.length,
    },
    select: { id: true },
  })

  await prisma.attempt.createMany({
    data: questionIds.map((questionId) => ({ userId, questionId, sessionId: session.id })),
  })

  // The allowance is spent at the point the test is created, not at the end —
  // otherwise abandoning tests would be a way to take unlimited mocks.
  await consumeQuota(userId, 'mock_test')

  return { sessionId: session.id, resumed: false }
}

export async function loadMockRun(sessionId: string, userId: string): Promise<MockRunState> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId, kind: 'MOCK' },
    include: {
      mockTest: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: { questions: { orderBy: { order: 'asc' }, select: { questionId: true, order: true } } },
          },
        },
      },
      attempts: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          questionId: true,
          status: true,
          question: { select: questionSelectForMock },
        },
      },
    },
  })

  if (!session || !session.mockTest) throw notFound('That mock test session does not exist.')

  const attemptByQuestion = new Map(session.attempts.map((attempt) => [attempt.questionId, attempt]))
  const sections: MockSectionView[] = []

  for (const section of session.mockTest.sections) {
    const questions: MockSectionView['questions'] = []
    for (const item of section.questions) {
      const attempt = attemptByQuestion.get(item.questionId)
      if (!attempt) continue
      questions.push({ attemptId: attempt.id, question: await toPublicQuestion(attempt.question) })
    }
    sections.push({
      id: section.id,
      section: section.section,
      title: section.title,
      instructions: section.instructions,
      durationSeconds: section.durationSeconds,
      order: section.order,
      questions,
    })
  }

  return {
    sessionId: session.id,
    mockTestId: session.mockTest.id,
    slug: session.mockTest.slug,
    title: session.mockTest.title,
    status: session.status,
    startedAt: session.startedAt,
    totalQuestions: session.totalQuestions,
    completedQuestions: session.completedQuestions,
    sections,
  }
}

const questionSelectForMock = {
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

// --- finishing ----------------------------------------------------------------

export interface MockResultView {
  overallScore: number
  speakingScore: number
  writingScore: number
  readingScore: number
  listeningScore: number
  enablingSkills: Record<string, number>
  strongestArea: string | null
  weakestArea: string | null
}

/**
 * Closes the session and writes the result.
 *
 * Section scores are the mean of the scored attempts in that section, and the
 * overall is the mean of the four sections — which is how PTE reports, and
 * which means a student who skipped a whole section sees that section at its
 * true value rather than silently excluded.
 */
export async function finishMockTest(sessionId: string, userId: string): Promise<MockResultView> {
  const session = await prisma.practiceSession.findFirst({
    where: { id: sessionId, userId, kind: 'MOCK' },
    select: { id: true, mockTestId: true, startedAt: true, totalQuestions: true },
  })
  if (!session || !session.mockTestId) throw notFound('That mock test session does not exist.')

  const existing = await prisma.mockTestResult.findUnique({ where: { sessionId } })
  if (existing) return toResultView(existing)

  const attempts = await prisma.attempt.findMany({
    where: { sessionId },
    select: {
      status: true,
      score: { select: { overall: true, breakdown: true } },
      question: { select: { questionType: { select: { section: true } } } },
    },
  })

  const bySection = new Map<PteSection, number[]>()
  const skills: Record<string, number[]> = {}

  for (const attempt of attempts) {
    const section = attempt.question.questionType.section
    const list = bySection.get(section) ?? []
    // An unanswered question is a zero, not an absence — that is what happens
    // in the real exam.
    list.push(attempt.score?.overall ?? 10)
    bySection.set(section, list)

    const breakdown = (attempt.score?.breakdown ?? {}) as Record<string, unknown>
    for (const [key, value] of Object.entries(breakdown)) {
      if (typeof value !== 'number') continue
      skills[key] = [...(skills[key] ?? []), value]
    }
  }

  const average = (values: number[] | undefined) =>
    values && values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 10

  const sectionScores: Record<PteSection, number> = {
    SPEAKING: average(bySection.get('SPEAKING')),
    WRITING: average(bySection.get('WRITING')),
    READING: average(bySection.get('READING')),
    LISTENING: average(bySection.get('LISTENING')),
  }

  const overall = Math.round(
    SECTIONS.reduce((sum, section) => sum + sectionScores[section], 0) / SECTIONS.length,
  )

  const ranked = [...SECTIONS].sort((a, b) => sectionScores[b] - sectionScores[a])
  const enablingSkills = Object.fromEntries(
    Object.entries(skills).map(([key, values]) => [key, average(values)]),
  )

  const result = await prisma.$transaction(async (tx) => {
    await tx.practiceSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        completedQuestions: attempts.filter((a) => a.status === 'SCORED').length,
        durationSeconds: Math.round((Date.now() - session.startedAt.getTime()) / 1000),
      },
    })

    return tx.mockTestResult.create({
      data: {
        sessionId: session.id,
        mockTestId: session.mockTestId!,
        userId,
        overallScore: overall,
        speakingScore: sectionScores.SPEAKING,
        writingScore: sectionScores.WRITING,
        readingScore: sectionScores.READING,
        listeningScore: sectionScores.LISTENING,
        enablingSkills: enablingSkills as Prisma.InputJsonValue,
        strongestArea: ranked[0] ?? null,
        weakestArea: ranked[ranked.length - 1] ?? null,
      },
    })
  })

  for (const section of SECTIONS) {
    await refreshProgressForAttempt(userId, section)
  }

  await notifyUser({
    userId,
    type: NOTIFICATION_TYPES.scoreReady,
    title: 'Your mock test result is ready',
    body: `You scored an estimated ${overall} overall. Open the result to see your section breakdown and where to focus next.`,
    href: `/mock-tests/results/${session.id}`,
  })

  return toResultView(result)
}

function toResultView(row: {
  overallScore: number
  speakingScore: number
  writingScore: number
  readingScore: number
  listeningScore: number
  enablingSkills: unknown
  strongestArea: string | null
  weakestArea: string | null
}): MockResultView {
  const skills = (row.enablingSkills ?? {}) as Record<string, unknown>
  const enablingSkills: Record<string, number> = {}
  for (const [key, value] of Object.entries(skills)) {
    if (typeof value === 'number') enablingSkills[key] = value
  }

  return {
    overallScore: row.overallScore,
    speakingScore: row.speakingScore,
    writingScore: row.writingScore,
    readingScore: row.readingScore,
    listeningScore: row.listeningScore,
    enablingSkills,
    strongestArea: row.strongestArea,
    weakestArea: row.weakestArea,
  }
}

/** Catalogue for the mock test index, with the student's own history attached. */
export async function listMockTests(userId: string) {
  const [tests, results, inProgress] = await Promise.all([
    prisma.mockTest.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { displayOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        kind: true,
        difficulty: true,
        durationMinutes: true,
        isPremium: true,
        _count: { select: { sections: true } },
      },
    }),
    prisma.mockTestResult.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { mockTestId: true, overallScore: true, createdAt: true, sessionId: true },
    }),
    prisma.practiceSession.findMany({
      where: { userId, kind: 'MOCK', status: 'IN_PROGRESS' },
      select: { id: true, mockTestId: true },
    }),
  ])

  const lastResult = new Map<string, (typeof results)[number]>()
  for (const result of results) {
    if (!lastResult.has(result.mockTestId)) lastResult.set(result.mockTestId, result)
  }
  const openSession = new Map(inProgress.map((session) => [session.mockTestId ?? '', session.id]))

  return tests.map((test) => ({
    ...test,
    sectionCount: test._count.sections,
    lastResult: lastResult.get(test.id) ?? null,
    attempts: results.filter((result) => result.mockTestId === test.id).length,
    openSessionId: openSession.get(test.id) ?? null,
  }))
}
