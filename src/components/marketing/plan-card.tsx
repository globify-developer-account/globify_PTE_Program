import { Check } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { formatMoney } from '@/lib/money'
import { describeLimit, planPeriodLabel, type PlanView } from '@/lib/plans'
import { cn } from '@/lib/utils'

export function PlanCard({ plan, ctaLabel }: { plan: PlanView; ctaLabel?: string }) {
  const savings =
    plan.compareAtCents && plan.compareAtCents > plan.priceCents
      ? Math.round(((plan.compareAtCents - plan.priceCents) / plan.compareAtCents) * 100)
      : null

  const limitLines = [
    describeLimit(plan.limits.aiSpeakingPerMonth, 'AI speaking evaluations / month'),
    describeLimit(plan.limits.aiWritingPerMonth, 'AI writing evaluations / month'),
    describeLimit(plan.limits.mockTestsPerMonth, 'mock tests / month'),
    describeLimit(plan.limits.practicePerDay, 'practice questions / day'),
  ]

  return (
    <div
      className={cn(
        'relative flex h-full flex-col rounded-2xl border bg-white p-7 transition-shadow',
        plan.isPopular
          ? 'border-brand-300 shadow-ring ring-1 ring-brand-100'
          : 'border-hairline shadow-soft hover:shadow-lift',
      )}
    >
      {plan.isPopular || plan.badge ? (
        <span className="absolute -top-3 left-7 rounded-full bg-brand-600 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
          {plan.badge ?? 'Most popular'}
        </span>
      ) : null}

      <h3 className="text-lg font-semibold text-navy-900">{plan.name}</h3>
      {plan.tagline ? <p className="mt-1 text-sm text-ink-500">{plan.tagline}</p> : null}

      <div className="mt-6 flex items-end gap-2">
        <span className="text-[38px] font-bold leading-none text-navy-900">
          {formatMoney(plan.priceCents, plan.currency)}
        </span>
        <span className="pb-1 text-sm text-ink-500">/ {planPeriodLabel(plan.durationDays)}</span>
      </div>

      {plan.compareAtCents && savings ? (
        <p className="mt-2 text-sm text-ink-500">
          <span className="line-through">{formatMoney(plan.compareAtCents, plan.currency)}</span>
          <span className="ml-2 font-medium text-green-700">Save {savings}%</span>
        </p>
      ) : null}

      <ButtonLink
        href={`/checkout?plan=${plan.code}`}
        variant={plan.isPopular ? 'primary' : 'secondary'}
        block
        className="mt-6"
      >
        {ctaLabel ?? `Choose ${plan.name}`}
      </ButtonLink>

      <ul className="mt-7 space-y-3 border-t border-hairline pt-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5 text-[15px] text-ink-700">
            <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
            {feature}
          </li>
        ))}
      </ul>

      <ul className="mt-6 space-y-1.5 border-t border-hairline pt-5 text-xs text-ink-500">
        {limitLines.map((line) => (
          <li key={line}>{line}</li>
        ))}
        {plan.limits.teacherReviews !== 0 ? (
          <li>{describeLimit(plan.limits.teacherReviews, 'teacher reviews / month')}</li>
        ) : null}
      </ul>
    </div>
  )
}
