import { notFound, redirect } from 'next/navigation'
import { SimulateGateway } from '@/components/checkout/simulate-gateway'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { env } from '@/lib/env'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Simulated payment',
  description: 'Demo-mode payment gateway.',
  path: '/checkout',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function SimulatePage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string }>
}) {
  if (!env.demoMode) redirect('/pricing')

  const { reference } = await searchParams
  if (!reference) notFound()

  const user = await requireStudent(`/checkout/simulate?reference=${reference}`)
  const payment = await prisma.payment.findFirst({
    where: { reference, userId: user.id },
    select: {
      reference: true,
      totalCents: true,
      currency: true,
      status: true,
      plan: { select: { name: true } },
    },
  })
  if (!payment) notFound()

  if (payment.status === 'PAID') redirect(`/checkout/success?reference=${payment.reference}`)

  return (
    <div className="mx-auto max-w-md">
      <SimulateGateway
        reference={payment.reference}
        planName={payment.plan.name}
        amount={formatMoney(payment.totalCents, payment.currency)}
      />
    </div>
  )
}
