import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { CheckoutForm } from '@/components/checkout/checkout-form'
import { requireStudent } from '@/lib/auth/guards'
import { getActivePlans, getPlanByCode } from '@/lib/plans'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Checkout',
  description: 'Complete your Globify PTE Premium subscription.',
  path: '/checkout',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

type Method = 'CARD' | 'BANK_TRANSFER' | 'EASYPAISA' | 'JAZZCASH' | 'DEMO'

/**
 * Which methods to offer. Manual transfer is always available because it is the
 * dominant way our students actually pay; a card gateway only appears when one
 * is genuinely configured.
 */
function availableMethods(): Method[] {
  const methods: Method[] = ['BANK_TRANSFER', 'EASYPAISA', 'JAZZCASH']
  if (env.demoMode) return ['DEMO', ...methods]
  if (env.payments.apiKey) methods.unshift('CARD')
  return methods
}

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>
}) {
  const { plan: planCode } = await searchParams
  const user = await requireStudent('/checkout')

  const plans = await getActivePlans()
  if (plans.length === 0) redirect('/pricing')

  const plan = planCode ? await getPlanByCode(planCode) : null
  const selected = plan ?? plans.find((item) => item.isPopular) ?? plans[0]!

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All plans
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-navy-900">Complete your subscription</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          You are subscribing to {selected.name}. Change plan on the{' '}
          <Link href="/pricing" className="font-medium text-brand-600 hover:text-brand-700">
            pricing page
          </Link>
          .
        </p>
      </div>

      <CheckoutForm
        plan={selected}
        user={{ name: user.name, email: user.email, phone: user.profile?.phone ?? null }}
        methods={availableMethods()}
        demoMode={env.demoMode}
      />

      <p className="flex items-center justify-center gap-2 text-xs text-ink-400">
        <ShieldCheck className="size-4" aria-hidden />
        Payments are confirmed on our servers. We never store card numbers.
      </p>
    </div>
  )
}
