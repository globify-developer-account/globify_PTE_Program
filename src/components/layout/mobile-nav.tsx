'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NavIcon } from './nav-icon'
import { mobileNav } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * Bottom tab bar for phones. The app shell reserves matching bottom padding so
 * this never covers page content, and it hides itself inside the practice
 * player where every pixel of vertical space matters.
 */
export function MobileNav() {
  const pathname = usePathname()

  // The practice player and mock test runner are full-screen experiences.
  const hidden = /^\/(practice\/[^/]+\/(session|attempt)|mock-tests\/[^/]+\/run)/.test(pathname)
  if (hidden) return null

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      <ul className="grid grid-cols-5">
        {mobileNav.map((item) => {
          const active =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 px-1 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-brand-600' : 'text-ink-500',
                )}
              >
                <NavIcon name={item.icon} className="size-[19px]" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
