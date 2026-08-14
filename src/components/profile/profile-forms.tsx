'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, LogOut, Save, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/field'
import { Modal } from '@/components/ui/modal'
import { notify } from '@/components/ui/toast'

export interface ProfileValues {
  name: string
  email: string
  phone: string
  city: string
  country: string
  studyDestination: string
  targetScore: number
  dailyGoalMinutes: number
  preferredTestDate: string
}

export function ProfileDetailsForm({ initial }: { initial: ProfileValues }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof ProfileValues>(key: K, value: ProfileValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not save', payload.error)
        return
      }
      notify.success('Profile saved')
      router.refresh()
    } catch {
      notify.error('Could not save', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" value={values.name} onChange={(e) => set('name', e.target.value)} required />
      <Input label="Email" value={values.email} disabled hint="Contact support to change your email." />
      <Input label="Phone" value={values.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+92 3xx xxxxxxx" />
      <Input label="City" value={values.city} onChange={(e) => set('city', e.target.value)} />
      <Input label="Country" value={values.country} onChange={(e) => set('country', e.target.value)} />
      <Input
        label="Study destination"
        value={values.studyDestination}
        onChange={(e) => set('studyDestination', e.target.value)}
        placeholder="Australia, Canada, UK…"
      />

      <Select
        label="Target score"
        value={String(values.targetScore)}
        onChange={(e) => set('targetScore', Number(e.target.value))}
        hint="Drives your dashboard ring and recommendations."
      >
        {[50, 58, 65, 70, 79, 84, 90].map((score) => (
          <option key={score} value={score}>
            {score}
          </option>
        ))}
      </Select>

      <Select
        label="Daily goal"
        value={String(values.dailyGoalMinutes)}
        onChange={(e) => set('dailyGoalMinutes', Number(e.target.value))}
      >
        {[15, 30, 45, 60, 90, 120].map((minutes) => (
          <option key={minutes} value={minutes}>
            {minutes} minutes
          </option>
        ))}
      </Select>

      <Input
        label="Planned test date"
        type="date"
        value={values.preferredTestDate}
        onChange={(e) => set('preferredTestDate', e.target.value)}
        wrapperClassName="sm:col-span-2"
        hint="Used for the countdown on your dashboard."
      />

      <div className="sm:col-span-2">
        <Button type="submit" loading={saving}>
          {saving ? null : <Save aria-hidden />}
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)

  if (!hasPassword) {
    return (
      <p className="text-sm text-ink-500">
        This account signs in with Google, so it has no password to change. Manage it from your Google
        account settings.
      </p>
    )
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (next !== confirm) {
      notify.error('Passwords do not match', 'Type the same new password in both fields.')
      return
    }
    setSaving(true)
    try {
      const response = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not change password', payload.error)
        return
      }
      setCurrent('')
      setNext('')
      setConfirm('')
      notify.success('Password changed', 'Other devices have been signed out.')
    } catch {
      notify.error('Could not change password', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:max-w-md">
      <Input
        label="Current password"
        type="password"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        autoComplete="current-password"
        required
      />
      <Input
        label="New password"
        type="password"
        value={next}
        onChange={(e) => setNext(e.target.value)}
        autoComplete="new-password"
        hint="At least 10 characters."
        required
      />
      <Input
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        autoComplete="new-password"
        required
      />
      <div>
        <Button type="submit" loading={saving}>
          {saving ? 'Changing…' : 'Change password'}
        </Button>
      </div>
      <p className="text-xs text-ink-500">
        Changing your password signs you out everywhere else — this device stays signed in.
      </p>
    </form>
  )
}

export function ReferralCard({ code, url }: { code: string; url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      notify.info('Copy it manually', url)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-ink-50/60 p-4">
      <div className="min-w-0">
        <p className="text-xs text-ink-500">Your referral link</p>
        <p className="mt-0.5 truncate font-mono text-sm text-navy-900">{url}</p>
        <p className="mt-1 text-xs text-ink-500">Code {code}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={copy}>
        <Copy aria-hidden />
        {copied ? 'Copied' : 'Copy link'}
      </Button>
    </div>
  )
}

export function SignOutEverywhere() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState(false)

  async function confirm() {
    setWorking(true)
    try {
      const response = await fetch('/api/profile/sessions', { method: 'DELETE' })
      if (!response.ok) {
        notify.error('Could not sign out', 'Please try again.')
        return
      }
      router.replace('/login')
      router.refresh()
    } finally {
      setWorking(false)
    }
  }

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        <LogOut aria-hidden />
        Sign out everywhere
      </Button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out on all devices?"
        description="Every active session is revoked, including this one."
        dismissible={!working}
      >
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-amber-900">
            Use this if you signed in on a shared or public computer. You will need to sign in again here.
          </p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={working}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} loading={working}>
            Sign out everywhere
          </Button>
        </div>
      </Modal>
    </>
  )
}
