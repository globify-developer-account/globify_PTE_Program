import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { startPracticeSession } from '@/lib/practice'
import { QUESTION_TYPE_CODES } from '@/lib/pte/question-types'

export const runtime = 'nodejs'

const startSchema = z.object({
  section: z.enum(['SPEAKING', 'WRITING', 'READING', 'LISTENING']).optional(),
  typeCode: z.enum(QUESTION_TYPE_CODES).optional(),
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
      section: input.section ?? null,
      typeCode: input.typeCode ?? null,
      difficulty: input.difficulty ?? null,
      count: input.count,
    },
    entitlements,
  )

  return ok({ sessionId, questionCount: questionIds.length })
})
