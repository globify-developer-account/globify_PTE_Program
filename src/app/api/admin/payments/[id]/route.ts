import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { activateSubscription } from '@/lib/payments/checkout'
import { notifyUser, NOTIFICATION_TYPES } from '@/lib/notifications'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const schema = z.object({
  action: z.enum(['approve', 'reject']),
  note: z.string().trim().max(500).optional(),
})

/**
 * Manual payment review.
 *
 * This is the only path by which a bank transfer becomes an active
 * subscription, and it routes through the same `activateSubscription` used by
 * the webhook — so approving twice is as harmless as a duplicated webhook.
 */
export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('payments.manage')
  const { id } = await context.params

  const input = await parseJson(request, schema)

  const payment = await prisma.payment.findUnique({
    where: { id },
    select: {
      id: true,
      reference: true,
      status: true,
      userId: true,
      plan: { select: { name: true } },
    },
  })
  if (!payment) throw notFound('That payment does not exist.')

  if (input.action === 'approve') {
    if (payment.status === 'PAID') throw badRequest('That payment is already confirmed.')

    const result = await activateSubscription(payment.reference, {
      approvedById: staff.id,
      note: input.note,
    })

    await writeAudit({
      actorId: staff.id,
      actorRole: staff.role,
      action: 'payment.approved',
      entity: 'Payment',
      entityId: payment.id,
      metadata: { reference: payment.reference, outcome: result.reason },
    })

    return ok({ status: 'PAID', activated: result.activated })
  }

  if (payment.status === 'PAID') {
    throw badRequest('That payment is already confirmed. Refund it instead of rejecting it.')
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'FAILED',
      reviewedById: staff.id,
      reviewedAt: new Date(),
      reviewNote: input.note ?? null,
      failureReason: input.note ?? 'Rejected after manual review.',
    },
  })

  await notifyUser({
    userId: payment.userId,
    type: NOTIFICATION_TYPES.paymentRejected,
    title: 'We could not verify your payment',
    body:
      input.note ??
      `We were unable to verify the receipt for ${payment.plan.name}. Please check the amount and reference, then upload it again or contact support.`,
    href: `/checkout/pay/${payment.reference}`,
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'payment.rejected',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { reference: payment.reference, note: input.note ?? null },
  })

  return ok({ status: 'FAILED' })
})
