'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AlertCircle, Lock, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import { AuthDivider, GoogleButton } from './google-button'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'

const ERROR_MESSAGES: Record<string, string> = {
  google_unavailable: 'Google sign-in is not configured on this deployment. Use your email and password.',
  google_cancelled: 'Google sign-in was cancelled.',
  google_state_mismatch: 'That sign-in link expired. Please try again.',
  google_failed: 'We could not complete Google sign-in. Please try again.',
  account_suspended: 'This account is suspended. Please contact support.',
  registration_disabled: 'New registrations are paused right now.',
  session_expired: 'Your session expired. Please sign in again.',
}

export function LoginForm({
  googleEnabled = false,
  hideSignUp = false,
}: {
  googleEnabled?: boolean
  /** The admin sign-in page reuses this form but must not advertise sign-up. */
  hideSignUp?: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? undefined
  const initialError = searchParams.get('error')

  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(
    initialError ? (ERROR_MESSAGES[initialError] ?? 'Sign-in failed. Please try again.') : null,
  )

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setError(null)

    const formData = new FormData(event.currentTarget)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
          next: nextPath,
        }),
      })
      const body = (await response.json()) as {
        ok: boolean
        error?: string
        data?: { redirectTo: string; role: string }
      }

      if (!response.ok || !body.ok || !body.data) {
        setError(body.error ?? 'Sign-in failed. Please try again.')
        return
      }

      track(ANALYTICS_EVENTS.login, { method: 'password' })
      router.push(body.data.redirectTo)
      router.refresh()
    } catch {
      setError('We could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      {hideSignUp ? null : (
        <>
          <h1 className="text-2xl font-bold tracking-tight text-navy-900">Welcome back</h1>
          <p className="mt-2 text-[15px] text-ink-600">Sign in to continue your PTE preparation.</p>
        </>
      )}

      {error ? (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}

      {googleEnabled ? (
        <>
          <div className="mt-6">
            <GoogleButton next={nextPath} label="Sign in with Google" />
          </div>
          <AuthDivider label="or sign in with email" />
        </>
      ) : (
        <div className="mt-6" />
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          leading={<Mail />}
          placeholder="you@example.com"
        />

        <div>
          <Input
            name="password"
            type="password"
            label="Password"
            autoComplete="current-password"
            required
            leading={<Lock />}
            placeholder="Your password"
          />
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-sm font-medium text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button type="submit" loading={pending} block size="lg">
          Sign in
        </Button>
      </form>

      {hideSignUp ? null : (
        <p className="mt-6 text-center text-sm text-ink-600">
          New to Globify?{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:underline">
            Create a free account
          </Link>
        </p>
      )}
    </div>
  )
}
