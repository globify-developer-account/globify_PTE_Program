import { z } from 'zod'
import { NextResponse } from 'next/server'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { enforceRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/db'
import { speechProvider } from '@/lib/ai/speech'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  text: z.string().trim().min(1).max(1200),
  voice: z.string().trim().max(40).optional(),
  /** 0.5–1.5 in the UI; the provider clamps to its own range. */
  speed: z.number().min(0.5).max(1.5).optional(),
})

/**
 * Reads the partner's turn aloud.
 *
 * When no speech provider is configured the response is `{ mode: 'client' }`
 * and the browser reads the text with its own `speechSynthesis` voice. That
 * keeps spoken replies working in demo mode, offline, and at no cost — the UI
 * treats the two paths identically apart from the label.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`speech:${user.id}`, 120, 60 * 60_000)

  const input = await parseJson(request, schema)
  const provider = speechProvider()

  if (!provider) return ok({ mode: 'client' as const })

  const startedAt = Date.now()
  try {
    const result = await provider.synthesize({
      text: input.text,
      voice: input.voice ?? null,
      speed: input.speed,
    })

    await prisma.aiUsageLog
      .create({
        data: {
          userId: user.id,
          feature: 'SPEECH_SYNTHESIS',
          provider: result.provider,
          model: result.model,
          status: 'SUCCESS',
          promptTokens: 0,
          completionTokens: 0,
          costMicros: result.usage.costMicros,
          latencyMs: result.latencyMs,
        },
      })
      .catch(() => undefined)

    return new NextResponse(Buffer.from(result.data.audio), {
      headers: {
        'Content-Type': result.data.mimeType,
        'Content-Length': String(result.data.audio.byteLength),
        // Per-user audio of a per-user conversation: never shared or edge-cached.
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    await prisma.aiUsageLog
      .create({
        data: {
          userId: user.id,
          feature: 'SPEECH_SYNTHESIS',
          provider: provider.name,
          model: 'unknown',
          status: 'FAILED',
          latencyMs: Date.now() - startedAt,
          error: (error instanceof Error ? error.message : 'Unknown error').slice(0, 500),
        },
      })
      .catch(() => undefined)

    // Falling back to the browser voice is far better than a silent button.
    console.error('[speech] synthesis failed:', error instanceof Error ? error.message : error)
    return ok({ mode: 'client' as const })
  }
})
