'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useId, useRef, useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import type { QuestionSearchHit } from '@/app/api/practice/search/route'
import { cn } from '@/lib/utils'

/**
 * Look up a task by the reference students quote ("RA 677") or by a phrase
 * from its text.
 *
 * Requests are debounced and every in-flight one is abandoned when a newer
 * keystroke supersedes it, so a slow response cannot overwrite the results
 * for text the learner has already moved past.
 */
export function QuestionSearch({ className }: { className?: string }) {
  const router = useRouter()
  const listId = useId()
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<QuestionSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setHits([])
      setLoading(false)
      setFailed(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/practice/search?q=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error('Search failed')
        const payload = (await response.json()) as { data: { hits: QuestionSearchHit[] } }
        setHits(payload.data.hits)
        setFailed(false)
        setOpen(true)
      } catch (error) {
        // An abort is the expected outcome for a superseded keystroke, not a
        // failure worth showing.
        if ((error as Error).name === 'AbortError') return
        setHits([])
        setFailed(true)
        setOpen(true)
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }, 250)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
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

  const showPanel = open && query.trim().length >= 2

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-ink-400"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Question content or number — try “RA 677”"
          aria-label="Search questions"
          /* An input's implicit role is textbox, which does not take
             aria-expanded. combobox is the role that owns a results popup. */
          role="combobox"
          aria-autocomplete="list"
          aria-controls={showPanel ? listId : undefined}
          aria-expanded={showPanel}
          className="h-12 w-full rounded-full border border-hairline bg-white pl-11 pr-11 text-sm text-navy-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-300 focus:ring-4 focus:ring-brand-50"
        />
        {loading ? (
          <Loader2
            className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-400"
            aria-hidden
          />
        ) : null}
      </div>

      {showPanel ? (
        <div
          id={listId}
          className="absolute inset-x-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-xl border border-hairline bg-white shadow-lift"
        >
          {failed ? (
            <p className="px-4 py-3.5 text-sm text-ink-500">
              Search is unavailable right now. Please try again.
            </p>
          ) : hits.length === 0 ? (
            <p className="px-4 py-3.5 text-sm text-ink-500">
              {loading ? 'Searching…' : 'No questions match that.'}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false)
                      router.push(hit.href)
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-ink-50"
                  >
                    <span className="shrink-0 rounded bg-brand-50 px-2 py-1 text-[11px] font-semibold tabular-nums text-brand-700">
                      {hit.label}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-700">{hit.title}</span>
                    <span className="shrink-0 text-xs text-ink-400">{hit.sectionLabel}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  )
}
