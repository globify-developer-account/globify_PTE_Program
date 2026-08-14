import 'server-only'
import type { PteSection } from '@prisma/client'
import { prisma } from './db'
import { getSectionProgress, type SectionProgress } from './progress'
import { QUESTION_TYPES, SECTION_META, questionType, type QuestionTypeCode } from './pte/question-types'
import { addDays } from './utils'

/**
 * Rules-based recommendation engine.
 *
 * Deliberately deterministic rather than an AI call: a student should be able
 * to see *why* something was recommended, the reason must not change between
 * page loads, and generating study advice is not worth a paid inference on
 * every dashboard render. The AI layer explains and coaches; these rules decide.
 */

export type RecommendationKind =
  | 'weak_type'
  | 'unattempted_type'
  | 'weak_section'
  | 'high_leverage'
  | 'stale_type'
  | 'mock_test'
  | 'consistency'

export interface Recommendation {
  id: string
  kind: RecommendationKind
  title: string
  reason: string
  href: string
  ctaLabel: string
  section: PteSection | null
  /** Higher sorts first. Kept on the object so the UI can explain ordering. */
  priority: number
}

/**
 * Tasks whose scores feed more than one section of the real exam, so practice
 * here moves the overall estimate further than practice anywhere else.
 */
const HIGH_LEVERAGE: Partial<Record<QuestionTypeCode, string>> = {
  READ_ALOUD: 'Read Aloud feeds both your Speaking and Reading scores.',
  REPEAT_SENTENCE: 'Repeat Sentence contributes to Speaking and Listening.',
  WRITE_FROM_DICTATION: 'Write From Dictation contributes to Listening and Writing, and is fully rule-scored.',
  SUMMARIZE_SPOKEN_TEXT: 'Summarize Spoken Text counts toward both Listening and Writing.',
  RETELL_LECTURE: 'Retell Lecture contributes to Speaking and Listening.',
}

const ACCURACY_FLOOR = 62
const STALE_DAYS = 14
const MOCK_GAP_DAYS = 14

function practiceHref(code: QuestionTypeCode): string {
  const type = questionType(code)
  if (!type) return '/practice'
  return `/practice/${SECTION_META[type.section].slug}/${code.toLowerCase().replace(/_/g, '-')}`
}

export interface RecommendationInput {
  userId: string
  targetScore: number
  sections?: SectionProgress[]
}

