import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { assertUploadSize, extensionForAudio, mediaKey, storage } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Uploads the recording behind a drill.
 *
 * Returns a storage *key*, not a URL. The key is what goes in the drill's
 * `audioUrl` column and is resolved to a short-lived signed URL when a learner
 * opens the exercise, so exercise audio never has a stable public address.
 */
export const POST = route(async (request) => {
  const staff = await requireApiStaff('content.manage')

  enforceRateLimit(`drill:media:${staff.id}`, LIMITS.upload.limit, LIMITS.upload.windowMs)
  enforceRateLimit(clientKey(request, 'drill-media'), LIMITS.upload.limit, LIMITS.upload.windowMs)

  const form = await request.formData()
  const file = form.get('audio')
  if (!(file instanceof File)) throw badRequest('No audio file was received.')

  assertUploadSize(file.size)
  const contentType = file.type || 'audio/mpeg'
  const key = mediaKey('audio', extensionForAudio(contentType))

  await storage().put(key, new Uint8Array(await file.arrayBuffer()), contentType)

  return ok({ key, bytes: file.size })
})
