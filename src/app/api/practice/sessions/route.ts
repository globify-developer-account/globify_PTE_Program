import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { startPracticeSession } from '@/lib/practice'
import { QUESTION_TYPE_CODES } from '@/lib/pte/question-types'
import { IELTS_QUESTION_TYPE_CODES } from '@/lib/exams/ielts/question-types'

export const runtime = 'nodejs'

const startSchema = z.object({
  // A section on its own no longer identifies a task set, because both exams
  // use the same four section names.
  exam: z.enum(['PTE', 'IELTS']).optional(),
  section: z.enum(['SPEAKING', 'WRITING', 'READING', 'LISTENING']).optional(),
  typeCode: z.union([z.enum(QUESTION_TYPE_CODES), z.enum(IELTS_QUESTION_TYPE_CODES)]).optional(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
  count: z.coerce.number().int().min(1).max(20).default(5),
})

export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(clientKey(request, 'practice-start'), LIMITS.general.limit, LIMITS.general.windowMs)

  const input = await parseJson(request, startSchema)
  const entitlements = await getEntitlements(user.id)

  const { sessionId, questionIds } = await startPracticeSession(
    {
      userId: user.id,
      exam: input.exam ?? null,
      section: input.section ?? null,
      typeCode: input.typeCode ?? null,
      difficulty: input.difficulty ?? null,
      count: input.count,
    },
    entitlements,
  )

  return ok({ sessionId, questionCount: questionIds.length })
})
