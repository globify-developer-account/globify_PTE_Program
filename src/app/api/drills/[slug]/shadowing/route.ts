import { randomUUID } from 'node:crypto'
import { requireApiUser } from '@/lib/auth/guards'
import { assertQuota, getEntitlements } from '@/lib/access'
import { badRequest, ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { assertUploadSize, extensionForAudio, storage } from '@/lib/storage'
import { submitShadowing } from '@/lib/drills'
import { shadowingSubmissionSchema } from '@/lib/drills/schemas'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Receives a shadowing recording, transcribes it and marks it.
 *
 * Upload and scoring are one request here, unlike the practice player's two —
 * a shadowing clip is a single sentence, there is nothing to keep between the
 * two calls, and a stored recording that never got scored would be a recording
 * kept for no reason.
 */
export const POST = route(async (request, context: { params: Promise<{ slug: string }> }) => {
  const user = await requireApiUser()
  const { slug } = await context.params

  enforceRateLimit(`drill:shadowing:${user.id}`, LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)
  enforceRateLimit(clientKey(request, 'drill-upload'), LIMITS.upload.limit, LIMITS.upload.windowMs)

  // Checked before the upload, not inside the service: a paywalled attempt that
  // has already written a file leaves a recording nobody will ever score.
  const entitlements = await getEntitlements(user.id)
  await assertQuota(user.id, 'practice', entitlements)

  const form = await request.formData()
  const file = form.get('audio')
  if (!(file instanceof File)) throw badRequest('No recording was received.')
  assertUploadSize(file.size)

  const parsed = shadowingSubmissionSchema.safeParse({
    segmentId: form.get('segmentId'),
    audioDurationMs: form.get('audioDurationMs') ?? undefined,
    playCount: form.get('playCount') ?? undefined,
    timeSpentSeconds: form.get('timeSpentSeconds') ?? undefined,
  })
  if (!parsed.success) throw badRequest('That recording could not be matched to an exercise line.')

  const contentType = file.type || 'audio/webm'
  const key = `drills/${user.id}/${parsed.data.segmentId}-${randomUUID()}.${extensionForAudio(contentType)}`
  await storage().put(key, new Uint8Array(await file.arrayBuffer()), contentType)

  const feedback = await submitShadowing({
    userId: user.id,
    drillSlug: slug,
    segmentId: parsed.data.segmentId,
    audioKey: key,
    audioDurationMs: parsed.data.audioDurationMs,
    playCount: parsed.data.playCount,
    timeSpentSeconds: parsed.data.timeSpentSeconds,
    entitlements,
  })

  return ok(feedback)
})
