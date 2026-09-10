'use client'

import { ArrowRight, Gauge, RotateCcw } from 'lucide-react'
import type { DrillFeedback } from '@/lib/drills'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/charts/score-ring'
import { DiffLegend, WordDiff } from './word-diff'
import { cn } from '@/lib/utils'

const BAND_COPY = {
  excellent: { label: 'Excellent', note: 'You caught the whole line.' },
  good: { label: 'Good', note: 'Close — a couple of words to tighten up.' },
  fair: { label: 'Getting there', note: 'Replay the line and listen for the words in amber.' },
  poor: { label: 'Keep going', note: 'Slow the clip to 0.6× and work through it phrase by phrase.' },
} as const

const BAND_COLOR = {
  excellent: 'var(--color-success)',
  good: 'var(--color-brand-600)',
  fair: 'var(--color-warning)',
  poor: 'var(--color-danger)',
} as const

const PACE_COPY = {
  slow: 'Slower than the recording — try to keep up with the speaker rather than finishing each word.',
  good: 'Your pace matched the recording well.',
  fast: 'Faster than the recording. Shadowing works best at the speaker’s own speed.',
} as const

export function DrillFeedbackPanel({
  feedback,
  onRetry,
  onNext,
  isLast,
}: {
  feedback: DrillFeedback
  onRetry: () => void
  onNext: () => void
  isLast: boolean
}) {
  const band = BAND_COPY[feedback.band]
  const color = BAND_COLOR[feedback.band]

  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-navy-900">{band.label}</p>
          <p className="mt-1 text-sm text-ink-500">
            {feedback.inaudible
              ? 'We could not make out any speech in that recording. Check your microphone and try the line again.'
              : band.note}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-semibold leading-none tabular" style={{ color }}>
            {feedback.accuracy}%
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {feedback.correct} of {feedback.total} words
          </p>
        </div>
      </div>

      <Meter value={feedback.accuracy} max={100} color={color} className="mt-4" height={6} />

      <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-hairline pt-4">
        <Stat label="Wrong" value={feedback.wrong} tone={feedback.wrong > 0 ? 'danger' : 'muted'} />
        <Stat label="Missed" value={feedback.missing} tone={feedback.missing > 0 ? 'warning' : 'muted'} />
        <Stat label="Extra" value={feedback.extra} tone="muted" />
      </dl>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">
          {feedback.mode === 'DICTATION' ? 'Your answer against the line' : 'What we heard'}
        </h4>
        <div className="mt-2.5 rounded-lg border border-hairline bg-ink-50/60 p-4">
          <WordDiff tokens={feedback.tokens} />
        </div>
        <DiffLegend className="mt-2.5" />
      </div>

      <div className="mt-5">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-400">The line was</h4>
        <p className="mt-2 text-[15px] leading-relaxed text-navy-900">{feedback.expectedText}</p>
      </div>

      {feedback.mode === 'SHADOWING' && feedback.pace ? (
        <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-hairline bg-ink-50/60 p-4">
          <Gauge className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-900">
              {feedback.wordsPerMinute} words per minute
              {feedback.referenceWordsPerMinute
                ? ` · the recording runs at about ${feedback.referenceWordsPerMinute}`
                : ''}
            </p>
            <p className="mt-1 text-sm text-ink-500">{PACE_COPY[feedback.pace]}</p>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
        <Button variant="secondary" onClick={onRetry}>
          <RotateCcw aria-hidden />
          Try this line again
        </Button>
        <Button onClick={onNext}>
          {isLast ? 'Finish' : 'Next line'}
          <ArrowRight aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'danger' | 'warning' | 'muted'
}) {
  return (
    <div>
      <dt className="text-xs text-ink-400">{label}</dt>
      <dd
        className={cn(
          'mt-0.5 text-lg font-semibold tabular',
          tone === 'danger' && 'text-danger',
          tone === 'warning' && 'text-amber-700',
          tone === 'muted' && 'text-ink-600',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
