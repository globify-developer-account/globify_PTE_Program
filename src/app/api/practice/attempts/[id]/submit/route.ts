import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { notFound, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { advanceSession, countPracticeUsage, recordAnswer } from '@/lib/practice'
import { scoreAttempt } from '@/lib/attempt-scoring'
import { submitAnswerSchema } from '@/lib/pte/schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Records an answer and scores it in one request.
 *
 * Ownership is re-checked here rather than trusted from the client: an attempt
 * id is a guessable-looking string, and the only thing standing between one
 * student and another's attempt is this `where: { id, userId }` clause.
 */
export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(clientKey(request, 'submit'), LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)
  enforceRateLimit(`submit:user:${user.id}`, LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)

  const body = await parseJson(request, submitAnswerSchema.omit({ attemptId: true }))

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: user.id },
    select: { id: true, sessionId: true },
  })
  if (!attempt) throw notFound('That attempt does not exist.')

  await recordAnswer({
    attemptId: attempt.id,
    userId: user.id,
    text: body.text,
    selection: body.selection ?? {},
    audioUrl: body.audioUrl,
    audioDurationMs: body.audioDurationMs,
    transcript: body.transcript,
    timeSpentSeconds: body.timeSpentSeconds,
  })

  const entitlements = await getEntitlements(user.id)
  const result = await scoreAttempt(attempt.id, user.id, entitlements)

  await countPracticeUsage(user.id)
  await advanceSession(attempt.sessionId, user.id)

  return ok(result)
})
