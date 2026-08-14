'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Clock, Loader2 } from 'lucide-react'
import type { MockRunState } from '@/lib/mock-tests'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { notify } from '@/components/ui/toast'
import { QuestionRenderer } from '@/components/practice/renderers'
import { emptyDraft, hasAnswer, type AnswerDraft } from '@/components/practice/types'
import { SECTION_META } from '@/lib/pte/question-types'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Mock test runner.
 *
 * Differs from the practice player in three ways that matter: there is no
 * feedback between questions, the clock runs per section rather than per
 * question, and running out of time advances automatically. That is what makes
 * the resulting score comparable to a real sitting.
 */
export function MockRunner({ run }: { run: MockRunState }) {
  const router = useRouter()

  const flat = useMemo(
    () =>
      run.sections.flatMap((section, sectionIndex) =>
        section.questions.map((item, questionIndex) => ({
          ...item,
          section,
          sectionIndex,
          questionIndex,
        })),
      ),
    [run.sections],
  )

  const firstOpen = 0
  const [index, setIndex] = useState(firstOpen)
  const [draft, setDraft] = useState<AnswerDraft>(emptyDraft)
  const [submitting, setSubmitting] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sectionRemaining, setSectionRemaining] = useState(run.sections[0]?.durationSeconds ?? 0)

  const current = flat[index]
  const isLast = index >= flat.length - 1
  const startedAt = useRef(Date.now())

  useEffect(() => {
    setDraft(emptyDraft)
    startedAt.current = Date.now()
  }, [index])

  // Reset the clock when the section changes.
  const sectionIndex = current?.sectionIndex ?? 0
  useEffect(() => {
    setSectionRemaining(run.sections[sectionIndex]?.durationSeconds ?? 0)
  }, [sectionIndex, run.sections])

  const advance = useCallback(() => {
    if (isLast) {
      setConfirmOpen(true)
      return
    }
    setIndex((value) => value + 1)
  }, [isLast])

  // Section countdown. Reaching zero jumps to the next section rather than
  // ending the test — the same behaviour as the real exam.
  useEffect(() => {
    if (sectionRemaining <= 0) {
      const nextSectionStart = flat.findIndex((item) => item.sectionIndex > sectionIndex)
      if (nextSectionStart === -1) setConfirmOpen(true)
      else setIndex(nextSectionStart)
      return
    }
    const timer = window.setTimeout(() => setSectionRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [sectionRemaining, sectionIndex, flat])

  async function submitAndAdvance() {
    if (!current || submitting) return
    setSubmitting(true)

    try {
      let audioKey: string | undefined
      if (draft.audio) {
        const form = new FormData()
        form.append('audio', draft.audio.blob, 'recording.webm')
        const uploadResponse = await fetch(`/api/practice/attempts/${current.attemptId}/audio`, {
          method: 'POST',
          body: form,
        })
        const uploadPayload = await uploadResponse.json()
        if (uploadResponse.ok) audioKey = uploadPayload.data.key
      }

      const response = await fetch(`/api/practice/attempts/${current.attemptId}/submit`, {
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

      if (!response.ok) {
        const payload = await response.json()
        // A quota or scoring failure must not strand the candidate mid-test —
        // the answer is recorded either way and the test continues.
        notify.warning('This answer could not be scored', payload.error)
      }
    } catch {
      notify.warning('This answer could not be scored', 'It has been saved and the test will continue.')
    } finally {
      setSubmitting(false)
      advance()
    }
  }

  async function finish() {
    setFinishing(true)
    try {
      const response = await fetch(`/api/mock-tests/sessions/${run.sessionId}/finish`, { method: 'POST' })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not finish the test', payload.error)
        return
      }
      router.push(`/mock-tests/results/${run.sessionId}`)
      router.refresh()
    } catch {
      notify.error('Could not finish the test', 'Check your connection and try again.')
    } finally {
      setFinishing(false)
    }
  }

  if (!current) {
    return (
      <div className="surface-card p-10 text-center">
        <p className="text-sm text-ink-500">This mock test has no questions.</p>
        <Button className="mt-4" onClick={() => router.push('/mock-tests')}>
          Back to mock tests
        </Button>
      </div>
    )
  }

  const meta = SECTION_META[current.section.section]
  const answered = hasAnswer(current.question, draft)
  const lowTime = sectionRemaining <= 120

  return (
    <div className="mx-auto max-w-3xl">
      {/* Exam header */}
      <div className="sticky top-16 z-10 -mx-4 mb-6 border-b border-hairline bg-ink-50/95 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-semibold text-navy-900">
              <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
              {current.section.title}
            </p>
            <p className="text-xs text-ink-500">
              Question {index + 1} of {flat.length} · {current.question.typeName}
            </p>
          </div>

          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular',
              lowTime ? 'bg-red-50 text-danger' : 'bg-navy-900 text-white',
            )}
            aria-live={lowTime ? 'assertive' : 'off'}
          >
            <Clock className="size-4" aria-hidden />
            {formatDuration(sectionRemaining)}
          </span>
        </div>

        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-ink-200">
          <div
            className="h-full rounded-full bg-brand-600 transition-[width] duration-300"
            style={{ width: `${((index + 1) / flat.length) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="mb-4 text-lg font-semibold text-navy-900">{current.question.title}</h2>

      <QuestionRenderer
        question={current.question}
        value={draft}
        onChange={setDraft}
        disabled={submitting}
      />

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-5">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="text-sm font-medium text-ink-500 hover:text-danger"
        >
          End test early
        </button>

        <Button onClick={submitAndAdvance} disabled={submitting} size="lg">
          {submitting ? <Loader2 className="animate-spin" aria-hidden /> : null}
          {submitting ? 'Saving…' : isLast ? 'Save and finish' : answered ? 'Save and next' : 'Skip and next'}
          {!submitting ? <ChevronRight aria-hidden /> : null}
        </Button>
      </div>

      <p className="mt-3 text-right text-xs text-ink-400">
        You cannot return to a question once you move on, exactly as in the real test.
      </p>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Finish this mock test?"
        description="Unanswered questions are scored as zero, which is what happens in the real exam."
      >
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden />
          <p className="text-sm text-amber-900">
            {flat.length - index - 1 > 0
              ? `${flat.length - index - 1} question${flat.length - index - 1 === 1 ? '' : 's'} remaining.`
              : 'All questions have been reached.'}{' '}
            Your result is generated immediately and cannot be undone.
          </p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={finishing}>
            Keep going
          </Button>
          <Button onClick={finish} loading={finishing}>
            {finishing ? 'Scoring…' : 'Finish and see my result'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
