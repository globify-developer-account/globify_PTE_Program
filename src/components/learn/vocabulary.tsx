'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react'
import type { VocabularyTerm } from '@/lib/pte/schemas'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/charts/score-ring'
import { cn } from '@/lib/utils'

/** Reference list — every term visible at once, for looking things up. */
export function VocabularyList({ terms }: { terms: VocabularyTerm[] }) {
  if (terms.length === 0) return null

  return (
    <dl className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-white">
      {terms.map((term) => (
        <div key={term.term} className="p-4">
          <dt className="flex flex-wrap items-baseline gap-2">
            <span className="text-[15px] font-semibold text-navy-900">{term.term}</span>
            {term.phonetic ? <span className="text-sm text-ink-400">{term.phonetic}</span> : null}
          </dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-ink-700">{term.definition}</dd>
          {term.example ? (
            <dd className="mt-2 border-l-2 border-brand-200 pl-3 text-sm italic leading-relaxed text-ink-500">
              {term.example}
            </dd>
          ) : null}
        </div>
      ))}
    </dl>
  )
}

/**
 * Flashcard deck — recall first, then check.
 *
 * The card starts on the term and hides the definition, because a deck that
 * shows both at once is just the reference list with extra clicks.
 */
export function FlashcardDeck({ terms }: { terms: VocabularyTerm[] }) {
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  if (terms.length === 0) return null
  const term = terms[Math.min(index, terms.length - 1)]!

  function move(delta: number) {
    setFlipped(false)
    setIndex((current) => Math.min(terms.length - 1, Math.max(0, current + delta)))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-ink-500">
          Card {index + 1} of {terms.length}
        </p>
        <Meter value={index + 1} max={terms.length} className="w-40" height={5} />
      </div>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        aria-live="polite"
        className={cn(
          'flex min-h-56 w-full flex-col items-center justify-center gap-3 rounded-xl border p-8 text-center transition-colors',
          flipped ? 'border-brand-200 bg-brand-50/40' : 'border-hairline bg-white hover:border-brand-200',
        )}
      >
        {flipped ? (
          <>
            <p className="text-[15px] leading-relaxed text-ink-700">{term.definition}</p>
            {term.example ? (
              <p className="text-sm italic leading-relaxed text-ink-500">{term.example}</p>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xl font-semibold text-navy-900">{term.term}</p>
            {term.phonetic ? <p className="text-sm text-ink-400">{term.phonetic}</p> : null}
            <p className="text-xs text-ink-400">Say it, define it, then tap to check</p>
          </>
        )}
      </button>

      <div className="flex items-center justify-between gap-3">
        <Button size="sm" variant="secondary" onClick={() => move(-1)} disabled={index === 0}>
          <ArrowLeft aria-hidden />
          Previous
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setFlipped((value) => !value)}>
          <RotateCcw aria-hidden />
          Flip
        </Button>
        <Button size="sm" variant="secondary" onClick={() => move(1)} disabled={index >= terms.length - 1}>
          Next
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}
