import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../env'
import { PaymentError, type PaymentProvider, type WebhookInput, type WebhookVerdict } from './types'

/**
 * Concrete payment providers.
 *
 * `manual` covers bank transfer, Easypaisa and JazzCash: the student pays out
 * of band and uploads a receipt, and an administrator approves it. That is the
 * dominant flow in Pakistan and it is a first-class provider here, not a
 * fallback.
 *
 * `stripe` is a real integration behind a configured key. `demo` simulates a
 * gateway so the whole checkout can be exercised without credentials.
 */

function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

// --- manual (bank transfer / Easypaisa / JazzCash) ---------------------------

export const manualProvider: PaymentProvider = {
  name: 'manual',
  available: true,
  methods: ['BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH'],

  async createCharge(input) {
    return {
      providerRef: input.reference,
      redirectUrl: null,
      // Nothing is activated until an administrator has seen the receipt.
      initialStatus: 'MANUAL_REVIEW',
      instructions:
        'Transfer the exact amount shown, then upload a screenshot of the confirmation. Your subscription activates as soon as our team verifies it.',
    }
  },

  async parseWebhook() {
    // Manual payments are confirmed by an admin in the dashboard, not by a
    // webhook. Anything arriving here is not something we should act on.
    return { kind: 'ignore', reason: 'Manual payments are confirmed by an administrator.' }
  },

  eventId() {
    return null
  },
}

// --- demo ---------------------------------------------------------------------

export const demoProvider: PaymentProvider = {
  name: 'demo',
  available: true,
  methods: ['DEMO', 'CARD', 'BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH'],

  async createCharge(input) {
    return {
      providerRef: `demo_${input.reference}`,
      // The simulated gateway is a real page in this app that posts back to the
      // same webhook endpoint a live provider would call.
      redirectUrl: `/checkout/simulate?reference=${encodeURIComponent(input.reference)}`,
      initialStatus: 'PENDING',
      instructions: 'Demo mode: no money moves. The simulated gateway confirms the payment server-side.',
    }
  },

  async parseWebhook({ rawBody, headers }) {
    const signature = headers.get('x-globify-signature') ?? ''
    const secret = env.payments.webhookSecret || 'globify-demo-webhook-secret'
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
    if (!constantTimeEquals(signature, expected)) {
      throw new PaymentError('Invalid webhook signature.', 'demo')
    }

    const payload = JSON.parse(rawBody) as {
      event?: string
      reference?: string
      providerRef?: string
      amountCents?: number
    }
    if (!payload.reference) return { kind: 'ignore', reason: 'No reference in payload.' }

    switch (payload.event) {
      case 'payment.succeeded':
        return {
          kind: 'paid',
          reference: payload.reference,
          providerRef: payload.providerRef ?? `demo_${payload.reference}`,
          amountCents: payload.amountCents,
        }
      case 'payment.failed':
        return {
          kind: 'failed',
          reference: payload.reference,
          providerRef: payload.providerRef ?? `demo_${payload.reference}`,
          reason: 'The simulated gateway declined this payment.',
        }
      default:
        return { kind: 'ignore', reason: `Unhandled event "${payload.event}".` }
    }
  },

  eventId({ rawBody }) {
    try {
      const payload = JSON.parse(rawBody) as { id?: string }
      return payload.id ?? null
    } catch {
      return null
    }
  },
}

// --- stripe -------------------------------------------------------------------

/**
 * Stripe integration over the REST API. The SDK is not a dependency here — one
 * form-encoded POST and one signature check is the entire surface we use, and
 * adding a package for that is not worth the install size.
 */
