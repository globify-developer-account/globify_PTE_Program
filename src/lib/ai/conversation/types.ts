import { z } from 'zod'
import type { AiResult } from '../types'

/**
 * Conversation provider contract.
 *
 * Conversation is deliberately a separate contract from `AIProvider`. Scoring
 * is a single-shot, one-response-in/one-verdict-out call; a conversation is
 * multi-turn and stateful, and the two have almost nothing in common beyond
 * the transport. Keeping them apart means a provider can support scoring
 * without supporting chat, and the scoring contract stays small.
 */

const band = z.number().min(0).max(90)
const bullets = z.array(z.string().min(1).max(400)).max(8)

export const conversationReplySchema = z.object({
  /** What the persona says next. Kept short — this is a conversation, not a lecture. */
  reply: z.string().min(1).max(1200),
  /**
   * A corrected version of the student's last turn, or null when it was fine.
   * The correction is shown beside their message, never spoken by the persona —
   * interrupting every turn to correct grammar is exactly the pressure this
   * feature exists to remove.
   */
  correction: z.string().max(600).nullish(),
  /** One sentence naming what changed and why. */
  correction_note: z.string().max(300).nullish(),
  /** Two or three things the student could say next, for when they stall. */
  suggestions: z.array(z.string().min(1).max(200)).max(3).optional().default([]),
  /** Scenario goals the student has now covered, quoted verbatim from the goal list. */
  goals_met: z.array(z.string().max(160)).max(8).optional().default([]),
  /** True once the scenario has reached a natural close. */
  is_closing: z.boolean().optional().default(false),
})
export type ConversationReply = z.infer<typeof conversationReplySchema>

export const conversationReportSchema = z.object({
  /** AI estimated speaking band for the conversation as a whole. Practice only. */
  estimated_score: band,
  fluency: band,
  vocabulary: band,
  grammar: band,
  /** How well the student sustained the exchange — asking back, following up, repairing. */
  interaction: band,
  summary: z.string().min(1).max(1200),
  strengths: bullets,
  improvements: bullets,
  next_steps: bullets,
  corrections: z
    .array(
      z.object({
        said: z.string().min(1).max(400),
        better: z.string().min(1).max(400),
        why: z.string().min(1).max(300),
      }),
    )
    .max(8)
    .optional()
    .default([]),
  goals_met: z.array(z.string().max(160)).max(8).optional().default([]),
})
export type ConversationReport = z.infer<typeof conversationReportSchema>

// --- request inputs -----------------------------------------------------------

export interface ConversationTurn {
  role: 'USER' | 'ASSISTANT'
  content: string
}

export interface ConversationReplyInput {
  /** Who the AI is playing, e.g. "Sara". */
  personaName: string
  /** Their relationship to the student, e.g. "a neighbour you have just met". */
  personaRole: string
  /** The situation both sides are in. */
  scenario: string
  topicTitle: string
  level: 'EASY' | 'MEDIUM' | 'HARD'
  /** What the student should manage to do in this scenario. */
  goals: string[]
  /** Vocabulary and structures worth steering the student towards. */
  targetLanguage: string[]
  /** Prior turns, oldest first. Trimmed by the caller before it gets here. */
  history: ConversationTurn[]
  studentMessage: string
  /** True when the turn arrived as speech rather than typing. */
  spoken: boolean
  targetScore: number
}

export interface ConversationReportInput {
  topicTitle: string
  scenario: string
  goals: string[]
  /** The full exchange, oldest first. */
  transcript: ConversationTurn[]
  targetScore: number
  /** How many of the student's turns were spoken rather than typed. */
  spokenTurns: number
  durationMs: number
}

export interface ConversationProvider {
  readonly name: string
  readonly available: boolean
  reply(input: ConversationReplyInput): Promise<AiResult<ConversationReply>>
  report(input: ConversationReportInput): Promise<AiResult<ConversationReport>>
}
