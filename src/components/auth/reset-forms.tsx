'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AlertCircle, CheckCircle2, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [demoUrl, setDemoUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.get('email') }),
      })
      const body = (await response.json()) as {
        ok: boolean
        error?: string
        data?: { message: string; demoResetUrl?: string }
      }

      if (!response.ok || !body.ok) {
        setError(body.error ?? 'We could not process that request. Please try again.')
        return
      }

      setSent(true)
      setDemoUrl(body.data?.demoResetUrl ?? null)
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div>
        <div className="grid size-12 place-items-center rounded-xl bg-green-50 text-green-600">
          <CheckCircle2 className="size-6" aria-hidden />
        </div>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-navy-900">Check your inbox</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          If that email is registered, a reset link is on its way. The link expires in 60 minutes and can be used
          once.
        </p>

        {demoUrl ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Demo mode</p>
            <p className="mt-1.5 text-sm text-amber-900">
              No email provider is configured, so here is the reset link directly:
            </p>
            <Link href={demoUrl} className="mt-2 block break-all text-sm font-medium text-brand-700 underline">
              {demoUrl}
            </Link>
          </div>
        ) : null}

        <Link href="/login" className="mt-8 inline-block text-sm font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy-900">Reset your password</h1>
      <p className="mt-2 text-[15px] text-ink-600">
        Enter the email you registered with and we will send you a reset link.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Input name="email" type="email" label="Email" autoComplete="email" required leading={<Mail />} />
        <Button type="submit" loading={pending} block size="lg">
          Send reset link
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Remembered it?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const password = String(formData.get('password') ?? '')
    const confirm = String(formData.get('confirmPassword') ?? '')

    if (password !== confirm) {
      setError('The two passwords do not match.')
      setPending(false)
      return
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = (await response.json()) as { ok: boolean; error?: string }

      if (!response.ok || !body.ok) {
        setError(body.error ?? 'We could not reset your password. Request a new link.')
        return
      }

      notify.success('Password updated', 'Sign in with your new password.')
      router.push('/login')
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">This link is not valid</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          The reset link is missing its token. Request a new one and use the most recent email.
        </p>
        <Link href="/forgot-password" className="mt-6 inline-block font-medium text-brand-600 hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy-900">Choose a new password</h1>
      <p className="mt-2 text-[15px] text-ink-600">
        Setting a new password signs you out of every other device.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        <Input
          name="password"
          type="password"
          label="New password"
          autoComplete="new-password"
          required
          leading={<Lock />}
          hint="At least 8 characters, including a letter and a number."
        />
        <Input
          name="confirmPassword"
          type="password"
          label="Confirm new password"
          autoComplete="new-password"
          required
          leading={<Lock />}
        />
        <Button type="submit" loading={pending} block size="lg">
          Update password
        </Button>
      </form>
    </div>
  )
}
