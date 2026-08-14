import { requireApiUser } from '@/lib/auth/guards'
import { destroyAllSessions } from '@/lib/auth/session'
import { ok, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

/** Signs the account out on every device, including this one. */
export const DELETE = route(async () => {
  const user = await requireApiUser()
  const count = await destroyAllSessions(user.id)

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.logout_all',
    entity: 'User',
    entityId: user.id,
    metadata: { revoked: count },
  })

  return ok({ revoked: count })
})
