import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { listConversations, startConversation } from '@/lib/conversations'

export const runtime = 'nodejs'

const schema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('topic'), topicId: z.string().min(1).max(40) }),
  z.object({
    kind: z.literal('custom'),
    title: z.string().trim().min(3).max(80),
    scenario: z.string().trim().min(10).max(600),
    level: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  }),
])

export const GET = route(async () => {
  const user = await requireApiUser()
  return ok({ conversations: await listConversations(user.id) })
})

export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`conversation-start:${user.id}`, 12, 60 * 60_000)
  enforceRateLimit(clientKey(request, 'conversation-start'), LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)

  const input = await parseJson(request, schema)
  const entitlements = await getEntitlements(user.id)
  const conversation = await startConversation(user.id, input, entitlements)

  return ok({ conversation }, { status: 201 })
})
