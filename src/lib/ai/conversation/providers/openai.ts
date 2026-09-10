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

const DEFAULT_MODEL = 'gpt-4o-mini'

/** USD per million tokens — verify against the current price list. */
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
  return process.env.AI_CONVERSATION_MODEL?.trim() || env.ai.model || DEFAULT_MODEL
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

/**
 * A strict json_schema response format rejects `type: ["string", "null"]`, so
 * the nullable correction fields are relaxed to plain strings here and an
 * empty string is normalised back to null by the zod schema's consumers.
 */
function toStrictSchema(schema: Record<string, unknown>): Record<string, unknown> {
  const clone: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(schema)) {
    if (key === 'type' && Array.isArray(value)) {
      clone[key] = value.find((entry) => entry !== 'null') ?? 'string'
    } else if (Array.isArray(value)) {
      clone[key] = value.map((item) =>
        item && typeof item === 'object' ? toStrictSchema(item as Record<string, unknown>) : item,
      )
    } else if (value && typeof value === 'object') {
      clone[key] = toStrictSchema(value as Record<string, unknown>)
    } else {
      clone[key] = value
    }
  }
  return clone
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
        json_schema: {
          name: options.schemaName,
          strict: true,
          schema: toStrictSchema(options.jsonSchema),
        },
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
    usage: {
      promptTokens,
      completionTokens,
      costMicros: costMicros(modelId, promptTokens, completionTokens),
    },
    provider: 'openai',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

export const openaiConversationProvider: ConversationProvider = {
  name: 'openai',
  get available() {
    return Boolean(env.ai.apiKey)
  },

  reply(input: ConversationReplyInput): Promise<AiResult<ConversationReply>> {
    return call({
      system: CONVERSATION_SYSTEM_PROMPT,
      prompt: conversationReplyPrompt(input),
      jsonSchema: CONVERSATION_REPLY_JSON_SCHEMA,
      schema: conversationReplySchema,
      schemaName: 'conversation_reply',
    })
  },

  report(input: ConversationReportInput): Promise<AiResult<ConversationReport>> {
    return call({
      system: CONVERSATION_REPORT_SYSTEM_PROMPT,
      prompt: conversationReportPrompt(input),
      jsonSchema: CONVERSATION_REPORT_JSON_SCHEMA,
      schema: conversationReportSchema,
      schemaName: 'conversation_report',
    })
  },
}
