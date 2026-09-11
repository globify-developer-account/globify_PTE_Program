import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { ConversationTopicEditor } from '@/components/admin/conversation-topic-editor'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Edit conversation topic',
  description: 'Edit a speaking scenario.',
  path: '/admin/conversations',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function EditConversationTopicPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireStaff('content.manage')
  const { id } = await params

  const topic = await prisma.conversationTopic.findUnique({
    where: { id },
    include: { _count: { select: { conversations: true } } },
  })
  if (!topic) notFound()

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
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{topic.title}</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          {topic._count.conversations} conversation{topic._count.conversations === 1 ? '' : 's'} held under
          this topic. Editing it does not change transcripts students have already been given.
        </p>
      </div>

      <ConversationTopicEditor
        initial={{
          id: topic.id,
          slug: topic.slug,
          title: topic.title,
          subtitle: topic.subtitle ?? '',
          description: topic.description ?? '',
          category: topic.category,
          level: topic.level,
          emoji: topic.emoji ?? '',
          personaName: topic.personaName,
          personaRole: topic.personaRole,
          scenario: topic.scenario,
          openingLine: topic.openingLine,
          goals: topic.goals.join('\n'),
          starterPhrases: topic.starterPhrases.join('\n'),
          targetLanguage: topic.targetLanguage.join('\n'),
          isPremium: topic.isPremium,
          status: topic.status,
          displayOrder: topic.displayOrder,
        }}
      />
    </div>
  )
}
