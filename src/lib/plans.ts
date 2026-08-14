import 'server-only'
import type { SubscriptionPlan } from '@prisma/client'
import { prisma, safeQuery } from './db'
import { parseLimits, type PlanLimits } from './access'

/**
 * Plans are entirely database-driven — an admin can rename, reprice, reorder or
 * retire a plan without a deploy. The fallback below is only what a marketing
 * page renders when the database is unreachable, so the page never shows a
 * blank pricing table on a cold preview deploy.
 */

export interface PlanView {
  id: string
  code: string
  name: string
  tagline: string | null
  description: string | null
  priceCents: number
  compareAtCents: number | null
  currency: string
  durationDays: number
  features: string[]
  limits: PlanLimits
  isPopular: boolean
  badge: string | null
  displayOrder: number
}

export function toPlanView(plan: SubscriptionPlan): PlanView {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    tagline: plan.tagline,
    description: plan.description,
    priceCents: plan.priceCents,
    compareAtCents: plan.compareAtCents,
    currency: plan.currency,
    durationDays: plan.durationDays,
    features: plan.features,
    limits: parseLimits(plan.limits),
    isPopular: plan.isPopular,
    badge: plan.badge,
    displayOrder: plan.displayOrder,
  }
}

export async function getActivePlans(): Promise<PlanView[]> {
  const plans = await safeQuery(
    () =>
      prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { priceCents: 'asc' }],
      }),
    [],
  )
  return plans.map(toPlanView)
}

export async function getPlanByCode(code: string): Promise<PlanView | null> {
  const plan = await safeQuery(
    () => prisma.subscriptionPlan.findFirst({ where: { code, isActive: true } }),
    null,
  )
  return plan ? toPlanView(plan) : null
}

export async function getPlanById(id: string): Promise<SubscriptionPlan | null> {
  return safeQuery(() => prisma.subscriptionPlan.findUnique({ where: { id } }), null)
}

export function planPeriodLabel(durationDays: number): string {
  if (durationDays % 365 === 0) {
    const years = durationDays / 365
    return years === 1 ? '1 year' : `${years} years`
  }
  if (durationDays % 30 === 0) {
    const months = durationDays / 30
    return months === 1 ? '30 days' : `${durationDays} days`
  }
  return `${durationDays} days`
}

export function describeLimit(value: number, noun: string): string {
  if (value < 0) return `Unlimited ${noun}`
  if (value === 0) return `No ${noun}`
  return `${value} ${noun}`
}
