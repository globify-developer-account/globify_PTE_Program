import type { PaymentMethodKind } from '@prisma/client'

/**
 * Payment provider contract.
 *
 * The application never talks to a payment API directly. It asks a provider to
 * create a charge and then waits for that provider's webhook to confirm it —
 * a status reported by the browser is never sufficient to activate anything.
 */

export interface CreateChargeInput {
  reference: string
  amountCents: number
  currency: string
  description: string
  customer: { name: string; email: string; phone?: string | null }
  method: PaymentMethodKind
  returnUrl: string
  cancelUrl: string
  metadata: Record<string, string>
}

export interface CreateChargeResult {
  /** The provider's own id for this charge, stored as Payment.providerRef. */
  providerRef: string
  /**
   * Where to send the customer next. Null for flows that complete without a
   * redirect — manual bank transfer, for example.
   */
  redirectUrl: string | null
  /** PENDING for redirect flows, MANUAL_REVIEW when a human must verify. */
  initialStatus: 'PENDING' | 'PROCESSING' | 'MANUAL_REVIEW' | 'PAID'
  instructions?: string
}

export type WebhookVerdict =
  | { kind: 'ignore'; reason: string }
  | { kind: 'paid'; reference: string; providerRef: string; amountCents?: number }
  | { kind: 'failed'; reference: string; providerRef: string; reason: string }
  | { kind: 'refunded'; reference: string; providerRef: string }

export interface WebhookInput {
  rawBody: string
  headers: Headers
}

export interface PaymentProvider {
  readonly name: string
  readonly available: boolean
  readonly methods: PaymentMethodKind[]
  createCharge(input: CreateChargeInput): Promise<CreateChargeResult>
  /**
   * Verifies the signature and returns what happened. Must throw on an invalid
   * signature — an unverified webhook is an unauthenticated request.
   */
  parseWebhook(input: WebhookInput): Promise<WebhookVerdict>
  /** Unique per-event id used to make webhook handling idempotent. */
  eventId(input: WebhookInput): string | null
}

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly provider: string,
  ) {
    super(message)
    this.name = 'PaymentError'
  }
}
