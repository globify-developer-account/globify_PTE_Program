import { questionType, typeSlug } from '../pte/question-types'

/**
 * Where a bank question's prompt media lives.
 *
 * Recordings and Describe Image charts for the shipped question bank are built
 * once by `npm run content:media` and committed under `public/media/questions`,
 * so they deploy with the app and need no storage bucket or speech API at
 * runtime. The path is derived from the task type and title — both stable
 * across databases, unlike ids or codes — so the same file attaches to the
 * same question locally and in production.
 */

export function mediaSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Public URL path of the recording for an audio-prompted question. */
export function questionAudioPath(typeCode: string, title: string): string {
  return `/media/questions/${typeSlug(typeCode)}/${mediaSlug(title)}.mp3`
}

/** Public URL path of the chart or diagram for a Describe Image question. */
export function questionImagePath(typeCode: string, title: string): string {
  return `/media/questions/${typeSlug(typeCode)}/${mediaSlug(title)}.svg`
}

/** Tasks the student hears rather than reads: every Listening task and the audio-prompted Speaking tasks. */
export function needsPromptAudio(typeCode: string): boolean {
  const type = questionType(typeCode)
  if (!type) return false
  return type.section === 'LISTENING' || type.renderer === 'speaking-audio-prompt'
}

export function needsPromptImage(typeCode: string): boolean {
  return questionType(typeCode)?.renderer === 'speaking-image-prompt'
}

export interface SpeechSegment {
  /** 0 for a single narrator; 0, 1, 2 for Speaker A, B, C in a group discussion. */
  voice: number
  text: string
}

export interface SpeechScript {
  segments: SpeechSegment[]
  /** Select Missing Word: the recording ends on a beep in place of the missing words. */
  endsWithBeep: boolean
}

const SPEAKER_LINE = /^\s*Speaker\s+([A-C])\s*:\s*/i
const BEEP_MARKER = /\s*\[beep\]\s*$/i

/**
 * Turns a stored transcript into what should actually be spoken.
 *
 * Group discussions are split per speaker so each gets a different voice, and
 * the "Speaker A:" labels — cues for whoever records the item — are not read
 * out. A trailing `[beep]` becomes a tone rather than the word "beep".
 */
export function speechScript(transcript: string): SpeechScript {
  const endsWithBeep = BEEP_MARKER.test(transcript)
  const text = transcript.replace(BEEP_MARKER, '').trim()

  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const labelled = lines.length > 1 && lines.every((line) => SPEAKER_LINE.test(line))

  const segments = labelled
    ? lines.map((line) => ({
        voice: line.match(SPEAKER_LINE)![1]!.toUpperCase().charCodeAt(0) - 65,
        text: line.replace(SPEAKER_LINE, '').trim(),
      }))
    : [{ voice: 0, text: lines.join(' ') }]

  return { segments: segments.filter((segment) => segment.text.length > 0), endsWithBeep }
}
