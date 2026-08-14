import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { badRequest, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { destroyAllSessions, createSession } from '@/lib/auth/session'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(10).max(200),
})

/**
 * Changes the password and signs every other device out.
 *
 * A password change is usually a response to a suspected compromise, so
 * leaving old sessions alive would defeat the point. The current device is
 * re-issued a session so the user is not logged out of the page they are on.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`password:${user.id}`, 5, 60 * 60_000)
  enforceRateLimit(clientKey(request, 'password'), LIMITS.passwordReset.limit, LIMITS.passwordReset.windowMs)

  const input = await parseJson(request, schema)

  const valid = await verifyPassword(input.currentPassword, user.passwordHash)
  if (!valid) throw badRequest('Your current password is not correct.')

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(input.newPassword) },
  })

  await destroyAllSessions(user.id)
  await createSession(user.id)

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.password_changed',
    entity: 'User',
    entityId: user.id,
  })

  return ok({ changed: true })
})
