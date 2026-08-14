import Link from 'next/link'
import {
  ArrowRight,
  CalendarClock,
  ClipboardList,
  Flame,
  Lightbulb,
  PlayCircle,
  Target,
  Timer,
} from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { ScoreRing, Meter } from '@/components/charts/score-ring'
import { LineChart } from '@/components/charts/line-chart'
import { ScoreCard } from '@/components/dashboard/score-card'
import { AiEstimateBadge, AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { prisma } from '@/lib/db'
import {
  getScoreHistory,
  getSectionProgress,
  minutesPracticedToday,
  overallEstimate,
} from '@/lib/progress'
import { getRecommendations } from '@/lib/recommendations'
import { SECTION_META, SECTIONS } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { daysBetween, formatDate, greeting, pluralize } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Dashboard',
  description: 'Your PTE preparation at a glance.',
  path: '/dashboard',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await requireStudent('/dashboard')
  const profile = user.profile
  const target = profile?.targetScore ?? 79
  const dailyGoal = profile?.dailyGoalMinutes ?? 45

  const entitlements = await getEntitlements(user.id)
  const sections = await getSectionProgress(user.id)
  const overall = overallEstimate(sections)

  const [history, minutesToday, recentMocks, openSession, recommendations] = await Promise.all([
    getScoreHistory(user.id, 30),
    minutesPracticedToday(user.id),
    prisma.mockTestResult.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 3,
      select: {
        id: true,
        overallScore: true,
        createdAt: true,
        sessionId: true,
        mockTest: { select: { title: true } },
      },
    }),
    prisma.practiceSession.findFirst({
      where: { userId: user.id, status: 'IN_PROGRESS' },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        kind: true,
        section: true,
        questionTypeCode: true,
        completedQuestions: true,
        totalQuestions: true,
        startedAt: true,
        mockTest: { select: { title: true, slug: true } },
      },
    }),
    getRecommendations({ userId: user.id, targetScore: target, sections }),
  ])

  const totalAttempts = sections.reduce((sum, section) => sum + section.attemptsCount, 0)
  const daysToTest = profile?.preferredTestDate ? daysBetween(new Date(), profile.preferredTestDate) : null
  const goalMet = minutesToday >= dailyGoal

  const chartSeries = [
    {
      key: 'overall',
      label: 'Overall estimate',
      color: 'var(--color-brand-600)',
      points: history.map((row) => ({ x: row.date, y: row.overallScore })),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-ink-500">{greeting()},</p>
          <h2 className="mt-0.5 text-2xl font-semibold tracking-tight text-navy-900">
            {user.name.split(' ')[0]}
          </h2>
          <p className="mt-1.5 text-sm text-ink-500">
            {totalAttempts === 0
              ? 'Let us get your first practice question done — it takes about two minutes.'
              : `${pluralize(totalAttempts, 'question')} practised so far. Target score ${target}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/practice">
            <PlayCircle aria-hidden />
            Start practice
          </ButtonLink>
          <ButtonLink href="/mock-tests" variant="secondary">
            <ClipboardList aria-hidden />
            Mock tests
          </ButtonLink>
        </div>
      </div>

      {/* Overall estimate + daily goal + streak */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title="Overall estimate" action={<AiEstimateBadge />} />
          <CardBody className="flex flex-col items-center">
            <ScoreRing value={overall} target={target} label="Overall estimate" />
            <p className="mt-4 text-center text-sm text-ink-500">
              {totalAttempts === 0
                ? 'Your estimate appears once you have practised a few questions.'
                : overall >= target
                  ? 'You are tracking at or above your target score. Keep the consistency up.'
                  : `${target - overall} point${target - overall === 1 ? '' : 's'} to reach your target of ${target}.`}
            </p>
            {daysToTest !== null && daysToTest > 0 ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-700">
                <CalendarClock className="size-3.5" aria-hidden />
                {daysToTest} days until {formatDate(profile?.preferredTestDate)}
              </p>
            ) : null}
          </CardBody>
        </Card>

        <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2 lg:content-start">
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Today&rsquo;s goal</p>
                <Timer className="size-4 text-ink-300" aria-hidden />
              </div>
              <p className="mt-2.5 text-[28px] font-semibold leading-none text-navy-900">
                {minutesToday}
                <span className="ml-1 text-base font-medium text-ink-400">/ {dailyGoal} min</span>
              </p>
              <Meter value={minutesToday} max={dailyGoal} className="mt-4" />
              <p className="mt-3 text-sm text-ink-500">
                {goalMet
                  ? 'Daily goal complete. Anything more is a bonus.'
                  : `${dailyGoal - minutesToday} minutes left to hit today's goal.`}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-500">Practice streak</p>
                <Flame className="size-4 text-ink-300" aria-hidden />
              </div>
              <p className="mt-2.5 text-[28px] font-semibold leading-none text-navy-900">
                {profile?.streakDays ?? 0}
                <span className="ml-1 text-base font-medium text-ink-400">
                  day{(profile?.streakDays ?? 0) === 1 ? '' : 's'}
                </span>
              </p>
              <p className="mt-4 text-sm text-ink-500">
                Longest streak {profile?.longestStreak ?? 0} days.
              </p>
              <p className="mt-1.5 text-sm text-ink-500">
                {(profile?.streakDays ?? 0) === 0
                  ? 'Practise today to start a streak.'
                  : goalMet
                    ? 'Today is counted. See you tomorrow.'
                    : 'Practise today to keep it going.'}
              </p>
            </CardBody>
          </Card>

          {/* Continue where you left off */}
          <Card className="sm:col-span-2">
            <CardHeader
              title="Continue practice"
              description={
                openSession
                  ? 'You have a session in progress.'
                  : 'Pick up the section you are working on next.'
              }
            />
            <CardBody>
              {openSession ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">
                      {openSession.mockTest?.title ??
                        (openSession.section
                          ? `${SECTION_META[openSession.section].label} practice`
                          : 'Practice session')}
                    </p>
                    <p className="mt-1 text-sm text-ink-500">
                      {openSession.completedQuestions} of {openSession.totalQuestions} questions completed ·
                      started {formatDate(openSession.startedAt)}
                    </p>
                    <Meter
                      value={openSession.completedQuestions}
                      max={Math.max(1, openSession.totalQuestions)}
                      className="mt-3 max-w-xs"
                      height={6}
                    />
                  </div>
                  <ButtonLink
                    href={
                      openSession.kind === 'MOCK' && openSession.mockTest
                        ? `/mock-tests/${openSession.mockTest.slug}/run?session=${openSession.id}`
                        : `/practice/session/${openSession.id}`
                    }
                  >
                    Resume
                    <ArrowRight aria-hidden />
                  </ButtonLink>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {SECTIONS.map((section) => {
                    const meta = SECTION_META[section]
                    return (
                      <Link
                        key={section}
                        href={`/practice/${meta.slug}`}
                        className="group rounded-xl border border-hairline p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                      >
                        <span className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                          <span
                            className="size-2.5 rounded-full"
                            style={{ backgroundColor: meta.color }}
                            aria-hidden
                          />
                          {meta.label}
                        </span>
                        <span className="mt-2 flex items-center gap-1 text-xs text-brand-600">
                          Start
                          <ArrowRight
                            className="size-3 transition-transform group-hover:translate-x-0.5"
                            aria-hidden
                          />
                        </span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Section scores */}
      <section aria-labelledby="section-scores">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 id="section-scores" className="text-base font-semibold text-navy-900">
            Section estimates
          </h3>
          <Link href="/progress" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Full progress report
          </Link>
        </div>
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
        <AiEstimateNote className="mt-3" />
      </section>

      {/* Trend + recommendations */}
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader
            title="Score trend"
            description="Your overall estimate over the last 30 days."
            action={<AiEstimateBadge />}
          />
          <CardBody>
            {history.length > 1 ? (
              <LineChart
                series={chartSeries}
                domain={[10, 90]}
                reference={{ value: target, label: `Target ${target}` }}
                tableCaption="Overall estimated score by day"
              />
            ) : (
              <EmptyState
                title="Not enough history yet"
                description="Your score trend appears after a couple of days of practice."
                action={{ label: 'Practise now', href: '/practice' }}
              />
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Recommended for you"
            description="Chosen from your own results — not a generic study plan."
          />
          <CardBody className="space-y-3">
            {recommendations.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="group block rounded-xl border border-hairline p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
                    <Lightbulb className="size-4" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.reason}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
                      {item.ctaLabel}
                      <ArrowRight
                        className="size-3 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                      />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Recent mock tests */}
      <Card>
        <CardHeader
          title="Recent mock tests"
          description="Full-length tests under exam timing."
          action={
            <Link href="/mock-tests" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              All mock tests
            </Link>
          }
        />
        {recentMocks.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {recentMocks.map((mock) => (
              <li key={mock.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{mock.mockTest.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{formatDate(mock.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold leading-none text-navy-900">{mock.overallScore}</p>
                    <p className="mt-1 text-[11px] uppercase tracking-wide text-ink-400">Overall</p>
                  </div>
                  <Link
                    href={`/mock-tests/results/${mock.sessionId}`}
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    View
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<Target aria-hidden />}
            title="No mock tests yet"
            description="A full mock test under exam conditions is the most reliable way to know where you stand."
            action={{ label: 'Browse mock tests', href: '/mock-tests' }}
          />
        )}
      </Card>

      {!entitlements.isPremium ? <UpgradePrompt /> : null}
    </div>
  )
}
