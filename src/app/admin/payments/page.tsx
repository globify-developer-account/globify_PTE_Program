import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable, Pagination } from '@/components/ui/data-table'
import { LinkTabs } from '@/components/ui/tabs'
import { AdminSearch } from '@/components/admin/admin-search'
import { PaymentReview } from '@/components/admin/payment-review'
import { StatTile } from '@/components/charts/stat-tile'
import { requireStaff } from '@/lib/auth/guards'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { resolveMediaUrl } from '@/lib/storage'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { formatDateTime } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Payments',
  description: 'Review, approve and reject payments.',
  path: '/admin/payments',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

const TABS = [
  { key: 'MANUAL_REVIEW', label: 'Awaiting review' },
  { key: 'PAID', label: 'Paid' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'all', label: 'All' },
]

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>
}) {
  const staff = await requireStaff('payments.view')
  const canManage = hasPermission(staff.role, staff.adminProfile?.permissions ?? [], 'payments.manage')

  const { q = '', status = 'MANUAL_REVIEW', page = '1' } = await searchParams
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)

  const where: Prisma.PaymentWhereInput = {
    ...(status && status !== 'all'
      ? { status: status as Prisma.EnumPaymentStatusFilter['equals'] }
      : {}),
    ...(q
      ? {
          OR: [
            { reference: { contains: q, mode: 'insensitive' } },
            { user: { name: { contains: q, mode: 'insensitive' } } },
            { user: { email: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [payments, total, awaiting, revenue, counts] = await Promise.all([
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        reference: true,
        status: true,
        method: true,
        provider: true,
        totalCents: true,
        currency: true,
        proofUrl: true,
        createdAt: true,
        paidAt: true,
        reviewNote: true,
        user: { select: { id: true, name: true, email: true } },
        plan: { select: { name: true } },
      },
    }),
    prisma.payment.count({ where }),
    prisma.payment.count({ where: { status: 'MANUAL_REVIEW' } }),
    prisma.payment.aggregate({
      where: { status: 'PAID', paidAt: { gte: monthStart } },
      _sum: { totalCents: true },
      _count: true,
    }),
    prisma.payment.groupBy({ by: ['status'], _count: true }),
  ])

  // Receipts live behind signed URLs — resolve them per row, never store a
  // permanent public link.
  const withProof = await Promise.all(
    payments.map(async (payment) => ({
      ...payment,
      proofHref: await resolveMediaUrl(payment.proofUrl, 900),
    })),
  )

  const countFor = (key: string) => counts.find((row) => row.status === key)?._count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Payments</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Bank transfers and wallet payments are activated here. Card payments activate themselves through
          the provider webhook.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Awaiting review" value={awaiting} upIsGood={false} hint="Students are waiting" />
        <StatTile
          label="Revenue this month"
          value={formatMoney(revenue._sum.totalCents ?? 0)}
          hint={`${revenue._count} confirmed payments`}
        />
        <StatTile label="Total records" value={counts.reduce((sum, row) => sum + row._count, 0)} />
      </div>

      <Card>
        <CardHeader title="Payment records" action={<AdminSearch placeholder="Reference, name or email…" />} />

        <LinkTabs
          items={TABS.map((tab) => ({
            ...tab,
            count: tab.key === 'all' ? undefined : countFor(tab.key),
          }))}
          paramName="status"
          className="px-5"
        />

        <DataTable
          rows={withProof}
          rowKey={(payment) => payment.id}
          empty={{
            title: status === 'MANUAL_REVIEW' ? 'Nothing waiting for review' : 'No payments found',
            description:
              status === 'MANUAL_REVIEW'
                ? 'Receipts uploaded by students appear here for verification.'
                : 'Try a different filter or search term.',
          }}
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (payment) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{payment.user.name}</p>
                  <p className="truncate text-xs text-ink-500">{payment.user.email}</p>
                </div>
              ),
            },
            {
              key: 'plan',
              header: 'Plan',
              secondary: true,
              render: (payment) => <span className="text-sm">{payment.plan.name}</span>,
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (payment) => (
                <span className="font-medium tabular text-navy-900">
                  {formatMoney(payment.totalCents, payment.currency)}
                </span>
              ),
            },
            {
              key: 'method',
              header: 'Method',
              secondary: true,
              render: (payment) => (
                <span className="text-xs text-ink-500">{humanizeStatus(payment.method)}</span>
              ),
            },
            {
              key: 'reference',
              header: 'Reference',
              secondary: true,
              render: (payment) => (
                <span className="font-mono text-xs text-ink-500">{payment.reference}</span>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              secondary: true,
              render: (payment) => (
                <span className="text-xs text-ink-500">{formatDateTime(payment.createdAt)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (payment) => (
                <div>
                  <Badge tone={statusTone(payment.status)}>{humanizeStatus(payment.status)}</Badge>
                  {payment.reviewNote ? (
                    <p className="mt-1 max-w-[200px] truncate text-xs text-ink-400" title={payment.reviewNote}>
                      {payment.reviewNote}
                    </p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'actions',
              header: '',
              align: 'right',
              render: (payment) =>
                canManage && payment.status !== 'PAID' && payment.status !== 'REFUNDED' ? (
                  <PaymentReview
                    paymentId={payment.id}
                    reference={payment.reference}
                    studentName={payment.user.name}
                    planName={payment.plan.name}
                    amount={formatMoney(payment.totalCents, payment.currency)}
                    proofUrl={payment.proofHref}
                  />
                ) : payment.proofHref ? (
                  <a
                    href={payment.proofHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700"
                  >
                    Receipt
                  </a>
                ) : null,
            },
          ]}
        />

        <Pagination
          page={pageNumber}
          pageSize={PAGE_SIZE}
          total={total}
          buildHref={(next) => {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            if (status) params.set('status', status)
            params.set('page', String(next))
            return `/admin/payments?${params.toString()}`
          }}
        />
      </Card>
    </div>
  )
}
