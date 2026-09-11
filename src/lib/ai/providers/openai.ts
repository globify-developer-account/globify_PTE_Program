import type { ZodType, ZodTypeDef } from 'zod'
import { env } from '../../env'
import {
  PROGRESS_JSON_SCHEMA,
  PROGRESS_SYSTEM_PROMPT,
  RECOMMENDATION_JSON_SCHEMA,
  RECOMMENDATION_SYSTEM_PROMPT,
  IMPROVEMENT_JSON_SCHEMA,
  IMPROVEMENT_SYSTEM_PROMPT,
  SCORING_SYSTEM_PROMPT,
  SPEAKING_JSON_SCHEMA,
  WRITING_JSON_SCHEMA,
  improvementPrompt,
  progressPrompt,
  recommendationPrompt,
  speakingPrompt,
  writingPrompt,
} from '../prompts'
import {
  IELTS_SCORING_SYSTEM_PROMPT,
  IELTS_SPEAKING_JSON_SCHEMA,
  IELTS_WRITING_JSON_SCHEMA,
  ieltsSpeakingPrompt,
  ieltsWritingPrompt,
} from '../ielts-prompts'
import {
  AiProviderError,
  progressAnalysisSchema,
  recommendationSchema,
  speakingScoreSchema,
  writingImprovementSchema,
  transcriptionSchema,
  writingScoreSchema,
  type AIProvider,
  type AiResult,
  type ProgressAnalysis,
  type ProgressAnalysisInput,
  type RecommendationInput,
  type RecommendationPayload,
  type SpeakingScore,
  type SpeakingScoreInput,
  type Transcription,
  type TranscriptionInput,
  type TranscriptionProvider,
  type WritingImprovement,
  type WritingImprovementInput,
  type WritingScore,
  type WritingScoreInput,
  ieltsSpeakingScoreSchema,
  ieltsWritingScoreSchema,
  type IeltsSpeakingScore,
  type IeltsSpeakingScoreInput,
  type IeltsWritingScore,
  type IeltsWritingScoreInput,
} from '../types'
import { parseJson } from './anthropic'

/**
 * OpenAI-compatible provider. Talks the Chat Completions shape, so it also
 * works against Azure OpenAI, Together, Groq and other compatible gateways by
 * pointing AI_BASE_URL at them.
 */

const DEFAULT_MODEL = 'gpt-4o'
const DEFAULT_TRANSCRIBE_MODEL = 'whisper-1'

/** USD per million tokens — verify against the current price list before relying on billing figures. */
const PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 2.5, output: 10 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1': { input: 2, output: 8 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
}

