import type { PublicQuestion } from '@/lib/practice'
import type { AnswerSelection } from '@/lib/pte/schemas'
import type { RecordedAudio } from './audio-recorder'

/**
 * What a renderer produces. Every renderer writes into the same shape so the
 * player can submit any of the 18 task types through one code path.
 */
export interface AnswerDraft {
  text: string
  selection: AnswerSelection
  audio: RecordedAudio | null
}

export const emptyDraft: AnswerDraft = { text: '', selection: {}, audio: null }

export interface RendererProps {
  question: PublicQuestion
  value: AnswerDraft
  onChange: (next: AnswerDraft) => void
  disabled: boolean
}

/** True once the student has actually supplied something submittable. */
export function hasAnswer(question: PublicQuestion, draft: AnswerDraft): boolean {
  switch (question.renderer) {
    case 'speaking-read-aloud':
    case 'speaking-audio-prompt':
    case 'speaking-image-prompt':
      return draft.audio !== null
    case 'writing-text':
    case 'dictation':
      return draft.text.trim().length > 0
    case 'choice-single':
    case 'choice-multiple':
      return (draft.selection.optionIds ?? []).length > 0
    case 'reorder':
      return (draft.selection.order ?? []).length > 0
    case 'fill-blanks-dropdown':
    case 'fill-blanks-typed':
      return Object.values(draft.selection.blanks ?? {}).some((value) => value.trim().length > 0)
    case 'highlight-words':
      return (draft.selection.wordIndexes ?? []).length > 0
    default:
      return false
  }
}
