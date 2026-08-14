import { z } from 'zod'

/**
 * Shapes for the JSON columns on Question and Answer.
 *
 * Everything that comes out of the database or off the wire is parsed through
 * these before it reaches a renderer or the scorer — a malformed question can
 * degrade to an empty state, but it can never crash the practice engine.
 */

export const choiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
})
export type ChoiceOption = z.infer<typeof choiceOptionSchema>

export const blankOptionSchema = z.object({
  index: z.number().int().positive(),
  choices: z.array(z.string().min(1)).min(2),
})
export type BlankOption = z.infer<typeof blankOptionSchema>

export const questionOptionsSchema = z.union([
  z.array(choiceOptionSchema),
  z.array(blankOptionSchema),
  z.array(z.never()).length(0),
])

export const correctAnswerSchema = z
  .object({
    optionId: z.string().optional(),
    optionIds: z.array(z.string()).optional(),
    order: z.array(z.string()).optional(),
    blanks: z.record(z.string(), z.string()).optional(),
    wordIndexes: z.array(z.number().int().nonnegative()).optional(),
    text: z.string().optional(),
    keyPoints: z.array(z.string()).optional(),
  })
  .strip()
export type CorrectAnswer = z.infer<typeof correctAnswerSchema>

/** What the practice UI submits for a non-speaking task. */
export const answerSelectionSchema = z
  .object({
    optionIds: z.array(z.string()).max(20).optional(),
    order: z.array(z.string()).max(20).optional(),
    blanks: z.record(z.string(), z.string().max(80)).optional(),
    wordIndexes: z.array(z.number().int().nonnegative()).max(200).optional(),
  })
  .strip()
export type AnswerSelection = z.infer<typeof answerSelectionSchema>

export const submitAnswerSchema = z.object({
  attemptId: z.string().min(1),
  text: z.string().max(8000).optional(),
  selection: answerSelectionSchema.optional(),
  audioUrl: z.string().max(500).optional(),
  audioDurationMs: z.number().int().nonnegative().max(600_000).optional(),
  transcript: z.string().max(8000).optional(),
  timeSpentSeconds: z.number().int().nonnegative().max(7200).optional(),
})
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>

export function parseChoiceOptions(raw: unknown): ChoiceOption[] {
  const parsed = z.array(choiceOptionSchema).safeParse(raw)
  return parsed.success ? parsed.data : []
}

export function parseBlankOptions(raw: unknown): BlankOption[] {
  const parsed = z.array(blankOptionSchema).safeParse(raw)
  return parsed.success ? parsed.data : []
}

export function parseCorrectAnswer(raw: unknown): CorrectAnswer {
  const parsed = correctAnswerSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : {}
}

export function parseSelection(raw: unknown): AnswerSelection {
  const parsed = answerSelectionSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : {}
}

/** Splits a passage on `{{n}}` blank markers into literal and blank segments. */
export type PassageSegment =
  | { kind: 'text'; value: string }
  | { kind: 'blank'; index: number }

export function segmentPassage(passage: string): PassageSegment[] {
  const segments: PassageSegment[] = []
  const pattern = /\{\{(\d+)\}\}/g
  let cursor = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(passage)) !== null) {
    if (match.index > cursor) {
      segments.push({ kind: 'text', value: passage.slice(cursor, match.index) })
    }
    segments.push({ kind: 'blank', index: Number.parseInt(match[1]!, 10) })
    cursor = match.index + match[0].length
  }
  if (cursor < passage.length) {
    segments.push({ kind: 'text', value: passage.slice(cursor) })
  }
  return segments
}

/** Tokenises a transcript into clickable words for Highlight Incorrect Words. */
export function tokenizeWords(text: string): string[] {
  return text.split(/(\s+)/).filter((token) => token.trim().length > 0)
}
