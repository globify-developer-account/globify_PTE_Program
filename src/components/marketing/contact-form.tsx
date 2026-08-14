'use client'

import { useState, type FormEvent } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'

type Errors = Partial<Record<'name' | 'email' | 'message', string>>

export function ContactForm() {
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPending(true)
    setErrors({})

    const formData = new FormData(event.currentTarget)
    const payload = Object.fromEntries(formData.entries())

    try {
      const response = await fetch('/api/contact', {
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
            ) as Errors,
          )
        }
        notify.error(body.error ?? 'We could not send your message. Please try again.')
        return
      }

      setSent(true)
      notify.success('Message sent', 'Our team replies within one business day.')
    } catch {
      notify.error('Network problem', 'Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  if (sent) {
    return (
      <div className="surface-card p-8 text-center">
        <h3 className="text-lg font-semibold text-navy-900">Thanks — we have your message</h3>
        <p className="mt-2 text-[15px] text-ink-600">
          Our admissions team replies within one business day. If it is urgent, WhatsApp is faster.
        </p>
        <Button variant="secondary" className="mt-6" onClick={() => setSent(false)}>
          Send another message
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="surface-card space-y-5 p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="name" label="Full name" required autoComplete="name" error={errors.name} />
        <Input name="email" type="email" label="Email" required autoComplete="email" error={errors.email} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Input name="phone" label="Phone (optional)" autoComplete="tel" placeholder="+92 3XX XXXXXXX" />
        <Select name="topic" label="What is this about?" defaultValue="general">
          <option value="general">General enquiry</option>
          <option value="plans">Plans and pricing</option>
          <option value="payment">Payment or invoice</option>
          <option value="technical">Technical problem</option>
          <option value="teacher-review">Teacher review</option>
        </Select>
      </div>

      <Input
        name="targetScore"
        label="Target PTE score (optional)"
        type="number"
        min={10}
        max={90}
        placeholder="79"
      />

      <Textarea
        name="message"
        label="Message"
        required
        rows={5}
        error={errors.message}
        placeholder="Tell us your target score, your planned test date and where you are stuck."
      />

      {/* Honeypot — real users never fill this in. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />

      <Button type="submit" loading={pending} block size="lg">
        <Send aria-hidden />
        Send message
      </Button>

      <p className="text-xs text-ink-500">
        By sending this message you agree to our privacy policy. We never share your details.
      </p>
    </form>
  )
}
