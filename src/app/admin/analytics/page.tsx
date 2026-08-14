import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { StatTile } from '@/components/charts/stat-tile'
import { BarChart, HorizontalBarChart } from '@/components/charts/bar-chart'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { addDays, formatDate, startOfDay } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Analytics',
  description: 'Engagement, conversion and content performance.',
  path: '/admin/analytics',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminAnalyticsPage() {
  await requireStaff('analytics.view')

  const now = new Date()
  const thirtyDaysAgo = startOfDay(addDays(now, -29))
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [
    totalStudents,
    activeSubs,
    attempts30,
    activeStudents30,
    revenueThis,
    revenueLast,
    bySection,
    hardestTypes,
    signups,
    mockAverages,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
    prisma.attempt.count({ where: { status: 'SCORED', submittedAt: { gte: thirtyDaysAgo } } }),
    prisma.attempt.findMany({
      where: { status: 'SCORED', submittedAt: { gte: thirtyDaysAgo } },
      select: { userId: true },
      distinct: ['userId'],
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { totalCents: true },
    }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: lastMonthStart, lt: monthStart } },
      _sum: { totalCents: true },
    }),
    prisma.progress.groupBy({
      by: ['section'],
      _avg: { estimatedScore: true },
      _sum: { attemptsCount: true },
    }),
    prisma.question.findMany({
      where: { status: 'PUBLISHED', timesAttempted: { gte: 3 }, averageScore: { not: null } },
      orderBy: { averageScore: 'asc' },
      take: 10,
      select: {
        id: true,
        title: true,
        averageScore: true,
        timesAttempted: true,
        questionType: { select: { shortName: true, section: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.mockTestResult.groupBy({
      by: ['mockTestId'],
      _avg: { overallScore: true },
      _count: true,
    }),
  ])

  const conversion = totalStudents > 0 ? Math.round((activeSubs / totalStudents) * 100) : 0
  const revenueThisCents = revenueThis._sum.totalCents ?? 0
  const revenueLastCents = revenueLast._sum.totalCents ?? 0
  const revenueDelta =
    revenueLastCents > 0
      ? Math.round(((revenueThisCents - revenueLastCents) / revenueLastCents) * 100)
      : 0

  const signupBuckets = new Map<string, number>()
  for (let i = 29; i >= 0; i--) {
    signupBuckets.set(formatDate(addDays(now, -i)).replace(/ \d{4}$/, ''), 0)
  }
  for (const row of signups) {
    const key = formatDate(row.createdAt).replace(/ \d{4}$/, '')
    if (signupBuckets.has(key)) signupBuckets.set(key, (signupBuckets.get(key) ?? 0) + 1)
  }

  const mockTests = await prisma.mockTest.findMany({
    where: { id: { in: mockAverages.map((row) => row.mockTestId) } },
    select: { id: true, title: true },
  })
  const mockTitle = new Map(mockTests.map((test) => [test.id, test.title]))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Analytics</h2>
        <p className="mt-1.5 text-sm text-ink-500">Engagement, conversion and content performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Total students" value={totalStudents} />
        <StatTile
          label="Paid conversion"
          value={`${conversion}%`}
          hint={`${activeSubs} active subscriptions`}
        />
        <StatTile
          label="Active students (30d)"
          value={activeStudents30.length}
          hint={`${attempts30} questions answered`}
        />
        <StatTile
          label="Revenue this month"
          value={formatMoney(revenueThisCents)}
          delta={revenueLastCents > 0 ? { value: revenueDelta, period: 'last month', suffix: '%' } : undefined}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Sign-ups" description="New student accounts over the last 30 days." />
          <CardBody>
            <BarChart
              data={[...signupBuckets.entries()].map(([label, value]) => ({ label, value }))}
              tableCaption="New student sign-ups per day"
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Average estimate by section"
            description="Across every student with recorded progress."
          />
          <CardBody>
            <HorizontalBarChart
              data={bySection.map((row) => ({
                label: SECTION_META[row.section].label,
                value: Math.round(row._avg.estimatedScore ?? 0),
                color: SECTION_META[row.section].color,
                meta: `${row._sum.attemptsCount ?? 0} attempts`,
              }))}
              max={90}
              tableCaption="Average estimated score by section"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Hardest questions"
          description="Lowest average score across at least three attempts — worth reviewing for fairness or a broken answer key."
        />
        <CardBody>
          <HorizontalBarChart
            data={hardestTypes.map((question) => ({
              label: `${question.questionType.shortName} · ${question.title}`,
              value: Math.round(question.averageScore ?? 0),
              color: SECTION_META[question.questionType.section].color,
              meta: `${question.timesAttempted} attempts`,
            }))}
            max={90}
            tableCaption="Lowest scoring published questions"
          />
        </CardBody>
      </Card>

      {mockAverages.length > 0 ? (
        <Card>
          <CardHeader title="Mock test averages" description="Mean overall score per paper." />
          <CardBody>
            <HorizontalBarChart
              data={mockAverages.map((row) => ({
                label: mockTitle.get(row.mockTestId) ?? row.mockTestId,
                value: Math.round(row._avg.overallScore ?? 0),
                meta: `${row._count} sittings`,
              }))}
              max={90}
              tableCaption="Average mock test score"
            />
          </CardBody>
        </Card>
      ) : null}
    </div>
  )
}
