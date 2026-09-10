import { z } from 'zod'

/**
 * Validation for dictation & shadowing authoring.
 *
 * Lives in lib rather than beside the route because a Next.js route file may
 * only export handlers and segment config.
 */

export const drillSegmentInputSchema = z.object({
  text: z.string().trim().min(1).max(1000),
  startMs: z.number().int().nonnegative().max(3_600_000).default(0),
  endMs: z.number().int().nonnegative().max(3_600_000).default(0),
})

export const drillInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens only.'),
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).optional().or(z.literal('')),
    categoryId: z.string().min(1).max(60),
    /** A storage key from the upload endpoint, or an absolute URL. */
    audioUrl: z.string().trim().min(1).max(500),
    audioDurationMs: z.number().int().nonnegative().max(3_600_000).nullable().optional(),
    transcript: z.string().trim().min(1).max(20_000),
    accent: z.string().trim().max(60).optional().or(z.literal('')),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    isPremium: z.boolean(),
    tags: z.array(z.string().trim().min(1).max(40)).max(10),
    displayOrder: z.number().int().min(0).max(9999),
    segments: z.array(drillSegmentInputSchema).min(1).max(200),
  })
  .superRefine((input, ctx) => {
    input.segments.forEach((segment, index) => {
      if (segment.endMs > 0 && segment.endMs <= segment.startMs) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['segments', index, 'endMs'],
          message: 'The end time must come after the start time.',
        })
      }
    })

    // A published exercise with no timings would play the whole recording for
    // every line, which is not a dictation exercise.
    if (input.status === 'PUBLISHED' && input.segments.every((segment) => segment.endMs === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['segments'],
        message: 'Set the start and end time of each line before publishing.',
      })
    }
  })

export type DrillInput = z.infer<typeof drillInputSchema>

export const blankToNull = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
