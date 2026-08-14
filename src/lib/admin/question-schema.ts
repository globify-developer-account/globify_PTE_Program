import { z } from 'zod'
import { QUESTION_TYPE_CODES } from '../pte/question-types'
import { correctAnswerSchema } from '../pte/schemas'

/**
 * Validation for question authoring.
 *
 * `options` and `correctAnswer` are free-form JSON columns, so they are the one
 * place a malformed admin payload could break the practice engine at render
 * time. Both are validated against the same shapes the renderers parse with.
 *
 * This lives in lib rather than beside the route because Next.js route files
 * may only export handlers and segment config.
 */

const optionsSchema = z.union([
  z.array(z.object({ id: z.string().min(1).max(40), text: z.string().min(1).max(2000) })),
  z.array(
    z.object({
      index: z.number().int().positive(),
      choices: z.array(z.string().min(1).max(120)).min(2).max(8),
    }),
  ),
  z.array(z.never()).length(0),
])

export const questionInputSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9-]+$/, 'Use letters, numbers and hyphens only.'),
  typeCode: z.enum(QUESTION_TYPE_CODES),
  title: z.string().trim().min(3).max(200),
  prompt: z.string().trim().max(4000).optional().or(z.literal('')),
  passage: z.string().trim().max(12000).optional().or(z.literal('')),
  audioTranscript: z.string().trim().max(12000).optional().or(z.literal('')),
  imageUrl: z.string().trim().max(500).optional().or(z.literal('')),
  audioUrl: z.string().trim().max(500).optional().or(z.literal('')),
  explanation: z.string().trim().max(4000).optional().or(z.literal('')),
  sampleAnswer: z.string().trim().max(6000).optional().or(z.literal('')),
  options: optionsSchema.default([]),
  correctAnswer: correctAnswerSchema.default({}),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  timeLimitSeconds: z.coerce.number().int().min(1).max(3600).nullable().optional(),
  preparationSeconds: z.coerce.number().int().min(0).max(600).nullable().optional(),
  wordLimitMin: z.coerce.number().int().min(1).max(2000).nullable().optional(),
  wordLimitMax: z.coerce.number().int().min(1).max(2000).nullable().optional(),
  isPremium: z.boolean().default(false),
})

export type QuestionInput = z.infer<typeof questionInputSchema>

/** Empty string means "not set" in the editor, but null in the database. */
export function blankToNull(value: string | undefined | null): string | null {
  return value && value.length > 0 ? value : null
}
