import { createHmac, randomUUID } from 'node:crypto'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

const schema = z.object({
  reference: z.string().min(1).max(60),
  outcome: z.enum(['succeeded', 'failed']),
})

/**
 * The simulated gateway.
 *
 * Rather than flipping a payment to PAID directly, this signs a payload and
 * delivers it to the real webhook endpoint over HTTP — the same route a live
 * provider calls. That means demo mode exercises signature verification,
 * event de-duplication and activation exactly as production does, so a bug in
 * that path cannot hide behind a shortcut.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  if (!env.demoMode) throw badRequest('The simulated gateway is only available in demo mode.')

  const input = await parseJson(request, schema)

  const payment = await prisma.payment.findFirst({
    where: { reference: input.reference, userId: user.id },
    select: { reference: true, totalCents: true, provider: true, status: true },
  })
  if (!payment) throw notFound('That payment reference does not match your account.')
  if (payment.provider !== 'demo') throw badRequest('That payment was not created by the simulated gateway.')

  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    event: input.outcome === 'succeeded' ? 'payment.succeeded' : 'payment.failed',
    reference: payment.reference,
    providerRef: `demo_${payment.reference}`,
    amountCents: payment.totalCents,
  })

  const secret = env.payments.webhookSecret || 'globify-demo-webhook-secret'
  const signature = createHmac('sha256', secret).update(body).digest('hex')

  const response = await fetch(`${env.appUrl}/api/webhooks/payments/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-globify-signature': signature },
    body,
  })

  const payload = (await response.json()) as { ok?: boolean; data?: { outcome?: string }; error?: string }
  if (!response.ok) {
    throw badRequest(payload.error ?? 'The simulated webhook was rejected.')
  }

  return ok({ reference: payment.reference, outcome: payload.data?.outcome ?? input.outcome })
})
