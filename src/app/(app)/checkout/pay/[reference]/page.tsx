import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Clock, Info } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, statusTone, humanizeStatus } from '@/components/ui/badge'
import { CopyField, ProofUpload } from '@/components/checkout/proof-upload'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { getSettings } from '@/lib/settings'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { formatDateTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Complete your payment',
  description: 'Transfer instructions and receipt upload for your Globify subscription.',
  path: '/checkout',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const METHOD_LABEL: Record<string, string> = {
  BANK_TRANSFER: 'Bank transfer',
  EASYPAISA: 'Easypaisa',
  JAZZCASH: 'JazzCash',
  CARD: 'Card',
  STRIPE: 'Card',
  DEMO: 'Simulated payment',
}

export default async function PayPage({ params }: { params: Promise<{ reference: string }> }) {
  const { reference } = await params
  const user = await requireStudent(`/checkout/pay/${reference}`)

  const payment = await prisma.payment.findFirst({
    where: { reference, userId: user.id },
    include: { plan: { select: { name: true, durationDays: true } } },
  })
  if (!payment) notFound()

  const settings = await getSettings()
  const bank = env.payments.bank

  const accounts =
    payment.method === 'EASYPAISA'
      ? [{ label: 'Easypaisa account', value: bank.easypaisa || 'TODO: set EASYPAISA_NUMBER' }]
      : payment.method === 'JAZZCASH'
        ? [{ label: 'JazzCash account', value: bank.jazzcash || 'TODO: set JAZZCASH_NUMBER' }]
        : [
            { label: 'Bank', value: bank.bankName || 'TODO: set BANK_NAME' },
            { label: 'Account title', value: bank.accountTitle },
            { label: 'Account number', value: bank.accountNumber || 'TODO: set BANK_ACCOUNT_NUMBER' },
            { label: 'IBAN', value: bank.iban || 'TODO: set BANK_IBAN' },
          ]

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Complete your payment</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Reference <span className="font-mono font-medium text-navy-900">{payment.reference}</span> ·{' '}
          {METHOD_LABEL[payment.method] ?? payment.method}
        </p>
      </div>

      <Card>
        <CardHeader
          title={payment.plan.name}
          description={`${payment.plan.durationDays} days of access`}
          action={<Badge tone={statusTone(payment.status)}>{humanizeStatus(payment.status)}</Badge>}
        />
        <CardBody>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Subtotal</dt>
              <dd className="tabular text-navy-900">
                {formatMoney(payment.subtotalCents, payment.currency)}
              </dd>
            </div>
            {payment.discountCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-500">Discount</dt>
                <dd className="tabular text-green-700">
                  − {formatMoney(payment.discountCents, payment.currency)}
                </dd>
              </div>
            ) : null}
            {payment.taxCents > 0 ? (
              <div className="flex justify-between">
                <dt className="text-ink-500">Tax</dt>
                <dd className="tabular text-navy-900">{formatMoney(payment.taxCents, payment.currency)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-hairline pt-2.5">
              <dt className="font-semibold text-navy-900">Amount to transfer</dt>
              <dd className="text-lg font-semibold text-navy-900 tabular">
                {formatMoney(payment.totalCents, payment.currency)}
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      {payment.status === 'PAID' ? (
        <Card>
          <CardBody className="text-center">
            <p className="text-sm font-semibold text-navy-900">This payment is confirmed.</p>
            <p className="mt-1.5 text-sm text-ink-500">
              Paid {formatDateTime(payment.paidAt)}. Your subscription is active.
            </p>
            <Link
              href="/subscription"
              className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              View your subscription
            </Link>
          </CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Transfer to this account" description={settings.bankTransferInstructions} />
            <CardBody className="space-y-2.5">
              {accounts.map((account) => (
                <CopyField key={account.label} label={account.label} value={account.value} />
              ))}
              <CopyField
                label="Amount"
                value={formatMoney(payment.totalCents, payment.currency)}
              />
              <CopyField label="Reference (include this)" value={payment.reference} />

              <p className="flex items-start gap-2 rounded-lg bg-brand-50/60 p-3 text-xs text-ink-600">
                <Info className="mt-0.5 size-3.5 shrink-0 text-brand-600" aria-hidden />
                Include the reference in the transfer note. It is how we match your payment to your account —
                without it, verification takes longer.
              </p>
            </CardBody>
          </Card>

          <ProofUpload reference={payment.reference} alreadyUploaded={Boolean(payment.proofUrl)} />

          <p className="flex items-center justify-center gap-2 text-xs text-ink-400">
            <Clock className="size-3.5" aria-hidden />
            Verification usually completes within a few business hours during {settings.timezone} working days.
          </p>
        </>
      )}
    </div>
  )
}
