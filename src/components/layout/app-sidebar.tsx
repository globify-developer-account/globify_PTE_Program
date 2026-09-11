'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { LogOut, Sparkles } from 'lucide-react'
import { NavIcon } from './nav-icon'
import { appNav } from '@/lib/site'
import { cn, initials } from '@/lib/utils'
import { Meter } from '@/components/charts/score-ring'
import { notify } from '@/components/ui/toast'

export interface SidebarSummary {
  name: string
  avatarUrl: string | null
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

/**
 * The user centre rail.
 *
 * It starts below the masthead rather than beside it, so the product nav in
 * the header spans the full width and this rail reads as belonging to the
 * signed-in account underneath it.
 */
export function AppSidebar({ summary }: { summary: SidebarSummary }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error('Sign out failed')
      router.replace('/login')
      router.refresh()
    } catch {
      setSigningOut(false)
      notify.error('Could not sign you out', 'Please check your connection and try again.')
    }
  }

  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-[76px] overflow-hidden rounded-xl border border-hairline bg-white">
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-4">
          {summary.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={summary.avatarUrl} alt="" className="size-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {initials(summary.name)}
            </span>
          )}
          <p className="min-w-0 truncate text-[15px] font-semibold text-navy-900">{summary.name}</p>
        </div>

        <nav className="py-2" aria-label="Account">
          <ul>
            {appNav.map((item) => {
              const active = isActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      active
                        ? 'bg-brand-50 font-semibold text-brand-700'
                        : 'text-ink-600 hover:bg-ink-50 hover:text-navy-900',
                    )}
                  >
                    {active ? (
                      <span className="absolute inset-y-0 right-0 w-[3px] bg-brand-600" aria-hidden />
                    ) : null}
                    <NavIcon
                      name={item.icon}
                      className={cn(
                        'size-[18px]',
                        active ? 'text-brand-600' : 'text-ink-400 group-hover:text-ink-600',
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              )
            })}
            <li>
              <button
                type="button"
                onClick={signOut}
                disabled={signingOut}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink-600 transition-colors hover:bg-red-50 hover:text-danger disabled:opacity-60"
              >
                <LogOut className="size-[18px] text-ink-400" aria-hidden />
                {signingOut ? 'Signing out…' : 'Log Out'}
              </button>
            </li>
          </ul>
        </nav>

        <div className="border-t border-hairline p-3">
          {summary.isPremium ? (
            <div className="rounded-lg bg-ink-50/70 p-3">
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
            <div className="rounded-lg border border-brand-100 bg-brand-50/60 p-3">
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
      </div>
    </aside>
  )
}
