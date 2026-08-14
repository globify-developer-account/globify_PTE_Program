import Link from 'next/link'

export function GoogleButton({ next, label = 'Continue with Google' }: { next?: string; label?: string }) {
  const href = next ? `/api/auth/google?next=${encodeURIComponent(next)}` : '/api/auth/google'
  return (
    <Link
      href={href}
      className="inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-hairline bg-white text-sm font-medium text-navy-900 transition-colors hover:border-brand-200 hover:bg-brand-50/50"
    >
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path
          fill="#4285F4"
          d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.9h3.72c2.18-2 3.44-4.96 3.44-8.56Z"
        />
        <path
          fill="#34A853"
          d="M12 24c3.11 0 5.72-1.03 7.62-2.79l-3.72-2.89c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.55-2.02-6.46-4.75H1.7v2.98A11.99 11.99 0 0 0 12 24Z"
        />
        <path
          fill="#FBBC05"
          d="M5.54 14.67a7.2 7.2 0 0 1 0-4.6V7.09H1.7a12 12 0 0 0 0 10.56l3.84-2.98Z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.71 1.2 15.1 0 12 0 7.45 0 3.52 2.6 1.7 6.39l3.84 2.98C6.45 6.77 9 4.75 12 4.75Z"
        />
      </svg>
      {label}
    </Link>
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
