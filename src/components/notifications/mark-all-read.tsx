'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

export function MarkAllRead() {
  const router = useRouter()
  const [working, setWorking] = useState(false)

  async function markAll() {
    setWorking(true)
    try {
      const response = await fetch('/api/notifications/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!response.ok) {
        notify.error('Could not update', 'Please try again.')
        return
      }
      router.refresh()
    } finally {
      setWorking(false)
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={markAll} loading={working}>
      {working ? null : <CheckCheck aria-hidden />}
      Mark all read
    </Button>
  )
}
