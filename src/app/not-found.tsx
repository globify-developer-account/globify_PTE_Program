import Link from 'next/link'
import { ButtonLink } from '@/components/ui/button'
import { Logo } from '@/components/layout/logo'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <Logo href="/" className="justify-center" />

        <p className="mt-10 text-[64px] font-bold leading-none text-brand-100">404</p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-navy-900">This page does not exist</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          The link may be out of date, or the page may have moved. Everything below is still where you left it.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <ButtonLink href="/">Go to homepage</ButtonLink>
          <ButtonLink href="/dashboard" variant="secondary">
            Go to dashboard
          </ButtonLink>
        </div>

        <nav className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-hairline pt-6 text-sm">
          {[
            { href: '/pte', label: 'PTE Preparation' },
            { href: '/pricing', label: 'Pricing' },
            { href: '/resources', label: 'Resources' },
            { href: '/contact', label: 'Contact' },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="text-ink-500 hover:text-brand-600">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </main>
  )
}
