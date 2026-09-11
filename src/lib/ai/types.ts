import { z } from 'zod'
import type { AiFeature } from '@prisma/client'

/**
 * AI provider contract.
 *
 * The rest of the application talks to this interface only — swapping
 * AI_PROVIDER between demo, anthropic, openai and gemini must not require a
 * change anywhere outside src/lib/ai/providers.
 */

const score = z.number().min(0).max(90)
const bullets = z.array(z.string().min(1).max(400)).max(8)

/** Matches the documented Speaking payload (see docs/AI.md). */
export const speakingScoreSchema = z.object({
  overall_score: score,
  content: score,
  pronunciation: score,
  fluency: score,
  grammar: score,
  vocabulary: score,
  feedback: bullets,
  strengths: bullets.optional().default([]),
  improvements: bullets.optional().default([]),
  recommendations: bullets.optional().default([]),
})
export type SpeakingScore = z.infer<typeof speakingScoreSchema>

export const writingScoreSchema = z.object({
  overall_score: score,
  content: score,
  form: score,
  grammar: score,
  vocabulary: score,
  coherence: score,
  development: score,
  spelling: score.optional(),
  feedback: bullets,
  strengths: bullets.optional().default([]),
  improvements: bullets.optional().default([]),
  how_to_improve: bullets.optional().default([]),
  suggested_rewrite: z.string().max(4000).optional(),
})
export type WritingScore = z.infer<typeof writingScoreSchema>

/**
 * IELTS band, 0-9.
 *
 * Bands are reported in half steps, but this schema deliberately accepts any
 * number in range: a model that answers 6.3 is telling us something useful,
 * and rejecting the payload would fail the whole scoring call. The rounding to
 * a reportable half band happens in the scoring pipeline, alongside the other
 * clamping a provider response goes through before it is written.
 */
const band = z.number().min(0).max(9)

/**
 * The four published IELTS Writing criteria. Task 1 is assessed on Task
 * Achievement and Task 2 on Task Response — the same slot under two names, so
 * the payload carries one `task` field and the prompt says which it means.
 */
export const ieltsWritingScoreSchema = z.object({
  overall_band: band,
  task: band,
  coherence_cohesion: band,
  lexical_resource: band,
  grammatical_range_accuracy: band,
  /** Whether the response met the stated minimum word count. */
  meets_word_count: z.boolean().optional().default(true),
  word_count: z.number().int().nonnegative().optional(),
  feedback: bullets,
  strengths: bullets.optional().default([]),
  improvements: bullets.optional().default([]),
  how_to_improve: bullets.optional().default([]),
  suggested_rewrite: z.string().max(4000).optional(),
})
export type IeltsWritingScore = z.infer<typeof ieltsWritingScoreSchema>

/** The four published IELTS Speaking criteria. */
export const ieltsSpeakingScoreSchema = z.object({
  overall_band: band,
  fluency_coherence: band,
  lexical_resource: band,
  grammatical_range_accuracy: band,
  pronunciation: band,
  feedback: bullets,
  strengths: bullets.optional().default([]),
  improvements: bullets.optional().default([]),
  recommendations: bullets.optional().default([]),
})
export type IeltsSpeakingScore = z.infer<typeof ieltsSpeakingScoreSchema>

/**
 * Rewrite payload for the writing improvement tool.
 *
 * This is deliberately not a scoring schema. The tool exists so a student can
 * write freely and see their own sentences repaired, so the contract is the
 * improved text plus an itemised, categorised account of every change.
 */
export const editCategories = [
  'GRAMMAR',
  'VOCABULARY',
  'SPELLING',
  'PUNCTUATION',
  'COHERENCE',
  'STRUCTURE',
  'CONCISENESS',
] as const
export type EditCategory = (typeof editCategories)[number]

export const writingImprovementSchema = z.object({
  improved_text: z.string().min(1).max(12000),
  summary: z.string().min(1).max(800),
  edits: z
    .array(
      z.object({
        original: z.string().max(400),
        replacement: z.string().max(400),
        category: z.enum(editCategories),
        explanation: z.string().min(1).max(400),
      }),
    )
    .max(40)
    .default([]),
  strengths: bullets.optional().default([]),
  focus_next: bullets.optional().default([]),
})
export type WritingImprovement = z.infer<typeof writingImprovementSchema>

export const transcriptionSchema = z.object({
  text: z.string().max(8000),
  /** 0–1 confidence where the provider reports one. */
  confidence: z.number().min(0).max(1).optional(),
  durationMs: z.number().int().nonnegative().optional(),
})
export type Transcription = z.infer<typeof transcriptionSchema>

export const recommendationSchema = z.object({
  recommendations: z
    .array(
      z.object({
        code: z.string().min(1).max(60),
        title: z.string().min(1).max(120),
        body: z.string().min(1).max(600),
        section: z.enum(['SPEAKING', 'WRITING', 'READING', 'LISTENING']).optional(),
        questionTypeCode: z.string().max(60).optional(),
        priority: z.number().int().min(0).max(100).default(50),
      }),
    )
    .max(8),
})
export type RecommendationPayload = z.infer<typeof recommendationSchema>

export const progressAnalysisSchema = z.object({
  summary: z.string().min(1).max(1200),
  strengths: bullets,
  weaknesses: bullets,
  next_steps: bullets,
  projected_score: score.optional(),
})
export type ProgressAnalysis = z.infer<typeof progressAnalysisSchema>

