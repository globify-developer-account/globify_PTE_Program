'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { DiffToken } from '@/lib/text-diff'

/**
 * Renders the three ways a student needs to read their rewrite: what they
 * wrote, what changed, and what the finished piece looks like.
 *
 * "Tracked" is the default because it is the only one that teaches anything —
 * the polished version on its own is the version a student copies without
 * learning why it is better.
 */

type Mode = 'tracked' | 'original' | 'improved'

const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'tracked', label: 'Tracked changes' },
  { key: 'original', label: 'Your draft' },
  { key: 'improved', label: 'Improved' },
]

export function DiffView({
  diff,
  original,
  improved,
  className,
}: {
  diff: DiffToken[]
  original: string
  improved: string
  className?: string
}) {
  const [mode, setMode] = useState<Mode>('tracked')

  const body = useMemo(() => {
    if (mode === 'original') return <span className="whitespace-pre-wrap">{original}</span>
    if (mode === 'improved') return <span className="whitespace-pre-wrap">{improved}</span>
    return (
      <span className="whitespace-pre-wrap">
        {diff.map((token, index) => {
          if (token.op === 'equal') return <span key={index}>{token.value}</span>
          if (token.op === 'delete') {
            return (
              <del
                key={index}
                className="rounded bg-red-50 text-red-700 decoration-red-400 decoration-1"
                title="Removed"
              >
                {token.value}
              </del>
            )
          }
          return (
            <ins
              key={index}
              className="rounded bg-green-50 font-medium text-green-800 no-underline"
              title="Added"
            >
              {token.value}
            </ins>
          )
        })}
      </span>
    )
  }, [diff, improved, mode, original])

  return (
    <div className={cn('rounded-xl border border-hairline', className)}>
      <div
        className="flex flex-wrap items-center gap-1 border-b border-hairline p-1.5"
        role="tablist"
        aria-label="How to view the rewrite"
      >
        {MODES.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={mode === item.key}
            onClick={() => setMode(item.key)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              mode === item.key ? 'bg-navy-900 text-white' : 'text-ink-600 hover:bg-ink-100',
            )}
          >
            {item.label}
          </button>
        ))}

        {mode === 'tracked' ? (
          <p className="ml-auto pr-2 text-[11px] text-ink-400">
            <span className="text-red-600">struck through</span> removed ·{' '}
            <span className="text-green-700">highlighted</span> added
          </p>
        ) : null}
      </div>

      <div className="max-h-[420px] overflow-y-auto p-4 text-sm leading-relaxed text-ink-700">{body}</div>
    </div>
  )
}
