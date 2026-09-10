'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlayCircle } from 'lucide-react'
import { Button, type ButtonProps } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'

/**
 * Enrols the student and opens the lesson they should be on.
 *
 * Enrolment is implicit — nobody wants a sign-up step in front of a free
 * lesson — so this records the enrolment and navigates in one action.
 */
export function StartCourseButton({
  slug,
  lessonSlug,
  label,
  variant,
  size,
  block,
}: {
  slug: string
  lessonSlug: string
  label: string
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
  block?: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function start() {
    setLoading(true)
    try {
      const response = await fetch(`/api/learn/courses/${slug}/enroll`, { method: 'POST' })
      if (!response.ok) {
        const payload = await response.json()
        notify.error('Could not open this course', payload.error)
        return
      }
      router.push(`/learn/${slug}/${lessonSlug}`)
    } catch {
      notify.error('Could not open this course', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={start} loading={loading} variant={variant} size={size} block={block}>
      {loading ? null : <PlayCircle aria-hidden />}
      {label}
    </Button>
  )
}
