import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { badRequest, ok, route } from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limit'
import { isSimulated, runAi } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { getScoreHistory, getSectionProgress, overallEstimate } from '@/lib/progress'
import { SECTIONS } from '@/lib/pte/question-types'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Narrative study analysis over the student's own numbers.
 *
 * The model is given the computed statistics and asked to explain them — it is
 * never asked to produce scores, and nothing it returns is written to the
 * progress tables.
 */
export const POST = route(async () => {
  const user = await requireApiUser()
  enforceRateLimit(`ai-analysis:${user.id}`, 10, 60 * 60_000)

  const entitlements = await getEntitlements(user.id)
  const sections = await getSectionProgress(user.id)
  const attempts = sections.reduce((sum, section) => sum + section.attemptsCount, 0)

  if (attempts < 5) {
    throw badRequest('Practise at least five questions first — there is not enough data to analyse yet.')
  }

  const [history, recentCount] = await Promise.all([
    getScoreHistory(user.id, 30),
    prisma.attempt.count({
      where: { userId: user.id, status: 'SCORED', submittedAt: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    }),
  ])

  const sectionScores = Object.fromEntries(
    sections.map((section) => [section.section, section.estimatedScore]),
  ) as Record<string, number>

  const result = await runAi('PROGRESS_ANALYSIS', user.id, (provider) =>
    provider.analyzeProgress({
      targetScore: user.profile?.targetScore ?? 79,
      currentScore: overallEstimate(sections),
      sectionScores,
      history: history.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        score: row.overallScore,
      })),
      attemptsLast30Days: recentCount,
    }),
  )

  return ok({
    ...result.data,
    simulated: isSimulated(result.provider),
    isPremium: entitlements.isPremium,
    sections: SECTIONS.map((section) => ({ section, score: sectionScores[section] ?? 0 })),
  })
})
