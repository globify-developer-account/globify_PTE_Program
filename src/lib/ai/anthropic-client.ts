import Anthropic from '@anthropic-ai/sdk'
import AnthropicAws from '@anthropic-ai/aws-sdk'
import { env } from '../env'
import { AiProviderError } from './types'

/**
 * The one Claude client shared by scoring, conversations and content generation.
 *
 * AI_API_KEY can hold either of two kinds of key, and they are not
 * interchangeable — each is rejected by the other's endpoint:
 *
 *   - a first-party key (`sk-ant-…`) from the Claude Console, served by
 *     api.anthropic.com;
 *   - a Claude Platform on AWS key generated in the AWS Console, served by
 *     aws-external-anthropic.{region}.api.aws, which additionally needs the
 *     workspace's region and ID.
 *
 * The key's prefix decides which client is built, so a misconfigured AWS setup
 * fails with a message naming the missing variable rather than a bare 401.
 */

const FIRST_PARTY_KEY_PREFIX = 'sk-ant-'

export function usesClaudePlatformOnAws(): boolean {
  return Boolean(env.ai.aws.workspaceId) || !env.ai.apiKey.startsWith(FIRST_PARTY_KEY_PREFIX)
}

let cached: Anthropic | null = null

/** Retries are off: `runAi` owns retry and fallback policy for the product. */
export function anthropicClient(): Anthropic {
  if (!env.ai.apiKey) throw new AiProviderError('AI_API_KEY is not configured.', 'anthropic')
  if (cached) return cached

  const options = { apiKey: env.ai.apiKey, maxRetries: 0, timeout: env.ai.timeoutMs }

  if (!usesClaudePlatformOnAws()) {
    cached = new Anthropic(options)
    return cached
  }

  const { region, workspaceId } = env.ai.aws
  if (!region || !workspaceId) {
    throw new AiProviderError(
      'AI_API_KEY is a Claude Platform on AWS key, which also needs AWS_REGION and ANTHROPIC_AWS_WORKSPACE_ID.',
      'anthropic',
    )
  }
  cached = new AnthropicAws({ ...options, awsRegion: region, workspaceId })
  return cached
}
