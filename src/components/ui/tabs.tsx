'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export interface TabItem {
  key: string
  label: ReactNode
  content?: ReactNode
  count?: number
}

export function Tabs({ items, defaultKey, className }: { items: TabItem[]; defaultKey?: string; className?: string }) {
  const [active, setActive] = useState(defaultKey ?? items[0]?.key ?? '')
  const current = items.find((item) => item.key === active)

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-hairline scrollbar-slim">
        {items.map((item) => (
          <button
            key={item.key}
            role="tab"
            type="button"
            aria-selected={item.key === active}
            onClick={() => setActive(item.key)}
            className={cn(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              item.key === active
                ? 'border-brand-600 text-brand-700'
                : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-navy-900',
            )}
          >
            {item.label}
            {typeof item.count === 'number' ? (
              <span className="ml-2 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600 tabular">
                {item.count}
              </span>
            ) : null}
          </button>
        ))}
      </div>
      {current?.content ? <div className="pt-5">{current.content}</div> : null}
    </div>
  )
}

/** URL-driven tabs — keeps admin filters shareable and back-button friendly. */
export function LinkTabs({
  items,
  paramName = 'tab',
  className,
}: {
  items: Array<{ key: string; label: ReactNode; count?: number }>
  paramName?: string
  className?: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get(paramName) ?? items[0]?.key

  function hrefFor(key: string): string {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, key)
    params.delete('page')
    return `${pathname}?${params.toString()}`
  }

  return (
    <div className={cn('flex gap-1 overflow-x-auto border-b border-hairline scrollbar-slim', className)}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={hrefFor(item.key)}
          className={cn(
            '-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
            item.key === active
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-ink-500 hover:border-ink-200 hover:text-navy-900',
          )}
        >
          {item.label}
          {typeof item.count === 'number' ? (
            <span className="ml-2 rounded-full bg-ink-100 px-1.5 py-0.5 text-[11px] text-ink-600 tabular">
              {item.count}
            </span>
          ) : null}
        </Link>
      ))}
    </div>
  )
}
