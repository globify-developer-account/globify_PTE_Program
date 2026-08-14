import 'server-only'
import { cache } from 'react'
import type { Subscription, SubscriptionPlan } from '@prisma/client'
import { prisma } from './db'
import { PaywallError } from './http'
import { startOfDay } from './utils'

/**
 * Subscription entitlements.
 *
 * Every gated action calls `assertQuota()` on the server. The UI mirrors these
 * numbers for a nicer experience, but the UI is never the enforcement point.
 */

export type GatedFeature =
  | 'ai_speaking'
  | 'ai_writing'
  | 'mock_test'
  | 'practice'
  | 'teacher_review'
  | 'analytics'

export interface PlanLimits {
  aiSpeakingPerMonth: number
  aiWritingPerMonth: number
  mockTestsPerMonth: number
  practicePerDay: number
  teacherReviews: number
  advancedAnalytics: boolean
}

/** What a signed-in user with no active subscription may do. */
export const FREE_LIMITS: PlanLimits = {
  aiSpeakingPerMonth: 5,
  aiWritingPerMonth: 3,
  mockTestsPerMonth: 1,
  practicePerDay: 10,
  teacherReviews: 0,
  advancedAnalytics: false,
}

const UNLIMITED = -1

const FEATURE_META: Record<
  GatedFeature,
  { limitKey: keyof PlanLimits; window: 'day' | 'month' | 'none'; label: string }
> = {
  ai_speaking: { limitKey: 'aiSpeakingPerMonth', window: 'month', label: 'AI speaking evaluations' },
  ai_writing: { limitKey: 'aiWritingPerMonth', window: 'month', label: 'AI writing evaluations' },
  mock_test: { limitKey: 'mockTestsPerMonth', window: 'month', label: 'mock tests' },
  practice: { limitKey: 'practicePerDay', window: 'day', label: 'practice questions' },
  teacher_review: { limitKey: 'teacherReviews', window: 'month', label: 'teacher reviews' },
  analytics: { limitKey: 'advancedAnalytics', window: 'none', label: 'advanced analytics' },
}

export function parseLimits(raw: unknown): PlanLimits {
  const source = (raw ?? {}) as Record<string, unknown>
  const num = (key: keyof PlanLimits, fallback: number): number => {
    const value = source[key]
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback
  }
  return {
    aiSpeakingPerMonth: num('aiSpeakingPerMonth', FREE_LIMITS.aiSpeakingPerMonth),
    aiWritingPerMonth: num('aiWritingPerMonth', FREE_LIMITS.aiWritingPerMonth),
    mockTestsPerMonth: num('mockTestsPerMonth', FREE_LIMITS.mockTestsPerMonth),
    practicePerDay: num('practicePerDay', FREE_LIMITS.practicePerDay),
    teacherReviews: num('teacherReviews', FREE_LIMITS.teacherReviews),
    advancedAnalytics: source.advancedAnalytics === true,
  }
}

export type AccessTier = 'free' | 'premium' | 'expired'

export interface Entitlements {
  tier: AccessTier
  isPremium: boolean
  limits: PlanLimits
  plan: SubscriptionPlan | null
  subscription: (Subscription & { plan: SubscriptionPlan }) | null
  /** Days left on an active subscription, or null when there is none. */
  daysRemaining: number | null
  expiresAt: Date | null
}

export const getEntitlements = cache(async (userId: string): Promise<Entitlements> => {
  const now = new Date()

  const active = await prisma.subscription.findFirst({
    where: { userId, status: 'ACTIVE', expiresAt: { gt: now } },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  })

  if (active) {
    return {
      tier: 'premium',
      isPremium: true,
      limits: parseLimits(active.plan.limits),
      plan: active.plan,
      subscription: active,
      daysRemaining: active.expiresAt
        ? Math.max(0, Math.ceil((active.expiresAt.getTime() - now.getTime()) / 86_400_000))
        : null,
      expiresAt: active.expiresAt,
    }
  }

  const lapsed = await prisma.subscription.findFirst({
    where: { userId, status: { in: ['ACTIVE', 'EXPIRED', 'CANCELLED'] } },
    include: { plan: true },
    orderBy: { expiresAt: 'desc' },
  })

  return {
    tier: lapsed ? 'expired' : 'free',
    isPremium: false,
    limits: FREE_LIMITS,
    plan: null,
    subscription: lapsed ?? null,
    daysRemaining: 0,
    expiresAt: lapsed?.expiresAt ?? null,
  }
})

