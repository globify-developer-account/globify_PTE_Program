import { createHash } from 'node:crypto'
import { prisma } from '@/lib/db'
import { resetPasswordSchema } from '@/lib/auth/schemas'
import { hashPassword } from '@/lib/auth/password'
import { writeAudit } from '@/lib/audit'
import { badRequest, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  enforceRateLimit(clientKey(request, 'reset-confirm'), LIMITS.passwordReset.limit, LIMITS.passwordReset.windowMs)

  const input = await parseJson(request, resetPasswordSchema)
  const tokenHash = createHash('sha256').update(input.token).digest('hex')

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    throw badRequest('This reset link has expired or has already been used. Request a new one.')
  }

  const passwordHash = await hashPassword(input.password)

  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // A password reset invalidates every existing session — that is the point.
    prisma.session.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ])

  await writeAudit({
    actorId: record.userId,
    actorRole: record.user.role,
    action: 'auth.password_reset_completed',
    entity: 'User',
    entityId: record.userId,
  })

  return ok({ reset: true })
})
