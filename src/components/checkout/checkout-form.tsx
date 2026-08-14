'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, CreditCard, Loader2, Smartphone, Tag, Wallet } from 'lucide-react'
import type { PlanView } from '@/lib/plans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'
import { formatMoney } from '@/lib/money'
import { cn } from '@/lib/utils'

type Method = 'CARD' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH' | 'DEMO'

interface MethodOption {
  value: Method
  label: string
  description: string
  icon: React.ReactNode
}

interface Totals {
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
}

export function CheckoutForm({
  plan,
  user,
  methods,
  demoMode,
}: {
  plan: PlanView
  user: { name: string; email: string; phone: string | null }
  methods: Method[]
  demoMode: boolean
}) {
  const router = useRouter()

  const ALL_METHODS: MethodOption[] = [
    { value: 'BANK_TRANSFER', label: 'Bank transfer', description: 'Transfer and upload your receipt. Verified by our team.', icon: <Building2 className="size-5" aria-hidden /> },
    { value: 'EASYPAISA', label: 'Easypaisa', description: 'Send to our Easypaisa account and upload the confirmation.', icon: <Smartphone className="size-5" aria-hidden /> },
    { value: 'JAZZCASH', label: 'JazzCash', description: 'Send to our JazzCash account and upload the confirmation.', icon: <Wallet className="size-5" aria-hidden /> },
    { value: 'CARD', label: 'Card', description: 'Pay securely by debit or credit card.', icon: <CreditCard className="size-5" aria-hidden /> },
    { value: 'DEMO', label: 'Simulated payment', description: 'Demo mode — no money moves and the gateway confirms server-side.', icon: <CreditCard className="size-5" aria-hidden /> },
  ]
  const options = ALL_METHODS.filter((option) => methods.includes(option.value))

  const [method, setMethod] = useState<Method>(options[0]?.value ?? 'BANK_TRANSFER')
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [phone, setPhone] = useState(user.phone ?? '')
  const [couponInput, setCouponInput] = useState('')
  const [coupon, setCoupon] = useState<{ code: string; discountCents: number } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [totals, setTotals] = useState<Totals>({
    subtotalCents: plan.priceCents,
    discountCents: 0,
    taxCents: 0,
    totalCents: plan.priceCents,
  })

  async function applyCoupon() {
    const code = couponInput.trim()
    if (!code) return
    setCheckingCoupon(true)
    try {
      const response = await fetch('/api/checkout/coupon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.id, code }),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Coupon not applied', payload.error)
        return
      }
      setCoupon({ code: payload.data.code, discountCents: payload.data.discountCents })
      setTotals(payload.data.totals)
      notify.success('Coupon applied', `You saved ${formatMoney(payload.data.discountCents, plan.currency)}.`)
    } catch {
      notify.error('Coupon not applied', 'Check your connection and try again.')
    } finally {
      setCheckingCoupon(false)
    }
  }

  function removeCoupon() {
    setCoupon(null)
    setCouponInput('')
    setTotals({
      subtotalCents: plan.priceCents,
      discountCents: 0,
      taxCents: 0,
      totalCents: plan.priceCents,
    })
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          method,
          couponCode: coupon?.code,
          name,
          email,
          phone: phone || undefined,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Could not start checkout', payload.error)
        return
      }

      const { reference, redirectUrl } = payload.data
      // A redirect means a gateway owns the next step; otherwise the student
      // goes to the instructions page to complete a manual transfer.
      router.push(redirectUrl ?? `/checkout/pay/${reference}`)
    } catch {
      notify.error('Could not start checkout', 'Check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {/* Payment method */}
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold text-navy-900">Payment method</h3>
          <div className="mt-4 space-y-2.5">
            {options.map((option) => (
              <label
                key={option.value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                  method === option.value
                    ? 'border-brand-400 bg-brand-50/60'
                    : 'border-hairline hover:border-brand-200',
                )}
              >
                <input
                  type="radio"
                  name="method"
                  className="sr-only"
                  checked={method === option.value}
                  onChange={() => setMethod(option.value)}
                />
                <span
                  className={cn(
                    'grid size-10 shrink-0 place-items-center rounded-lg',
                    method === option.value ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-500',
                  )}
                >
                  {option.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-navy-900">{option.label}</span>
                  <span className="mt-0.5 block text-xs text-ink-500">{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Billing details */}
        <section className="surface-card p-5">
          <h3 className="text-sm font-semibold text-navy-900">Your details</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              autoComplete="name"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Phone (optional)"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+92 3xx xxxxxxx"
              autoComplete="tel"
              wrapperClassName="sm:col-span-2"
            />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:col-span-2">
        <div className="surface-card sticky top-24 p-5">
          <h3 className="text-sm font-semibold text-navy-900">Order summary</h3>

          <div className="mt-4 rounded-xl bg-ink-50 p-4">
            <p className="text-sm font-semibold text-navy-900">{plan.name}</p>
            {plan.tagline ? <p className="mt-0.5 text-xs text-ink-500">{plan.tagline}</p> : null}
            <p className="mt-2 text-xs text-ink-500">{plan.durationDays} days of access</p>
          </div>

          {/* Coupon */}
          <div className="mt-4">
            {coupon ? (
              <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3">
                <span className="flex items-center gap-2 text-sm font-medium text-green-800">
                  <Tag className="size-4" aria-hidden />
                  {coupon.code}
                </span>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="text-xs font-medium text-green-800 underline underline-offset-2"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                  placeholder="Coupon code"
                  className="h-10 min-w-0 flex-1 rounded-lg border border-hairline px-3 text-sm uppercase outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={applyCoupon}
                  disabled={checkingCoupon || !couponInput.trim()}
                  className="h-10"
                >
                  {checkingCoupon ? <Loader2 className="animate-spin" aria-hidden /> : null}
                  Apply
                </Button>
              </div>
            )}
          </div>

          <dl className="mt-5 space-y-2.5 border-t border-hairline pt-5 text-sm">
            <Row label="Subtotal" value={formatMoney(totals.subtotalCents, plan.currency)} />
            {totals.discountCents > 0 ? (
              <Row
                label="Discount"
                value={`− ${formatMoney(totals.discountCents, plan.currency)}`}
                tone="good"
              />
            ) : null}
            {totals.taxCents > 0 ? (
              <Row label="Tax" value={formatMoney(totals.taxCents, plan.currency)} />
            ) : null}
            <div className="flex items-baseline justify-between border-t border-hairline pt-3">
              <dt className="text-sm font-semibold text-navy-900">Total</dt>
              <dd className="text-xl font-semibold text-navy-900 tabular">
                {formatMoney(totals.totalCents, plan.currency)}
              </dd>
            </div>
          </dl>

          <Button type="submit" block size="lg" className="mt-5" loading={submitting}>
            {submitting ? 'Starting…' : 'Continue to payment'}
          </Button>

          {demoMode ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
              Demo mode is on. No real payment is taken and no card details are collected.
            </p>
          ) : null}

          <p className="mt-3 text-center text-xs text-ink-400">
            By continuing you accept our{' '}
            <Link href="/terms" className="underline underline-offset-2 hover:text-ink-600">
              Terms
            </Link>{' '}
            and{' '}
            <Link href="/refund-policy" className="underline underline-offset-2 hover:text-ink-600">
              Refund Policy
            </Link>
            .
          </p>
        </div>
      </aside>
    </form>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'good' }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-500">{label}</dt>
      <dd className={cn('tabular', tone === 'good' ? 'text-green-700' : 'text-navy-900')}>{value}</dd>
    </div>
  )
}
