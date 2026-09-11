import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { conflict, notFound, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { slugify } from '@/lib/utils'
import { conversationTopicUpdateSchema } from '@/lib/conversations/schemas'

export const runtime = 'nodejs'

export const PATCH = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('content.manage')
  const { id } = await context.params
  const input = await parseJson(request, conversationTopicUpdateSchema)

  const topic = await prisma.conversationTopic.findUnique({ where: { id } })
  if (!topic) throw notFound('That conversation topic does not exist.')

  const slug = input.slug ? slugify(input.slug) : topic.slug
  if (slug !== topic.slug) {
    const clash = await prisma.conversationTopic.findUnique({ where: { slug } })
    if (clash) throw conflict('A conversation topic with that slug already exists.')
  }

  const updated = await prisma.conversationTopic.update({
    where: { id },
    data: { ...input, slug },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'conversation_topic.updated',
    entity: 'ConversationTopic',
    entityId: updated.id,
    metadata: { slug: updated.slug, status: updated.status },
  })

  return ok({ topic: updated })
})

/**
 * Archives rather than deletes.
 *
 * Conversations reference the topic they were held under, and students keep
 * reading those transcripts and reports. Removing the row would strip that
 * context from history for the sake of tidying a list.
 */
export const DELETE = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('content.manage')
  const { id } = await context.params

  const topic = await prisma.conversationTopic.findUnique({ where: { id } })
  if (!topic) throw notFound('That conversation topic does not exist.')

  await prisma.conversationTopic.update({ where: { id }, data: { status: 'ARCHIVED' } })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'conversation_topic.archived',
    entity: 'ConversationTopic',
    entityId: topic.id,
    metadata: { slug: topic.slug },
  })

  return ok({ status: 'ARCHIVED' })
})
