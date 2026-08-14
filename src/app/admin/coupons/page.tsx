import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Coupons',
  description: 'Discount codes and their redemption.',
  path: '/admin/coupons',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminCouponsPage() {
  await requireStaff('plans.view')

  const coupons = await prisma.coupon.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { redemptions: true } } },
  })

  const now = new Date()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Coupons</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Discounts are recalculated on the server at checkout — a coupon preview in the browser never
          determines what a student is charged.
        </p>
      </div>

      <Card>
        <CardHeader title={`${coupons.length} codes`} />
        <DataTable
          rows={coupons}
          rowKey={(coupon) => coupon.id}
          empty={{
            title: 'No coupons yet',
            description: 'Run the seed script or create codes to offer discounts.',
          }}
          columns={[
            {
              key: 'code',
              header: 'Code',
              render: (coupon) => (
                <div className="min-w-0">
                  <p className="font-mono text-sm font-semibold text-navy-900">{coupon.code}</p>
                  {coupon.description ? (
                    <p className="truncate text-xs text-ink-500">{coupon.description}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'discount',
              header: 'Discount',
              render: (coupon) => (
                <span className="text-sm font-medium text-navy-900">
                  {coupon.discountType === 'PERCENTAGE'
                    ? `${coupon.discountValue}%`
                    : formatMoney(coupon.discountValue)}
                </span>
              ),
            },
            {
              key: 'used',
              header: 'Used',
              align: 'right',
              render: (coupon) => (
                <span className="tabular text-sm">
                  {coupon.usedCount}
                  {coupon.usageLimit !== null ? (
                    <span className="text-ink-400"> / {coupon.usageLimit}</span>
                  ) : null}
                </span>
              ),
            },
            {
              key: 'redemptions',
              header: 'Redemptions',
              align: 'right',
              secondary: true,
              render: (coupon) => <span className="tabular text-sm">{coupon._count.redemptions}</span>,
            },
            {
              key: 'expires',
              header: 'Expires',
              secondary: true,
              render: (coupon) => (
                <span className="text-xs text-ink-500">
                  {coupon.expiresAt ? formatDate(coupon.expiresAt) : 'No expiry'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (coupon) => {
                const expired = coupon.expiresAt !== null && coupon.expiresAt < now
                const exhausted =
                  coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit
                return (
                  <Badge
                    tone={!coupon.isActive || expired || exhausted ? 'neutral' : 'success'}
                  >
                    {!coupon.isActive
                      ? 'Disabled'
                      : expired
                        ? 'Expired'
                        : exhausted
                          ? 'Exhausted'
                          : 'Active'}
                  </Badge>
                )
              },
            },
          ]}
        />
      </Card>
    </div>
  )
}
