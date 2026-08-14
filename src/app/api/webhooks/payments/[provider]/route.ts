import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'
import { fail, ok } from '@/lib/http'
import { verifyWebhook } from '@/lib/payments/providers'
import { activateSubscription, failPayment, refundPayment } from '@/lib/payments/checkout'
import { PaymentError } from '@/lib/payments/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Payment webhook receiver.
 *
 * Three properties matter here, in this order:
 *
 *   1. **Authenticity.** The signature is verified before the body is trusted
 *      for anything. An unverified webhook is an anonymous internet request.
 *   2. **Idempotency.** Every event is recorded against a unique
 *      `(provider, eventId)` key. A replayed delivery hits that constraint and
 *      returns without touching the subscription — a webhook must never
 *      activate a subscription twice.
 *   3. **Acknowledgement.** Once an event is safely stored, we return 200 even
 *      if downstream work failed, so the provider stops retrying and the error
 *      surfaces in our logs rather than as an endless redelivery loop.
 */
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params

  // The raw body is required — re-serialising parsed JSON changes the bytes and
  // invalidates the signature.
  const rawBody = await request.text()

  try {
    const { verdict, eventId } = await verifyWebhook(provider, { rawBody, headers: request.headers })

    if (verdict.kind === 'ignore') {
      return ok({ received: true, handled: false, reason: verdict.reason })
    }

    // Providers that do not supply an event id get a content hash instead, so
    // an identical redelivery is still deduplicated.
    const key = eventId ?? createHash('sha256').update(rawBody).digest('hex')

    try {
      await prisma.webhookEvent.create({
        data: {
          provider,
          eventId: key,
          eventType: verdict.kind,
          payload: safeJson(rawBody),
        },
      })
    } catch {
      // Unique violation on (provider, eventId): already seen this delivery.
      return ok({ received: true, handled: false, reason: 'duplicate_event' })
    }

    let outcome: string
    switch (verdict.kind) {
      case 'paid': {
        const result = await activateSubscription(verdict.reference, { providerRef: verdict.providerRef })
        outcome = result.reason
        break
      }
      case 'failed':
        await failPayment(verdict.reference, verdict.reason)
        outcome = 'failed'
        break
      case 'refunded':
        await refundPayment(verdict.reference)
        outcome = 'refunded'
        break
    }

    await prisma.webhookEvent.updateMany({
      where: { provider, eventId: key },
      data: { processedAt: new Date() },
    })

    return ok({ received: true, handled: true, outcome })
  } catch (error) {
    if (error instanceof PaymentError) {
      // A bad signature is a 400, not a 500 — the provider should not retry it.
      console.error('[webhook] signature verification failed:', error.message)
      return Response.json({ ok: false, error: 'Invalid webhook signature.' }, { status: 400 })
    }
    console.error('[webhook] processing failed:', error)
    return fail(error)
  }
}

function safeJson(raw: string): object {
  try {
    const parsed: unknown = JSON.parse(raw)
    return typeof parsed === 'object' && parsed !== null ? (parsed as object) : { raw }
  } catch {
    return { raw: raw.slice(0, 4000) }
  }
}
