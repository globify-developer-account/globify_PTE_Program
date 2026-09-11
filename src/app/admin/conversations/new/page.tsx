import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConversationTopicEditor, EMPTY_TOPIC } from '@/components/admin/conversation-topic-editor'
import { requireStaff } from '@/lib/auth/guards'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'New conversation topic',
  description: 'Author a speaking scenario.',
  path: '/admin/conversations/new',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function NewConversationTopicPage() {
  await requireStaff('content.manage')

  return (
    <div className="space-y-5">
      <Link
        href="/admin/conversations"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Conversation topics
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">New conversation topic</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Write it as a scene: a person with a reason to be talking, and an opening line the student can
          answer straight away.
        </p>
      </div>

      <ConversationTopicEditor initial={EMPTY_TOPIC} />
    </div>
  )
}
