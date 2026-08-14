import { requireApiUser } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { startMockTest } from '@/lib/mock-tests'

export const runtime = 'nodejs'

export const POST = route(async (request, context: { params: Promise<{ slug: string }> }) => {
  const user = await requireApiUser()
  const { slug } = await context.params

  enforceRateLimit(`mock-start:${user.id}`, 20, 60 * 60_000)
  enforceRateLimit(clientKey(request, 'mock-start'), LIMITS.general.limit, LIMITS.general.windowMs)

  // Premium gating and the monthly allowance are both enforced inside
  // startMockTest, on the server, where they cannot be skipped.
  const entitlements = await getEntitlements(user.id)
  const result = await startMockTest(user.id, slug, entitlements)

  return ok(result)
})
