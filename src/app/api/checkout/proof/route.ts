import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { badRequest, notFound, ok, route } from '@/lib/http'
import { LIMITS, enforceRateLimit } from '@/lib/rate-limit'
import { assertUploadSize, extensionForProof, proofKey, storage } from '@/lib/storage'
import { notifyUser, NOTIFICATION_TYPES } from '@/lib/notifications'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Receives a bank-transfer or wallet receipt.
 *
 * Uploading proof moves the payment to MANUAL_REVIEW — it never marks it paid.
 * Only an administrator approving it in the dashboard can do that.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`proof:${user.id}`, LIMITS.upload.limit, LIMITS.upload.windowMs)

  const form = await request.formData()
  const reference = String(form.get('reference') ?? '').trim()
  const file = form.get('proof')

  if (!reference) throw badRequest('A payment reference is required.')
  if (!(file instanceof File)) throw badRequest('No receipt file was received.')

  const payment = await prisma.payment.findFirst({
    where: { reference, userId: user.id },
    select: { id: true, status: true, plan: { select: { name: true } } },
  })
  if (!payment) throw notFound('That payment reference does not match your account.')
  if (payment.status === 'PAID') throw badRequest('This payment has already been confirmed.')

  assertUploadSize(file.size)
  const extension = extensionForProof(file.type)
  const key = proofKey(user.id, reference, extension)
  await storage().put(key, new Uint8Array(await file.arrayBuffer()), file.type)

  await prisma.payment.update({
    where: { id: payment.id },
    data: { proofUrl: key, status: 'MANUAL_REVIEW' },
  })

  await notifyUser({
    userId: user.id,
    type: NOTIFICATION_TYPES.paymentReceived,
    title: 'Receipt received',
    body: `We have your receipt for ${payment.plan.name}. Our team verifies transfers within a few business hours and your subscription activates automatically once approved.`,
    href: '/subscription',
  })

  await writeAudit({
    actorId: user.id,
    actorRole: 'STUDENT',
    action: 'payment.proof_uploaded',
    entity: 'Payment',
    entityId: payment.id,
    metadata: { reference },
  })

  return ok({ reference, status: 'MANUAL_REVIEW' })
})
