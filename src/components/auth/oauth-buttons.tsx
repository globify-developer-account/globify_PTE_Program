import type { OAuthProviderId } from '@/lib/auth/oauth-state'

const PROVIDER_LABELS: Record<OAuthProviderId, string> = {
  google: 'Google',
  facebook: 'Facebook',
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.02-6.46-4.75H1.7v2.98A11.99 11.99 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.54 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.7a12 12 0 0 0 0 10.56l3.84-2.98Z" />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.45 0 3.52 2.6 1.7 6.39l3.84 2.98C6.45 6.77 9 4.75 12 4.75Z"
      />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  )
}

const ICONS: Record<OAuthProviderId, () => React.JSX.Element> = {
  google: GoogleIcon,
  facebook: FacebookIcon,
}

export function oauthProviderLabel(id: string | null | undefined): string {
  return id && id in PROVIDER_LABELS ? PROVIDER_LABELS[id as OAuthProviderId] : 'social'
}

export function OAuthButtons({
  providers,
  verb,
  next,
  referralCode,
}: {
  providers: OAuthProviderId[]
  verb: 'Sign in' | 'Sign up'
  next?: string
  referralCode?: string
}) {
  if (providers.length === 0) return null

  const query = new URLSearchParams()
  if (next) query.set('next', next)
  if (referralCode) query.set('ref', referralCode)
  const suffix = query.toString() ? `?${query.toString()}` : ''

  return (
    <div className="space-y-3">
      {providers.map((id) => {
        const Icon = ICONS[id]
        return (
          // A plain anchor, not next/link: this is a route handler that sets a
          // state cookie and redirects off-site, and must never be prefetched.
          <a
            key={id}
            href={`/api/auth/${id}${suffix}`}
            className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-hairline bg-white text-sm font-medium text-navy-900 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
          >
            <Icon />
            {verb} with {PROVIDER_LABELS[id]}
          </a>
        )
      })}
    </div>
  )
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="relative my-6 text-center">
      <span className="absolute inset-x-0 top-1/2 h-px bg-hairline" aria-hidden />
      <span className="relative bg-canvas px-3 text-xs uppercase tracking-wide text-ink-400">{label}</span>
    </div>
  )
}
