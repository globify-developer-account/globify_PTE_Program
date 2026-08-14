import { ShieldCheck } from 'lucide-react'
import { EmptyState } from '@/components/ui/states'
import { PlanCard } from '@/components/marketing/plan-card'
import { CtaBand, SectionHeading } from '@/components/marketing/sections'
import { JsonLd } from '@/components/seo/json-ld'
import { faqJsonLd, pageMetadata } from '@/lib/metadata'
import { getActivePlans } from '@/lib/plans'
import { AI_DISCLAIMER } from '@/lib/site'

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'Pricing',
  description:
    'Globify PTE Premium subscription plans. Unlimited PTE practice, full mock tests, AI speaking and writing evaluation, and detailed performance analytics.',
  path: '/pricing',
})

const PRICING_FAQ = [
  {
    question: 'What happens when my subscription expires?',
    answer:
      'Your account stays open and your entire practice history is preserved. Premium features are locked until you renew, and free-tier limits apply again.',
  },
  {
    question: 'Can I pay by bank transfer, Easypaisa or JazzCash?',
    answer:
      'Yes. Choose manual transfer at checkout, send the amount to the account shown, then upload your receipt. Our team verifies it and your subscription activates automatically on approval.',
  },
  {
    question: 'Are the AI scores the same as my real PTE result?',
    answer:
      'No. Globify produces an AI estimated score for practice purposes. It is designed to be a realistic and useful guide, but it is not an official Pearson PTE score.',
  },
  {
    question: 'Can I upgrade part-way through a plan?',
    answer:
      'Yes. Upgrading starts a new subscription period on the higher plan immediately, and the remaining days on your current plan are added to it.',
  },
]

export default async function PricingPage() {
  const plans = await getActivePlans()

  return (
    <>
      <JsonLd data={faqJsonLd(PRICING_FAQ)} />

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Pricing"
          title="Choose the plan that matches your test date"
          description="Every plan includes the full question bank and the same AI scoring engine. The difference is how much you can use it and how deep the analysis goes."
        />

        {plans.length === 0 ? (
          <div className="mt-12 surface-card">
            <EmptyState
              title="Plans are being updated"
              description="Our subscription plans are not available right now. Please check back shortly or contact our team and we will help you directly."
              action={{ label: 'Contact us', href: '/contact' }}
            />
          </div>
        ) : (
          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-500">
          <span className="inline-flex items-center gap-2">
            <ShieldCheck className="size-4 text-brand-600" aria-hidden />
            Secure checkout
          </span>
          <span>Card, bank transfer, Easypaisa and JazzCash</span>
          <span>Cancel anytime — no auto-renewal without your consent</span>
        </div>
      </section>

      <section className="container-page pb-16 sm:pb-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">Pricing questions</h2>
          <dl className="mt-8 divide-y divide-hairline border-y border-hairline">
            {PRICING_FAQ.map((item) => (
              <div key={item.question} className="py-5">
                <dt className="text-[15px] font-semibold text-navy-900">{item.question}</dt>
                <dd className="mt-2 text-[15px] leading-relaxed text-ink-600">{item.answer}</dd>
              </div>
            ))}
          </dl>

          <p className="mt-8 rounded-xl border border-amber-100 bg-amber-50/70 p-4 text-sm leading-relaxed text-amber-900">
            {AI_DISCLAIMER}
          </p>
        </div>
      </section>

      <CtaBand
        title="Not sure which plan is right?"
        description="Create a free account first. You can take a mock test, get AI feedback on five speaking tasks, and decide once you have seen your baseline."
      />
    </>
  )
}
