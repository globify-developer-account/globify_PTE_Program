import { AlertTriangle, Sparkles } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, statusTone, humanizeStatus } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { StatTile } from '@/components/charts/stat-tile'
import { BarChart, HorizontalBarChart } from '@/components/charts/bar-chart'
import { Meter } from '@/components/charts/score-ring'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { getSettings } from '@/lib/settings'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'
import { addDays, formatDate, formatDateTime, startOfDay } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'AI usage',
  description: 'AI request volume, cost and failures.',
  path: '/admin/ai-usage',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const usd = (micros: number) => `$${(micros / 1_000_000).toFixed(2)}`

export default async function AdminAiUsagePage() {
  await requireStaff('ai.view')
  const settings = await getSettings()

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const chartStart = startOfDay(addDays(new Date(), -13))

  const [month, byFeature, byProvider, failures, recent, daily] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: monthStart }, status: 'SUCCESS' },
      _sum: { costMicros: true, promptTokens: true, completionTokens: true },
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.aiUsageLog.groupBy({
      by: ['feature'],
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicros: true },
      _count: true,
    }),
    prisma.aiUsageLog.groupBy({
      by: ['provider'],
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicros: true },
      _count: true,
    }),
    prisma.aiUsageLog.count({
      where: { createdAt: { gte: monthStart }, status: { in: ['FAILED', 'BLOCKED'] } },
    }),
    prisma.aiUsageLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 25,
      select: {
        id: true,
        feature: true,
        provider: true,
        model: true,
        status: true,
        costMicros: true,
        latencyMs: true,
        error: true,
        createdAt: true,
        user: { select: { name: true } },
      },
    }),
    prisma.aiUsageLog.findMany({
      where: { createdAt: { gte: chartStart } },
      select: { createdAt: true, costMicros: true },
    }),
  ])

  const budgetUsd = settings.aiMonthlyBudgetUsd || env.ai.monthlyBudgetUsd
  const spentUsd = (month._sum.costMicros ?? 0) / 1_000_000
  const overBudget = budgetUsd > 0 && spentUsd >= budgetUsd

  // Daily spend for the last 14 days.
  const buckets = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    buckets.set(formatDate(addDays(new Date(), -i)).replace(/ \d{4}$/, ''), 0)
  }
  for (const row of daily) {
    const key = formatDate(row.createdAt).replace(/ \d{4}$/, '')
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + row.costMicros / 1_000_000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">AI usage</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Every AI request is logged with its provider, tokens, latency and cost.
        </p>
      </div>

      {overBudget ? (
        <p className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <span>
            <strong className="font-semibold">The monthly AI budget has been reached.</strong> New scoring
            requests are being refused and students are told their response is saved for later. Raise the
            budget in Settings to resume.
          </span>
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Spend this month"
          value={`$${spentUsd.toFixed(2)}`}
          icon={<Sparkles aria-hidden />}
          upIsGood={false}
          hint={budgetUsd > 0 ? `of $${budgetUsd} budget` : 'No budget cap set'}
        />
        <StatTile label="Successful requests" value={month._count} hint="This month" />
        <StatTile
          label="Failed or blocked"
          value={failures}
          upIsGood={false}
          hint={failures > 0 ? 'Check the log below' : 'None this month'}
        />
        <StatTile
          label="Average latency"
          value={`${Math.round(month._avg.latencyMs ?? 0)} ms`}
          upIsGood={false}
        />
      </div>

      {budgetUsd > 0 ? (
        <Card>
          <CardBody>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-ink-600">Monthly budget</span>
              <span className="font-medium text-navy-900 tabular">
                ${spentUsd.toFixed(2)} / ${budgetUsd.toFixed(2)}
              </span>
            </div>
            <Meter
              value={spentUsd}
              max={budgetUsd}
              className="mt-3"
              color={overBudget ? 'var(--color-danger)' : 'var(--color-brand-600)'}
              trackColor="var(--color-ink-100)"
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Daily spend" description="Last 14 days, in USD." />
          <CardBody>
            <BarChart
              data={[...buckets.entries()].map(([label, value]) => ({
                label,
                value: Number(value.toFixed(2)),
              }))}
              valueSuffix=" USD"
              tableCaption="AI spend per day in USD"
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Spend by feature" description="This month." />
          <CardBody>
            <HorizontalBarChart
              data={byFeature.map((row) => ({
                label: humanizeStatus(row.feature),
                value: Number(((row._sum.costMicros ?? 0) / 1_000_000).toFixed(2)),
                meta: `${row._count} requests`,
              }))}
              valueSuffix=" USD"
              tableCaption="AI spend by feature"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Providers" description="Which provider actually served each request." />
        <CardBody className="grid gap-3 sm:grid-cols-3">
          {byProvider.map((row) => (
            <div key={row.provider} className="rounded-xl border border-hairline p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-navy-900">
                {row.provider}
                {row.provider === 'demo' ? (
                  <Badge tone="warning" size="sm">
                    Simulated
                  </Badge>
                ) : null}
              </p>
              <p className="mt-2 text-lg font-semibold text-navy-900 tabular">
                {usd(row._sum.costMicros ?? 0)}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">{row._count} requests</p>
            </div>
          ))}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent requests" description="The last 25 AI calls across the platform." />
        <DataTable
          rows={recent}
          rowKey={(row) => row.id}
          empty={{ title: 'No AI requests yet', description: 'Requests appear here as students are scored.' }}
          columns={[
            {
              key: 'feature',
              header: 'Feature',
              render: (row) => <span className="text-sm">{humanizeStatus(row.feature)}</span>,
            },
            {
              key: 'user',
              header: 'Student',
              secondary: true,
              render: (row) => (
                <span className="text-sm text-ink-600">{row.user?.name ?? '—'}</span>
              ),
            },
            {
              key: 'provider',
              header: 'Provider',
              render: (row) => (
                <span className="font-mono text-xs text-ink-600">
                  {row.provider}
                  <span className="text-ink-400"> / {row.model}</span>
                </span>
              ),
            },
            {
              key: 'cost',
              header: 'Cost',
              align: 'right',
              render: (row) => <span className="tabular text-sm">{usd(row.costMicros)}</span>,
            },
            {
              key: 'latency',
              header: 'Latency',
              align: 'right',
              secondary: true,
              render: (row) => <span className="tabular text-sm">{row.latencyMs} ms</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (row) => (
                <div>
                  <Badge tone={row.status === 'SUCCESS' ? 'success' : statusTone(row.status)}>
                    {humanizeStatus(row.status)}
                  </Badge>
                  {row.error ? (
                    <p className="mt-1 max-w-[220px] truncate text-xs text-ink-400" title={row.error}>
                      {row.error}
                    </p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'when',
              header: 'When',
              align: 'right',
              secondary: true,
              render: (row) => (
                <span className="whitespace-nowrap text-xs text-ink-500">
                  {formatDateTime(row.createdAt)}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
