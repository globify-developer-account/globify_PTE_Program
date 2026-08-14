import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  tagline: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(600).nullable().optional(),
  price: z.coerce.number().min(0).max(10_000_000).optional(),
  compareAtPrice: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  durationDays: z.coerce.number().int().min(1).max(3650).optional(),
  features: z.array(z.string().trim().min(1).max(200)).max(20).optional(),
  limits: z
    .object({
      aiSpeakingPerMonth: z.coerce.number().int().min(-1),
      aiWritingPerMonth: z.coerce.number().int().min(-1),
      mockTestsPerMonth: z.coerce.number().int().min(-1),
      practicePerDay: z.coerce.number().int().min(-1),
      teacherReviews: z.coerce.number().int().min(-1),
      advancedAnalytics: z.boolean(),
    })
    .optional(),
  isActive: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  badge: z.string().trim().max(40).nullable().optional(),
  displayOrder: z.coerce.number().int().min(0).max(1000).optional(),
})

export const PATCH = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('plans.manage')
  const { id } = await context.params
  const input = await parseJson(request, patchSchema)

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } })
  if (!plan) throw notFound('That plan does not exist.')

  const nextPrice = input.price != null ? Math.round(input.price * 100) : plan.priceCents
  const nextCompare =
    input.compareAtPrice === null
      ? null
      : input.compareAtPrice != null
        ? Math.round(input.compareAtPrice * 100)
        : plan.compareAtCents

  if (nextCompare != null && nextCompare <= nextPrice) {
    throw badRequest('The compare-at price must be higher than the price, or left blank.')
  }

  await prisma.subscriptionPlan.update({
    where: { id },
    data: {
      ...(input.name != null ? { name: input.name } : {}),
      ...(input.tagline !== undefined ? { tagline: input.tagline || null } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.price != null ? { priceCents: nextPrice } : {}),
      ...(input.compareAtPrice !== undefined ? { compareAtCents: nextCompare } : {}),
      ...(input.durationDays != null ? { durationDays: input.durationDays } : {}),
      ...(input.features != null ? { features: input.features } : {}),
      ...(input.limits != null ? { limits: input.limits } : {}),
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
      ...(input.isPopular != null ? { isPopular: input.isPopular } : {}),
      ...(input.badge !== undefined ? { badge: input.badge || null } : {}),
      ...(input.displayOrder != null ? { displayOrder: input.displayOrder } : {}),
    },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'plan.updated',
    entity: 'SubscriptionPlan',
    entityId: id,
    // Price changes are the field most worth being able to reconstruct later.
    metadata: { code: plan.code, priceCentsBefore: plan.priceCents, priceCentsAfter: nextPrice },
  })

  return ok({ id })
})

/**
 * Deactivates rather than deletes.
 *
 * Existing subscriptions and payments reference the plan; removing the row
 * would orphan a paying customer's record.
 */
export const DELETE = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('plans.manage')
  const { id } = await context.params

  const plan = await prisma.subscriptionPlan.findUnique({ where: { id }, select: { id: true, code: true } })
  if (!plan) throw notFound('That plan does not exist.')

  await prisma.subscriptionPlan.update({ where: { id }, data: { isActive: false } })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'plan.deactivated',
    entity: 'SubscriptionPlan',
    entityId: id,
    metadata: { code: plan.code },
  })

  return ok({ deactivated: true })
})
