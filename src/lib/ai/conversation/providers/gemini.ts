import type { ZodType, ZodTypeDef } from 'zod'
import { env } from '../../../env'
import { AiProviderError, type AiResult } from '../../types'
import { parseJson } from '../../providers/anthropic'
import {
  CONVERSATION_REPLY_JSON_SCHEMA,
  CONVERSATION_REPORT_JSON_SCHEMA,
  CONVERSATION_REPORT_SYSTEM_PROMPT,
  CONVERSATION_SYSTEM_PROMPT,
  conversationReplyPrompt,
  conversationReportPrompt,
} from '../prompts'
import {
  conversationReplySchema,
  conversationReportSchema,
  type ConversationProvider,
  type ConversationReply,
  type ConversationReplyInput,
  type ConversationReport,
  type ConversationReportInput,
} from '../types'

const DEFAULT_MODEL = 'gemini-2.0-flash'
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/** USD per million tokens — verify against the current price list. */
const PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.1, output: 0.4 },
  'gemini-2.5-pro': { input: 1.25, output: 10 },
}

function model(): string {
  return process.env.AI_CONVERSATION_MODEL?.trim() || env.ai.model || DEFAULT_MODEL
}

function costMicros(modelId: string, promptTokens: number, completionTokens: number): number {
  const rate = PRICING[modelId] ?? PRICING[DEFAULT_MODEL]!
  return Math.round(promptTokens * rate.input + completionTokens * rate.output)
}

/**
 * Gemini rejects `additionalProperties`, and expresses an optional field with
 * `nullable` rather than a union type, so both are rewritten here.
 */
function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'additionalProperties') continue
    if (key === 'type' && Array.isArray(value)) {
      clone[key] = value.find((entry) => entry !== 'null') ?? 'string'
      if (value.includes('null')) clone.nullable = true
    } else if (Array.isArray(value)) {
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
    usage: {
      promptTokens,
      completionTokens,
      costMicros: costMicros(modelId, promptTokens, completionTokens),
    },
    provider: 'gemini',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

export const geminiConversationProvider: ConversationProvider = {
  name: 'gemini',
  get available() {
    return Boolean(env.ai.apiKey)
  },

  reply(input: ConversationReplyInput): Promise<AiResult<ConversationReply>> {
    return call({
      system: CONVERSATION_SYSTEM_PROMPT,
      prompt: conversationReplyPrompt(input),
      jsonSchema: CONVERSATION_REPLY_JSON_SCHEMA,
      schema: conversationReplySchema,
    })
  },

  report(input: ConversationReportInput): Promise<AiResult<ConversationReport>> {
    return call({
      system: CONVERSATION_REPORT_SYSTEM_PROMPT,
      prompt: conversationReportPrompt(input),
      jsonSchema: CONVERSATION_REPORT_JSON_SCHEMA,
      schema: conversationReportSchema,
    })
  },
}
