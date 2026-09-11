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
  ieltsSpeakingScoreSchema,
  ieltsWritingScoreSchema,
  type IeltsSpeakingScore,
  type IeltsSpeakingScoreInput,
  type IeltsWritingScore,
  type IeltsWritingScoreInput,
} from '../types'
import { parseJson } from './anthropic'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** USD per million tokens — verify against the current price list. */
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
}

function model(): string {
  return env.ai.model || DEFAULT_MODEL
}

function costMicros(modelId: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING[modelId] ?? PRICING[DEFAULT_MODEL]!
  return Math.round(promptTokens * rate.input + completionTokens * rate.output)
}

/** Gemini rejects `additionalProperties`, so strip it from the shared schemas. */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties') continue
    if (Array.isArray(value)) {
      clone[key] = value.map((item) =>
        item && typeof item === 'object' ? toGeminiSchema(item as Record<string, unknown>) : item,
      )
    } else if (value && typeof value === 'object') {
      clone[key] = toGeminiSchema(value as Record<string, unknown>)
    } else {
      clone[key] = value
    }
  }
  return clone
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
  error?: { message?: string }
}

async function call<T>(options: {
  system: string
  prompt: string
  jsonSchema: Record<string, unknown>
  schema: ZodType<T, ZodTypeDef, unknown>
}): Promise<AiResult<T>> {
  if (!env.ai.apiKey) throw new AiProviderError('AI_API_KEY is not configured.', 'gemini')
  const modelId = model()
  const startedAt = Date.now()

  const response = await fetch(`${BASE_URL}/models/${modelId}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.ai.apiKey },
    signal: AbortSignal.timeout(env.ai.timeoutMs),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: options.system }] },
      contents: [{ role: 'user', parts: [{ text: options.prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(options.jsonSchema),
      },
    }),
  })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as GeminiResponse | null
    throw new AiProviderError(
      body?.error?.message ?? `Gemini request failed with status ${response.status}.`,
      'gemini',
      response.status === 429 || response.status >= 500,
    )
  }

  const body = (await response.json()) as GeminiResponse
  const text = body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? ''
  const validated = options.schema.safeParse(parseJson(text))
  if (!validated.success) {
    throw new AiProviderError('Gemini returned a payload that failed validation.', 'gemini', true)
  }

  const promptTokens = body.usageMetadata?.promptTokenCount ?? 0
  const completionTokens = body.usageMetadata?.candidatesTokenCount ?? 0

  return {
    data: validated.data,
    usage: { promptTokens, completionTokens, costMicros: costMicros(modelId, promptTokens, completionTokens) },
    provider: 'gemini',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

export const geminiProvider: AIProvider = {
  name: 'gemini',
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
    })
  },

  scoreIeltsWriting(input: IeltsWritingScoreInput): Promise<AiResult<IeltsWritingScore>> {
    return call({
      system: IELTS_SCORING_SYSTEM_PROMPT,
      prompt: ieltsWritingPrompt(input),
      jsonSchema: IELTS_WRITING_JSON_SCHEMA,
      schema: ieltsWritingScoreSchema,
    })
  },

  scoreIeltsSpeaking(input: IeltsSpeakingScoreInput): Promise<AiResult<IeltsSpeakingScore>> {
    return call({
      system: IELTS_SCORING_SYSTEM_PROMPT,
      prompt: ieltsSpeakingPrompt(input),
      jsonSchema: IELTS_SPEAKING_JSON_SCHEMA,
      schema: ieltsSpeakingScoreSchema,
    })
  },
  improveWriting(input: WritingImprovementInput): Promise<AiResult<WritingImprovement>> {
    return call({
      system: IMPROVEMENT_SYSTEM_PROMPT,
      prompt: improvementPrompt(input),
      jsonSchema: IMPROVEMENT_JSON_SCHEMA,
      schema: writingImprovementSchema,
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
