import Link from 'next/link'
import { MessagesSquare } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { TopicGallery, type GalleryTopic } from '@/components/conversations/topic-gallery'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { listConversations, listTopics } from '@/lib/conversations'
import { speechAvailable } from '@/lib/ai/speech'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'
import { relativeTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'AI conversations',
  description: 'Practise speaking English in a real conversation, without the pressure of a test.',
  path: '/conversations',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function ConversationsPage() {
  const user = await requireStudent('/conversations')
  const entitlements = await getEntitlements(user.id)
  const [topics, conversations, quota] = await Promise.all([
    listTopics(entitlements),
    listConversations(user.id, 8),
    getQuota(user.id, 'ai_conversation', entitlements),
  ])

  const gallery: GalleryTopic[] = topics.map((topic) => ({
    id: topic.id,
    slug: topic.slug,
    title: topic.title,
    subtitle: topic.subtitle,
    category: topic.category,
    level: topic.level,
    emoji: topic.emoji,
    personaName: topic.personaName,
    goals: topic.goals,
    isPremium: topic.isPremium,
    locked: topic.locked,
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">AI conversations</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
            Talk without stressing over perfect grammar, pronunciation or vocabulary. Speak or type, mix
            languages if it helps, and get a written report when you are done.
          </p>
        </div>
        <span className="shrink-0 text-sm text-ink-500">
          {quota.unlimited ? (
            <span className="text-green-700">Unlimited conversations</span>
          ) : (
            `${quota.remaining} of ${quota.limit} left this month`
          )}
        </span>
      </div>

      {env.demoMode ? (
        <Card>
          <CardBody className="bg-amber-50/60">
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">Demo mode is on.</strong> You are talking to the built-in
              simulated partner, which follows rules rather than understanding you. Set{' '}
              <code className="font-mono text-xs">AI_PROVIDER</code> and{' '}
              <code className="font-mono text-xs">AI_API_KEY</code> to use a live provider.
              {!speechAvailable() ? ' Replies are read aloud by your browser’s own voice.' : ''}
            </p>
          </CardBody>
        </Card>
      ) : null}

      {conversations.length > 0 ? (
        <section>
          <h3 className="text-sm font-semibold text-navy-900">Pick up where you left off</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {conversations.map((conversation) => (
              <Link
                key={conversation.id}
                href={`/conversations/${conversation.id}`}
                className="rounded-xl border border-hairline bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl leading-none" aria-hidden>
                    {conversation.topic?.emoji ?? '💬'}
                  </span>
                  {conversation.status === 'ACTIVE' ? (
                    <Badge tone="brand" size="sm">
                      In progress
                    </Badge>
                  ) : conversation.report ? (
                    <span className="tabular text-sm font-semibold text-navy-900">
                      {conversation.report.estimatedScore}
                      <span className="text-xs font-normal text-ink-400">/90</span>
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 truncate text-sm font-medium text-navy-900">{conversation.title}</p>
                <p className="mt-1 text-xs text-ink-400">
                  {conversation.userTurns} turn{conversation.userTurns === 1 ? '' : 's'} ·{' '}
                  {relativeTime(conversation.lastMessageAt)}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {gallery.length > 0 ? (
        <TopicGallery topics={gallery} canStart={quota.allowed} />
      ) : (
        <EmptyState
          title="No conversation topics yet"
          description="Run the seed script to publish the starter conversation topics."
          icon={<MessagesSquare className="size-5" aria-hidden />}
        />
      )}

      {!quota.allowed && !entitlements.isPremium ? (
        <UpgradePrompt
          title="Unlimited AI conversations"
          description={`You have used all ${quota.limit} free conversations this month. Premium removes the cap, so you can practise speaking as often as you like.`}
        />
      ) : null}

      <AiEstimateNote />
    </div>
  )
}
