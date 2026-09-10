'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Headphones, Keyboard, Loader2, Mic, SkipForward } from 'lucide-react'
import type { DrillFeedback, DrillModeProgress, PracticeDrill } from '@/lib/drills'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/field'
import { UpgradePrompt } from '@/components/ui/states'
import { notify } from '@/components/ui/toast'
import { AudioRecorder, type RecordedAudio } from '@/components/practice/audio-recorder'
import { SegmentPlayer } from './segment-player'
import { DrillFeedbackPanel } from './drill-feedback'
import { cn } from '@/lib/utils'

/**
 * Runs one drill, one line at a time.
 *
 * Switching mode is a page navigation rather than local state: in dictation the
 * server withholds every segment's text, so the shadowing view genuinely needs a
 * different payload. Flipping a boolean here would mean shipping the answers to
 * the browser and hiding them with CSS.
 */

type Mode = 'DICTATION' | 'SHADOWING'

interface Props {
  drill: PracticeDrill
  mode: Mode
  progress: DrillModeProgress | null
}

export function DrillRunner({ drill, mode, progress }: Props) {
  const router = useRouter()
  const [index, setIndex] = useState(0)
  const [text, setText] = useState('')
  const [recording, setRecording] = useState<RecordedAudio | null>(null)
  const [playCount, setPlayCount] = useState(0)
  const [feedback, setFeedback] = useState<DrillFeedback | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [paywall, setPaywall] = useState<string | null>(null)
  const [results, setResults] = useState<number[]>([])
  const [finished, setFinished] = useState(false)
  const startedAt = useRef(Date.now())
  const recorderRun = useRef(0)

  const segment = drill.segments[index]
  const isLast = index >= drill.segments.length - 1

  const reset = useCallback(() => {
    setText('')
    setRecording(null)
    setPlayCount(0)
    setFeedback(null)
    setPaywall(null)
    startedAt.current = Date.now()
    recorderRun.current += 1
  }, [])

  const submit = useCallback(async () => {
    if (!segment || submitting) return
    setSubmitting(true)
    setPaywall(null)

    try {
      const timeSpentSeconds = Math.round((Date.now() - startedAt.current) / 1000)
      let response: Response

      if (mode === 'DICTATION') {
        response = await fetch(`/api/drills/${drill.slug}/dictation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segmentId: segment.id, text, playCount, timeSpentSeconds }),
        })
      } else {
        if (!recording) return
        const form = new FormData()
        form.append('audio', recording.blob, 'shadowing.webm')
        form.append('segmentId', segment.id)
        form.append('audioDurationMs', String(recording.durationMs))
        form.append('playCount', String(playCount))
        form.append('timeSpentSeconds', String(timeSpentSeconds))
        response = await fetch(`/api/drills/${drill.slug}/shadowing`, { method: 'POST', body: form })
      }

      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          setPaywall(payload.error)
          return
        }
        throw new Error(payload.error || 'Something went wrong.')
      }

      const result = payload.data as DrillFeedback
      setFeedback(result)
      setResults((previous) => [...previous, result.accuracy])
    } catch (error) {
      notify.error(
        'Could not check that line',
        error instanceof Error ? error.message : 'Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [drill.slug, mode, playCount, recording, segment, submitting, text])

  const goTo = useCallback(
    (next: number) => {
      reset()
      setIndex(next)
    },
    [reset],
  )

  const advance = useCallback(() => {
    if (isLast) {
      setFinished(true)
      // The library cards read from DrillProgress, which this run has changed.
      router.refresh()
      return
    }
    goTo(index + 1)
  }, [goTo, index, isLast, router])

  const average = useMemo(
    () => (results.length === 0 ? 0 : Math.round(results.reduce((a, b) => a + b, 0) / results.length)),
    [results],
  )

  if (!drill.audioUrl) {
    return (
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        The recording for this exercise is unavailable. Please try again shortly.
      </p>
    )
  }

  if (finished) {
    return (
      <div className="rounded-xl border border-hairline bg-white p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
          <Check className="size-5" aria-hidden />
        </div>
        <h3 className="text-base font-semibold text-navy-900">
          {drill.segments.length} line{drill.segments.length === 1 ? '' : 's'} done
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-500">
          You answered {results.length} of {drill.segments.length} lines this time, averaging {average}%
          accuracy.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setResults([])
              setFinished(false)
              goTo(0)
            }}
          >
            Practise again
          </Button>
          <Button onClick={() => router.push('/drills')}>Back to the library</Button>
        </div>
      </div>
    )
  }

  if (!segment) {
    return (
      <p className="rounded-xl border border-hairline bg-white p-6 text-center text-sm text-ink-500">
        This exercise has no lines yet.
      </p>
    )
  }

  const canSubmit = mode === 'DICTATION' ? text.trim().length > 0 : recording !== null

  return (
    <div className="space-y-5">
      <ModeSwitch slug={drill.slug} mode={mode} />

      <SegmentStepper
        count={drill.segments.length}
        index={index}
        answered={results.length}
        onSelect={goTo}
        disabled={submitting}
      />

      <SegmentPlayer
        src={drill.audioUrl}
        startMs={segment.startMs}
        endMs={segment.endMs}
        onPlay={() => setPlayCount((value) => value + 1)}
        disabled={submitting}
      />

      {paywall ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{paywall}</p>
          <UpgradePrompt />
        </div>
      ) : feedback ? (
        <DrillFeedbackPanel
          feedback={feedback}
          onRetry={reset}
          onNext={advance}
          isLast={isLast}
        />
      ) : mode === 'DICTATION' ? (
        <div>
          <label htmlFor="dictation-answer" className="text-sm font-medium text-navy-900">
            Type the line exactly as you hear it
          </label>
          <p className="mt-1 text-xs text-ink-500">
            Capitals and punctuation are not marked — spelling is.
          </p>
          <Textarea
            id="dictation-answer"
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={submitting}
            rows={3}
            className="mt-2.5"
            placeholder="What did you hear?"
            autoFocus
          />
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium text-navy-900">Read this aloud with the recording</p>
            <p className="mt-2 rounded-xl border border-hairline bg-white p-4 text-[17px] leading-relaxed text-navy-900">
              {segment.text}
            </p>
          </div>
          <AudioRecorder
            key={`${segment.id}-${recorderRun.current}`}
            preparationSeconds={null}
            timeLimitSeconds={Math.max(30, Math.ceil((segment.endMs - segment.startMs) / 1000) * 3)}
            onRecorded={setRecording}
            disabled={submitting}
          />
        </div>
      )}

      {!feedback && !paywall ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
          <button
            type="button"
            onClick={advance}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700 disabled:opacity-50"
          >
            <SkipForward className="size-4" aria-hidden />
            Skip this line
          </button>
          <Button onClick={submit} disabled={!canSubmit || submitting} size="lg">
            {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
            {submitting
              ? mode === 'DICTATION'
                ? 'Checking…'
                : 'Listening…'
              : mode === 'DICTATION'
                ? 'Check my answer'
                : 'Check my speaking'}
          </Button>
        </div>
      ) : null}

      {progress && progress.attempts > 0 && !feedback ? (
        <p className="text-center text-xs text-ink-400">
          Best so far on this exercise: {progress.bestAccuracy}% across {progress.attempts} attempt
          {progress.attempts === 1 ? '' : 's'}.
        </p>
      ) : null}
    </div>
  )
}

function ModeSwitch({ slug, mode }: { slug: string; mode: Mode }) {
  const options = [
    { key: 'DICTATION' as const, href: `/drills/${slug}?mode=dictation`, label: 'Dictation', icon: Keyboard },
    { key: 'SHADOWING' as const, href: `/drills/${slug}?mode=shadowing`, label: 'Shadowing', icon: Mic },
  ]

  return (
    <div className="inline-flex rounded-lg border border-hairline bg-white p-1" role="group" aria-label="Practice mode">
      {options.map((option) => {
        const Icon = option.icon
        const active = option.key === mode
        return (
          <Link
            key={option.key}
            href={option.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-sm font-medium transition-colors',
              active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-navy-900',
            )}
          >
            <Icon className="size-4" aria-hidden />
            {option.label}
          </Link>
        )
      })}
    </div>
  )
}

function SegmentStepper({
  count,
  index,
  answered,
  onSelect,
  disabled,
}: {
  count: number
  index: number
  answered: number
  onSelect: (next: number) => void
  disabled: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-1.5 text-sm font-medium text-navy-900">
          <Headphones className="size-4 text-ink-400" aria-hidden />
          Line {index + 1} of {count}
        </p>
        <p className="text-xs text-ink-500">{answered} answered</p>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {Array.from({ length: count }, (_, position) => (
          <button
            key={position}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(position)}
            aria-label={`Go to line ${position + 1}`}
            aria-current={position === index ? 'step' : undefined}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors disabled:opacity-50',
              position === index
                ? 'bg-brand-600'
                : position < index
                  ? 'bg-brand-200'
                  : 'bg-ink-200 hover:bg-ink-300',
            )}
          />
        ))}
      </div>
    </div>
  )
}
