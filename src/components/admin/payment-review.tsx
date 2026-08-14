'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'

/**
 * Approve or reject a manually-paid subscription.
 *
 * Approving is the moment a student gets access, so it is deliberately a
 * two-step action with the receipt visible — not a single click in a table row.
 */
export function PaymentReview({
  paymentId,
  reference,
  studentName,
  planName,
  amount,
  proofUrl,
}: {
  paymentId: string
  reference: string
  studentName: string
  planName: string
  amount: string
  proofUrl: string | null
}) {
  const router = useRouter()
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [note, setNote] = useState('')
  const [working, setWorking] = useState(false)

  async function submit() {
    if (!action) return
    setWorking(true)
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note: note.trim() || undefined }),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Could not update the payment', payload.error)
        return
      }

      notify.success(
        action === 'approve' ? 'Payment approved' : 'Payment rejected',
        action === 'approve'
          ? `${studentName} now has an active ${planName} subscription.`
          : `${studentName} has been notified.`,
      )
      setAction(null)
      setNote('')
      router.refresh()
    } catch {
      notify.error('Could not update the payment', 'Check your connection and try again.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {proofUrl ? (
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hairline px-2.5 py-1.5 text-xs font-medium text-ink-600 hover:border-brand-200 hover:text-brand-700"
          >
            <ExternalLink className="size-3.5" aria-hidden />
            Receipt
          </a>
        ) : (
          <span className="text-xs text-ink-400">No receipt</span>
        )}
        <Button size="sm" onClick={() => setAction('approve')}>
          <Check aria-hidden />
          Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setAction('reject')}>
          <X aria-hidden />
          Reject
        </Button>
      </div>

      <Modal
        open={action !== null}
        onClose={() => setAction(null)}
        title={action === 'approve' ? 'Approve this payment?' : 'Reject this payment?'}
        description={
          action === 'approve'
            ? 'This activates the subscription immediately and notifies the student.'
            : 'The student is notified and can upload a corrected receipt.'
        }
        dismissible={!working}
      >
        <dl className="space-y-2 rounded-xl bg-ink-50 p-4 text-sm">
          <Row label="Student" value={studentName} />
          <Row label="Plan" value={planName} />
          <Row label="Amount" value={amount} />
          <Row label="Reference" value={reference} mono />
        </dl>

        {action === 'approve' && !proofUrl ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            No receipt has been uploaded for this payment. Confirm the transfer arrived before approving.
          </p>
        ) : null}

        <div className="mt-4">
          <Textarea
            label={action === 'approve' ? 'Internal note (optional)' : 'Reason shown to the student'}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
            placeholder={
              action === 'approve'
                ? 'e.g. Verified against the 14 Aug bank statement.'
                : 'e.g. The amount transferred was PKR 4,000 but the plan costs PKR 5,999.'
            }
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setAction(null)} disabled={working}>
            Cancel
          </Button>
          <Button
            variant={action === 'approve' ? 'primary' : 'danger'}
            onClick={submit}
            loading={working}
          >
            {action === 'approve' ? 'Approve and activate' : 'Reject payment'}
          </Button>
        </div>
      </Modal>
    </>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-navy-900' : 'font-medium text-navy-900'}>{value}</dd>
    </div>
  )
}
