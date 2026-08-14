import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, conflict, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

/**
 * Plan pricing is data, not code.
 *
 * Amounts arrive in major units (what an admin types) and are stored as integer
 * minor units, so no float ever reaches the database.
 */
const planSchema = z.object({
  code: z.string().trim().min(2).max(40).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens.'),
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160).optional().or(z.literal('')),
  description: z.string().trim().max(600).optional().or(z.literal('')),
  price: z.coerce.number().min(0).max(10_000_000),
  compareAtPrice: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  currency: z.string().trim().length(3).default('PKR'),
  durationDays: z.coerce.number().int().min(1).max(3650),
  features: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  limits: z.object({
    aiSpeakingPerMonth: z.coerce.number().int().min(-1).max(100_000),
    aiWritingPerMonth: z.coerce.number().int().min(-1).max(100_000),
    mockTestsPerMonth: z.coerce.number().int().min(-1).max(10_000),
    practicePerDay: z.coerce.number().int().min(-1).max(10_000),
    teacherReviews: z.coerce.number().int().min(-1).max(10_000),
    advancedAnalytics: z.boolean().default(true),
  }),
  isActive: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  badge: z.string().trim().max(40).optional().or(z.literal('')),
  displayOrder: z.coerce.number().int().min(0).max(1000).default(0),
})

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100)
}

export const POST = route(async (request) => {
  const staff = await requireApiStaff('plans.manage')
  const input = await parseJson(request, planSchema)

  const existing = await prisma.subscriptionPlan.findUnique({ where: { code: input.code } })
  if (existing) throw conflict('A plan with that code already exists.')

  if (input.compareAtPrice != null && input.compareAtPrice <= input.price) {
    throw badRequest('The compare-at price must be higher than the price, or left blank.')
  }

  const plan = await prisma.subscriptionPlan.create({
    data: {
      code: input.code,
      name: input.name,
      tagline: input.tagline || null,
      description: input.description || null,
      priceCents: toMinorUnits(input.price),
      compareAtCents: input.compareAtPrice != null ? toMinorUnits(input.compareAtPrice) : null,
      currency: input.currency.toUpperCase(),
      durationDays: input.durationDays,
      features: input.features,
      limits: input.limits,
      isActive: input.isActive,
      isPopular: input.isPopular,
      badge: input.badge || null,
      displayOrder: input.displayOrder,
    },
    select: { id: true, code: true },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'plan.created',
    entity: 'SubscriptionPlan',
    entityId: plan.id,
    metadata: { code: plan.code, priceCents: toMinorUnits(input.price) },
  })

  return ok(plan, { status: 201 })
})
