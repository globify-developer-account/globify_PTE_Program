import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Coupon, PaymentMethodKind, Prisma, SubscriptionPlan } from '@prisma/client'
import { prisma } from '../db'
import { env } from '../env'
import { getSettings } from '../settings'
import { badRequest, notFound } from '../http'
import { computeTotals, formatMoney } from '../money'
import { notifyUser, NOTIFICATION_TYPES } from '../notifications'
import { writeAudit } from '../audit'
import { paymentProvider } from './providers'

/**
 * Checkout and subscription activation.
 *
 * Two rules govern this file:
 *
 *   1. A payment is only ever marked paid by server-side confirmation — a
 *      verified webhook or an administrator reviewing a receipt. The browser
 *      cannot put a payment into a paid state.
 *   2. `activateSubscription` is idempotent. A provider that delivers the same
 *      webhook three times must not produce three subscriptions or three
 *      extensions of the expiry date.
 */

export function paymentReference(): string {
  // Human-quotable in a WhatsApp message to support, and unguessable enough
  // that knowing one reference tells you nothing about another.
  return `GLB-${randomBytes(5).toString('hex').toUpperCase()}`
}

// --- coupons ------------------------------------------------------------------

export interface CouponEvaluation {
  coupon: Coupon
  discountCents: number
}

export async function evaluateCoupon(
  code: string,
  plan: SubscriptionPlan,
  userId: string,
): Promise<CouponEvaluation> {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.trim().toUpperCase() } })
  if (!coupon || !coupon.isActive) throw badRequest('That coupon code is not valid.')

  const now = new Date()
  if (coupon.startsAt && coupon.startsAt > now) throw badRequest('That coupon is not active yet.')
  if (coupon.expiresAt && coupon.expiresAt < now) throw badRequest('That coupon has expired.')
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    throw badRequest('That coupon has reached its usage limit.')
  }
  if (coupon.applicablePlanIds.length > 0 && !coupon.applicablePlanIds.includes(plan.id)) {
    throw badRequest('That coupon does not apply to the selected plan.')
  }
  if (plan.priceCents < coupon.minSubtotalCents) {
    throw badRequest(
      `That coupon requires a minimum order of ${formatMoney(coupon.minSubtotalCents, plan.currency)}.`,
    )
  }

  const used = await prisma.couponRedemption.count({ where: { couponId: coupon.id, userId } })
  if (used >= coupon.perUserLimit) throw badRequest('You have already used that coupon.')

  let discountCents =
    coupon.discountType === 'PERCENTAGE'
      ? Math.round((plan.priceCents * coupon.discountValue) / 100)
      : coupon.discountValue

  if (coupon.maxDiscountCents !== null) {
    discountCents = Math.min(discountCents, coupon.maxDiscountCents)
  }

  return { coupon, discountCents: Math.min(discountCents, plan.priceCents) }
}

// --- checkout -----------------------------------------------------------------

export interface CheckoutInput {
  userId: string
  planId: string
  method: PaymentMethodKind
  couponCode?: string | null
  customer: { name: string; email: string; phone?: string | null }
}

export interface CheckoutResult {
  reference: string
  paymentId: string
  redirectUrl: string | null
  instructions: string | null
  totals: { subtotalCents: number; discountCents: number; taxCents: number; totalCents: number }
  currency: string
  requiresProof: boolean
}

const MANUAL_METHODS: PaymentMethodKind[] = ['BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH']

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const plan = await prisma.subscriptionPlan.findFirst({
    where: { id: input.planId, isActive: true },
  })
  if (!plan) throw notFound('That plan is no longer available.')

  const settings = await getSettings()

  let discountCents = 0
  let couponId: string | null = null
  if (input.couponCode) {
    const evaluation = await evaluateCoupon(input.couponCode, plan, input.userId)
    discountCents = evaluation.discountCents
    couponId = evaluation.coupon.id
  }

  const totals = computeTotals(plan.priceCents, discountCents, settings.taxPercent)
  const reference = paymentReference()
  const isManual = MANUAL_METHODS.includes(input.method)
  const provider = paymentProvider(isManual ? 'manual' : undefined)

  const charge = await provider.createCharge({
    reference,
    amountCents: totals.totalCents,
    currency: plan.currency,
    description: `${settings.platformName} — ${plan.name}`,
    customer: input.customer,
    method: input.method,
    returnUrl: `${env.appUrl}/checkout/success?reference=${reference}`,
    cancelUrl: `${env.appUrl}/checkout?plan=${plan.code}&cancelled=1`,
    metadata: { userId: input.userId, planId: plan.id, reference },
  })

  const payment = await prisma.payment.create({
    data: {
      reference,
      userId: input.userId,
      planId: plan.id,
      couponId,
      provider: provider.name,
      method: input.method,
      providerRef: charge.providerRef,
      status: charge.initialStatus,
      subtotalCents: totals.subtotalCents,
      discountCents: totals.discountCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      currency: plan.currency,
      customerName: input.customer.name,
      customerEmail: input.customer.email,
      customerPhone: input.customer.phone ?? null,
      metadata: { couponCode: input.couponCode ?? null } as Prisma.InputJsonValue,
    },
  })

  await writeAudit({
    actorId: input.userId,
    actorRole: 'STUDENT',
    action: 'payment.created',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { reference, planCode: plan.code, method: input.method, totalCents: totals.totalCents },
  })

  return {
    reference,
    paymentId: payment.id,
    redirectUrl: charge.redirectUrl,
    instructions: charge.instructions ?? null,
    totals,
    currency: plan.currency,
    requiresProof: isManual,
  }
}

