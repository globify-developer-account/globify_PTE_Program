import 'server-only'
import type { AiFeature } from '@prisma/client'
import { prisma } from '../db'
import { env } from '../env'
import { getSettings } from '../settings'
import { HttpError } from '../http'
import { anthropicProvider } from './providers/anthropic'
import { demoProvider, demoTranscriptionProvider } from './providers/demo'
import { geminiProvider } from './providers/gemini'
import { openaiProvider, openaiTranscriptionProvider } from './providers/openai'
import {
  AiProviderError,
  type AIProvider,
  type AiResult,
  type TranscriptionProvider,
} from './types'

export * from './types'

const PROVIDERS: Record<string, AIProvider> = {
  demo: demoProvider,
  anthropic: anthropicProvider,
  openai: openaiProvider,
  gemini: geminiProvider,
}

const TRANSCRIBERS: Record<string, TranscriptionProvider> = {
  demo: demoTranscriptionProvider,
  openai: openaiTranscriptionProvider,
}

/**
 * Resolves the configured provider, degrading to the simulated one rather than
 * failing when credentials are missing. The UI always reports which provider
 * produced a score, so a silent downgrade is never invisible to the student.
 */
export function aiProvider(): AIProvider {
  if (env.demoMode) return demoProvider
  const chosen = PROVIDERS[env.ai.provider]
  if (chosen?.available) return chosen
  console.warn(`[ai] provider "${env.ai.provider}" is unavailable; falling back to the simulated provider.`)
  return demoProvider
}

export function transcriptionProvider(): TranscriptionProvider {
  if (env.demoMode) return demoTranscriptionProvider
  const chosen = TRANSCRIBERS[env.ai.transcriptionProvider]
  return chosen?.available ? chosen : demoTranscriptionProvider
}

export function isSimulated(providerName: string): boolean {
  return providerName === 'demo'
}

function fallbackProvider(): AIProvider | null {
  if (!env.ai.fallbackProvider) return null
  const candidate = PROVIDERS[env.ai.fallbackProvider]
  return candidate?.available ? candidate : null
}

/** Monthly spend across every AI feature, in millionths of a USD. */
export async function monthlySpendMicros(): Promise<number> {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  const result = await prisma.aiUsageLog.aggregate({
    where: { createdAt: { gte: start }, status: 'SUCCESS' },
    _sum: { costMicros: true },
  })
  return result._sum.costMicros ?? 0
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
      'AI scoring is temporarily paused while we review this month’s usage. Your response has been saved and can be scored later.',
      'ai_budget_reached',
    )
  }
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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Runs an AI call with budget enforcement, bounded retries, provider fallback
 * and usage accounting. Every AI request in the product goes through here —
 * that is what makes the admin cost dashboard complete.
 */
export async function runAi<T>(
  feature: AiFeature,
  userId: string | null,
  invoke: (provider: AIProvider) => Promise<AiResult<T>>,
): Promise<AiResult<T>> {
  await assertBudget(feature, userId)

  const primary = aiProvider()
  const candidates = [primary, fallbackProvider()].filter(
    (provider): provider is AIProvider => provider !== null,
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

  // Last resort: the simulated provider keeps the student unblocked rather than
  // losing their response entirely. The result is labelled as simulated.
  if (primary.name !== 'demo') {
    console.error('[ai] all providers failed; using the simulated provider for this request.')
    const result = await invoke(demoProvider)
    await logUsage({
      feature,
      userId,
      provider: 'demo',
      model: result.model,
      status: 'CACHED',
      usage: result.usage,
      latencyMs: result.latencyMs,
      error: 'Degraded to simulated scoring after provider failure',
    })
    return result
  }

  throw lastError instanceof Error
    ? new HttpError(502, `AI scoring failed: ${lastError.message}`, 'ai_failed')
    : new HttpError(502, 'AI scoring failed. Please try again.', 'ai_failed')
}
