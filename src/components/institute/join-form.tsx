'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Links a learner to their coaching centre with the centre's join code.
 *
 * The error the server returns is shown verbatim rather than replaced with a
 * generic message — "that institute is full" and "no institute uses that code"
 * lead to completely different next steps for the student.
 */
export function JoinInstituteForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = code.trim()
    if (trimmed.length === 0) return

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch('/api/institute/join', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ joinCode: trimmed }),
      })
      const payload = (await response.json()) as
        | { ok: true; data: { name: string } }
        | { ok: false; error: string }

      if (!payload.ok) {
        setError(payload.error)
        return
      }

      notify.success('Institute linked', `You are now studying with ${payload.data.name}.`)
      router.refresh()
    } catch {
      setError('We could not reach the server. Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-start gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor="join-code" className="sr-only">
          Institute join code
        </label>
        <input
          id="join-code"
          name="joinCode"
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder="ABC123"
          autoComplete="off"
          spellCheck={false}
          maxLength={16}
          aria-invalid={error !== null}
          aria-describedby={error ? 'join-code-error' : undefined}
          className="h-11 w-full rounded-lg border border-hairline bg-white px-3.5 font-mono text-sm uppercase tracking-widest text-navy-900 outline-none transition-colors placeholder:font-sans placeholder:tracking-normal placeholder:text-ink-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
        />
        {error ? (
          <p id="join-code-error" role="alert" className="mt-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
      </div>
      <Button type="submit" disabled={submitting || code.trim().length === 0}>
        {submitting ? 'Joining…' : 'Join'}
      </Button>
    </form>
  )
}