// --- activation ---------------------------------------------------------------

export interface ActivationResult {
  activated: boolean
  reason: 'activated' | 'already_paid' | 'not_found'
  subscriptionId?: string
}

/**
 * Marks a payment paid and activates the matching subscription.
 *
 * Everything runs inside one transaction whose first statement re-reads the
 * payment and refuses to continue if it is already PAID. That single guard is
 * what makes a duplicated webhook harmless.
 */
export async function activateSubscription(
  reference: string,
  options: { providerRef?: string; approvedById?: string; note?: string } = {},
): Promise<ActivationResult> {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { plan: true },
  })
  if (!payment) return { activated: false, reason: 'not_found' }
  if (payment.status === 'PAID') {
    return { activated: false, reason: 'already_paid' }
  }

  const now = new Date()
  const expiresAt = new Date(now.getTime() + payment.plan.durationDays * 86_400_000)

  const result = await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction: two webhooks can arrive concurrently.
    const fresh = await tx.payment.findUnique({ where: { id: payment.id }, select: { status: true } })
    if (!fresh || fresh.status === 'PAID') return null

    // Extend rather than replace an active subscription, so a renewal that
    // arrives early does not throw away days the student has paid for.
    const existing = await tx.subscription.findFirst({
      where: { userId: payment.userId, status: 'ACTIVE', expiresAt: { gt: now } },
      orderBy: { expiresAt: 'desc' },
    })

    const subscription = existing
      ? await tx.subscription.update({
          where: { id: existing.id },
          data: {
            planId: payment.planId,
            expiresAt: new Date(existing.expiresAt!.getTime() + payment.plan.durationDays * 86_400_000),
          },
        })
      : await tx.subscription.create({
          data: {
            userId: payment.userId,
            planId: payment.planId,
            status: 'ACTIVE',
            startedAt: now,
            expiresAt,
            source: payment.provider,
          },
        })

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: now,
        subscriptionId: subscription.id,
        providerRef: options.providerRef ?? payment.providerRef,
        reviewedById: options.approvedById ?? null,
        reviewedAt: options.approvedById ? now : null,
        reviewNote: options.note ?? null,
      },
    })

    if (payment.couponId) {
      await tx.coupon.update({ where: { id: payment.couponId }, data: { usedCount: { increment: 1 } } })
      await tx.couponRedemption.create({
        data: { couponId: payment.couponId, userId: payment.userId, paymentId: payment.id },
      })
    }

    return subscription
  })

  if (!result) return { activated: false, reason: 'already_paid' }

  await notifyUser({
    userId: payment.userId,
    type: NOTIFICATION_TYPES.subscriptionActivated,
    title: `${payment.plan.name} is active`,
    body: `Your subscription runs until ${result.expiresAt?.toDateString() ?? 'further notice'}. Every premium feature is now unlocked.`,
    href: '/subscription',
  })

  await settleReferral(payment.id, payment.userId, payment.totalCents)

  await writeAudit({
    actorId: options.approvedById ?? null,
    actorRole: options.approvedById ? 'ADMIN' : null,
    action: 'subscription.activated',
    entity: 'Subscription',
    entityId: result.id,
    metadata: { reference, paymentId: payment.id, provider: payment.provider },
  })

  return { activated: true, reason: 'activated', subscriptionId: result.id }
}

export async function failPayment(reference: string, reason: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { reference }, select: { id: true, status: true, userId: true } })
  if (!payment || payment.status === 'PAID') return

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'FAILED', failureReason: reason.slice(0, 400) },
  })

  await notifyUser({
    userId: payment.userId,
    type: NOTIFICATION_TYPES.paymentRejected,
    title: 'Your payment did not complete',
    body: `${reason} No money has been taken. You can try again from the pricing page.`,
    href: '/pricing',
  })
}

export async function refundPayment(reference: string): Promise<void> {
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { subscription: true } })
  if (!payment) return

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } })
    if (payment.subscriptionId) {
      await tx.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
    }
  })

  await writeAudit({
    actorId: null,
    actorRole: null,
    action: 'payment.refunded',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { reference },
  })
}

/** Credits the referrer once their referred user actually pays. */
async function settleReferral(paymentId: string, userId: string, totalCents: number): Promise<void> {
  const referral = await prisma.referral.findFirst({
    where: { referredUserId: userId, status: { in: ['CLICKED', 'REGISTERED', 'PURCHASED'] } },
  })
  if (!referral) return

  const rewardCents = Math.round(totalCents * 0.1)
  await prisma.referral.update({
    where: { id: referral.id },
    data: { status: 'REWARDED', paymentId, rewardCents, rewardedAt: new Date() },
  })

  await notifyUser({
    userId: referral.referrerId,
    type: NOTIFICATION_TYPES.paymentReceived,
    title: 'You earned a referral reward',
    body: `Someone you referred just subscribed. Your reward of ${formatMoney(rewardCents)} has been recorded.`,
    href: '/profile#referrals',
  })
}
