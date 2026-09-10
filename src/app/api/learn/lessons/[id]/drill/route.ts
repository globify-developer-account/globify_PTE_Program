import { requireApiUser } from '@/lib/auth/guards'
import { assertQuota, getEntitlements } from '@/lib/access'
import { notFound, ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { getLessonDrillQuestionIds } from '@/lib/learn'
import { createSessionForQuestions } from '@/lib/practice'

export const runtime = 'nodejs'

/**
 * Starts a practice session over the questions attached to a lesson.
 *
 * The drill runs through the normal practice player and scorer — a lesson does
 * not get its own second-rate copy of the practice engine.
 */
export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(clientKey(request, 'learn-drill'), LIMITS.general.limit, LIMITS.general.windowMs)

  const entitlements = await getEntitlements(user.id)
  await assertQuota(user.id, 'practice', entitlements)

  const questionIds = await getLessonDrillQuestionIds(id, entitlements)
  if (questionIds.length === 0) {
    throw notFound('This lesson has no practice questions attached to it yet.')
  }

  const { sessionId } = await createSessionForQuestions({ userId: user.id, questionIds })
  return ok({ sessionId, questionCount: questionIds.length })
})
