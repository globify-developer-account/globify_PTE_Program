import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, conflict, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { blankToNull, questionInputSchema } from '@/lib/admin/question-schema'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  const staff = await requireApiStaff('questions.manage')
  const input = await parseJson(request, questionInputSchema)

  if (
    input.wordLimitMin != null &&
    input.wordLimitMax != null &&
    input.wordLimitMin > input.wordLimitMax
  ) {
    throw badRequest('The minimum word limit cannot be higher than the maximum.')
  }

  const type = await prisma.questionType.findUnique({ where: { code: input.typeCode } })
  if (!type) throw badRequest('That question type does not exist.')

  const existing = await prisma.question.findUnique({ where: { code: input.code } })
  if (existing) throw conflict('A question with that code already exists.')

  const question = await prisma.question.create({
    data: {
      code: input.code,
      questionTypeId: type.id,
      title: input.title,
      prompt: blankToNull(input.prompt),
      passage: blankToNull(input.passage),
      audioTranscript: blankToNull(input.audioTranscript),
      imageUrl: blankToNull(input.imageUrl),
      audioUrl: blankToNull(input.audioUrl),
      explanation: blankToNull(input.explanation),
      sampleAnswer: blankToNull(input.sampleAnswer),
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
      createdById: staff.id,
    },
    select: { id: true, code: true },
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'question.created',
    entity: 'Question',
    entityId: question.id,
    metadata: { code: question.code, typeCode: input.typeCode },
  })

  return ok(question, { status: 201 })
})
