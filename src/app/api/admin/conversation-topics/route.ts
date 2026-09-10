import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { conflict, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { slugify } from '@/lib/utils'

export const runtime = 'nodejs'

export const topicSchema = z.object({
  slug: z.string().trim().max(80).optional(),
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(1000).nullish(),
  category: z.enum(['DAILY_LIFE', 'SOCIAL', 'TRAVEL', 'WORK_AND_STUDY', 'EXAM_PREP', 'CUSTOM']),
  level: z.enum(['EASY', 'MEDIUM', 'HARD']),
  emoji: z.string().trim().max(8).nullish(),
  personaName: z.string().trim().min(1).max(60),
  personaRole: z.string().trim().min(1).max(200),
  scenario: z.string().trim().min(10).max(1200),
  openingLine: z.string().trim().min(3).max(600),
  goals: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  starterPhrases: z.array(z.string().trim().min(1).max(200)).max(6).default([]),
  targetLanguage: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  isPremium: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  displayOrder: z.number().int().min(0).max(9999).default(0),
})

export const GET = route(async () => {
  await requireApiStaff('content.view')
  const topics = await prisma.conversationTopic.findMany({
    orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
  })
  return ok({ topics })
})

export const POST = route(async (request) => {
  const staff = await requireApiStaff('content.manage')
  const input = await parseJson(request, topicSchema)

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
