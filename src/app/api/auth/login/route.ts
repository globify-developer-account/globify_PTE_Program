import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth/session'
import { loginSchema, safeNextPath } from '@/lib/auth/schemas'
import { verifyPassword } from '@/lib/auth/password'
import { writeAudit } from '@/lib/audit'
import { HttpError, ok, parseJson, route, unauthorized } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { isStaffRole } from '@/lib/auth/session'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  const input = await parseJson(request, loginSchema)

  // Rate limit per IP and per account, so one attacker cannot lock out a user
  // by hammering their address from elsewhere.
  enforceRateLimit(clientKey(request, 'login'), LIMITS.login.limit, LIMITS.login.windowMs)
  enforceRateLimit(`login:account:${input.email}`, LIMITS.login.limit, LIMITS.login.windowMs)

  const user = await prisma.user.findUnique({ where: { email: input.email } })
  const valid = await verifyPassword(input.password, user?.passwordHash)

  // One message for both branches — never reveal whether an address is registered.
  if (!user || !valid) {
    throw unauthorized('That email and password combination does not match an account.')
  }

  if (user.status === 'SUSPENDED') {
    throw new HttpError(
      403,
      'This account is suspended. Please contact support to have it reinstated.',
      'account_suspended',
    )
  }
  if (user.status === 'DELETED') {
    throw unauthorized('That email and password combination does not match an account.')
  }

  await createSession(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.login',
    entity: 'User',
    entityId: user.id,
  })

  const fallback = isStaffRole(user.role) && user.role !== 'STUDENT' ? '/admin' : '/dashboard'

  return ok({ redirectTo: safeNextPath(input.next, fallback), role: user.role })
})
