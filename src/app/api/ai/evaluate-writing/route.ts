import { z } from 'zod'
import { requireApiUser } from '@/lib/auth/guards'
import { assertQuota, consumeQuota, getEntitlements } from '@/lib/access'
import { ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { isSimulated, runAi } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { countWords } from '@/lib/utils'
import { clamp } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

const TASKS = {
  ESSAY: { name: 'Write Essay', min: 200, max: 300 },
  SUMMARIZE_WRITTEN_TEXT: { name: 'Summarize Written Text', min: 5, max: 75 },
  SUMMARIZE_SPOKEN_TEXT: { name: 'Summarize Spoken Text', min: 50, max: 70 },
} as const

const schema = z.object({
  taskType: z.enum(['ESSAY', 'SUMMARIZE_WRITTEN_TEXT', 'SUMMARIZE_SPOKEN_TEXT']),
  prompt: z.string().trim().min(1).max(2000),
  response: z.string().trim().min(20).max(8000),
})

/**
 * Scores a piece of writing that is not tied to a question in the bank — a
 * student's own practice essay, or one from a class. It consumes the same
 * AI writing allowance as a normal attempt, because it costs the same.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`ai-writing:${user.id}`, LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)
  enforceRateLimit(clientKey(request, 'ai-writing'), LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)

  const input = await parseJson(request, schema)
  const task = TASKS[input.taskType]

  const entitlements = await getEntitlements(user.id)
  await assertQuota(user.id, 'ai_writing', entitlements)

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { targetScore: true },
  })

  const result = await runAi('WRITING_SCORE', user.id, (provider) =>
    provider.scoreWriting({
      questionType: task.name,
      questionTitle: input.prompt.slice(0, 120),
      prompt: input.prompt,
      response: input.response,
      wordLimitMin: task.min,
      wordLimitMax: task.max,
      targetScore: profile?.targetScore ?? 79,
    }),
  )

  const words = countWords(input.response)
  const outOfRange = words < task.min || words > task.max

  // Same Form rule as a scored attempt — the evaluator must not be more
  // generous than the practice engine, or students would trust the wrong number.
  const overall = outOfRange
    ? Math.min(Math.round(clamp(result.data.overall_score, 0, 90)), 40)
    : Math.round(clamp(result.data.overall_score, 0, 90))

  await consumeQuota(user.id, 'ai_writing')

  return ok({
    overall,
    words,
    wordLimit: { min: task.min, max: task.max },
    outOfRange,
    breakdown: {
      content: result.data.content,
      form: outOfRange ? 0 : result.data.form,
      grammar: result.data.grammar,
      vocabulary: result.data.vocabulary,
      coherence: result.data.coherence,
      development: result.data.development,
      ...(typeof result.data.spelling === 'number' ? { spelling: result.data.spelling } : {}),
    },
    feedback: result.data.feedback,
    strengths: result.data.strengths,
    improvements: result.data.improvements,
    suggestions: result.data.how_to_improve,
    suggestedRewrite: result.data.suggested_rewrite ?? null,
    simulated: isSimulated(result.provider),
  })
})
