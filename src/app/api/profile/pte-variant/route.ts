import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { PTE_VARIANTS } from '@/lib/pte/question-types'

export const runtime = 'nodejs'

const variantSchema = z.object({
  variant: z.enum(PTE_VARIANTS),
})

/**
 * Switches which PTE product the learner is preparing for.
 *
 * This only changes which task list they are shown — no attempt, score or
 * progress row is rewritten, so switching back restores the previous view
 * intact. That matters because students genuinely do sit both exams.
 */
export const PATCH = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(clientKey(request, 'pte-variant'), LIMITS.general.limit, LIMITS.general.windowMs)

  const { variant } = await parseJson(request, variantSchema)

  await prisma.profile.update({
    where: { userId: user.id },
    data: { pteVariant: variant },
  })

  return ok({ variant })
})