export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  get available() {
    return Boolean(env.payments.apiKey)
  },
  methods: ['CARD', 'STRIPE'],

  async createCharge(input) {
    if (!env.payments.apiKey) throw new PaymentError('PAYMENT_API_KEY is not configured.', 'stripe')

    const body = new URLSearchParams({
      mode: 'payment',
      'payment_method_types[0]': 'card',
      'line_items[0][price_data][currency]': input.currency.toLowerCase(),
      'line_items[0][price_data][product_data][name]': input.description,
      'line_items[0][price_data][unit_amount]': String(input.amountCents),
      'line_items[0][quantity]': '1',
      success_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      client_reference_id: input.reference,
      customer_email: input.customer.email,
    })
    for (const [key, value] of Object.entries(input.metadata)) {
      body.append(`metadata[${key}]`, value)
    }
    // Carried through so the webhook can find the payment even if Stripe omits
    // client_reference_id on some event shapes.
    body.append('metadata[reference]', input.reference)

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.payments.apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    const payload = (await response.json()) as { id?: string; url?: string; error?: { message?: string } }
    if (!response.ok || !payload.id || !payload.url) {
      throw new PaymentError(payload.error?.message ?? 'Stripe rejected the checkout session.', 'stripe')
    }

    return { providerRef: payload.id, redirectUrl: payload.url, initialStatus: 'PENDING' }
  },

  async parseWebhook({ rawBody, headers }) {
    const secret = env.payments.webhookSecret
    if (!secret) throw new PaymentError('PAYMENT_WEBHOOK_SECRET is not configured.', 'stripe')

    const header = headers.get('stripe-signature') ?? ''
    const parts = Object.fromEntries(
      header.split(',').map((part) => {
        const [key, value] = part.split('=')
        return [key?.trim() ?? '', value?.trim() ?? '']
      }),
    )
    const timestamp = parts.t
    const signature = parts.v1
    if (!timestamp || !signature) throw new PaymentError('Malformed Stripe signature header.', 'stripe')

    // Reject replays of an old, validly-signed event.
    const ageSeconds = Math.abs(Date.now() / 1000 - Number.parseInt(timestamp, 10))
    if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
      throw new PaymentError('Stripe webhook timestamp is outside the tolerance window.', 'stripe')
    }

    const expected = createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')
    if (!constantTimeEquals(signature, expected)) {
      throw new PaymentError('Invalid Stripe webhook signature.', 'stripe')
    }

    const event = JSON.parse(rawBody) as {
      type?: string
      data?: {
        object?: {
          id?: string
          client_reference_id?: string
          amount_total?: number
          metadata?: Record<string, string>
        }
      }
    }
    const object = event.data?.object
    const reference = object?.client_reference_id ?? object?.metadata?.reference
    if (!reference || !object?.id) return { kind: 'ignore', reason: 'No client reference on the event.' }

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded':
        return { kind: 'paid', reference, providerRef: object.id, amountCents: object.amount_total }
      case 'checkout.session.async_payment_failed':
      case 'checkout.session.expired':
        return { kind: 'failed', reference, providerRef: object.id, reason: 'Stripe reported the session did not complete.' }
      case 'charge.refunded':
        return { kind: 'refunded', reference, providerRef: object.id }
      default:
        return { kind: 'ignore', reason: `Unhandled Stripe event "${event.type}".` }
    }
  },

  eventId({ rawBody }) {
    try {
      const event = JSON.parse(rawBody) as { id?: string }
      return event.id ?? null
    } catch {
      return null
    }
  },
}

// --- registry -----------------------------------------------------------------

const PROVIDERS: Record<string, PaymentProvider> = {
  demo: demoProvider,
  manual: manualProvider,
  stripe: stripeProvider,
}

/** The gateway used for card-style checkout. Manual is always also available. */
export function paymentProvider(name?: string): PaymentProvider {
  const requested = (name ?? env.payments.provider).toLowerCase()
  const provider = PROVIDERS[requested]
  if (provider?.available) return provider
  if (requested !== 'manual' && env.demoMode) return demoProvider
  return manualProvider
}

export function providerForWebhook(name: string): PaymentProvider | null {
  const provider = PROVIDERS[name.toLowerCase()]
  return provider?.available ? provider : null
}

export function availableProviders(): PaymentProvider[] {
  return Object.values(PROVIDERS).filter((provider) => provider.available)
}

export async function verifyWebhook(
  providerName: string,
  input: WebhookInput,
): Promise<{ verdict: WebhookVerdict; eventId: string | null }> {
  const provider = providerForWebhook(providerName)
  if (!provider) throw new PaymentError(`Unknown payment provider "${providerName}".`, providerName)
  return { verdict: await provider.parseWebhook(input), eventId: provider.eventId(input) }
}
