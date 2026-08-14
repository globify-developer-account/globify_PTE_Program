'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Copy, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/** Copies a bank account number or wallet number in one tap. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notify.info('Copy it manually', value)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-white px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-navy-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded-lg p-2 text-ink-400 transition-colors hover:bg-ink-100 hover:text-brand-600"
        aria-label={`Copy ${label}`}
      >
        {copied ? <CheckCircle2 className="size-4 text-green-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      </button>
    </div>
  )
}

export function ProofUpload({ reference, alreadyUploaded }: { reference: string; alreadyUploaded: boolean }) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(alreadyUploaded)

  async function upload() {
    if (!file) return
    setUploading(true)
    try {
      const form = new FormData()
      form.append('reference', reference)
      form.append('proof', file)

      const response = await fetch('/api/checkout/proof', { method: 'POST', body: form })
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Upload failed', payload.error)
        return
      }

      setDone(true)
      notify.success('Receipt received', 'Our team will verify it shortly.')
      router.refresh()
    } catch {
      notify.error('Upload failed', 'Check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" aria-hidden />
        <div>
          <p className="text-sm font-semibold text-green-900">Receipt uploaded</p>
          <p className="mt-1 text-sm text-green-800">
            Your payment is with our team for verification. Your subscription activates automatically once it is
            approved — usually within a few business hours. We will notify you here and by email.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-hairline p-5">
      <h3 className="text-sm font-semibold text-navy-900">Upload your receipt</h3>
      <p className="mt-1 text-sm text-ink-500">
        A screenshot or PDF of the transfer confirmation. Make sure the amount and reference are readable.
      </p>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-ink-200 p-8 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/40">
        <Upload className="size-6 text-ink-400" aria-hidden />
        <span className="mt-2 text-sm font-medium text-navy-900">
          {file ? file.name : 'Choose a file'}
        </span>
        <span className="mt-1 text-xs text-ink-500">PNG, JPG, WEBP or PDF · up to 15 MB</span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="sr-only"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
      </label>

      <Button onClick={upload} disabled={!file} loading={uploading} block className="mt-4">
        {uploading ? 'Uploading…' : 'Submit receipt'}
      </Button>
    </div>
  )
}
