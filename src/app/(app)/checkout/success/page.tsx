import { notFound } from 'next/navigation'
import { CheckCircle2, Clock, Sparkles } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Payment received',
  description: 'Your Globify PTE Premium subscription.',
  path: '/checkout',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>
}) {
  const { reference } = await searchParams
  if (!reference) notFound()

  const user = await requireStudent(`/checkout/success?reference=${reference}`)
  const payment = await prisma.payment.findFirst({
    where: { reference, userId: user.id },
    include: {
      plan: { select: { name: true, durationDays: true } },
      subscription: { select: { expiresAt: true } },
    },
  })
  if (!payment) notFound()

  const confirmed = payment.status === 'PAID'

  return (
    <div className="mx-auto max-w-lg text-center">
      <span
        className={`mx-auto grid size-16 place-items-center rounded-2xl ${
          confirmed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
        }`}
      >
        {confirmed ? <CheckCircle2 className="size-8" aria-hidden /> : <Clock className="size-8" aria-hidden />}
      </span>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight text-navy-900">
        {confirmed ? 'You are all set' : 'Payment received — awaiting confirmation'}
      </h2>
      <p className="mt-2 text-sm text-ink-500">
        {confirmed
          ? `${payment.plan.name} is active${
              payment.subscription?.expiresAt ? ` until ${formatDate(payment.subscription.expiresAt)}` : ''
            }. Every premium feature is unlocked.`
          : 'We have your payment details. Your subscription activates automatically as soon as it is confirmed — usually within a few business hours.'}
      </p>

      <Card className="mt-6 text-left">
        <CardBody className="space-y-2.5 text-sm">
          <Row label="Plan" value={payment.plan.name} />
          <Row label="Amount" value={formatMoney(payment.totalCents, payment.currency)} />
          <Row label="Reference" value={payment.reference} mono />
          <Row label="Duration" value={`${payment.plan.durationDays} days`} />
        </CardBody>
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/practice">
          <Sparkles aria-hidden />
          Start practising
        </ButtonLink>
        <ButtonLink href="/subscription" variant="secondary">
          View subscription
        </ButtonLink>
      </div>

      <p className="mt-6 text-xs text-ink-400">
        A receipt has been recorded against your account. Quote the reference above if you contact support.
      </p>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-500">{label}</span>
      <span className={`text-navy-900 ${mono ? 'font-mono text-xs' : 'font-medium'}`}>{value}</span>
    </div>
  )
}
