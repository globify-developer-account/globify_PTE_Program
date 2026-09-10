import { z } from 'zod'

/**
 * Shapes for the JSON columns on Question, Answer and Lesson.
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

// --- lesson content -----------------------------------------------------------

/**
 * One caption line, timed against the lesson's video or audio.
 *
 * Cues do triple duty: they are the captions on a video lesson, the segments a
 * dictation lesson dictates one at a time, and the lines a shadowing lesson
 * asks the student to repeat. Keeping one shape means the same authored
 * transcript drives all three without being typed out three times.
 */
export const captionCueSchema = z.object({
  /** Seconds from the start of the media. */
  start: z.number().nonnegative().max(36_000),
  end: z.number().nonnegative().max(36_000),
  text: z.string().min(1).max(600),
})
export type CaptionCue = z.infer<typeof captionCueSchema>

export const vocabularyTermSchema = z.object({
  term: z.string().min(1).max(120),
  definition: z.string().min(1).max(600),
  example: z.string().max(600).optional(),
  /** IPA, shown next to the term when present. */
  phonetic: z.string().max(120).optional(),
})
export type VocabularyTerm = z.infer<typeof vocabularyTermSchema>

export const lessonContentSchema = z
  .object({
    /** Prose body, one paragraph per blank-line-separated block. */
    body: z.string().max(20_000).optional(),
    keyPoints: z.array(z.string().min(1).max(300)).max(20).default([]),
    cues: z.array(captionCueSchema).max(400).default([]),
    terms: z.array(vocabularyTermSchema).max(100).default([]),
    /**
     * Drill this lesson sends the student to, by slug.
     *
     * A dictation or shadowing lesson does not run its own exercise — it points
     * at `/drills/<slug>`, where the drill engine already handles segment
     * replay, scoring and attempt history. The link is by slug rather than a
     * foreign key so a course can be authored before its drills exist, and a
     * missing drill degrades to the drills index instead of a broken lesson.
     */
    drillSlug: z.string().min(1).max(120).optional(),
    /** Attribution for third-party media. */
    source: z
      .object({ label: z.string().min(1).max(160), href: z.string().url().max(500).optional() })
      .optional(),
  })
  .strip()
export type LessonContent = z.infer<typeof lessonContentSchema>

export function parseLessonContent(raw: unknown): LessonContent {
  const parsed = lessonContentSchema.safeParse(raw ?? {})
  return parsed.success ? parsed.data : { keyPoints: [], cues: [], terms: [] }
}

/** Splits a prose body into paragraphs for the article renderer. */
export function paragraphs(body: string): string[] {
  return body
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
}
