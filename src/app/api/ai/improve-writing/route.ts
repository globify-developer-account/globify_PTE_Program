import { z } from 'zod'
import type { WritingTaskKind } from '@prisma/client'
import { requireApiUser } from '@/lib/auth/guards'
import { assertQuota, consumeQuota, getEntitlements } from '@/lib/access'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { isSimulated, runAi } from '@/lib/ai'
import { prisma } from '@/lib/db'
import { diffStats, diffWords } from '@/lib/text-diff'
import { countWords } from '@/lib/utils'

export const runtime = 'nodejs'
export const maxDuration = 60

const schema = z.object({
  text: z.string().trim().min(40).max(8000),
  /** Set when the draft answers an exercise from the library. */
  exerciseId: z.string().cuid().optional(),
  /** Only read when there is no exerciseId — a student's own prompt. */
  prompt: z.string().trim().max(2000).optional(),
  taskKind: z.enum(['ESSAY', 'SUMMARIZE_WRITTEN_TEXT', 'SUMMARIZE_SPOKEN_TEXT', 'FREEFORM']).default('FREEFORM'),
  focus: z.enum(['all', 'grammar', 'vocabulary', 'structure']).default('all'),
})

/**
 * Rewrites a piece of writing and explains every change.
 *
 * This is a teaching tool, not a scorer: it returns the student's own text
 * repaired, a word-level diff against their draft, and a categorised list of
 * what was changed and why. It draws on the same monthly AI writing allowance
 * as an evaluation, because it costs the same to run.
 */
export const POST = route(async (request) => {
  const user = await requireApiUser()
  enforceRateLimit(`ai-improve:${user.id}`, LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)
  enforceRateLimit(clientKey(request, 'ai-improve'), LIMITS.aiScoring.limit, LIMITS.aiScoring.windowMs)

  const input = await parseJson(request, schema)

  const exercise = input.exerciseId
    ? await prisma.writingExercise.findFirst({
        where: { id: input.exerciseId, status: 'PUBLISHED' },
        select: {
          id: true,
          prompt: true,
          passage: true,
          taskKind: true,
          wordMin: true,
          wordMax: true,
          isPremium: true,
        },
      })
    : null

  if (input.exerciseId && !exercise) throw notFound('That exercise is no longer available.')

  const entitlements = await getEntitlements(user.id)
  if (exercise?.isPremium && !entitlements.isPremium) {
    throw badRequest('This exercise is part of Globify PTE Premium.')
  }
  await assertQuota(user.id, 'ai_writing', entitlements)

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { targetScore: true },
  })

  const taskKind: WritingTaskKind = exercise?.taskKind ?? input.taskKind
  const prompt = exercise?.prompt ?? input.prompt ?? null

  const result = await runAi('WRITING_IMPROVEMENT', user.id, (provider) =>
    provider.improveWriting({
      taskKind,
      prompt,
      passage: exercise?.passage ?? null,
      text: input.text,
      // A freeform draft has no word limit to hold the rewrite to.
      wordLimitMin: taskKind === 'FREEFORM' ? null : (exercise?.wordMin ?? null),
      wordLimitMax: taskKind === 'FREEFORM' ? null : (exercise?.wordMax ?? null),
      focus: input.focus,
      targetScore: profile?.targetScore ?? 79,
    }),
  )

  const improved = result.data.improved_text.trim()
  const diff = diffWords(input.text, improved)

  await consumeQuota(user.id, 'ai_writing')

  const byCategory: Record<string, number> = {}
  for (const edit of result.data.edits) {
    byCategory[edit.category] = (byCategory[edit.category] ?? 0) + 1
  }

  const record = await prisma.writingImprovement.create({
    data: {
      userId: user.id,
      exerciseId: exercise?.id ?? null,
      taskKind,
      prompt,
      originalText: input.text,
      improvedText: improved,
      summary: result.data.summary,
      edits: result.data.edits,
      editCount: result.data.edits.length,
      wordCount: countWords(input.text),
      provider: result.provider,
    },
    select: { id: true, createdAt: true },
  })

  return ok({
    id: record.id,
    createdAt: record.createdAt,
    original: input.text,
    improved,
    summary: result.data.summary,
    edits: result.data.edits,
    byCategory,
    diff,
    stats: diffStats(diff),
    words: { before: countWords(input.text), after: countWords(improved) },
    strengths: result.data.strengths,
    focusNext: result.data.focus_next,
    simulated: isSimulated(result.provider),
  })
})
