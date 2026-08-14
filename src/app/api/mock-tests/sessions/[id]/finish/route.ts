import { requireApiUser } from '@/lib/auth/guards'
import { ok, route } from '@/lib/http'
import { finishMockTest } from '@/lib/mock-tests'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Closes a mock test and computes the result.
 *
 * Safe to call twice: `finishMockTest` returns the existing result if one has
 * already been written, so a double-tapped Finish button cannot produce two
 * results for one sitting.
 */
export const POST = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const user = await requireApiUser()
  const { id } = await context.params

  const result = await finishMockTest(id, user.id)
  return ok({ sessionId: id, result })
})
