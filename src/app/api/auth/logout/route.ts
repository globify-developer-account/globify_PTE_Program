import { getCurrentUser, destroySession } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'
import { ok, route } from '@/lib/http'

export const runtime = 'nodejs'

export const POST = route(async () => {
  const user = await getCurrentUser()
  await destroySession()
  if (user) {
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'auth.logout',
      entity: 'User',
      entityId: user.id,
    })
  }
  return ok({ signedOut: true })
})
