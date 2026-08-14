'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Clock, Loader2, SkipForward, X } from 'lucide-react'
import type { ScoredAttempt } from '@/lib/attempt-scoring'
import type { SessionState } from '@/lib/practice'
import { Button } from '@/components/ui/button'
import { UpgradePrompt } from '@/components/ui/states'
import { notify } from '@/components/ui/toast'
import { QuestionRenderer } from './renderers'
import { AttemptResult } from './attempt-result'
import { emptyDraft, hasAnswer, type AnswerDraft } from './types'
import { SECTION_META } from '@/lib/pte/question-types'
import { cn, formatDuration } from '@/lib/utils'

/**
 * The practice player.
 *
 * One question at a time: answer, submit, read the result, move on. Nothing in
 * this component decides a score — it posts the answer and renders whatever the
 * server sends back. The answer key is not in the page until after submission.
 */
export function PracticePlayer({ session }: { session: SessionState }) {
  const router = useRouter()

  const firstUnanswered = Math.max(
    0,
    session.items.findIndex((item) => item.status !== 'SCORED' && item.status !== 'SKIPPED'),
  )

  const [index, setIndex] = useState(firstUnanswered === -1 ? 0 : firstUnanswered)
  const [draft, setDraft] = useState<AnswerDraft>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<ScoredAttempt | null>(null)
  const [paywall, setPaywall] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)

  const item = session.items[index]
  const isLast = index >= session.items.length - 1
  const startedAt = useRef(Date.now())

  // Reset per-question state whenever the question changes.
  useEffect(() => {
    setDraft(emptyDraft)
    setResult(null)
    setElapsed(0)
    startedAt.current = Date.now()
  }, [index])

  // Elapsed-time ticker. Speaking tasks run their own recorder countdown, so
  // this is a stopwatch rather than an enforced limit outside a mock test.
  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [result, index])

  const submit = useCallback(async () => {
    if (!item || submitting) return
    setSubmitting(true)
    setPaywall(null)

    try {
      let audioKey: string | undefined
      if (draft.audio) {
        const form = new FormData()
        form.append('audio', draft.audio.blob, 'recording.webm')
        const uploadResponse = await fetch(`/api/practice/attempts/${item.attemptId}/audio`, {
          method: 'POST',
          body: form,
        })
        const uploadPayload = await uploadResponse.json()
        if (!uploadResponse.ok) throw new PlayerError(uploadPayload.error, uploadResponse.status)
        audioKey = uploadPayload.data.key
      }

      const response = await fetch(`/api/practice/attempts/${item.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: draft.text || undefined,
          selection: draft.selection,
          audioUrl: audioKey,
          audioDurationMs: draft.audio?.durationMs,
          timeSpentSeconds: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        if (response.status === 402) {
          setPaywall(payload.error)
          return
        }
        throw new PlayerError(payload.error, response.status)
      }

      setResult(payload.data as ScoredAttempt)
    } catch (error) {
      notify.error(
        'Could not submit your answer',
        error instanceof PlayerError ? error.message : 'Check your connection and try again.',
      )
    } finally {
      setSubmitting(false)
    }
  }, [draft, item, submitting])

  function next() {
    if (isLast) {
      router.push(`/practice/session/${session.id}/summary`)
      router.refresh()
      return
    }
    setIndex((value) => value + 1)
  }

  if (!item) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-ink-500">This session has no questions.</p>
        <Button className="mt-4" onClick={() => router.push('/practice')}>
          Back to practice
        </Button>
      </div>
    )
  }

  const meta = SECTION_META[item.question.section]
  const answered = hasAnswer(item.question, draft)

  return (
    <div className="mx-auto max-w-3xl">
      {/* Progress header */}
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-hairline bg-ink-50/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/practice"
              className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100"
              aria-label="Leave practice"
            >
              <X className="size-4" aria-hidden />
            </Link>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate text-sm font-semibold text-navy-900">
                <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                {item.question.typeName}
              </p>
              <p className="text-xs text-ink-500">
                Question {index + 1} of {session.items.length}
              </p>
            </div>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium tabular',
              item.question.timeLimitSeconds && elapsed > item.question.timeLimitSeconds
                ? 'bg-amber-50 text-amber-700'
                : 'bg-ink-100 text-ink-600',
            )}
          >
            <Clock className="size-3.5" aria-hidden />
            {formatDuration(elapsed)}
            {item.question.timeLimitSeconds ? ` / ${formatDuration(item.question.timeLimitSeconds)}` : ''}
          </span>
        </div>

        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
            style={{ width: `${((index + (result ? 1 : 0)) / session.items.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Body */}
      {result ? (
        <AttemptResult result={result} question={item.question} onNext={next} isLast={isLast} />
      ) : paywall ? (
        <div className="space-y-4">
          <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{paywall}</p>
          <UpgradePrompt />
          <div className="flex justify-center">
            <Button variant="secondary" onClick={() => router.push('/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h2 className="mb-4 text-lg font-semibold text-navy-900">{item.question.title}</h2>

          <QuestionRenderer
            question={item.question}
            value={draft}
            onChange={setDraft}
            disabled={submitting}
          />

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700 disabled:opacity-50"
            >
              <SkipForward className="size-4" aria-hidden />
              Skip this question
            </button>

            <Button onClick={submit} disabled={!answered || submitting} size="lg">
              {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
              {submitting ? 'Scoring…' : 'Submit answer'}
            </Button>
          </div>

          {!answered ? (
            <p className="mt-3 text-right text-xs text-ink-400">
              {item.question.section === 'SPEAKING'
                ? 'Record your answer to enable submit.'
                : 'Answer the question to enable submit.'}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

class PlayerError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message || 'Something went wrong.')
  }
}
