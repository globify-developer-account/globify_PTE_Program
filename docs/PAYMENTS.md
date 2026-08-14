# Payments

## The rule that shapes everything here

**A payment is only ever marked paid by server-side confirmation** — a
signature-verified webhook, or an administrator reviewing a receipt. Nothing the
browser sends can put a payment into a paid state or activate a subscription.

---

## Providers

Configured with `PAYMENT_PROVIDER`. The application talks only to the
`PaymentProvider` interface in `src/lib/payments/types.ts`.

| Provider | Methods | Confirmation |
|---|---|---|
| `manual` | Bank transfer, Easypaisa, JazzCash | Administrator approves the receipt |
| `stripe` | Card | Signed webhook |
| `demo` | Simulated | Signed webhook, from a simulated gateway |

`manual` is always available regardless of `PAYMENT_PROVIDER`. It is the
dominant way students in Pakistan actually pay, and it is a first-class flow
here, not a fallback.

---

## The manual flow

1. Student picks bank transfer, Easypaisa or JazzCash at checkout.
2. A `Payment` row is created with status `MANUAL_REVIEW`. **Nothing is
   activated.**
3. They see the account details, the exact amount, and a payment reference to
   include in the transfer note — that reference is how you match the money to
   the account.
4. They upload a receipt. That moves nothing; it only attaches the file.
5. **Admin → Payments** → *Awaiting review*. You see the receipt through a
   short-lived signed URL, and approve or reject with a note.
6. Approval calls the same `activateSubscription()` the webhook path uses.

Rejecting notifies the student with your reason and leaves them able to upload a
corrected receipt.

---

## The card flow

1. `createCheckout()` recomputes every amount server-side from the plan row.
   Nothing about money that the browser sends is used.
2. The provider returns a redirect URL; the student pays on the gateway.
3. The gateway calls `POST /api/webhooks/payments/:provider`.
4. The signature is verified **before the body is trusted for anything**. An
   unverified webhook is an anonymous internet request; a bad signature is a
   400, not a 500, so the provider does not retry it.
5. The event is recorded against a unique `(provider, eventId)` key.
6. `activateSubscription()` runs.

Stripe deliveries older than five minutes are rejected even with a valid
signature, so a captured request cannot be replayed later.

---

## Idempotency — two independent layers

A webhook must not activate a subscription twice. Two things prevent it:

**1. Event-level.** Every delivery is inserted into `WebhookEvent` with a unique
`(provider, eventId)` constraint. A duplicate delivery hits that constraint and
returns `duplicate_event` without touching anything.

**2. Payment-level.** `activateSubscription()` re-reads the payment *inside* the
transaction and stops if it is already `PAID`.

The second layer is what matters when a provider retries with a *fresh* event
id — the first layer would let that through. Verified behaviour:

| Delivery | Result |
|---|---|
| Forged signature | `400` rejected |
| Valid event | `activated` |
| Same event replayed | `duplicate_event` |
| **New event id, same payment** | `already_paid` — no second activation |

Renewals extend rather than replace: a subscription bought while one is still
active adds its days to the existing expiry, so nothing a student paid for is
thrown away.

---

## Coupons

Validated server-side at checkout against active status, date window, usage
limit, per-user limit, applicable plans and minimum subtotal. Percentage
discounts respect `maxDiscountCents`.

`POST /api/checkout/coupon` exists only to *preview* a discount in the UI. The
authoritative calculation runs again inside `createCheckout()` — the preview
endpoint never determines what a student is charged. It is rate-limited because
coupon codes are guessable.

---

## Money

Every amount is an integer in minor units — paisa for PKR, cents for USD. No
float touches a price and no `Decimal` crosses the server/client boundary.
`computeTotals()` applies the discount first, then tax on the discounted
subtotal, and is unit-tested for internal consistency.

---

## Testing without a gateway

With `DEMO_MODE=true`, checkout offers **Simulated payment**. It is a real page
in this app that signs a payload and delivers it to the actual webhook endpoint
over HTTP — the same route a live provider calls.

That means demo mode exercises signature verification, event deduplication and
activation exactly as production does. A bug in that path cannot hide behind a
shortcut.

The simulated gateway is refused outright when `DEMO_MODE` is false.

---

## Refunds

`refundPayment()` marks the payment refunded and cancels the linked
subscription. It is not exposed in the admin UI — refunds are processed in your
gateway or bank, and this is the function to call from a script once you have.
Doing it through the UI would create a way to cancel access without the money
having actually moved.

---

## What to check before taking real money

See [`GO-LIVE.md`](./GO-LIVE.md). The two that bite hardest:

- **Bank details are real.** They are shown verbatim to students. A leftover
  `TODO` means someone transfers money nowhere.
- **One real end-to-end payment**, approved, with the subscription confirmed
  active — using the method you will actually offer.
