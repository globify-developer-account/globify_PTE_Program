'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Stand-in for a hosted payment page.
 *
 * Deliberately looks like a test tool rather than a real gateway — nobody
 * should be able to mistake this screen for one that takes money.
 */
export function SimulateGateway({
  reference,
  planName,
  amount,
}: {
  reference: string
  planName: string
  amount: string
}) {
  const router = useRouter()
  const [pending, setPending] = useState<'succeeded' | 'failed' | null>(null)

  async function send(outcome: 'succeeded' | 'failed') {
    setPending(outcome)
    try {
      const response = await fetch('/api/checkout/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference, outcome }),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Simulation failed', payload.error)
        return
      }

      if (outcome === 'succeeded') {
        router.push(`/checkout/success?reference=${reference}`)
      } else {
        notify.warning('Payment declined', 'The simulated gateway rejected this payment.')
        router.push('/pricing')
      }
      router.refresh()
    } catch {
      notify.error('Simulation failed', 'Check your connection and try again.')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="surface-card overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-hairline bg-amber-50 px-5 py-3">
        <FlaskConical className="size-4 text-amber-700" aria-hidden />
        <p className="text-sm font-semibold text-amber-900">Simulated gateway — no money moves</p>
      </div>

      <div className="p-6">
        <p className="text-sm text-ink-500">You are paying</p>
        <p className="mt-1 text-[32px] font-semibold leading-none text-navy-900 tabular">{amount}</p>
        <p className="mt-2 text-sm text-ink-600">{planName}</p>
        <p className="mt-1 font-mono text-xs text-ink-400">{reference}</p>

        <div className="mt-6 space-y-2.5">
          <Button block size="lg" loading={pending === 'succeeded'} onClick={() => send('succeeded')}>
            Approve payment
          </Button>
          <Button
            block
            variant="secondary"
            loading={pending === 'failed'}
            onClick={() => send('failed')}
          >
            Decline payment
          </Button>
        </div>

        <p className="mt-5 flex items-start gap-2 text-xs text-ink-500">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Either choice sends a signed webhook to this application, exactly as a live provider would. Your
          subscription is activated by that webhook, never by this page.
        </p>
      </div>
    </div>
  )
}