// --- request inputs -----------------------------------------------------------

export interface SpeakingScoreInput {
  questionType: string
  questionTitle: string
  /** The text the student was asked to read, or the prompt/transcript of the audio. */
  expectedText?: string | null
  imageDescription?: string | null
  transcript: string
  audioDurationMs?: number | null
  targetScore: number
}

export interface WritingScoreInput {
  questionType: string
  questionTitle: string
  prompt: string
  passage?: string | null
  response: string
  wordLimitMin?: number | null
  wordLimitMax?: number | null
  targetScore: number
}

export interface IeltsWritingScoreInput {
  /** IELTS_WRITING_TASK1_ACADEMIC, IELTS_WRITING_TASK1_GENERAL or IELTS_WRITING_TASK2. */
  questionType: string
  questionTitle: string
  prompt: string
  /** Academic Task 1 describes a figure; this is what the figure shows. */
  figureDescription?: string | null
  variant: 'ACADEMIC' | 'GENERAL_TRAINING' | null
  /** 1 or 2 — decides Task Achievement vs Task Response and the word floor. */
  taskNumber: 1 | 2
  response: string
  wordLimitMin?: number | null
  /** The student's target band, 0-9. */
  targetBand: number
}

export interface IeltsSpeakingScoreInput {
  /** IELTS_SPEAKING_PART1, _PART2 or _PART3. */
  questionType: string
  questionTitle: string
  /** 1, 2 or 3 — Part 2 is the cue card and is judged as one long turn. */
  partNumber: 1 | 2 | 3
  /** The examiner questions or the cue card, as the student saw them. */
  prompt: string
  /** One entry per recorded answer; Part 2 has exactly one. */
  transcript: string
  audioDurationMs?: number | null
  targetBand: number
}

export interface WritingImprovementInput {
  /** Mirrors WritingTaskKind. FREEFORM means the student brought their own text. */
  taskKind: 'ESSAY' | 'SUMMARIZE_WRITTEN_TEXT' | 'SUMMARIZE_SPOKEN_TEXT' | 'FREEFORM'
  /** The exercise prompt, when the text answers one. */
  prompt?: string | null
  passage?: string | null
  text: string
  wordLimitMin?: number | null
  wordLimitMax?: number | null
  /** Narrows what the model may change; 'all' is the default polish. */
  focus: 'all' | 'grammar' | 'vocabulary' | 'structure'
  targetScore: number
}

export interface TranscriptionInput {
  audio: Uint8Array
  mimeType: string
  /** Expected text, when known — improves alignment for Read Aloud. */
  hint?: string | null
}

export interface RecommendationInput {
  targetScore: number
  currentScore: number
  sectionScores: Record<string, number>
  weakestSkills: Array<{ skill: string; score: number }>
  recentActivity: Array<{ questionType: string; score: number }>
}

export interface ProgressAnalysisInput {
  targetScore: number
  currentScore: number
  sectionScores: Record<string, number>
  history: Array<{ date: string; score: number }>
  attemptsLast30Days: number
}

export interface AiUsage {
  promptTokens: number
  completionTokens: number
  /** Cost in millionths of a USD, so aggregation stays integer-exact. */
  costMicros: number
}

export interface AiResult<T> {
  data: T
  usage: AiUsage
  provider: string
  model: string
  latencyMs: number
}

export interface AIProvider {
  readonly name: string
  readonly available: boolean
  scoreSpeaking(input: SpeakingScoreInput): Promise<AiResult<SpeakingScore>>
  scoreWriting(input: WritingScoreInput): Promise<AiResult<WritingScore>>
  scoreIeltsWriting(input: IeltsWritingScoreInput): Promise<AiResult<IeltsWritingScore>>
  scoreIeltsSpeaking(input: IeltsSpeakingScoreInput): Promise<AiResult<IeltsSpeakingScore>>
  improveWriting(input: WritingImprovementInput): Promise<AiResult<WritingImprovement>>
  generateRecommendation(input: RecommendationInput): Promise<AiResult<RecommendationPayload>>
  analyzeProgress(input: ProgressAnalysisInput): Promise<AiResult<ProgressAnalysis>>
}

export interface TranscriptionProvider {
  readonly name: string
  readonly available: boolean
  transcribe(input: TranscriptionInput): Promise<AiResult<Transcription>>
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly provider: string,
    readonly retryable = false,
  ) {
    super(message)
    this.name = 'AiProviderError'
  }
}

export const FEATURE_LABEL: Record<AiFeature, string> = {
  SPEAKING_SCORE: 'Speaking evaluation',
  WRITING_SCORE: 'Writing evaluation',
  TRANSCRIPTION: 'Speech transcription',
  FEEDBACK: 'Feedback generation',
  RECOMMENDATION: 'Recommendations',
  PROGRESS_ANALYSIS: 'Progress analysis',
  WRITING_IMPROVEMENT: 'Writing improvement',
  CONVERSATION: 'Conversation turn',
  CONVERSATION_REPORT: 'Conversation report',
  SPEECH_SYNTHESIS: 'Speech synthesis',
  IELTS_WRITING_SCORE: 'IELTS writing evaluation',
  IELTS_SPEAKING_SCORE: 'IELTS speaking evaluation',
}
