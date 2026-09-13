import Anthropic from '@anthropic-ai/sdk'
import AnthropicAws from '@anthropic-ai/aws-sdk'
import { env } from '../env'
import { AiProviderError } from './types'

/**
 * Claude clients, one per job, each with its own key:
 *
 *   - anthropicClient(): the app — scoring and the other runtime AI features —
 *     using AI_API_KEY, sent to AI_BASE_URL when a gateway is configured;
 *   - contentGenerationClient(): the question generator script, using
 *     CONTENT_AI_API_KEY.
 *
 * A key can be either of two kinds, and they are not interchangeable — each is
 * rejected by the other's endpoint:
 *
 *   - a first-party key (`sk-ant-…`) from the Claude Console, served by
 *     api.anthropic.com;
 *   - a Claude Platform on AWS key generated in the AWS Console, served by
 *     aws-external-anthropic.{region}.api.aws, which additionally needs the
 *     workspace's region and ID (AWS_REGION, ANTHROPIC_AWS_WORKSPACE_ID).
 *
 * Each key's own format decides which client it gets, so the two jobs can run
 * on different platforms side by side, and a misconfigured AWS setup fails with
 * a message naming the missing variable rather than a bare 401.
 */

const FIRST_PARTY_KEY_PREFIX = 'sk-ant-'

export function isClaudePlatformOnAwsKey(apiKey: string): boolean {
  return !apiKey.startsWith(FIRST_PARTY_KEY_PREFIX)
}

interface ClientOptions {
  maxRetries: number
  timeout: number
  baseURL?: string
}

function buildClient(apiKey: string, variable: string, options: ClientOptions): Anthropic {
  if (!apiKey) throw new AiProviderError(`${variable} is not configured.`, 'anthropic')

  // A gateway receives the key as-is, whatever its format.
  if (options.baseURL || !isClaudePlatformOnAwsKey(apiKey)) {
    return new Anthropic({ apiKey, ...options })
  }

  const { region, workspaceId } = env.ai.aws
  if (!region || !workspaceId) {
    throw new AiProviderError(
      `${variable} is a Claude Platform on AWS key, which also needs AWS_REGION and ANTHROPIC_AWS_WORKSPACE_ID.`,
      'anthropic',
    )
  }
  return new AnthropicAws({ apiKey, maxRetries: options.maxRetries, timeout: options.timeout, awsRegion: region, workspaceId })
}

let appClient: Anthropic | null = null

/** Retries are off: `runAi` owns retry and fallback policy for the product. */
export function anthropicClient(): Anthropic {
  appClient ??= buildClient(env.ai.apiKey, 'AI_API_KEY', {
    maxRetries: 0,
    timeout: env.ai.timeoutMs,
    baseURL: env.ai.baseUrl || undefined,
  })
  return appClient
}

/**
 * Generation is a batch job, not a request a student is waiting on, so it uses
 * the SDK's own retries and a long timeout. There is deliberately no fallback
 * to AI_API_KEY: that key is reserved for scoring.
 */
export function contentGenerationClient(): Anthropic {
  return buildClient(env.ai.contentApiKey, 'CONTENT_AI_API_KEY', { maxRetries: 3, timeout: 5 * 60_000 })
}
