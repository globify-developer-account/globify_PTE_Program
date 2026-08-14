'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

export function StartMockButton({
  slug,
  resumeSessionId,
  attempts,
}: {
  slug: string
  resumeSessionId: string | null
  attempts: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function start() {
    if (resumeSessionId) {
      router.push(`/mock-tests/${slug}/run?session=${resumeSessionId}`)
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/mock-tests/${slug}/start`, { method: 'POST' })
      const payload = await response.json()

      if (!response.ok) {
        notify.error(
          response.status === 402 ? 'Mock test allowance reached' : 'Could not start the test',
          payload.error,
        )
        if (response.status === 402) router.push('/pricing')
        return
      }

      router.push(`/mock-tests/${slug}/run?session=${payload.data.sessionId}`)
    } catch {
      notify.error('Could not start the test', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={start} loading={loading} block variant={resumeSessionId ? 'navy' : 'primary'}>
      {loading ? null : resumeSessionId ? <RotateCcw aria-hidden /> : <PlayCircle aria-hidden />}
      {loading
        ? 'Preparing…'
        : resumeSessionId
          ? 'Resume test in progress'
          : attempts > 0
            ? 'Take it again'
            : 'Start mock test'}
    </Button>
  )
}
