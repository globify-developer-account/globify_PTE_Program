import { prisma } from '@/lib/db'
import { createSession } from '@/lib/auth/session'
import { registerSchema } from '@/lib/auth/schemas'
import { registerUser } from '@/lib/auth/register'
import { writeAudit } from '@/lib/audit'
import { HttpError, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { getSettings } from '@/lib/settings'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  enforceRateLimit(clientKey(request, 'register'), LIMITS.register.limit, LIMITS.register.windowMs)

  const settings = await getSettings()
  if (!settings.registrationEnabled) {
    throw new HttpError(
      403,
      'New registrations are paused right now. Please contact our team and we will set your account up.',
      'registration_disabled',
    )
  }

  const input = await parseJson(request, registerSchema)

  const user = await registerUser({
    name: input.name,
    email: input.email,
    password: input.password,
    phone: input.phone || null,
    targetScore: input.targetScore,
    country: input.country || null,
    studyDestination: input.studyDestination || null,
    referralCode: input.referralCode || null,
  })

  await createSession(user.id)
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'auth.register',
    entity: 'User',
    entityId: user.id,
  })

  return ok({ id: user.id, name: user.name, email: user.email })
})
