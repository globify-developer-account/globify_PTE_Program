import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { badRequest, conflict, notFound, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const joinSchema = z.object({
  joinCode: z.string().trim().min(4).max(16),
})

/**
 * Links the signed-in learner to an institute.
 *
 * Join codes are guessable by design — they are read out in a classroom — so
 * this endpoint is rate limited on the login budget rather than the general
 * one. Without that, the code space is small enough to walk.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(clientKey(request, 'institute-join'), LIMITS.login.limit, LIMITS.login.windowMs)

  const { joinCode } = await parseJson(request, joinSchema)

  const institute = await prisma.institute.findUnique({
    where: { joinCode: joinCode.toUpperCase() },
    select: {
      id: true,
      name: true,
      status: true,
      seatLimit: true,
      _count: { select: { members: true } },
    },
  })

  if (!institute) {
    throw notFound('No institute uses that join code. Check it with your centre.')
  }
  if (institute.status !== 'ACTIVE') {
    throw badRequest('That institute is not active yet. Please contact your centre.')
  }

  const existing = await prisma.instituteMember.findUnique({
    where: { instituteId_userId: { instituteId: institute.id, userId: user.id } },
    select: { id: true },
  })
  if (existing) {
    throw conflict(`You are already a member of ${institute.name}.`)
  }

  // Checked before the write rather than enforced by a constraint, because the
  // limit is commercial rather than structural — an institute that outgrows it
  // buys more seats, and the error needs to say so.
  if (institute._count.members >= institute.seatLimit) {
    throw conflict('That institute has used all of its seats. Ask your centre to add more.')
  }

  await prisma.instituteMember.create({
    data: { instituteId: institute.id, userId: user.id, role: 'STUDENT' },
  })

  await writeAudit({
    actorId: user.id,
    action: 'institute.join',
    entity: 'Institute',
    entityId: institute.id,
  })

  return ok({ name: institute.name })
})
