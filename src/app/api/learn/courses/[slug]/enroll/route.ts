import { requireApiUser } from '@/lib/auth/guards'
import { ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { enrollInCourse } from '@/lib/learn'

export const runtime = 'nodejs'

export const POST = route(async (request, context: { params: Promise<{ slug: string }> }) => {
  const user = await requireApiUser()
  const { slug } = await context.params

  enforceRateLimit(clientKey(request, 'learn-enroll'), LIMITS.general.limit, LIMITS.general.windowMs)

  // Enrolling is free for everyone — a premium course still lists its outline.
  // The lock lives on the lesson, in `getLessonView`.
  const result = await enrollInCourse(user.id, slug)
  return ok(result)
})