function baseUrl(): string {
  return (process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
}

function model(): string {
  return env.ai.model || DEFAULT_MODEL
}

function costMicros(modelId: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING[modelId] ?? PRICING[DEFAULT_MODEL]!
  return Math.round(promptTokens * rate.input + completionTokens * rate.output)
}

interface ChatResponse {
  choices?: Array<{ message?: { content?: string | null } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
  error?: { message?: string }
}

async function call<T>(options: {
  system: string
  prompt: string
  jsonSchema: Record<string, unknown>
  schema: ZodType<T, ZodTypeDef, unknown>
  schemaName: string
}): Promise<AiResult<T>> {
  if (!env.ai.apiKey) throw new AiProviderError('AI_API_KEY is not configured.', 'openai')
  const modelId = model()
  const startedAt = Date.now()

  const response = await fetch(`${baseUrl()}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.ai.apiKey}`,
    },
    signal: AbortSignal.timeout(env.ai.timeoutMs),
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.prompt },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: options.schemaName, strict: true, schema: options.jsonSchema },
      },
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ChatResponse | null
    throw new AiProviderError(
      body?.error?.message ?? `OpenAI request failed with status ${response.status}.`,
      'openai',
      response.status === 429 || response.status >= 500,
    )
  }

  const body = (await response.json()) as ChatResponse
  const validated = options.schema.safeParse(parseJson(body.choices?.[0]?.message?.content ?? ''))
  if (!validated.success) {
    throw new AiProviderError('OpenAI returned a payload that failed validation.', 'openai', true)
  }

  const promptTokens = body.usage?.prompt_tokens ?? 0
  const completionTokens = body.usage?.completion_tokens ?? 0

  return {
    data: validated.data,
    usage: { promptTokens, completionTokens, costMicros: costMicros(modelId, promptTokens, completionTokens) },
    provider: 'openai',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

export const openaiProvider: AIProvider = {
  name: 'openai',
  get available() {
    return Boolean(env.ai.apiKey)
  },
  scoreSpeaking(input: SpeakingScoreInput): Promise<AiResult<SpeakingScore>> {
    return call({
      system: SCORING_SYSTEM_PROMPT,
      prompt: speakingPrompt(input),
      jsonSchema: SPEAKING_JSON_SCHEMA,
      schema: speakingScoreSchema,
      schemaName: 'speaking_score',
    })
  },
  scoreWriting(input: WritingScoreInput): Promise<AiResult<WritingScore>> {
    return call({
      system: SCORING_SYSTEM_PROMPT,
      prompt: writingPrompt(input),
      jsonSchema: WRITING_JSON_SCHEMA,
      schema: writingScoreSchema,
      schemaName: 'writing_score',
    })
  },

  scoreIeltsWriting(input: IeltsWritingScoreInput): Promise<AiResult<IeltsWritingScore>> {
    return call({
      system: IELTS_SCORING_SYSTEM_PROMPT,
      prompt: ieltsWritingPrompt(input),
      jsonSchema: IELTS_WRITING_JSON_SCHEMA,
      schema: ieltsWritingScoreSchema,
      schemaName: 'ielts_writing_score',
    })
  },

  scoreIeltsSpeaking(input: IeltsSpeakingScoreInput): Promise<AiResult<IeltsSpeakingScore>> {
    return call({
      system: IELTS_SCORING_SYSTEM_PROMPT,
      prompt: ieltsSpeakingPrompt(input),
      jsonSchema: IELTS_SPEAKING_JSON_SCHEMA,
      schema: ieltsSpeakingScoreSchema,
      schemaName: 'ielts_speaking_score',
    })
  },
  improveWriting(input: WritingImprovementInput): Promise<AiResult<WritingImprovement>> {
    return call({
      system: IMPROVEMENT_SYSTEM_PROMPT,
      prompt: improvementPrompt(input),
      jsonSchema: IMPROVEMENT_JSON_SCHEMA,
      schema: writingImprovementSchema,
      schemaName: 'writing_improvement',
    })
  },
  generateRecommendation(input: RecommendationInput): Promise<AiResult<RecommendationPayload>> {
    return call({
      system: RECOMMENDATION_SYSTEM_PROMPT,
      prompt: recommendationPrompt(input),
      jsonSchema: RECOMMENDATION_JSON_SCHEMA,
      schema: recommendationSchema,
      schemaName: 'recommendations',
    })
  },
  analyzeProgress(input: ProgressAnalysisInput): Promise<AiResult<ProgressAnalysis>> {
    return call({
      system: PROGRESS_SYSTEM_PROMPT,
      prompt: progressPrompt(input),
      jsonSchema: PROGRESS_JSON_SCHEMA,
      schema: progressAnalysisSchema,
      schemaName: 'progress_analysis',
    })
  },
}

export const openaiTranscriptionProvider: TranscriptionProvider = {
  name: 'openai',
  get available() {
    return Boolean(env.ai.transcriptionApiKey || env.ai.apiKey)
  },
  async transcribe(input: TranscriptionInput): Promise<AiResult<Transcription>> {
    const key = env.ai.transcriptionApiKey || env.ai.apiKey
    if (!key) throw new AiProviderError('No transcription API key configured.', 'openai')

    const startedAt = Date.now()
    const form = new FormData()
    form.append('file', new Blob([new Uint8Array(input.audio)], { type: input.mimeType }), 'response.webm')
    form.append('model', process.env.AI_TRANSCRIPTION_MODEL?.trim() || DEFAULT_TRANSCRIBE_MODEL)
    form.append('language', 'en')
    if (input.hint) form.append('prompt', input.hint.slice(0, 900))

    const response = await fetch(`${baseUrl()}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: AbortSignal.timeout(env.ai.timeoutMs),
    })

    if (!response.ok) {
      throw new AiProviderError(
        `Transcription failed with status ${response.status}.`,
        'openai',
        response.status === 429 || response.status >= 500,
      )
    }

    const body = (await response.json()) as { text?: string }
    const validated = transcriptionSchema.safeParse({ text: body.text ?? '' })
    if (!validated.success) throw new AiProviderError('Transcription response was malformed.', 'openai', true)

    return {
      data: validated.data,
      usage: { promptTokens: 0, completionTokens: 0, costMicros: 0 },
      provider: 'openai',
      model: DEFAULT_TRANSCRIBE_MODEL,
      latencyMs: Date.now() - startedAt,
    }
  },
}
