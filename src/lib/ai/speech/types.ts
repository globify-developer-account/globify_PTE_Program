import type { AiResult } from '../types'

/**
 * Text-to-speech contract.
 *
 * Speech is optional everywhere it is used. When no provider is configured the
 * browser's own `speechSynthesis` voice reads the partner's turn instead, which
 * is why `SpeechProvider.available` is checked before a request is ever made
 * rather than failing at call time.
 */

export interface SpeechInput {
  text: string
  /** Provider-specific voice id. Falls back to the provider's default. */
  voice?: string | null
  /** 0.25–4.0. Slower speech is a real accessibility need for learners. */
  speed?: number
}

export interface Speech {
  audio: Uint8Array
  mimeType: string
}

export interface SpeechProvider {
  readonly name: string
  readonly available: boolean
  synthesize(input: SpeechInput): Promise<AiResult<Speech>>
}
