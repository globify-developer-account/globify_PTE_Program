import Link from 'next/link'
import { CalendarClock, Check, CreditCard, Sparkles } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { Meter } from '@/components/charts/score-ring'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota, FREE_LIMITS } from '@/lib/access'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { describeLimit } from '@/lib/plans'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Subscription',
  description: 'Manage your Globify PTE Premium subscription and see your usage.',
  path: '/subscription',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function SubscriptionPage() {
  const user = await requireStudent('/subscription')
  const entitlements = await getEntitlements(user.id)

  const [speaking, writing, mocks, practice, payments] = await Promise.all([
    getQuota(user.id, 'ai_speaking', entitlements),
    getQuota(user.id, 'ai_writing', entitlements),
    getQuota(user.id, 'mock_test', entitlements),
    getQuota(user.id, 'practice', entitlements),
    prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        reference: true,
        status: true,
        totalCents: true,
        currency: true,
        method: true,
        createdAt: true,
        plan: { select: { name: true } },
      },
    }),
  ])

  const limits = entitlements.limits
  const quotas = [
    { label: 'AI speaking evaluations', quota: speaking, period: 'this month' },
    { label: 'AI writing evaluations', quota: writing, period: 'this month' },
    { label: 'Mock tests', quota: mocks, period: 'this month' },
    { label: 'Practice questions', quota: practice, period: 'today' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Subscription</h2>
        <p className="mt-1.5 text-sm text-ink-500">Your plan, your usage and your payment history.</p>
      </div>

      {/* Current plan */}
      <Card>
        <CardHeader
          title={entitlements.plan?.name ?? (entitlements.tier === 'expired' ? 'Subscription expired' : 'Free plan')}
          description={
            entitlements.plan?.tagline ??
            (entitlements.tier === 'expired'
              ? 'Renew to restore unlimited practice and AI scoring.'
              : 'A generous free allowance so you can try everything before you decide.')
          }
          action={
            <Badge tone={entitlements.isPremium ? 'success' : entitlements.tier === 'expired' ? 'danger' : 'neutral'}>
              {entitlements.isPremium ? 'Active' : entitlements.tier === 'expired' ? 'Expired' : 'Free'}
            </Badge>
          }
        />
        <CardBody>
          {entitlements.isPremium && entitlements.expiresAt ? (
            <div className="mb-5 flex flex-wrap items-center gap-4 rounded-xl bg-brand-50/60 p-4">
              <CalendarClock className="size-5 shrink-0 text-brand-600" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-900">
                  {entitlements.daysRemaining} day{entitlements.daysRemaining === 1 ? '' : 's'} remaining
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  Renews or expires on {formatDate(entitlements.expiresAt)}
                </p>
              </div>
              <ButtonLink href="/pricing" size="sm" variant="secondary">
                Extend plan
              </ButtonLink>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">What you get</p>
              <ul className="mt-2.5 space-y-2">
                {(entitlements.plan?.features ?? [
                  `${describeLimit(FREE_LIMITS.practicePerDay, 'practice questions per day')}`,
                  `${describeLimit(FREE_LIMITS.aiSpeakingPerMonth, 'AI speaking evaluations per month')}`,
                  `${describeLimit(FREE_LIMITS.aiWritingPerMonth, 'AI writing evaluations per month')}`,
                  `${describeLimit(FREE_LIMITS.mockTestsPerMonth, 'mock test per month')}`,
                ]).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-ink-600">
                    <Check className="mt-0.5 size-4 shrink-0 text-green-600" aria-hidden />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Allowances</p>
              <ul className="mt-2.5 space-y-1.5 text-sm text-ink-600">
                <li>{describeLimit(limits.aiSpeakingPerMonth, 'AI speaking evaluations / month')}</li>
                <li>{describeLimit(limits.aiWritingPerMonth, 'AI writing evaluations / month')}</li>
                <li>{describeLimit(limits.mockTestsPerMonth, 'mock tests / month')}</li>
                <li>{describeLimit(limits.practicePerDay, 'practice questions / day')}</li>
                <li>{describeLimit(limits.teacherReviews, 'teacher reviews / month')}</li>
              </ul>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader title="Your usage" description="Counted on our servers — these are the numbers that gate access." />
        <CardBody className="grid gap-5 sm:grid-cols-2">
          {quotas.map(({ label, quota, period }) => (
            <div key={label}>
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-sm text-ink-600">{label}</p>
                <p className="text-sm font-medium text-navy-900 tabular">
                  {quota.unlimited ? 'Unlimited' : `${quota.used} / ${quota.limit}`}
                </p>
              </div>
              {quota.unlimited ? (
                <div className="mt-2 h-1.5 rounded-full bg-green-100" aria-hidden />
              ) : (
                <Meter value={quota.used} max={Math.max(1, quota.limit)} className="mt-2" height={6} />
              )}
              <p className="mt-1.5 text-xs text-ink-400">Resets {period === 'today' ? 'at midnight' : 'monthly'}</p>
            </div>
          ))}
        </CardBody>
      </Card>

      {!entitlements.isPremium ? <UpgradePrompt /> : null}

      {/* Payments */}
      <Card>
        <CardHeader
          title="Payment history"
          description="Every payment recorded against your account."
          action={
            <Link href="/pricing" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View plans
            </Link>
          }
        />
        {payments.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900">{payment.plan.name}</p>
                  <p className="mt-0.5 font-mono text-xs text-ink-400">{payment.reference}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatDate(payment.createdAt)} · {humanizeStatus(payment.method)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-navy-900 tabular">
                    {formatMoney(payment.totalCents, payment.currency)}
                  </span>
                  <Badge tone={statusTone(payment.status)}>{humanizeStatus(payment.status)}</Badge>
                  {payment.status === 'MANUAL_REVIEW' || payment.status === 'PENDING' ? (
                    <Link
                      href={`/checkout/pay/${payment.reference}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Complete
                    </Link>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<CreditCard aria-hidden />}
            title="No payments yet"
            description="Your invoices and payment references will appear here."
            action={{ label: 'See plans', href: '/pricing' }}
          />
        )}
      </Card>

      <p className="flex items-center justify-center gap-2 text-xs text-ink-400">
        <Sparkles className="size-3.5" aria-hidden />
        Questions about billing? Email us and quote your payment reference.
      </p>
    </div>
  )
}
