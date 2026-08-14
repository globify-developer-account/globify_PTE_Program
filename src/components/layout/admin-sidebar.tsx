'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ArrowLeft, Menu, X } from 'lucide-react'
import { Logo } from './logo'
import { NavIcon } from './nav-icon'
import { adminNav } from '@/lib/site'
import { cn } from '@/lib/utils'

/**
 * Admin navigation.
 *
 * Items are filtered by the permissions the server resolved for this account —
 * but hiding a link is a courtesy, not a control. Every admin page and route
 * calls `requireStaff` / `requireApiStaff` with the permission it needs.
 */
export function AdminSidebar({ permissions }: { permissions: string[] }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const allowed = adminNav.filter((item) => permissions.includes(item.permission))

  const nav = (
    <nav className="scrollbar-slim flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
      <ul className="space-y-0.5">
        {allowed.map((item) => {
          const active =
            item.href === '/admin' ? pathname === '/admin' : pathname.startsWith(item.href)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/10 text-white'
                    : 'text-navy-100/70 hover:bg-white/5 hover:text-white',
                )}
              >
                <NavIcon name={item.icon} className="size-[17px]" />
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )

  return (
    <>
      {/* Desktop rail — navy, so admin is visually unmistakable from the student app. */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy-900 lg:flex">
        <div className="flex h-16 shrink-0 items-center border-b border-white/10 px-5">
          <Logo href="/admin" tone="light" showProduct={false} />
          <span className="ml-2 rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Admin
          </span>
        </div>
        {nav}
        <div className="shrink-0 border-t border-white/10 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-100/70 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Student view
          </Link>
        </div>
      </aside>

      {/* Mobile trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed left-4 top-4 z-30 grid size-10 place-items-center rounded-lg bg-navy-900 text-white lg:hidden"
        aria-label="Open admin navigation"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-navy-900/50" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-900">
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-4">
              <Logo href="/admin" tone="light" showProduct={false} />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-10 place-items-center rounded-lg text-navy-100/70 hover:bg-white/5"
                aria-label="Close admin navigation"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>
            {nav}
          </div>
        </div>
      ) : null}
    </>
  )
}
