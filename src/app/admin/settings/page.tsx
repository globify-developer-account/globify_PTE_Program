import { KeyRound } from 'lucide-react'
import { SettingsForm } from '@/components/admin/settings-form'
import { requireStaff } from '@/lib/auth/guards'
import { getSettings } from '@/lib/settings'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Settings',
  description: 'Platform-wide configuration.',
  path: '/admin/settings',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminSettingsPage() {
  await requireStaff('settings.manage')
  const settings = await getSettings()

  // Read-only view of what is configured through the environment, so an admin
  // can see the deployment's state without the secrets themselves being exposed.
  const environment = [
    { label: 'AI provider', value: env.ai.provider, configured: env.demoMode || Boolean(env.ai.apiKey) },
    { label: 'AI model', value: env.ai.model || 'provider default', configured: true },
    { label: 'Transcription provider', value: env.ai.transcriptionProvider, configured: true },
    { label: 'Payment provider', value: env.payments.provider, configured: env.demoMode || Boolean(env.payments.apiKey) },
    { label: 'Payment webhook secret', value: env.payments.webhookSecret ? 'set' : 'not set', configured: Boolean(env.payments.webhookSecret) || env.demoMode },
    { label: 'Storage driver', value: env.storage.driver, configured: env.storage.driver === 'local' || Boolean(env.storage.bucket) },
    { label: 'Email provider', value: env.email.provider, configured: env.email.provider === 'console' || Boolean(env.email.apiKey) },
    { label: 'Google sign-in', value: env.auth.google.clientId ? 'configured' : 'not configured', configured: Boolean(env.auth.google.clientId) },
    { label: 'Facebook sign-in', value: env.auth.facebook.appId ? 'configured' : 'not configured', configured: Boolean(env.auth.facebook.appId) },
    { label: 'Demo mode', value: env.demoMode ? 'on' : 'off', configured: true },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Settings</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Runtime configuration. Changes take effect immediately, without a deploy.
        </p>
      </div>

      <SettingsForm initial={settings} />

      <section className="surface-card p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <KeyRound className="size-4 text-ink-400" aria-hidden />
          Environment
        </h3>
        <p className="mt-1 text-sm text-ink-500">
          Set in environment variables and shown here read-only. Secrets are never rendered.
        </p>

        <dl className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {environment.map((row) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-3 rounded-lg border border-hairline px-3.5 py-2.5"
            >
              <dt className="text-sm text-ink-600">{row.label}</dt>
              <dd className="flex items-center gap-2">
                <span className="font-mono text-xs text-navy-900">{row.value}</span>
                <span
                  className={`size-2 rounded-full ${row.configured ? 'bg-green-500' : 'bg-amber-500'}`}
                  aria-label={row.configured ? 'Configured' : 'Not configured'}
                />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  )
}
