import Anthropic from '@anthropic-ai/sdk'
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

const DEFAULT_MODEL = 'claude-sonnet-5'

/**
 * A conversation turn is short and latency is felt directly by the student, so
 * this defaults to Sonnet rather than the Opus default used for scoring. Set
 * AI_CONVERSATION_MODEL to override.
 */

/** USD per million tokens. Update alongside the published price list. */
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-opus-5': { input: 5, output: 25 },
  'claude-opus-4-8': { input: 5, output: 25 },
  'claude-sonnet-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
}

function model(): string {
  return process.env.AI_CONVERSATION_MODEL?.trim() || env.ai.model || DEFAULT_MODEL
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

async function call<T>(options: {
  system: string
  prompt: string
  jsonSchema: Record<string, unknown>
  schema: ZodType<T, ZodTypeDef, unknown>
  maxTokens?: number
  effort?: 'low' | 'medium' | 'high'
}): Promise<AiResult<T>> {
  const modelId = model()
  const startedAt = Date.now()

  let message: Anthropic.Message
  try {
    message = await client().messages.create({
      model: modelId,
      max_tokens: options.maxTokens ?? 1500,
      system: options.system,
      messages: [{ role: 'user', content: options.prompt }],
      output_config: {
        effort: options.effort ?? 'low',
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
    throw new AiProviderError('The model declined to continue this conversation.', 'anthropic')
  }

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('')

  const validated = options.schema.safeParse(parseJson(text))
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
    usage: {
      promptTokens,
      completionTokens,
      costMicros: costMicros(modelId, promptTokens, completionTokens),
    },
    provider: 'anthropic',
    model: modelId,
    latencyMs: Date.now() - startedAt,
  }
}

export const anthropicConversationProvider: ConversationProvider = {
  name: 'anthropic',
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
      maxTokens: 4000,
      effort: 'medium',
    })
  },
}
