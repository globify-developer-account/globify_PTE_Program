'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Runs the lesson's attached questions through the normal practice player.
 *
 * The session is built server-side from the questions the author attached, so
 * the drill is scored by exactly the same engine as the rest of the platform.
 */
export function StartDrillButton({ lessonId, count }: { lessonId: string; count: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    try {
      const response = await fetch(`/api/learn/lessons/${lessonId}/drill`, { method: 'POST' })
      const payload = await response.json()

      if (!response.ok) {
        notify.error(
          response.status === 402 ? 'Daily limit reached' : 'Could not start this drill',
          payload.error,
        )
        if (response.status === 402) router.push('/pricing')
        return
      }

      router.push(`/practice/session/${payload.data.sessionId}`)
    } catch {
      notify.error('Could not start this drill', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={start} loading={loading} size="sm">
      {loading ? null : <Dumbbell aria-hidden />}
      {loading ? 'Starting…' : `Practise ${count} question${count === 1 ? '' : 's'}`}
    </Button>
  )
}
