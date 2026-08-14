import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { notFound, ok, parseJson, route } from '@/lib/http'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { evaluateCoupon } from '@/lib/payments/checkout'
import { getSettings } from '@/lib/settings'
import { computeTotals } from '@/lib/money'

export const runtime = 'nodejs'

const schema = z.object({
  planId: z.string().min(1),
  code: z.string().trim().min(1).max(40),
})

/**
 * Previews a coupon so the checkout page can show the discount before the
 * student commits. The authoritative calculation still happens again inside
 * `createCheckout` — this endpoint is for display only.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  // Coupon codes are guessable, so this endpoint is a brute-force target.
  enforceRateLimit(`coupon:${user.id}`, 20, 10 * 60_000)
  enforceRateLimit(clientKey(request, 'coupon'), 40, 10 * 60_000)

  const input = await parseJson(request, schema)

  const plan = await prisma.subscriptionPlan.findFirst({ where: { id: input.planId, isActive: true } })
  if (!plan) throw notFound('That plan is no longer available.')

  const { coupon, discountCents } = await evaluateCoupon(input.code, plan, user.id)
  const settings = await getSettings()
  const totals = computeTotals(plan.priceCents, discountCents, settings.taxPercent)

  return ok({
    code: coupon.code,
    description: coupon.description,
    discountCents,
    totals,
    currency: plan.currency,
  })
})
