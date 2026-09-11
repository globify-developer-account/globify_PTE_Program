import 'server-only'
import type { Exam, PteSection, Prisma } from '@prisma/client'
import { prisma } from './db'
import { SECTIONS } from './pte/question-types'
import { addDays, startOfDay } from './utils'

/**
 * Progress rollups.
 *
 * `Progress` holds the current estimate per section, `ProgressSnapshot` the
 * daily time series behind the charts. Both are recomputed from scored attempts
 * rather than incremented in place, so a re-score or a deleted attempt can never
 * leave the numbers drifting away from the truth.
 */

/** How many recent attempts define the "current" estimate for a section. */
const RECENT_WINDOW = 12

export interface SectionProgress {
  section: PteSection
  estimatedScore: number
  previousScore: number | null
  accuracy: number
  attemptsCount: number
  minutesPracticed: number
  byQuestionType: Record<string, { attempts: number; avg: number }>
}

export function emptySectionProgress(section: PteSection): SectionProgress {
  return {
    section,
    estimatedScore: 0,
    previousScore: null,
    accuracy: 0,
    attemptsCount: 0,
    minutesPracticed: 0,
    byQuestionType: {},
  }
}

function parseByType(raw: unknown): SectionProgress['byQuestionType'] {
  if (!raw || typeof raw !== 'object') return {}
  const result: SectionProgress['byQuestionType'] = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (value && typeof value === 'object') {
      const entry = value as { attempts?: unknown; avg?: unknown }
      if (typeof entry.attempts === 'number' && typeof entry.avg === 'number') {
        result[key] = { attempts: entry.attempts, avg: entry.avg }
      }
    }
  }
  return result
}

export async function getSectionProgress(userId: string): Promise<SectionProgress[]> {
  const rows = await prisma.progress.findMany({ where: { userId } })
  const bySection = new Map(rows.map((row) => [row.section, row]))

  return SECTIONS.map((section) => {
    const row = bySection.get(section)
    if (!row) return emptySectionProgress(section)
    return {
      section,
      estimatedScore: row.estimatedScore,
      previousScore: row.previousScore,
      accuracy: row.accuracy,
      attemptsCount: row.attemptsCount,
      minutesPracticed: row.minutesPracticed,
      byQuestionType: parseByType(row.byQuestionType),
    }
  })
}

/**
 * Weighted overall estimate. PTE weights the four sections roughly equally in
 * the overall score, so sections with no attempts are excluded rather than
 * counted as zero — otherwise a student who has only practised speaking would
 * see a misleadingly low overall number.
 */
export function overallEstimate(sections: SectionProgress[]): number {
  const scored = sections.filter((section) => section.attemptsCount > 0)
  if (scored.length === 0) return 0
  const total = scored.reduce((sum, section) => sum + section.estimatedScore, 0)
  return Math.round(total / scored.length)
}

/** Recomputes one section from the student's scored attempts. */
export async function recomputeSectionProgress(
  userId: string,
  section: PteSection,
  exam: Exam = 'PTE',
): Promise<void> {
  const attempts = await prisma.attempt.findMany({
    where: {
      userId,
      status: 'SCORED',
      // Scoped to one exam: PTE and IELTS attempts share the Attempt table and
      // the four section names, so without this an IELTS essay would be rolled
      // into the student's PTE writing estimate.
      question: { questionType: { section, exam } },
    },
    orderBy: { submittedAt: 'desc' },
    take: 200,
    select: {
      timeSpentSeconds: true,
      score: { select: { overall: true, isCorrect: true } },
      question: { select: { questionType: { select: { code: true } } } },
    },
  })

  const scored = attempts.filter((attempt) => attempt.score !== null)
  if (scored.length === 0) {
    await prisma.progress.upsert({
      where: { userId_exam_section: { userId, exam, section } },
      create: { userId, exam, section },
      update: { estimatedScore: 0, accuracy: 0, attemptsCount: 0 },
    })
    return
  }

  const recent = scored.slice(0, RECENT_WINDOW)
  const previousWindow = scored.slice(RECENT_WINDOW, RECENT_WINDOW * 2)

  const average = (values: number[]) =>
    values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)

  const estimatedScore = average(recent.map((attempt) => attempt.score!.overall))
  const previousScore = previousWindow.length > 0 ? average(previousWindow.map((attempt) => attempt.score!.overall)) : null

  const gradable = scored.filter((attempt) => attempt.score!.isCorrect !== null)
  const accuracy =
    gradable.length === 0
      ? 0
      : Math.round((gradable.filter((attempt) => attempt.score!.isCorrect).length / gradable.length) * 100)

  const byQuestionType: SectionProgress['byQuestionType'] = {}
  for (const attempt of scored) {
    const code = attempt.question.questionType.code
    const current = byQuestionType[code] ?? { attempts: 0, avg: 0 }
    const nextAttempts = current.attempts + 1
    byQuestionType[code] = {
      attempts: nextAttempts,
      avg: Math.round((current.avg * current.attempts + attempt.score!.overall) / nextAttempts),
    }
  }

  const minutesPracticed = Math.round(
    scored.reduce((sum, attempt) => sum + attempt.timeSpentSeconds, 0) / 60,
  )

  await prisma.progress.upsert({
    where: { userId_exam_section: { userId, exam: 'PTE', section } },
    create: {
      userId,
      section,
      estimatedScore,
      previousScore,
      accuracy,
      attemptsCount: scored.length,
      minutesPracticed,
      byQuestionType: byQuestionType as Prisma.InputJsonValue,
    },
    update: {
      estimatedScore,
      previousScore,
      accuracy,
      attemptsCount: scored.length,
      minutesPracticed,
      byQuestionType: byQuestionType as Prisma.InputJsonValue,
    },
  })
}