export async function getRecommendations(
  { userId, targetScore, sections }: RecommendationInput,
  limit = 4,
): Promise<Recommendation[]> {
  const progress = sections ?? (await getSectionProgress(userId))
  const now = new Date()

  const [recentAttempts, lastMock, totalAttempts] = await Promise.all([
    // Newest first, so the first row seen for a code is also its most recent.
    prisma.attempt.findMany({
      where: { userId, status: 'SCORED', submittedAt: { not: null } },
      orderBy: { submittedAt: 'desc' },
      take: 300,
      select: { submittedAt: true, question: { select: { questionType: { select: { code: true } } } } },
    }),
    prisma.mockTestResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    }),
    prisma.attempt.count({ where: { userId, status: 'SCORED' } }),
  ])

  const lastSeenByCode = new Map<string, Date>()
  for (const attempt of recentAttempts) {
    const code = attempt.question.questionType.code
    if (!attempt.submittedAt || lastSeenByCode.has(code)) continue
    lastSeenByCode.set(code, attempt.submittedAt)
  }

  const bySection = new Map(progress.map((row) => [row.section, row]))
  const out: Recommendation[] = []

  // Rule 1 — a section with no practice at all is the biggest blind spot.
  for (const row of progress) {
    if (row.attemptsCount > 0) continue
    const meta = SECTION_META[row.section]
    out.push({
      id: `section-empty-${row.section}`,
      kind: 'weak_section',
      title: `Start ${meta.label}`,
      reason: `You have not attempted any ${meta.label} questions yet, so this section is missing from your overall estimate.`,
      href: `/practice/${meta.slug}`,
      ctaLabel: `Practise ${meta.label}`,
      section: row.section,
      priority: 100,
    })
  }

  // Rule 2 — question types with real attempts but weak accuracy.
  for (const row of progress) {
    for (const [code, stats] of Object.entries(row.byQuestionType)) {
      const type = questionType(code)
      if (!type || stats.attempts < 3) continue
      if (stats.avg >= ACCURACY_FLOOR) continue
      out.push({
        id: `weak-${code}`,
        kind: 'weak_type',
        title: `Improve ${type.name}`,
        reason: `Your average across ${stats.attempts} attempts is ${stats.avg}, below your ${targetScore} target. This is your weakest ${SECTION_META[type.section].label} task.`,
        href: practiceHref(type.code),
        ctaLabel: 'Practise now',
        section: type.section,
        // Weaker scores and more evidence both raise the priority.
        priority: 90 + Math.min(8, Math.round((ACCURACY_FLOOR - stats.avg) / 4)),
      })
    }
  }

  // Rule 3 — a mock test is overdue (or has never been taken).
  const mockAge = lastMock ? Math.floor((now.getTime() - lastMock.createdAt.getTime()) / 86_400_000) : null
  if (totalAttempts >= 10 && (mockAge === null || mockAge >= MOCK_GAP_DAYS)) {
    out.push({
      id: 'mock-due',
      kind: 'mock_test',
      title: mockAge === null ? 'Take your first mock test' : 'Time for another mock test',
      reason:
        mockAge === null
          ? `You have completed ${totalAttempts} practice questions. A full mock test under exam timing is the most reliable estimate of where you stand.`
          : `Your last mock test was ${mockAge} days ago. Regular mocks keep your estimate honest and build exam stamina.`,
      href: '/mock-tests',
      ctaLabel: 'Start a mock test',
      section: null,
      priority: 88,
    })
  }

  // Rule 4 — types in a weak section that have never been attempted.
  const weakestFirst = [...progress]
    .filter((row) => row.attemptsCount > 0)
    .sort((a, b) => a.estimatedScore - b.estimatedScore)

  for (const row of weakestFirst) {
    const untouched = QUESTION_TYPES.filter(
      (type) => type.section === row.section && !(type.code in row.byQuestionType),
    )
    for (const type of untouched) {
      out.push({
        id: `new-${type.code}`,
        kind: 'unattempted_type',
        title: `Try ${type.name}`,
        reason: `You have not practised this ${SECTION_META[type.section].label} task yet, and ${SECTION_META[row.section].label} is currently your lowest section at ${row.estimatedScore}.`,
        href: practiceHref(type.code),
        ctaLabel: 'Start',
        section: type.section,
        priority: 80 - weakestFirst.indexOf(row) * 4,
      })
    }
  }

  // Rule 5 — high-leverage tasks that are under-practised.
  for (const [code, why] of Object.entries(HIGH_LEVERAGE) as Array<[QuestionTypeCode, string]>) {
    const type = questionType(code)
    if (!type) continue
    const attempts = bySection.get(type.section)?.byQuestionType[code]?.attempts ?? 0
    if (attempts >= 8) continue
    out.push({
      id: `leverage-${code}`,
      kind: 'high_leverage',
      title: `Build up ${type.name}`,
      reason: `${why} You have ${attempts} attempt${attempts === 1 ? '' : 's'} so far.`,
      href: practiceHref(code),
      ctaLabel: 'Practise',
      section: type.section,
      priority: 70 - attempts,
    })
  }

  // Rule 6 — practised once, then dropped.
  const staleCutoff = addDays(now, -STALE_DAYS)
  for (const [code, seen] of lastSeenByCode) {
    if (seen >= staleCutoff) continue
    const type = questionType(code)
    if (!type) continue
    const days = Math.floor((now.getTime() - seen.getTime()) / 86_400_000)
    out.push({
      id: `stale-${code}`,
      kind: 'stale_type',
      title: `Revisit ${type.name}`,
      reason: `It has been ${days} days since you last practised this task. Skills fade fastest on tasks you rehearse least.`,
      href: practiceHref(type.code),
      ctaLabel: 'Revisit',
      section: type.section,
      priority: 55,
    })
  }

  // Rule 7 — nothing else to say? Keep the habit going.
  if (out.length === 0) {
    out.push({
      id: 'keep-going',
      kind: 'consistency',
      title: 'Keep your streak alive',
      reason:
        'Your sections are all tracking well against your target. A short daily session is what protects the score you have built.',
      href: '/practice',
      ctaLabel: 'Practise today',
      section: null,
      priority: 10,
    })
  }

  // Stable ordering: priority first, then id, so equal-priority items never
  // shuffle between renders.
  return out
    .sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
    .slice(0, limit)
}
