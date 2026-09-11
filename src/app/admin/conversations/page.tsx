import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Conversations',
  description: 'Scenarios students practise speaking against.',
  path: '/admin/conversations',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const CATEGORY_LABELS: Record<string, string> = {
  DAILY_LIFE: 'Daily conversation',
  SOCIAL: 'Social',
  TRAVEL: 'Travel',
  WORK_AND_STUDY: 'Work & study',
  EXAM_PREP: 'Exam preparation',
  CUSTOM: 'Custom',
}

export default async function AdminConversationsPage() {
  await requireStaff('content.view')

  const [topics, held] = await Promise.all([
    prisma.conversationTopic.findMany({
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { conversations: true } } },
    }),
    prisma.conversation.count(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Conversation topics</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Scenarios students practise speaking against. {held} conversation{held === 1 ? '' : 's'} held so
            far.
          </p>
        </div>
        <ButtonLink href="/admin/conversations/new" size="sm">
          New topic
        </ButtonLink>
      </div>

      <Card>
        <CardHeader title={`${topics.length} topics`} />
        <DataTable
          rows={topics}
          rowKey={(topic) => topic.id}
          rowHref={(topic) => `/admin/conversations/${topic.id}`}
          empty={{
            title: 'No conversation topics yet',
            description: 'Run the seed script to publish the starter catalogue, or create one by hand.',
          }}
          columns={[
            {
              key: 'title',
              header: 'Topic',
              render: (topic) => (
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="text-lg leading-none" aria-hidden>
                    {topic.emoji ?? '💬'}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-navy-900">{topic.title}</p>
                    <p className="truncate font-mono text-xs text-ink-400">{topic.slug}</p>
                  </div>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              render: (topic) => (
                <span className="text-sm">{CATEGORY_LABELS[topic.category] ?? topic.category}</span>
              ),
            },
            {
              key: 'persona',
              header: 'Partner',
              secondary: true,
              render: (topic) => <span className="text-sm">{topic.personaName}</span>,
            },
            {
              key: 'level',
              header: 'Level',
              secondary: true,
              render: (topic) => <span className="text-sm capitalize">{topic.level.toLowerCase()}</span>,
            },
            {
              key: 'held',
              header: 'Held',
              align: 'right',
              secondary: true,
              render: (topic) => <span className="tabular text-sm">{topic._count.conversations}</span>,
            },
            {
              key: 'access',
              header: 'Access',
              secondary: true,
              render: (topic) =>
                topic.isPremium ? (
                  <Badge tone="brand" size="sm">
                    Premium
                  </Badge>
                ) : (
                  <Badge tone="neutral" size="sm">
                    Free
                  </Badge>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (topic) => (
                <Badge tone={statusTone(topic.status)} size="sm">
                  {humanizeStatus(topic.status)}
                </Badge>
              ),
            },
          ]}
        />
      </Card>

      <p className="text-sm text-ink-500">
        Archiving a topic hides it from students but keeps every conversation held under it readable.{' '}
        <Link href="/conversations" className="text-brand-600 hover:underline">
          See the student view
        </Link>
        .
      </p>
    </div>
  )
}
