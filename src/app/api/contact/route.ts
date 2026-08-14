import { headers } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { clientIp, getCurrentUser } from '@/lib/auth/session'
import { clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { ok, parseJson, route } from '@/lib/http'

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.').max(200),
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  topic: z.string().trim().max(40).default('general'),
  targetScore: z
    .union([z.coerce.number().int().min(10).max(90), z.literal(''), z.undefined()])
    .transform((value) => (typeof value === 'number' ? value : null)),
  message: z.string().trim().min(10, 'Tell us a little more so we can help.').max(4000),
  /** Honeypot — a filled value means a bot. */
  website: z.string().max(0).optional().or(z.literal('')),
})

export const POST = route(async (request) => {
  enforceRateLimit(clientKey(request, 'contact'), 6, 60 * 60_000)

  const input = await parseJson(request, contactSchema)

  // Silently accept honeypot hits so bots do not learn they were caught.
  if (input.website) return ok({ received: true })

  const [user, headerList] = await Promise.all([getCurrentUser(), headers()])

  await prisma.supportMessage.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      topic: input.topic,
      targetScore: input.targetScore,
      message: input.message,
      userId: user?.id ?? null,
      ip: clientIp(headerList),
    },
  })

  return ok({ received: true })
})

export const runtime = 'nodejs'
