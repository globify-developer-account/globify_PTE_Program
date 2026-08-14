'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Starts a practice session and navigates into the player.
 *
 * The session — including which questions it contains — is created entirely on
 * the server. This button only says what kind of practice was asked for.
 */
export function StartPracticeButton({
  section,
  typeCode,
  count = 5,
  label = 'Start practice',
  variant,
  size,
  block,
}: {
  section?: string
  typeCode?: string
  count?: number
  label?: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  block?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    try {
      const response = await fetch('/api/practice/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section, typeCode, count }),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error(
          response.status === 402 ? 'Daily limit reached' : 'Could not start practice',
          payload.error,
        )
        if (response.status === 402) router.push('/pricing')
        return
      }

      router.push(`/practice/session/${payload.data.sessionId}`)
    } catch {
      notify.error('Could not start practice', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={start} loading={loading} variant={variant} size={size} block={block}>
      {loading ? null : <PlayCircle aria-hidden />}
      {loading ? 'Starting…' : label}
    </Button>
  )
}
