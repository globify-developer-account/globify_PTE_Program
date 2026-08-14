import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { badRequest, notFound, ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { assertUploadSize, audioKey, extensionForAudio, storage } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Receives a speaking recording.
 *
 * The response is a storage *key*, not a URL — the browser hands that key back
 * on submit and the server resolves it to a short-lived signed URL when it
 * needs to. A recording is never reachable by a stable public address.
 */
export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(`upload:${user.id}`, LIMITS.upload.limit, LIMITS.upload.windowMs)
  enforceRateLimit(clientKey(request, 'upload'), LIMITS.upload.limit, LIMITS.upload.windowMs)

  const attempt = await prisma.attempt.findFirst({
    where: { id, userId: user.id },
    select: { id: true, status: true },
  })
  if (!attempt) throw notFound('That attempt does not exist.')
  if (attempt.status === 'SCORED') throw badRequest('This question has already been answered.')

  const form = await request.formData()
  const file = form.get('audio')
  if (!(file instanceof File)) throw badRequest('No recording was received.')

  assertUploadSize(file.size)
  const extension = extensionForAudio(file.type || 'audio/webm')
  const key = audioKey(user.id, attempt.id, extension)

  const bytes = new Uint8Array(await file.arrayBuffer())
  await storage().put(key, bytes, file.type || 'audio/webm')

  return ok({ key, bytes: bytes.byteLength })
})
