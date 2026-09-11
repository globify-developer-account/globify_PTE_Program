import { z } from 'zod'

/**
 * Validation for staff-authored conversation topics.
 *
 * Lives here rather than in a route file because both the create and the update
 * route need it, and a Next.js route module should only export handlers and
 * route config.
 */
export const conversationTopicSchema = z.object({
  slug: z.string().trim().max(80).optional(),
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().max(200).nullish(),
  description: z.string().trim().max(1000).nullish(),
  category: z.enum(['DAILY_LIFE', 'SOCIAL', 'TRAVEL', 'WORK_AND_STUDY', 'EXAM_PREP', 'CUSTOM']),
  level: z.enum(['EASY', 'MEDIUM', 'HARD']),
  emoji: z.string().trim().max(8).nullish(),
  personaName: z.string().trim().min(1).max(60),
  personaRole: z.string().trim().min(1).max(200),
  scenario: z.string().trim().min(10).max(1200),
  openingLine: z.string().trim().min(3).max(600),
  goals: z.array(z.string().trim().min(1).max(160)).max(8).default([]),
  starterPhrases: z.array(z.string().trim().min(1).max(200)).max(6).default([]),
  targetLanguage: z.array(z.string().trim().min(1).max(80)).max(12).default([]),
  isPremium: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  displayOrder: z.number().int().min(0).max(9999).default(0),
})

export type ConversationTopicInput = z.infer<typeof conversationTopicSchema>

/** Update accepts any subset, but never an empty body. */
export const conversationTopicUpdateSchema = conversationTopicSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
  })
