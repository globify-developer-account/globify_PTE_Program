import Link from 'next/link'
import { ArrowRight, Flame, Lightbulb, Target, Timer } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { ScoreRing, Meter } from '@/components/charts/score-ring'
import { LineChart } from '@/components/charts/line-chart'
import { BarChart, HorizontalBarChart } from '@/components/charts/bar-chart'
import { StatTile } from '@/components/charts/stat-tile'
import { ScoreCard } from '@/components/dashboard/score-card'
import { AiEstimateBadge, AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { prisma } from '@/lib/db'
import { getScoreHistory, getSectionProgress, historyValue, overallEstimate } from '@/lib/progress'
import { getRecommendations } from '@/lib/recommendations'
import { questionType, SECTIONS, SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Progress',
  description: 'Your PTE score trend, section breakdown and task-level performance.',
  path: '/progress',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function ProgressPage() {
  const user = await requireStudent('/progress')
  const target = user.profile?.targetScore ?? 79

  const entitlements = await getEntitlements(user.id)
  const sections = await getSectionProgress(user.id)
  const overall = overallEstimate(sections)

  const [history, mocks, recommendations] = await Promise.all([
    getScoreHistory(user.id, 60),
    prisma.mockTestResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      take: 12,
      select: {
        id: true,
        sessionId: true,
        overallScore: true,
        createdAt: true,
        mockTest: { select: { title: true } },
      },
    }),
    getRecommendations({ userId: user.id, targetScore: target, sections }, 5),
  ])

  const totalAttempts = sections.reduce((sum, section) => sum + section.attemptsCount, 0)
  const totalMinutes = sections.reduce((sum, section) => sum + section.minutesPracticed, 0)

  if (totalAttempts === 0) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Progress</h2>
        <Card>
          <EmptyState
            icon={<Target aria-hidden />}
            title="Nothing to chart yet"
            description="Answer a few questions and your score trend, section breakdown and task-level performance will appear here."
            action={{ label: 'Start practising', href: '/practice' }}
          />
        </Card>
      </div>
    )
  }

  // Per-task-type averages, ordered worst first — the view a student needs to
  // decide what to work on.
  const taskRows = sections
    .flatMap((section) =>
      Object.entries(section.byQuestionType).map(([code, stats]) => ({
        code,
        name: questionType(code)?.name ?? code,
        section: section.section,
        attempts: stats.attempts,
        avg: stats.avg,
      })),
    )
    .sort((a, b) => a.avg - b.avg)

  const activity = history.slice(-14).map((row) => ({
    label: formatDate(row.date).replace(/ \d{4}$/, ''),
    value: row.minutes,
    meta: `${row.attempts} question${row.attempts === 1 ? '' : 's'}`,
  }))

  const sectionSeries = SECTIONS.map((section) => ({
    key: section,
    label: SECTION_META[section].label,
    color: SECTION_META[section].color,
    points: history.map((row) => ({ x: row.date, y: historyValue(row, section) })),
  })).filter((series) => series.points.some((point) => point.y !== null))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Progress</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Everything below is computed from your own scored attempts.
          </p>
        </div>
        <AiEstimateBadge />
      </div>

      {/* Headline */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Overall estimate" />
          <CardBody className="flex flex-col items-center">
            <ScoreRing value={overall} target={target} label="Overall estimate" />
            <Meter value={overall} max={90} className="mt-5 w-full" />
            <p className="mt-3 text-center text-sm text-ink-500">
              {overall >= target
                ? 'You are tracking at or above your target.'
                : `${target - overall} points to your target of ${target}.`}
            </p>
          </CardBody>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:content-start">
          <StatTile
            label="Questions practised"
            value={totalAttempts}
            icon={<Target aria-hidden />}
            hint="Scored attempts across all sections"
          />
          <StatTile
            label="Time practised"
            value={`${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m`}
            icon={<Timer aria-hidden />}
            hint="Total across all sections"
          />
          <StatTile
            label="Current streak"
            value={`${user.profile?.streakDays ?? 0} days`}
            icon={<Flame aria-hidden />}
            hint={`Longest ${user.profile?.longestStreak ?? 0} days`}
          />
          <StatTile
            label="Mock tests taken"
            value={mocks.length}
            icon={<Target aria-hidden />}
            hint={mocks.length > 0 ? `Latest ${mocks[mocks.length - 1]!.overallScore}` : 'None yet'}
          />
        </div>
      </div>

      {/* Section cards */}
      <section aria-labelledby="sections-heading">
        <h3 id="sections-heading" className="mb-3 text-base font-semibold text-navy-900">
          Section estimates
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => (
            <ScoreCard
              key={section.section}
              target={target}
              data={{
                section: section.section,
                score: section.estimatedScore,
                previousScore: section.previousScore,
                attempts: section.attemptsCount,
              }}
            />
          ))}
        </div>
      </section>

      {/* Trend */}
      <Card>
        <CardHeader
          title="Score trend by section"
          description="Daily snapshots over the last 60 days."
          action={<AiEstimateBadge />}
        />
        <CardBody>
          {sectionSeries.length > 0 && history.length > 1 ? (
            <LineChart
              series={sectionSeries}
              domain={[10, 90]}
              height={280}
              reference={{ value: target, label: `Target ${target}` }}
              tableCaption="Estimated score by section and day"
            />
          ) : (
            <p className="py-10 text-center text-sm text-ink-500">
              Your trend appears after a couple of days of practice.
            </p>
          )}
        </CardBody>
      </Card>

      {/* Task-level performance */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Performance by task type"
            description="Weakest first — this is your work list."
          />
          <CardBody>
            {entitlements.limits.advancedAnalytics || entitlements.isPremium ? (
              <HorizontalBarChart
                data={taskRows.slice(0, 10).map((row) => ({
                  label: row.name,
                  value: row.avg,
                  color: SECTION_META[row.section].color,
                  meta: `${row.attempts} attempt${row.attempts === 1 ? '' : 's'}`,
                }))}
                max={90}
                tableCaption="Average score by task type"
              />
            ) : (
              <div className="space-y-3">
                {taskRows.slice(0, 3).map((row) => (
                  <div key={row.code}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink-600">{row.name}</span>
                      <span className="font-medium text-navy-900 tabular">{row.avg}</span>
                    </div>
                    <Meter
                      value={row.avg}
                      max={90}
                      color={SECTION_META[row.section].color}
                      trackColor="var(--color-ink-100)"
                      className="mt-1.5"
                      height={5}
                    />
                  </div>
                ))}
                <UpgradePrompt
                  title="See every task type"
                  description="Premium shows your average across every task type, your enabling-skill breakdown and your full attempt history."
                  ctaLabel="Unlock full analytics"
                  className="mt-4"
                />
              </div>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recommended next" description="Rules applied to your own results." />
          <CardBody className="space-y-3">
            {recommendations.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group flex items-start gap-3 rounded-xl border border-hairline p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                  <Lightbulb className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy-900">{item.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-ink-500">{item.reason}</span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                    {item.ctaLabel}
                    <ArrowRight
                      className="size-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </span>
                </span>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Activity + mock history */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Practice activity" description="Minutes practised over the last 14 days." />
          <CardBody>
            <BarChart data={activity} valueSuffix=" min" tableCaption="Minutes practised per day" />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Mock test history" description="Your full-length results over time." />
          <CardBody>
            {mocks.length > 1 ? (
              <LineChart
                series={[
                  {
                    key: 'mock',
                    label: 'Mock overall',
                    color: 'var(--color-brand-600)',
                    points: mocks.map((mock) => ({ x: mock.createdAt, y: mock.overallScore })),
                  },
                ]}
                domain={[10, 90]}
                reference={{ value: target, label: `Target ${target}` }}
                tableCaption="Mock test overall score by date"
              />
            ) : mocks.length === 1 ? (
              <div className="py-6 text-center">
                <p className="text-[32px] font-semibold leading-none text-navy-900 tabular">
                  {mocks[0]!.overallScore}
                </p>
                <p className="mt-2 text-sm text-ink-500">
                  {mocks[0]!.mockTest.title} · {formatDate(mocks[0]!.createdAt)}
                </p>
                <p className="mt-3 text-xs text-ink-400">Take another mock to see a trend.</p>
              </div>
            ) : (
              <EmptyState
                title="No mock tests yet"
                description="A full mock test is the most reliable estimate of your real score."
                action={{ label: 'Browse mock tests', href: '/mock-tests' }}
              />
            )}
          </CardBody>
        </Card>
      </div>

      <AiEstimateNote />
    </div>
  )
}
