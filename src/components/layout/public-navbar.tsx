'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Logo } from './logo'
import { ButtonLink } from '@/components/ui/button'
import { publicNav } from '@/lib/site'
import { cn } from '@/lib/utils'

export function PublicNavbar({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b transition-colors duration-200',
        scrolled ? 'border-hairline bg-white/85 backdrop-blur-xl' : 'border-transparent bg-canvas',
      )}
    >
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {publicNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href ? 'text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-navy-900',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <ButtonLink href="/dashboard" size="sm">
              Go to dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Login
              </ButtonLink>
              <ButtonLink href="/pricing" size="sm">
                Get Premium
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid size-10 place-items-center rounded-lg text-navy-900 hover:bg-ink-100 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-hairline bg-white lg:hidden">
          <nav className="container-page flex flex-col py-3" aria-label="Mobile">
            {publicNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2 py-3 text-sm font-medium text-ink-700 hover:bg-ink-50"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-3 grid gap-2 border-t border-hairline pt-4">
              {signedIn ? (
                <ButtonLink href="/dashboard" block>
                  Go to dashboard
                </ButtonLink>
              ) : (
                <>
                  <ButtonLink href="/login" variant="secondary" block>
                    Login
                  </ButtonLink>
                  <ButtonLink href="/pricing" block>
                    Get Premium
                  </ButtonLink>
                </>
              )}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  )
}
