import Link from 'next/link'
import { AlertTriangle, ArrowRight, CreditCard, FileQuestion, Sparkles, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { StatTile } from '@/components/charts/stat-tile'
import { BarChart } from '@/components/charts/bar-chart'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { addDays, formatDate, relativeTime, startOfDay } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Admin overview',
  description: 'Platform health at a glance.',
  path: '/admin',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  await requireStaff('admin.view')

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const weekAgo = startOfDay(addDays(new Date(), -6))

  const [
    students,
    newStudents,
    activeSubs,
    pendingPayments,
    revenue,
    questions,
    attempts7d,
    aiSpend,
    recentPayments,
    signupSeries,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'STUDENT', createdAt: { gte: monthStart } } }),
    prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } }),
    prisma.payment.count({ where: { status: 'MANUAL_REVIEW' } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { totalCents: true },
    }),
    prisma.question.count({ where: { status: 'PUBLISHED' } }),
    prisma.attempt.count({ where: { status: 'SCORED', submittedAt: { gte: weekAgo } } }),
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: monthStart }, status: 'SUCCESS' },
      _sum: { costMicros: true },
      _count: true,
    }),
    prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        reference: true,
        status: true,
        totalCents: true,
        currency: true,
        createdAt: true,
        user: { select: { name: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', createdAt: { gte: startOfDay(addDays(new Date(), -13)) } },
      select: { createdAt: true },
    }),
  ])

  // Bucket signups by day for the activity chart.
  const buckets = new Map<string, number>()
  for (let i = 13; i >= 0; i--) {
    buckets.set(formatDate(addDays(new Date(), -i)).replace(/ \d{4}$/, ''), 0)
  }
  for (const row of signupSeries) {
    const key = formatDate(row.createdAt).replace(/ \d{4}$/, '')
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1)
  }

  const aiSpendUsd = (aiSpend._sum.costMicros ?? 0) / 1_000_000

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Overview</h2>
        <p className="mt-1.5 text-sm text-ink-500">Platform health for {formatDate(monthStart, 'long')} onward.</p>
      </div>

      {pendingPayments > 0 ? (
        <Link
          href="/admin/payments?status=MANUAL_REVIEW"
          className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100/60"
        >
          <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1 text-sm text-amber-900">
            <strong className="font-semibold">
              {pendingPayments} payment{pendingPayments === 1 ? '' : 's'} awaiting verification.
            </strong>{' '}
            Students stay on the free plan until you approve their receipt.
          </p>
          <ArrowRight className="size-4 shrink-0 text-amber-700" aria-hidden />
        </Link>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Students"
          value={students}
          icon={<Users aria-hidden />}
          hint={`${newStudents} joined this month`}
        />
        <StatTile
          label="Active subscriptions"
          value={activeSubs}
          icon={<CreditCard aria-hidden />}
          hint={students > 0 ? `${Math.round((activeSubs / students) * 100)}% of students` : 'No students yet'}
        />
        <StatTile
          label="Revenue this month"
          value={formatMoney(revenue._sum.totalCents ?? 0)}
          icon={<CreditCard aria-hidden />}
          hint="Confirmed payments only"
        />
        <StatTile
          label="AI spend this month"
          value={`$${aiSpendUsd.toFixed(2)}`}
          icon={<Sparkles aria-hidden />}
          upIsGood={false}
          hint={`${aiSpend._count} successful requests`}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="New students" description="Sign-ups over the last 14 days." />
          <CardBody>
            <BarChart
              data={[...buckets.entries()].map(([label, value]) => ({ label, value }))}
              tableCaption="New student sign-ups per day"
            />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Content and activity" />
          <CardBody className="space-y-4">
            <Row
              label="Published questions"
              value={questions}
              href="/admin/questions"
              icon={<FileQuestion className="size-4" aria-hidden />}
            />
            <Row label="Answers scored (7 days)" value={attempts7d} />
            <Row
              label="Payments awaiting review"
              value={pendingPayments}
              href="/admin/payments?status=MANUAL_REVIEW"
            />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Recent payments"
          action={
            <Link href="/admin/payments" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              All payments
            </Link>
          }
        />
        {recentPayments.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {recentPayments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{payment.user.name}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {payment.plan.name} · <span className="font-mono">{payment.reference}</span> ·{' '}
                    {relativeTime(payment.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-navy-900 tabular">
                    {formatMoney(payment.totalCents, payment.currency)}
                  </span>
                  <Badge tone={statusTone(payment.status)}>{humanizeStatus(payment.status)}</Badge>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No payments yet" description="Payments appear here as students subscribe." />
        )}
      </Card>
    </div>
  )
}

function Row({
  label,
  value,
  href,
  icon,
}: {
  label: string
  value: number
  href?: string
  icon?: React.ReactNode
}) {
  const content = (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-sm text-ink-600">
        {icon}
        {label}
      </span>
      <span className="text-sm font-semibold text-navy-900 tabular">{value}</span>
    </div>
  )
  return href ? (
    <Link href={href} className="block rounded-lg px-1 py-1 transition-colors hover:bg-ink-50">
      {content}
    </Link>
  ) : (
    <div className="px-1 py-1">{content}</div>
  )
}
