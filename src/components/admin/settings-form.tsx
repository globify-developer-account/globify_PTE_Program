'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'
import type { PlatformSettings } from '@/lib/settings'

export function SettingsForm({ initial }: { initial: PlatformSettings }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName: values.platformName,
          contactEmail: values.contactEmail,
          supportEmail: values.supportEmail,
          supportWhatsapp: values.supportWhatsapp,
          currency: values.currency,
          timezone: values.timezone,
          defaultTargetScore: values.defaultTargetScore,
          taxPercent: values.taxPercent,
          aiMonthlyBudgetUsd: values.aiMonthlyBudgetUsd,
          maintenanceMode: values.maintenanceMode,
          registrationEnabled: values.registrationEnabled,
          supportTicketsEnabled: values.supportTicketsEnabled,
          bankTransferInstructions: values.bankTransferInstructions,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not save settings', payload.error)
        return
      }
      notify.success('Settings saved')
      router.refresh()
    } catch {
      notify.error('Could not save settings', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-6">
      <Section title="Brand and contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Platform name"
            value={values.platformName}
            onChange={(e) => set('platformName', e.target.value)}
          />
          <Input
            label="Timezone"
            value={values.timezone}
            onChange={(e) => set('timezone', e.target.value)}
            hint="IANA name, e.g. Asia/Karachi"
          />
          <Input
            label="Contact email"
            type="email"
            value={values.contactEmail}
            onChange={(e) => set('contactEmail', e.target.value)}
          />
          <Input
            label="Support email"
            type="email"
            value={values.supportEmail}
            onChange={(e) => set('supportEmail', e.target.value)}
          />
          <Input
            label="Support WhatsApp"
            value={values.supportWhatsapp}
            onChange={(e) => set('supportWhatsapp', e.target.value)}
            hint="Digits only, with country code."
          />
        </div>
      </Section>

      <Section title="Commerce">
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Currency"
            value={values.currency}
            onChange={(e) => set('currency', e.target.value.toUpperCase())}
            maxLength={3}
          />
          <Input
            label="Tax percent"
            type="number"
            step="0.01"
            value={values.taxPercent}
            onChange={(e) => set('taxPercent', Number(e.target.value))}
            hint="Applied after discounts."
          />
          <Input
            label="Default target score"
            type="number"
            value={values.defaultTargetScore}
            onChange={(e) => set('defaultTargetScore', Number(e.target.value))}
          />
        </div>
        <Textarea
          label="Bank transfer instructions"
          value={values.bankTransferInstructions}
          onChange={(e) => set('bankTransferInstructions', e.target.value)}
          rows={3}
          wrapperClassName="mt-4"
          hint="Shown on the manual payment page above the account details."
        />
      </Section>

      <Section
        title="AI cost control"
        description="Account numbers and API keys live in environment variables, never in the database."
      >
        <Input
          label="Monthly AI budget (USD)"
          type="number"
          step="1"
          value={values.aiMonthlyBudgetUsd}
          onChange={(e) => set('aiMonthlyBudgetUsd', Number(e.target.value))}
          hint="0 means no cap. When reached, AI scoring pauses and responses are saved for later."
        />
      </Section>

      <Section title="Availability">
        <div className="space-y-3">
          <Checkbox
            label="Registration open"
            checked={values.registrationEnabled}
            onChange={(e) => set('registrationEnabled', e.target.checked)}
            description="Turn off to pause new sign-ups without taking the site down."
          />
          <Checkbox
            label="Support widget"
            checked={values.supportTicketsEnabled}
            onChange={(e) => set('supportTicketsEnabled', e.target.checked)}
            description="Shows the WhatsApp and email support launcher on public pages."
          />
          <Checkbox
            label="Maintenance mode"
            checked={values.maintenanceMode}
            onChange={(e) => set('maintenanceMode', e.target.checked)}
            description="Students see a maintenance notice. Staff can still sign in to the admin area."
          />
        </div>
      </Section>

      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          {saving ? null : <Save aria-hidden />}
          {saving ? 'Saving…' : 'Save settings'}
        </Button>
      </div>
    </form>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="surface-card p-5">
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
