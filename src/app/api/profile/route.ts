import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const profileSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  city: z.string().trim().max(80).optional().or(z.literal('')),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  studyDestination: z.string().trim().max(80).optional().or(z.literal('')),
  targetScore: z.coerce.number().int().min(10).max(90),
  dailyGoalMinutes: z.coerce.number().int().min(5).max(480),
  preferredTestDate: z.string().trim().max(40).optional().or(z.literal('')),
})

const blankToNull = (value: string | undefined) => (value && value.length > 0 ? value : null)

export const PATCH = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(clientKey(request, 'profile'), LIMITS.general.limit, LIMITS.general.windowMs)

  const input = await parseJson(request, profileSchema)

  const testDate = input.preferredTestDate ? new Date(input.preferredTestDate) : null
  if (testDate && Number.isNaN(testDate.getTime())) {
    return ok({ updated: false, error: 'That test date is not a valid date.' })
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { name: input.name } }),
    prisma.profile.update({
      where: { userId: user.id },
      data: {
        phone: blankToNull(input.phone),
        city: blankToNull(input.city),
        country: blankToNull(input.country),
        studyDestination: blankToNull(input.studyDestination),
        targetScore: input.targetScore,
        dailyGoalMinutes: input.dailyGoalMinutes,
        preferredTestDate: testDate,
      },
    }),
  ])

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: 'profile.updated',
    entity: 'Profile',
    entityId: user.id,
  })

  return ok({ updated: true })
})
