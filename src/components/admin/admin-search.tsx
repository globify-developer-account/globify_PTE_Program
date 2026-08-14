'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'

/**
 * Search box that writes to the URL rather than to component state, so an
 * admin can bookmark or share a filtered view. Debounced so typing does not
 * fire a query per keystroke.
 */
export function AdminSearch({ placeholder = 'Search…' }: { placeholder?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [value, setValue] = useState(searchParams.get('q') ?? '')

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value.trim()) params.set('q', value.trim())
      else params.delete('q')
      params.delete('page')

      const next = `${pathname}?${params.toString()}`
      if (next !== `${pathname}?${searchParams.toString()}`) router.replace(next)
    }, 350)
    return () => window.clearTimeout(timer)
    // `searchParams` is intentionally omitted: including it re-runs the effect
    // on the navigation this effect itself causes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, pathname, router])

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-10 w-full min-w-[200px] rounded-lg border border-hairline bg-white pl-9 pr-9 text-sm outline-none transition-colors focus:border-brand-400 focus:ring-4 focus:ring-brand-100 sm:w-64"
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded text-ink-400 hover:bg-ink-100 hover:text-ink-600"
          aria-label="Clear search"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
