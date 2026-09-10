import { env } from '../../../env'
import { AiProviderError, type AiResult } from '../../types'
import type { Speech, SpeechInput, SpeechProvider } from '../types'

/**
 * OpenAI-compatible speech synthesis. Points at the same AI_BASE_URL as the
 * chat provider, so a compatible gateway serves both.
 */

const DEFAULT_MODEL = 'gpt-4o-mini-tts'
const DEFAULT_VOICE = 'alloy'

/**
 * USD per million characters — speech is billed by input length, not tokens.
 * `costMicros` is still millionths of a USD so it aggregates with every other
 * AI cost in the admin dashboard.
 */
const PRICING: Record<string, number> = {
  'gpt-4o-mini-tts': 12,
  'tts-1': 15,
  'tts-1-hd': 30,
}

function baseUrl(): string {
  return (process.env.AI_BASE_URL?.trim() || 'https://api.openai.com/v1').replace(/\/$/, '')
}

function apiKey(): string {
  return process.env.AI_SPEECH_API_KEY?.trim() || env.ai.apiKey
}

function model(): string {
  return process.env.AI_SPEECH_MODEL?.trim() || DEFAULT_MODEL
}

function costMicros(modelId: string, characters: number): number {
  const rate = PRICING[modelId] ?? PRICING[DEFAULT_MODEL]!
  return Math.round((characters / 1_000_000) * rate * 1_000_000)
}

export const openaiSpeechProvider: SpeechProvider = {
  name: 'openai',
  get available() {
    return Boolean(apiKey())
  },

  async synthesize(input: SpeechInput): Promise<AiResult<Speech>> {
    const key = apiKey()
    if (!key) throw new AiProviderError('No speech API key configured.', 'openai')

    const modelId = model()
    const startedAt = Date.now()

    const response = await fetch(`${baseUrl()}/audio/speech`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      signal: AbortSignal.timeout(env.ai.timeoutMs),
      body: JSON.stringify({
        model: modelId,
        voice: input.voice?.trim() || process.env.AI_SPEECH_VOICE?.trim() || DEFAULT_VOICE,
        input: input.text,
        response_format: 'mp3',
        ...(input.speed ? { speed: Math.max(0.25, Math.min(4, input.speed)) } : {}),
      }),
    })

    if (!response.ok) {
      const detail = await response.text().catch(() => '')
      throw new AiProviderError(
        `Speech synthesis failed with status ${response.status}. ${detail.slice(0, 200)}`.trim(),
        'openai',
        response.status === 429 || response.status >= 500,
      )
    }

    const audio = new Uint8Array(await response.arrayBuffer())
    if (audio.byteLength === 0) {
      throw new AiProviderError('Speech synthesis returned an empty audio stream.', 'openai', true)
    }

    return {
      data: { audio, mimeType: 'audio/mpeg' },
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        costMicros: costMicros(modelId, input.text.length),
      },
      provider: 'openai',
      model: modelId,
      latencyMs: Date.now() - startedAt,
    }
  },
}
