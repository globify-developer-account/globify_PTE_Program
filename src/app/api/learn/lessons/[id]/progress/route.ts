import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { saveLessonProgress } from '@/lib/learn'

export const runtime = 'nodejs'

const progressSchema = z.object({
  state: z.enum(['IN_PROGRESS', 'COMPLETED']).optional(),
  /** Time since the last heartbeat, capped server-side at one hour. */
  secondsSpent: z.number().int().nonnegative().max(3600).optional(),
})

export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(clientKey(request, 'learn-progress'), LIMITS.general.limit, LIMITS.general.windowMs)

  const input = await parseJson(request, progressSchema)
  const result = await saveLessonProgress({
    userId: user.id,
    lessonId: id,
    state: input.state,
    secondsSpent: input.secondsSpent,
  })

  return ok(result)
})