function windowFor(kind: 'day' | 'month'): { start: Date; end: Date } {
  const now = new Date()
  if (kind === 'day') {
    const start = startOfDay(now)
    return { start, end: new Date(start.getTime() + 86_400_000) }
  }
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return { start, end }
}

export interface QuotaState {
  feature: GatedFeature
  limit: number
  used: number
  remaining: number
  unlimited: boolean
  allowed: boolean
}

export async function getQuota(
  userId: string,
  feature: GatedFeature,
  entitlements?: Entitlements,
): Promise<QuotaState> {
  const ent = entitlements ?? (await getEntitlements(userId))
  const meta = FEATURE_META[feature]

  if (meta.window === 'none') {
    const allowed = ent.limits.advancedAnalytics || ent.isPremium
    return { feature, limit: allowed ? UNLIMITED : 0, used: 0, remaining: allowed ? UNLIMITED : 0, unlimited: allowed, allowed }
  }

  const limitValue = ent.limits[meta.limitKey]
  const limit = typeof limitValue === 'number' ? limitValue : 0
  if (limit === UNLIMITED) {
    return { feature, limit: UNLIMITED, used: 0, remaining: UNLIMITED, unlimited: true, allowed: true }
  }

  const { start, end } = windowFor(meta.window)
  const counter = await prisma.usageCounter.findUnique({
    where: { userId_feature_periodStart: { userId, feature, periodStart: start } },
  })
  const used = counter?.count ?? 0
  void end

  return {
    feature,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    unlimited: false,
    allowed: used < limit,
  }
}

/**
 * Throws a PaywallError when the user is out of quota. Call this *before*
 * doing paid work (an AI request, starting a mock test), then call
 * `consumeQuota` once the work has actually been committed.
 */
export async function assertQuota(
  userId: string,
  feature: GatedFeature,
  entitlements?: Entitlements,
): Promise<QuotaState> {
  const ent = entitlements ?? (await getEntitlements(userId))
  const quota = await getQuota(userId, feature, ent)
  if (quota.allowed) return quota

  const meta = FEATURE_META[feature]
  if (ent.tier === 'expired') {
    throw new PaywallError(
      `Your Globify PTE Premium subscription has expired. Renew to continue using ${meta.label}.`,
      'expired',
      { feature, limit: quota.limit, used: quota.used },
    )
  }
  if (ent.tier === 'free') {
    throw new PaywallError(
      `You have used all ${quota.limit} free ${meta.label}. Upgrade to Globify PTE Premium for unlimited practice.`,
      'quota_exceeded',
      { feature, limit: quota.limit, used: quota.used },
    )
  }
  throw new PaywallError(
    `Your current plan includes ${quota.limit} ${meta.label} in this period. Upgrade for a higher allowance.`,
    'plan_limit',
    { feature, limit: quota.limit, used: quota.used },
  )
}

/** Increments the usage counter for a feature after the work succeeded. */
export async function consumeQuota(userId: string, feature: GatedFeature, amount = 1): Promise<void> {
  const meta = FEATURE_META[feature]
  if (meta.window === 'none') return
  const { start, end } = windowFor(meta.window)
  await prisma.usageCounter.upsert({
    where: { userId_feature_periodStart: { userId, feature, periodStart: start } },
    create: { userId, feature, periodStart: start, periodEnd: end, count: amount },
    update: { count: { increment: amount } },
  })
}

/** Premium-only content gate for questions, mock tests and resources. */
export function canAccessPremiumContent(entitlements: Entitlements): boolean {
  return entitlements.isPremium
}

export async function assertPremiumContent(entitlements: Entitlements, what: string): Promise<void> {
  if (entitlements.isPremium) return
  throw new PaywallError(
    `${what} is part of Globify PTE Premium.`,
    entitlements.tier === 'expired' ? 'expired' : 'no_subscription',
  )
}
