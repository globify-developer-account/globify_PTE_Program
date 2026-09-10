import { requireApiUser } from '@/lib/auth/guards'
import { ok, route } from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { finishConversation } from '@/lib/conversations'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Ends a conversation and returns its feedback report.
 *
 * Idempotent: a conversation has exactly one report, so a second call returns
 * the report that already exists rather than paying for another one.
 */
export const POST = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  enforceRateLimit(`conversation-finish:${user.id}`, 20, 60 * 60_000)

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { targetScore: true },
  })

  const report = await finishConversation(user.id, id, profile?.targetScore ?? 79)
  return ok({ report })
})
