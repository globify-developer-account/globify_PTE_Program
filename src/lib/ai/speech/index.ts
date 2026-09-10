import 'server-only'
import { env } from '../../env'
import { openaiSpeechProvider } from './providers/openai'
import type { SpeechProvider } from './types'

export * from './types'

const PROVIDERS: Record<string, SpeechProvider> = {
  openai: openaiSpeechProvider,
}

/**
 * Resolves the configured speech provider, or null when there is none.
 *
 * There is deliberately no simulated provider here. A fake voice would either
 * be silence or a tone, and neither helps anyone practise listening — so when
 * nothing is configured the API says so and the browser reads the text with
 * its own `speechSynthesis` voice instead. That path needs no credentials and
 * works offline, which is what makes demo mode genuinely usable.
 */
export function speechProvider(): SpeechProvider | null {
  const configured = process.env.AI_SPEECH_PROVIDER?.trim().toLowerCase()
  if (configured === 'none') return null
  // Speech is not simulated in demo mode; the browser voice covers it.
  if (!configured && env.demoMode) return null

  const chosen = PROVIDERS[configured || 'openai']
  return chosen?.available ? chosen : null
}

export function speechAvailable(): boolean {
  return speechProvider() !== null
}
