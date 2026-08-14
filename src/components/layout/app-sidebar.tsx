'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { Logo } from './logo'
import { NavIcon } from './nav-icon'
import { appNav } from '@/lib/site'
import { cn } from '@/lib/utils'
import { Meter } from '@/components/charts/score-ring'

export interface SidebarSummary {
  isPremium: boolean
  planName: string | null
  daysRemaining: number | null
  /** Practice questions used today against the free allowance. */
  practiceUsed: number
  practiceLimit: number
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppSidebar({ summary }: { summary: SidebarSummary }) {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-hairline bg-white lg:flex">
      <div className="flex h-16 shrink-0 items-center border-b border-hairline px-5">
        <Logo href="/dashboard" />
      </div>

      <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
        <ul className="space-y-1">
          {appNav.map((item) => {
            const active = isActive(pathname, item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100 hover:text-navy-900',
                  )}
                >
                  {active ? (
                    <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-600" aria-hidden />
                  ) : null}
                  <NavIcon
                    name={item.icon}
                    className={cn('size-[18px]', active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600')}
                  />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="shrink-0 border-t border-hairline p-3">
        {summary.isPremium ? (
          <div className="rounded-xl border border-hairline bg-ink-50/70 p-3.5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-navy-900">
              <Sparkles className="size-4 text-brand-600" aria-hidden />
              {summary.planName ?? 'Premium'}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {summary.daysRemaining === null
                ? 'Active subscription'
                : `${summary.daysRemaining} day${summary.daysRemaining === 1 ? '' : 's'} remaining`}
            </p>
            <Link
              href="/subscription"
              className="mt-2.5 inline-block text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              Manage subscription
            </Link>
          </div>
        ) : (
          <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-3.5">
            <p className="text-sm font-semibold text-navy-900">Free plan</p>
            <p className="mt-1 text-xs text-ink-600">
              {summary.practiceUsed} of {summary.practiceLimit} practice questions used today
            </p>
            <Meter
              value={summary.practiceUsed}
              max={summary.practiceLimit}
              className="mt-2.5"
              height={5}
              trackColor="var(--color-brand-100)"
            />
            <Link
              href="/pricing"
              className="mt-3 flex h-9 items-center justify-center rounded-lg bg-brand-600 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Upgrade to Premium
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
