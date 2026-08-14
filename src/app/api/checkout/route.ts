import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { createCheckout } from '@/lib/payments/checkout'

export const runtime = 'nodejs'

const checkoutSchema = z.object({
  planId: z.string().min(1),
  method: z.enum(['CARD', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH', 'STRIPE', 'DEMO']),
  couponCode: z.string().trim().max(40).optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional(),
})

export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`checkout:${user.id}`, LIMITS.checkout.limit, LIMITS.checkout.windowMs)
  enforceRateLimit(clientKey(request, 'checkout'), LIMITS.checkout.limit, LIMITS.checkout.windowMs)

  const input = await parseJson(request, checkoutSchema)

  // Prices, discounts and totals are all recomputed server-side from the plan
  // row — nothing the browser sends about money is used.
  const result = await createCheckout({
    userId: user.id,
    planId: input.planId,
    method: input.method,
    couponCode: input.couponCode ?? null,
    customer: { name: input.name, email: input.email, phone: input.phone ?? null },
  })

  return ok(result)
})
