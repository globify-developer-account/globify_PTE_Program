import { createHash, randomBytes } from 'node:crypto'
import { prisma } from '@/lib/db'
import { forgotPasswordSchema } from '@/lib/auth/schemas'
import { passwordResetEmail, sendEmail } from '@/lib/email'
import { env } from '@/lib/env'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  enforceRateLimit(clientKey(request, 'reset'), LIMITS.passwordReset.limit, LIMITS.passwordReset.windowMs)

  const { email } = await parseJson(request, forgotPasswordSchema)
  const user = await prisma.user.findUnique({ where: { email } })

  // Always report the same outcome — the response must not reveal whether an
  // address is registered.
  const generic = {
    sent: true,
    message: 'If that email is registered, a reset link is on its way. Check your inbox and spam folder.',
  }

  if (!user || user.status !== 'ACTIVE') return ok(generic)

  enforceRateLimit(`reset:account:${email}`, 3, 60 * 60_000)

  const token = randomBytes(32).toString('base64url')
  const tokenHash = createHash('sha256').update(token).digest('hex')

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    },
  })

  const resetUrl = `${env.appUrl}/reset-password?token=${token}`
  const message = passwordResetEmail(user.name, resetUrl)
  const result = await sendEmail({ ...message, to: user.email })

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.password_reset_requested',
    entity: 'User',
    entityId: user.id,
    metadata: { delivered: result.delivered, provider: result.provider },
  })

  // In demo mode the console driver cannot deliver anything, so hand the link
  // back so the flow is still testable. Never do this in production.
  if (env.demoMode && !result.delivered) {
    return ok({ ...generic, demoResetUrl: resetUrl })
  }

  return ok(generic)
})
