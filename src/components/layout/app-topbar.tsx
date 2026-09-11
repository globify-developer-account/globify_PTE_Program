'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Bell, ChevronDown, Flame, LogOut, Menu, Settings, Sparkles, User, X } from 'lucide-react'
import { Logo } from './logo'
import { NavIcon } from './nav-icon'
import { PracticeMegaMenu } from './practice-mega-menu'
import { appNav, topNav } from '@/lib/site'
import { PTE_VARIANTS, PTE_VARIANT_META, type PteVariant } from '@/lib/pte/question-types'
import { cn, initials } from '@/lib/utils'
import { notify } from '@/components/ui/toast'

export interface TopbarUser {
  name: string
  email: string
  avatarUrl: string | null
  isPremium: boolean
  streakDays: number
  unreadCount: number
  pteVariant: PteVariant
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') return pathname === '/dashboard'
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppTopbar({ user }: { user: TopbarUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [practiceOpen, setPracticeOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const practiceRef = useRef<HTMLDivElement>(null)

  // Close the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [menuOpen])

  // Same treatment for the practice panel, which is far larger and so more
  // disruptive to leave open.
  useEffect(() => {
    if (!practiceOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (practiceRef.current && !practiceRef.current.contains(event.target as Node)) {
        setPracticeOpen(false)
      }
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPracticeOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [practiceOpen])

  // Route changes always close every overlay.
  useEffect(() => {
    setMenuOpen(false)
    setDrawerOpen(false)
    setPracticeOpen(false)
  }, [pathname])

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
    <>
      <div ref={practiceRef} className="sticky top-0 z-30 bg-white/90 backdrop-blur-md">
        <header className="flex h-16 items-center gap-2 border-b border-hairline px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-600 hover:bg-ink-100 lg:hidden"
            aria-label="Open navigation"
          >
            <Menu className="size-5" aria-hidden />
          </button>

          <div className="shrink-0">
            <Logo href="/dashboard" />
          </div>

          <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Sections">
            {topNav.map((item) => {
              const active = isActive(pathname, item.href)
              if (!item.hasMegaMenu) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'text-brand-600' : 'text-ink-600 hover:text-navy-900',
                    )}
                  >
                    {item.label}
                  </Link>
                )
              }
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setPracticeOpen((open) => !open)}
                  aria-expanded={practiceOpen}
                  aria-haspopup="true"
                  className={cn(
                    'flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active || practiceOpen ? 'text-brand-600' : 'text-ink-600 hover:text-navy-900',
                  )}
                >
                  {item.label}
                  <ChevronDown
                    className={cn('size-3.5 transition-transform', practiceOpen && 'rotate-180')}
                    aria-hidden
                  />
                </button>
              )
            })}
          </nav>

          <div className="flex-1" />

          {user.streakDays > 0 ? (
            <span
              className="hidden items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 sm:inline-flex"
              title={`${user.streakDays}-day practice streak`}
            >
              <Flame className="size-3.5" aria-hidden />
              {user.streakDays} day{user.streakDays === 1 ? '' : 's'}
            </span>
          ) : null}

          {!user.isPremium ? (
            <Link
              href="/pricing"
              className="hidden h-9 items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
            >
              <Sparkles className="size-3.5" aria-hidden />
              Upgrade
            </Link>
          ) : null}

          <Link
            href="/notifications"
            className="relative grid size-10 shrink-0 place-items-center rounded-lg text-ink-600 hover:bg-ink-100"
            aria-label={
              user.unreadCount > 0 ? `Notifications, ${user.unreadCount} unread` : 'Notifications'
            }
          >
            <Bell className="size-[18px]" aria-hidden />
            {user.unreadCount > 0 ? (
              <span className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white">
                {user.unreadCount > 9 ? '9+' : user.unreadCount}
              </span>
            ) : null}
          </Link>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-ink-100"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <Avatar name={user.name} url={user.avatarUrl} />
              <ChevronDown
                className={cn('size-4 text-ink-400 transition-transform', menuOpen && 'rotate-180')}
                aria-hidden
              />
            </button>

            {menuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] w-60 overflow-hidden rounded-xl border border-hairline bg-white shadow-lift"
              >
                <div className="border-b border-hairline px-4 py-3">
                  <p className="truncate text-sm font-semibold text-navy-900">{user.name}</p>
                  <p className="truncate text-xs text-ink-500">{user.email}</p>
                </div>
                <div className="p-1.5">
                  <MenuLink href="/profile" icon={<User className="size-4" aria-hidden />}>
                    Profile
                  </MenuLink>
                  <MenuLink href="/subscription" icon={<Settings className="size-4" aria-hidden />}>
                    Subscription
                  </MenuLink>
                </div>
                <div className="border-t border-hairline p-1.5">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={signOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-red-50 hover:text-danger disabled:opacity-60"
                  >
                    <LogOut className="size-4" aria-hidden />
                    {signingOut ? 'Signing out…' : 'Sign out'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <VariantSwitcher current={user.pteVariant} />
        </header>

        {practiceOpen ? (
          <PracticeMegaMenu
            defaultVariant={user.pteVariant}
            onNavigate={() => setPracticeOpen(false)}
          />
        ) : null}
      </div>

      {/* Mobile drawer — the sidebar is display:none below lg. */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-navy-900/45 backdrop-blur-[2px]"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white shadow-lift">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-hairline px-4">
              <Logo href="/dashboard" />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
                aria-label="Close navigation"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <nav className="scrollbar-slim flex-1 overflow-y-auto p-3" aria-label="Main">
              <ul className="space-y-1">
                {appNav.map((item) => {
                  const active = isActive(pathname, item.href)
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
                          active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-100',
                        )}
                      >
                        <NavIcon name={item.icon} className="size-[18px]" />
                        {item.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </>
  )
}

/**
 * Switches the learner between the two PTE products.
 *
 * The change is written to the profile rather than held in component state,
 * because it decides what the practice menus and the dashboard show on every
 * subsequent page — including pages rendered on the server.
 */
function VariantSwitcher({ current }: { current: PteVariant }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function choose(next: PteVariant) {
    setOpen(false)
    if (next === current) return
    setSaving(true)
    try {
      const response = await fetch('/api/profile/pte-variant', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ variant: next }),
      })
      if (!response.ok) throw new Error('Switch failed')
      router.refresh()
    } catch {
      notify.error('Could not switch exam', 'Please check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={saving}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 disabled:opacity-60"
      >
        {PTE_VARIANT_META[current].short}
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-72 overflow-hidden rounded-xl border border-hairline bg-white p-1.5 shadow-lift"
        >
          {PTE_VARIANTS.map((candidate) => (
            <button
              key={candidate}
              type="button"
              role="menuitemradio"
              aria-checked={candidate === current}
              onClick={() => choose(candidate)}
              className={cn(
                'block w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ink-100',
                candidate === current && 'bg-brand-50',
              )}
            >
              <span
                className={cn(
                  'block text-sm font-semibold',
                  candidate === current ? 'text-brand-700' : 'text-navy-900',
                )}
              >
                {PTE_VARIANT_META[candidate].label}
              </span>
              <span className="mt-0.5 block text-xs leading-snug text-ink-500">
                {PTE_VARIANT_META[candidate].blurb}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function MenuLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 hover:text-navy-900"
    >
      {icon}
      {children}
    </Link>
  )
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // Avatars come from arbitrary OAuth CDNs, so next/image would need every one
    // configured as a remote pattern. A plain img keeps the surface predictable.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="size-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-600 text-xs font-semibold text-white">
      {initials(name)}
    </span>
  )
}
