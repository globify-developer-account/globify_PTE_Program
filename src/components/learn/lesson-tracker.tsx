'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import type { LessonState } from '@prisma/client'
import { Button, ButtonLink } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

const HEARTBEAT_MS = 60_000

/**
 * Time-on-lesson tracker and the completion control.
 *
 * Time is counted in whole minutes and only while the tab is visible, so a
 * lesson left open overnight does not report eight hours of study. The count
 * is also flushed when the tab is hidden, because `beforeunload` is not
 * reliable on mobile.
 */
export function LessonTracker({
  lessonId,
  initialState,
  nextHref,
  courseHref,
}: {
  lessonId: string
  initialState: LessonState
  nextHref: string | null
  courseHref: string
}) {
  const router = useRouter()
  const [state, setState] = useState<LessonState>(initialState)
  const [saving, setSaving] = useState(false)
  const pendingRef = useRef(0)

  const send = useCallback(
    async (body: { state?: LessonState; secondsSpent?: number }, keepalive = false) => {
      try {
        await fetch(`/api/learn/lessons/${lessonId}/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          keepalive,
        })
      } catch {
        // A dropped heartbeat costs a minute of reported study time. It is not
        // worth interrupting the lesson with an error toast.
      }
    },
    [lessonId],
  )

  // Opening a lesson is what starts it.
  useEffect(() => {
    if (initialState === 'NOT_STARTED') void send({ state: 'IN_PROGRESS' })
  }, [initialState, send])

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      pendingRef.current += HEARTBEAT_MS / 1000
      const seconds = pendingRef.current
      pendingRef.current = 0
      void send({ secondsSpent: seconds })
    }, HEARTBEAT_MS)

    const flush = () => {
      if (document.visibilityState === 'visible' || pendingRef.current === 0) return
      const seconds = pendingRef.current
      pendingRef.current = 0
      void send({ secondsSpent: seconds }, true)
    }

    document.addEventListener('visibilitychange', flush)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [send])

  async function complete() {
    setSaving(true)
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: 'COMPLETED', secondsSpent: pendingRef.current }),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not save your progress', payload.error)
        return
      }
      pendingRef.current = 0
      setState('COMPLETED')
      notify.success('Lesson complete', `You are ${payload.data.percentComplete}% through this course.`)
      router.refresh()
    } catch {
      notify.error('Could not save your progress', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-white p-4">
      {state === 'COMPLETED' ? (
        <p className="flex items-center gap-2 text-sm font-medium text-green-700">
          <CheckCircle2 className="size-4" aria-hidden />
          Lesson complete
        </p>
      ) : (
        <p className="text-sm text-ink-500">Finished with this lesson?</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {state === 'COMPLETED' ? null : (
          <Button size="sm" onClick={() => void complete()} loading={saving}>
            Mark as complete
          </Button>
        )}
        {nextHref ? (
          <ButtonLink href={nextHref} size="sm" variant={state === 'COMPLETED' ? 'primary' : 'secondary'}>
            Next lesson
            <ArrowRight aria-hidden />
          </ButtonLink>
        ) : (
          <ButtonLink href={courseHref} size="sm" variant="secondary">
            Back to course
          </ButtonLink>
        )}
      </div>
    </div>
  )
}
