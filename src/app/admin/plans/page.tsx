import { Info } from 'lucide-react'
import { PlanEditor } from '@/components/admin/plan-editor'
import { EmptyState } from '@/components/ui/states'
import { Card } from '@/components/ui/card'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { parseLimits } from '@/lib/access'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Plans',
  description: 'Pricing and allowances for every subscription plan.',
  path: '/admin/plans',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminPlansPage() {
  await requireStaff('plans.view')

  const plans = await prisma.subscriptionPlan.findMany({
    orderBy: [{ displayOrder: 'asc' }, { priceCents: 'asc' }],
    include: {
      _count: {
        select: { subscriptions: { where: { status: 'ACTIVE', expiresAt: { gt: new Date() } } } },
      },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Plans</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Prices and allowances are stored in the database, not in code. Saving here updates the public
          pricing page and every entitlement check immediately.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-hairline bg-white p-4 text-sm text-ink-600">
        <Info className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
        Changing a price does not affect anyone already subscribed — their subscription runs to its existing
        expiry date at the price they paid.
      </p>

      {plans.length === 0 ? (
        <Card>
          <EmptyState
            title="No plans configured"
            description="Run the seed script or create a plan to start selling subscriptions."
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {plans.map((plan) => {
            const limits = parseLimits(plan.limits)
            return (
              <PlanEditor
                key={plan.id}
                plan={{
                  id: plan.id,
                  code: plan.code,
                  name: plan.name,
                  tagline: plan.tagline ?? '',
                  description: plan.description ?? '',
                  price: plan.priceCents / 100,
                  compareAtPrice: plan.compareAtCents !== null ? plan.compareAtCents / 100 : null,
                  currency: plan.currency,
                  durationDays: plan.durationDays,
                  features: plan.features,
                  limits,
                  isActive: plan.isActive,
                  isPopular: plan.isPopular,
                  badge: plan.badge ?? '',
                  displayOrder: plan.displayOrder,
                  activeSubscriptions: plan._count.subscriptions,
                }}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