/** Writes today's snapshot so the score-over-time chart has a data point. */
export async function writeDailySnapshot(userId: string): Promise<void> {
  const sections = await getSectionProgress(userId)
  const overall = overallEstimate(sections)
  const date = startOfDay(new Date())

  const todaysAttempts = await prisma.attempt.count({
    where: { userId, submittedAt: { gte: date } },
  })

  const minutes = await prisma.attempt.aggregate({
    where: { userId, submittedAt: { gte: date } },
    _sum: { timeSpentSeconds: true },
  })

  const scoreFor = (section: PteSection) => {
    const row = sections.find((item) => item.section === section)
    return row && row.attemptsCount > 0 ? row.estimatedScore : null
  }

  const values = {
    overallScore: overall,
    speakingScore: scoreFor('SPEAKING'),
    writingScore: scoreFor('WRITING'),
    readingScore: scoreFor('READING'),
    listeningScore: scoreFor('LISTENING'),
    attempts: todaysAttempts,
    minutes: Math.round((minutes._sum.timeSpentSeconds ?? 0) / 60),
  }

  await prisma.progressSnapshot.upsert({
    where: { userId_exam_date: { userId, exam: 'PTE', date } },
    create: { userId, date, ...values },
    update: values,
  })

  await prisma.profile.updateMany({ where: { userId }, data: { currentEstimateScore: overall } })
}

/** Advances or resets the practice streak. Idempotent within a day. */
export async function touchStreak(userId: string): Promise<number> {
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) return 0

  const today = startOfDay(new Date())
  const last = profile.lastPracticeDate ? startOfDay(profile.lastPracticeDate) : null

  if (last && last.getTime() === today.getTime()) return profile.streakDays

  const yesterday = addDays(today, -1)
  const streakDays = last && last.getTime() === yesterday.getTime() ? profile.streakDays + 1 : 1

  await prisma.profile.update({
    where: { userId },
    data: {
      streakDays,
      longestStreak: Math.max(profile.longestStreak, streakDays),
      lastPracticeDate: today,
    },
  })

  return streakDays
}

/** Daily snapshots for the progress charts — overall and every section. */
export async function getScoreHistory(userId: string, days = 30) {
  const from = startOfDay(addDays(new Date(), -days))
  return prisma.progressSnapshot.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: 'asc' },
    select: {
      date: true,
      overallScore: true,
      speakingScore: true,
      writingScore: true,
      readingScore: true,
      listeningScore: true,
      attempts: true,
      minutes: true,
    },
  })
}

export type ScoreHistoryRow = Awaited<ReturnType<typeof getScoreHistory>>[number]

export function historyValue(row: ScoreHistoryRow, section: PteSection | 'OVERALL'): number | null {
  switch (section) {
    case 'SPEAKING':
      return row.speakingScore
    case 'WRITING':
      return row.writingScore
    case 'READING':
      return row.readingScore
    case 'LISTENING':
      return row.listeningScore
    default:
      return row.overallScore
  }
}

/** Minutes practised today — drives the daily-goal tile. */
export async function minutesPracticedToday(userId: string): Promise<number> {
  const result = await prisma.attempt.aggregate({
    where: { userId, submittedAt: { gte: startOfDay(new Date()) } },
    _sum: { timeSpentSeconds: true },
  })
  return Math.round((result._sum.timeSpentSeconds ?? 0) / 60)
}

/** Runs the whole rollup after an attempt is scored. */
export async function refreshProgressForAttempt(
  userId: string,
  section: PteSection,
  exam: Exam = 'PTE',
): Promise<void> {
  await recomputeSectionProgress(userId, section, exam)
  await writeDailySnapshot(userId)
  await touchStreak(userId)
}
