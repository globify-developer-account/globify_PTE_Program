import { redirect } from 'next/navigation'
import { PracticePlayer } from '@/components/practice/practice-player'
import { requireStudent } from '@/lib/auth/guards'
import { loadSession } from '@/lib/practice'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Practice session',
  description: 'Answer each question and get scored the moment you submit.',
  path: '/practice',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function PracticeSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireStudent(`/practice/session/${id}`)

  // Ownership is enforced inside loadSession, which scopes on userId.
  const session = await loadSession(id, user.id)

  if (session.status === 'COMPLETED') {
    redirect(`/practice/session/${id}/summary`)
  }

  return <PracticePlayer session={session} />
}
