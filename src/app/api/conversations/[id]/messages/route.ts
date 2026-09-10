import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { badRequest, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { assertUploadSize, extensionForAudio, storage } from '@/lib/storage'
import { transcriptionProvider } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { addTurn } from '@/lib/conversations'

export const runtime = 'nodejs'
export const maxDuration = 60

const textSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

/**
 * Takes one student turn and returns the partner's reply.
 *
 * Accepts either JSON (typed) or multipart with an `audio` file (spoken). The
 * spoken path transcribes first and then runs exactly the same turn logic, so
 * speaking and typing can never drift apart in behaviour.
 */
export const POST = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(`conversation-turn:${user.id}`, 90, 60 * 60_000)
  enforceRateLimit(clientKey(request, 'conversation-turn'), LIMITS.aiScoring.limit * 4, LIMITS.aiScoring.windowMs)

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { targetScore: true },
  })
  const targetScore = profile?.targetScore ?? 79

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData()
    const file = form.get('audio')
    if (!(file instanceof File)) throw badRequest('No recording was received.')

    assertUploadSize(file.size)
    const mimeType = file.type || 'audio/webm'
    const key = `conversations/${user.id}/${id}-${randomUUID()}.${extensionForAudio(mimeType)}`
    const bytes = new Uint8Array(await file.arrayBuffer())
    await storage().put(key, bytes, mimeType)

    let transcript = ''
    try {
      const result = await transcriptionProvider().transcribe({ audio: bytes, mimeType, hint: null })
      transcript = result.data.text.trim()
    } catch (error) {
      console.error(
        '[conversations] transcription failed:',
        error instanceof Error ? error.message : error,
      )
    }

    if (!transcript) {
      // The recording is kept, but there is nothing to reply to. Saying so is
      // more useful than sending an empty turn to the model.
      throw badRequest(
        'We could not make out any speech in that recording. Check your microphone and try again, or type your message instead.',
      )
    }

    return ok(await addTurn(user.id, id, { text: transcript, spoken: true, audioKey: key }, targetScore))
  }

  const input = await parseJson(request, textSchema)
  return ok(await addTurn(user.id, id, { text: input.text, spoken: false }, targetScore))
})
