import { z } from 'zod'
import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { markAllRead } from '@/lib/notifications'

export const runtime = 'nodejs'

const schema = z.object({ id: z.string().min(1).optional() })

/** Marks one notification read, or all of them when no id is given. */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  const input = await parseJson(request, schema)

  if (input.id) {
    // Scoped by userId so one account cannot mark another's notification read.
    await prisma.notification.updateMany({
      where: { id: input.id, userId: user.id, readAt: null },
      data: { readAt: new Date() },
    })
  } else {
    await markAllRead(user.id)
  }

  return ok({ read: true })
})
