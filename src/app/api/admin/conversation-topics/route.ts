import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { conflict, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { slugify } from '@/lib/utils'
import { conversationTopicSchema } from '@/lib/conversations/schemas'

export const runtime = 'nodejs'

export const GET = route(async () => {
  await requireApiStaff('content.view')
  const topics = await prisma.conversationTopic.findMany({
    orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
  })
  return ok({ topics })
})

export const POST = route(async (request) => {
  const staff = await requireApiStaff('content.manage')
  const input = await parseJson(request, conversationTopicSchema)

  const slug = slugify(input.slug || input.title)
  const existing = await prisma.conversationTopic.findUnique({ where: { slug } })
  if (existing) throw conflict('A conversation topic with that slug already exists.')

  const topic = await prisma.conversationTopic.create({
    data: {
      ...input,
      slug,
      subtitle: input.subtitle ?? null,
      description: input.description ?? null,
      emoji: input.emoji ?? null,
    },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'conversation_topic.created',
    entity: 'ConversationTopic',
    entityId: topic.id,
    metadata: { slug: topic.slug, status: topic.status },
  })

  return ok({ topic }, { status: 201 })
})
