import { z } from 'zod'

/** Payloads accepted by the drill endpoints. Everything here is off the wire. */

export const drillModeSchema = z.enum(['DICTATION', 'SHADOWING'])
export type DrillModeInput = z.infer<typeof drillModeSchema>

/** Accepts the lowercase form used in `?mode=` and falls back to dictation. */
export function parseMode(raw: string | null | undefined): DrillModeInput {
  return raw?.toUpperCase() === 'SHADOWING' ? 'SHADOWING' : 'DICTATION'
}

const shared = {
  segmentId: z.string().min(1).max(60),
  /** How many times the clip was replayed — recorded, never scored. */
  playCount: z.number().int().nonnegative().max(200).optional(),
  timeSpentSeconds: z.number().int().nonnegative().max(3600).optional(),
}

export const dictationSubmissionSchema = z.object({
  ...shared,
  text: z.string().min(1).max(2000),
})
export type DictationSubmission = z.infer<typeof dictationSubmissionSchema>

/**
 * Shadowing arrives as multipart form data — the recording travels with it —
 * so the numeric fields come in as strings and are coerced here.
 */
export const shadowingSubmissionSchema = z.object({
  ...shared,
  audioDurationMs: z.coerce.number().int().nonnegative().max(600_000).optional(),
  playCount: z.coerce.number().int().nonnegative().max(200).optional(),
  timeSpentSeconds: z.coerce.number().int().nonnegative().max(3600).optional(),
})
export type ShadowingSubmission = z.infer<typeof shadowingSubmissionSchema>
