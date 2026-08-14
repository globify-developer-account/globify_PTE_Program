'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut } from 'lucide-react'
import { notify } from '@/components/ui/toast'
import { cn, initials } from '@/lib/utils'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  CONTENT_MANAGER: 'Content Manager',
  TEACHER: 'Teacher',
}

export function AdminUserMenu({
  name,
  email,
  role,
  title,
}: {
  name: string
  email: string
  role: string
  title: string | null
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
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

  async function signOut() {
    setSigningOut(true)
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error()
      router.replace('/admin/login')
      router.refresh()
    } catch {
      setSigningOut(false)
      notify.error('Could not sign you out', 'Please try again.')
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 hover:bg-ink-100"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-navy-900 text-xs font-semibold text-white">
          {initials(name)}
        </span>
        <ChevronDown className={cn('size-4 text-ink-400 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] w-64 overflow-hidden rounded-xl border border-hairline bg-white shadow-lift"
        >
          <div className="border-b border-hairline px-4 py-3">
            <p className="truncate text-sm font-semibold text-navy-900">{name}</p>
            <p className="truncate text-xs text-ink-500">{email}</p>
            <p className="mt-1.5 inline-block rounded-md bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
              {title ?? ROLE_LABELS[role] ?? role}
            </p>
          </div>
          <div className="p-1.5">
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
  )
}
