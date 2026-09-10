import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { submitDictation } from '@/lib/drills'
import { dictationSubmissionSchema } from '@/lib/drills/schemas'

export const runtime = 'nodejs'

/**
 * Marks one typed dictation line.
 *
 * This is also the only endpoint that reveals the line's text, which is why it
 * requires an answer to have been submitted first — polling it with junk would
 * hand over the transcript one line at a time, so it is rate limited per user
 * as well as per IP.
 */
export const POST = route(async (request, context: { params: Promise<{ slug: string }> }) => {
  const user = await requireApiUser()
  const { slug } = await context.params

  enforceRateLimit(`drill:dictation:${user.id}`, LIMITS.general.limit, LIMITS.general.windowMs)
  enforceRateLimit(clientKey(request, 'drill'), LIMITS.general.limit, LIMITS.general.windowMs)

  const body = await parseJson(request, dictationSubmissionSchema)

  const feedback = await submitDictation({
    userId: user.id,
    drillSlug: slug,
    segmentId: body.segmentId,
    text: body.text,
    playCount: body.playCount,
    timeSpentSeconds: body.timeSpentSeconds,
  })

  return ok(feedback)
})
