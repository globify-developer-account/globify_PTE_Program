import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { blankToNull as blank, questionInputSchema } from '@/lib/admin/question-schema'

export const runtime = 'nodejs'

export const PATCH = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('questions.manage')
  const { id } = await context.params

  const input = await parseJson(request, questionInputSchema)

  const existing = await prisma.question.findUnique({ where: { id }, select: { id: true, code: true } })
  if (!existing) throw notFound('That question does not exist.')

  if (input.code !== existing.code) {
    const clash = await prisma.question.findUnique({ where: { code: input.code } })
    if (clash) throw badRequest('Another question already uses that code.')
  }

  const type = await prisma.questionType.findUnique({ where: { code: input.typeCode } })
  if (!type) throw badRequest('That question type does not exist.')

  await prisma.question.update({
    where: { id },
    data: {
      code: input.code,
      questionTypeId: type.id,
      title: input.title,
      prompt: blank(input.prompt),
      passage: blank(input.passage),
      audioTranscript: blank(input.audioTranscript),
      imageUrl: blank(input.imageUrl),
      audioUrl: blank(input.audioUrl),
      explanation: blank(input.explanation),
      sampleAnswer: blank(input.sampleAnswer),
      options: input.options,
      correctAnswer: input.correctAnswer,
      difficulty: input.difficulty,
      status: input.status,
      tags: input.tags,
      timeLimitSeconds: input.timeLimitSeconds ?? null,
      preparationSeconds: input.preparationSeconds ?? null,
      wordLimitMin: input.wordLimitMin ?? null,
      wordLimitMax: input.wordLimitMax ?? null,
      isPremium: input.isPremium,
    },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'question.updated',
    entity: 'Question',
    entityId: id,
    metadata: { code: input.code, status: input.status },
  })

  return ok({ id, code: input.code })
})

/**
 * Archives rather than deletes.
 *
 * Attempts reference questions, and a student's history should not develop
 * holes because content was tidied up two months later.
 */
export const DELETE = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('questions.manage')
  const { id } = await context.params

  const question = await prisma.question.findUnique({ where: { id }, select: { id: true, code: true } })
  if (!question) throw notFound('That question does not exist.')

  await prisma.question.update({ where: { id }, data: { status: 'ARCHIVED' } })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'question.archived',
    entity: 'Question',
    entityId: id,
    metadata: { code: question.code },
  })

  return ok({ archived: true })
})
