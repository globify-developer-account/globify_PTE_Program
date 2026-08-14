'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'
import { formatMoney } from '@/lib/money'

export interface PlanFormValues {
  id: string
  code: string
  name: string
  tagline: string
  description: string
  price: number
  compareAtPrice: number | null
  currency: string
  durationDays: number
  features: string[]
  limits: {
    aiSpeakingPerMonth: number
    aiWritingPerMonth: number
    mockTestsPerMonth: number
    practicePerDay: number
    teacherReviews: number
    advancedAnalytics: boolean
  }
  isActive: boolean
  isPopular: boolean
  badge: string
  displayOrder: number
  activeSubscriptions: number
}

const LIMIT_FIELDS = [
  { key: 'aiSpeakingPerMonth', label: 'AI speaking / month' },
  { key: 'aiWritingPerMonth', label: 'AI writing / month' },
  { key: 'mockTestsPerMonth', label: 'Mock tests / month' },
  { key: 'practicePerDay', label: 'Practice / day' },
  { key: 'teacherReviews', label: 'Teacher reviews / month' },
] as const

export function PlanEditor({ plan }: { plan: PlanFormValues }) {
  const [values, setValues] = useState(plan)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const set = <K extends keyof PlanFormValues>(key: K, value: PlanFormValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }))

  async function save() {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/plans/${values.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: values.name,
          tagline: values.tagline || null,
          description: values.description || null,
          price: values.price,
          compareAtPrice: values.compareAtPrice,
          durationDays: values.durationDays,
          features: values.features,
          limits: values.limits,
          isActive: values.isActive,
          isPopular: values.isPopular,
          badge: values.badge || null,
          displayOrder: values.displayOrder,
        }),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not save the plan', payload.error)
        return
      }
      notify.success('Plan saved', 'Pricing pages update immediately.')
      router.refresh()
    } catch {
      notify.error('Could not save the plan', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="surface-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-base font-semibold text-navy-900">
            {values.name}
            {values.isPopular ? <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden /> : null}
          </h3>
          <p className="mt-0.5 font-mono text-xs text-ink-400">{values.code}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-semibold text-navy-900 tabular">
            {formatMoney(Math.round(values.price * 100), values.currency)}
          </p>
          <p className="text-xs text-ink-500">
            {values.activeSubscriptions} active subscription{values.activeSubscriptions === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Input label="Name" value={values.name} onChange={(e) => set('name', e.target.value)} />
        <Input
          label="Tagline"
          value={values.tagline}
          onChange={(e) => set('tagline', e.target.value)}
        />
        <Input
          label={`Price (${values.currency})`}
          type="number"
          step="0.01"
          value={values.price}
          onChange={(e) => set('price', Number(e.target.value))}
          hint="Stored as integer minor units."
        />
        <Input
          label="Compare-at price (optional)"
          type="number"
          step="0.01"
          value={values.compareAtPrice ?? ''}
          onChange={(e) => set('compareAtPrice', e.target.value ? Number(e.target.value) : null)}
          hint="Shown struck through. Must exceed the price."
        />
        <Input
          label="Duration (days)"
          type="number"
          value={values.durationDays}
          onChange={(e) => set('durationDays', Number(e.target.value))}
        />
        <Input
          label="Badge"
          value={values.badge}
          onChange={(e) => set('badge', e.target.value)}
          placeholder="Most popular"
        />
        <Textarea
          label="Description"
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          wrapperClassName="sm:col-span-2"
        />
        <Textarea
          label="Features"
          value={values.features.join('\n')}
          onChange={(e) => set('features', e.target.value.split('\n').filter((line) => line.trim()))}
          rows={6}
          wrapperClassName="sm:col-span-2"
          hint="One per line. Shown as the tick list on the pricing page."
        />
      </div>

      <div className="mt-5 border-t border-hairline pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          Allowances — use −1 for unlimited
        </p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {LIMIT_FIELDS.map((field) => (
            <Input
              key={field.key}
              label={field.label}
              type="number"
              value={values.limits[field.key]}
              onChange={(e) =>
                set('limits', { ...values.limits, [field.key]: Number(e.target.value) })
              }
            />
          ))}
        </div>
        <div className="mt-4 space-y-3">
          <Checkbox
            label="Advanced analytics"
            checked={values.limits.advancedAnalytics}
            onChange={(e) => set('limits', { ...values.limits, advancedAnalytics: e.target.checked })}
            description="Full task-type breakdown on the progress page."
          />
          <Checkbox
            label="Active"
            checked={values.isActive}
            onChange={(e) => set('isActive', e.target.checked)}
            description="Inactive plans disappear from pricing but keep existing subscriptions running."
          />
          <Checkbox
            label="Highlight as most popular"
            checked={values.isPopular}
            onChange={(e) => set('isPopular', e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={save} loading={saving}>
          {saving ? null : <Save aria-hidden />}
          {saving ? 'Saving…' : 'Save plan'}
        </Button>
      </div>
    </div>
  )
}
