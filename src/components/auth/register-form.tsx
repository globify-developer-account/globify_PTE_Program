'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AlertCircle, Lock, Mail, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select } from '@/components/ui/field'
import { passwordStrength } from '@/lib/auth/password'
import { AuthDivider, GoogleButton } from './google-button'
import { ANALYTICS_EVENTS, track } from '@/lib/analytics'
import { cn } from '@/lib/utils'

type Errors = Record<string, string>

const STRENGTH_COLORS = ['bg-ink-200', 'bg-red-400', 'bg-amber-400', 'bg-lime-500', 'bg-green-600']

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const referralFromUrl = searchParams.get('ref') ?? ''

  const [pending, setPending] = useState(false)
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})

  const strength = passwordStrength(password)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setFormError(null)
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const payload = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password'),
      phone: formData.get('phone') || '',
      targetScore: formData.get('targetScore'),
      studyDestination: formData.get('studyDestination') || '',
      referralCode: formData.get('referralCode') || '',
      acceptTerms: formData.get('acceptTerms') === 'on',
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const body = (await response.json()) as {
        ok: boolean
        error?: string
        details?: Record<string, string[]>
      }

      if (!response.ok || !body.ok) {
        if (body.details) {
          setErrors(
            Object.fromEntries(
              Object.entries(body.details).map(([key, messages]) => [key, messages[0] ?? 'Invalid value']),
            ),
          )
        }
        setFormError(body.error ?? 'We could not create your account. Please try again.')
        return
      }

      track(ANALYTICS_EVENTS.registration, { method: 'password' })
      router.push('/dashboard')
      router.refresh()
    } catch {
      setFormError('We could not reach the server. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy-900">Create your free account</h1>
      <p className="mt-2 text-[15px] text-ink-600">
        5 AI speaking evaluations, 3 writing evaluations and a full mock test — no card needed.
      </p>

      {formError ? (
        <p
          role="alert"
          className="mt-6 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formError}
        </p>
      ) : null}

      {googleEnabled ? (
        <>
          <div className="mt-6">
            <GoogleButton label="Sign up with Google" />
          </div>
          <AuthDivider label="or sign up with email" />
        </>
      ) : (
        <div className="mt-6" />
      )}

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input
          name="name"
          label="Full name"
          autoComplete="name"
          required
          leading={<User />}
          error={errors.name}
        />

        <Input
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          required
          leading={<Mail />}
          error={errors.email}
        />

        <div>
          <Input
            name="password"
            type="password"
            label="Password"
            autoComplete="new-password"
            required
            leading={<Lock />}
            error={errors.password}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            hint="At least 8 characters, including a letter and a number."
          />
          {password ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex flex-1 gap-1" aria-hidden>
                {[0, 1, 2, 3].map((index) => (
                  <span
                    key={index}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      index < strength.score ? STRENGTH_COLORS[strength.score] : 'bg-ink-200',
                    )}
                  />
                ))}
              </div>
              <span className="text-xs text-ink-500">{strength.label}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input name="phone" label="Phone (optional)" autoComplete="tel" placeholder="+92 3XX XXXXXXX" />
          <Select name="targetScore" label="Target score" defaultValue="79">
            {[50, 58, 65, 79, 85].map((score) => (
              <option key={score} value={score}>
                {score}+
              </option>
            ))}
          </Select>
        </div>

        <Select name="studyDestination" label="Study destination (optional)" defaultValue="">
          <option value="">Not decided yet</option>
          {['Australia', 'Canada', 'New Zealand', 'United Kingdom', 'Ireland', 'United States', 'Other'].map(
            (destination) => (
              <option key={destination} value={destination}>
                {destination}
              </option>
            ),
          )}
        </Select>

        <Input
          name="referralCode"
          label="Referral code (optional)"
          defaultValue={referralFromUrl}
          placeholder="GLOBIFY-XXXX"
        />

        <Checkbox
          name="acceptTerms"
          required
          label="I agree to the Terms and Privacy Policy"
          description="Including the AI Disclaimer — Globify scores are practice estimates, not official Pearson results."
        />

        <Button type="submit" loading={pending} block size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
