import 'server-only'
import type { AiFeature } from '@prisma/client'
import { prisma } from '../../db'
import { env } from '../../env'
import { getSettings } from '../../settings'
import { HttpError } from '../../http'
import { AiProviderError, monthlySpendMicros, type AiResult } from '../index'
import { anthropicConversationProvider } from './providers/anthropic'
import { demoConversationProvider } from './providers/demo'
import { geminiConversationProvider } from './providers/gemini'
import { openaiConversationProvider } from './providers/openai'
import type { ConversationProvider } from './types'

export * from './types'

const PROVIDERS: Record<string, ConversationProvider> = {
  demo: demoConversationProvider,
  anthropic: anthropicConversationProvider,
  openai: openaiConversationProvider,
  gemini: geminiConversationProvider,
}

/**
 * Resolves the configured conversation provider, degrading to the simulated one
 * rather than failing when credentials are missing. The chat UI always reports
 * which provider is speaking, so a silent downgrade is never invisible.
 */
export function conversationProvider(): ConversationProvider {
  if (env.demoMode) return demoConversationProvider
  const chosen = PROVIDERS[env.ai.provider]
  if (chosen?.available) return chosen
  console.warn(
    `[ai] conversation provider "${env.ai.provider}" is unavailable; falling back to the simulated partner.`,
  )
  return demoConversationProvider
}

function fallbackProvider(): ConversationProvider | null {
  if (!env.ai.fallbackProvider) return null
  const candidate = PROVIDERS[env.ai.fallbackProvider]
  return candidate?.available ? candidate : null
}

interface LogInput {
  feature: AiFeature
  userId: string | null
  provider: string
  model: string
  status: 'SUCCESS' | 'FAILED' | 'CACHED' | 'BLOCKED'
  usage: { promptTokens: number; completionTokens: number; costMicros: number }
  latencyMs: number
  error?: string
}

async function logUsage(input: LogInput): Promise<void> {
  await prisma.aiUsageLog
    .create({
      data: {
        userId: input.userId,
        feature: input.feature,
        provider: input.provider,
        model: input.model,
        status: input.status,
        promptTokens: input.usage.promptTokens,
        completionTokens: input.usage.completionTokens,
        costMicros: input.usage.costMicros,
        latencyMs: input.latencyMs,
        error: input.error?.slice(0, 500) ?? null,
      },
    })
    .catch((error: unknown) => {
      console.error('[ai] failed to record usage:', error instanceof Error ? error.message : error)
    })
}

async function assertBudget(feature: AiFeature, userId: string | null): Promise<void> {
  const settings = await getSettings()
  const budgetUsd = settings.aiMonthlyBudgetUsd || env.ai.monthlyBudgetUsd
  if (budgetUsd <= 0) return

  const spent = await monthlySpendMicros()
  if (spent >= budgetUsd * 1_000_000) {
    await logUsage({
      feature,
      userId,
      provider: env.ai.provider,
      model: env.ai.model || 'unknown',
      status: 'BLOCKED',
      usage: { promptTokens: 0, completionTokens: 0, costMicros: 0 },
      latencyMs: 0,
      error: 'Monthly AI budget reached',
    })
    throw new HttpError(
      503,
      'AI conversations are temporarily paused while we review this month’s usage. Your conversation has been saved and you can pick it up later.',
      'ai_budget_reached',
    )
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs a conversation call with budget enforcement, bounded retries, provider
 * fallback and usage accounting — the same policy `runAi()` applies to scoring,
 * against the conversation contract.
 *
 * The two runners are deliberately separate for now because `runAi()` is typed
 * against `AIProvider`. If a third contract appears, hoist this policy into one
 * generic runner rather than copying it a third time.
 */
export async function runConversationAi<T>(
  feature: AiFeature,
  userId: string | null,
  invoke: (provider: ConversationProvider) => Promise<AiResult<T>>,
): Promise<AiResult<T>> {
  await assertBudget(feature, userId)

  const primary = conversationProvider()
  const candidates = [primary, fallbackProvider()].filter(
    (provider): provider is ConversationProvider => provider !== null,
  )
  let lastError: unknown

  for (const provider of candidates) {
    for (let attempt = 0; attempt <= env.ai.maxRetries; attempt++) {
      try {
        const result = await invoke(provider)
        await logUsage({
          feature,
          userId,
          provider: result.provider,
          model: result.model,
          status: 'SUCCESS',
          usage: result.usage,
          latencyMs: result.latencyMs,
        })
        return result
      } catch (error) {
        lastError = error
        const retryable = error instanceof AiProviderError && error.retryable
        if (!retryable || attempt === env.ai.maxRetries) break
        await sleep(400 * 2 ** attempt)
      }
    }

    await logUsage({
      feature,
      userId,
      provider: provider.name,
      model: env.ai.model || 'unknown',
      status: 'FAILED',
      usage: { promptTokens: 0, completionTokens: 0, costMicros: 0 },
      latencyMs: 0,
      error: lastError instanceof Error ? lastError.message : 'Unknown error',
    })
  }

  // Last resort: the simulated partner keeps the student talking rather than
  // dropping the conversation. The result is labelled as simulated in the UI.
  if (primary.name !== 'demo') {
    console.error('[ai] all conversation providers failed; using the simulated partner for this turn.')
    const result = await invoke(demoConversationProvider)
    await logUsage({
      feature,
      userId,
      provider: 'demo',
      model: result.model,
      status: 'CACHED',
      usage: result.usage,
      latencyMs: result.latencyMs,
      error: 'Degraded to the simulated partner after provider failure',
    })
    return result
  }

  throw lastError instanceof Error
    ? new HttpError(502, `The conversation partner is unavailable: ${lastError.message}`, 'ai_failed')
    : new HttpError(502, 'The conversation partner is unavailable. Please try again.', 'ai_failed')
}
