import Anthropic from '@anthropic-ai/sdk'
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
  AiProviderError,
  progressAnalysisSchema,
  recommendationSchema,
  speakingScoreSchema,
  writingImprovementSchema,
  writingScoreSchema,
  type AIProvider,
  type AiResult,
  type ProgressAnalysis,
  type ProgressAnalysisInput,
  type RecommendationInput,
  type RecommendationPayload,
  type SpeakingScore,
  type SpeakingScoreInput,
  type WritingImprovement,
  type WritingImprovementInput,
  type WritingScore,
  type WritingScoreInput,
} from '../types'

const DEFAULT_MODEL = 'claude-opus-5'

/** USD per million tokens. Update alongside the published price list. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

function model(): string {
  return env.ai.model || DEFAULT_MODEL
}

function costMicros(modelId: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING[modelId] ?? PRICING[DEFAULT_MODEL]!
  return Math.round(promptTokens * rate.input + completionTokens * rate.output)
}

let cached: Anthropic | null = null
function client(): Anthropic {
  if (!env.ai.apiKey) throw new AiProviderError('AI_API_KEY is not configured.', 'anthropic')
  cached ??= new Anthropic({ apiKey: env.ai.apiKey, maxRetries: 0, timeout: env.ai.timeoutMs })
  return cached
}

interface CallOptions<T> {
  system: string
  prompt: string
  jsonSchema: Record<string, unknown>
  /** Input is `unknown` because the model's payload is untrusted until parsed. */
  schema: ZodType<T, ZodTypeDef, unknown>
  maxTokens?: number
}

async function call<T>(options: CallOptions<T>): Promise<AiResult<T>> {
  const modelId = model()
  const startedAt = Date.now()

  let message: Anthropic.Message
  try {
    message = await client().messages.create({
      model: modelId,
      max_tokens: options.maxTokens ?? 4000,
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: options.jsonSchema },
      },
    })
  } catch (error) {
    const retryable =
      error instanceof Anthropic.RateLimitError ||
      error instanceof Anthropic.APIConnectionError ||
      (error instanceof Anthropic.APIError && error.status >= 500)
    throw new AiProviderError(
      error instanceof Error ? error.message : 'Anthropic request failed.',
      'anthropic',
      retryable,
    )
  }

  if (message.stop_reason === 'refusal') {
    throw new AiProviderError('The model declined to score this response.', 'anthropic')
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const parsed = parseJson(text)
  const validated = options.schema.safeParse(parsed)
  if (!validated.success) {
    throw new AiProviderError(
      `Anthropic returned a payload that failed validation: ${validated.error.issues[0]?.message ?? 'unknown issue'}`,
      'anthropic',
      true,
    )
  }

  const promptTokens = message.usage.input_tokens ?? 0
  const completionTokens = message.usage.output_tokens ?? 0

  return {
    data: validated.data,
    usage: { promptTokens, completionTokens, costMicros: costMicros(modelId, promptTokens, completionTokens) },
    provider: 'anthropic',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

/** Tolerates a model that wraps its JSON in prose or a code fence. */
export function parseJson(text: string): unknown {
  const trimmed = text.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
    const candidate = fenced?.[1] ?? trimmed.slice(trimmed.indexOf('{'), trimmed.lastIndexOf('}') + 1)
    try {
      return JSON.parse(candidate)
    } catch {
      return null
    }
  }
}

export const anthropicProvider: AIProvider = {
  name: 'anthropic',
  get available() {
    return Boolean(env.ai.apiKey)
  },

  scoreSpeaking(input: SpeakingScoreInput): Promise<AiResult<SpeakingScore>> {
    return call({
      system: SCORING_SYSTEM_PROMPT,
      prompt: speakingPrompt(input),
      jsonSchema: SPEAKING_JSON_SCHEMA,
      schema: speakingScoreSchema,
    })
  },

  scoreWriting(input: WritingScoreInput): Promise<AiResult<WritingScore>> {
    return call({
      system: SCORING_SYSTEM_PROMPT,
      prompt: writingPrompt(input),
      jsonSchema: WRITING_JSON_SCHEMA,
      schema: writingScoreSchema,
      maxTokens: 6000,
    })
  },

  improveWriting(input: WritingImprovementInput): Promise<AiResult<WritingImprovement>> {
    return call({
      system: IMPROVEMENT_SYSTEM_PROMPT,
      prompt: improvementPrompt(input),
      jsonSchema: IMPROVEMENT_JSON_SCHEMA,
      schema: writingImprovementSchema,
      // The rewrite returns the whole draft plus an explanation per edit, so it
      // needs materially more room than a score does.
      maxTokens: 8000,
    })
  },

  generateRecommendation(input: RecommendationInput): Promise<AiResult<RecommendationPayload>> {
    return call({
      system: RECOMMENDATION_SYSTEM_PROMPT,
      prompt: recommendationPrompt(input),
      jsonSchema: RECOMMENDATION_JSON_SCHEMA,
      schema: recommendationSchema,
    })
  },

  analyzeProgress(input: ProgressAnalysisInput): Promise<AiResult<ProgressAnalysis>> {
    return call({
      system: PROGRESS_SYSTEM_PROMPT,
      prompt: progressPrompt(input),
      jsonSchema: PROGRESS_JSON_SCHEMA,
      schema: progressAnalysisSchema,
    })
  },
}
