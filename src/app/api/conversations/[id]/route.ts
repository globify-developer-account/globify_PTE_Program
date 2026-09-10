import { requireApiUser } from '@/lib/auth/guards'
import { ok, route } from '@/lib/http'
import { abandonConversation, getConversationWithReport } from '@/lib/conversations'

export const runtime = 'nodejs'

export const GET = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params
  return ok({ conversation: await getConversationWithReport(user.id, id) })
})

/** Leaves a conversation. The transcript is kept; only the status changes. */
export const DELETE = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params
  await abandonConversation(user.id, id)
  return ok({ status: 'ABANDONED' })
})
