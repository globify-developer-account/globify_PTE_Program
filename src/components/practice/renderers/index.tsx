'use client'

import type { RendererProps } from '../types'
import { DropdownBlanksRenderer, TypedBlanksRenderer } from './blanks'
import { MultipleChoiceRenderer, SingleChoiceRenderer } from './choice'
import { HighlightWordsRenderer } from './highlight'
import { ReorderRenderer } from './reorder'
import { AudioPromptRenderer, ImagePromptRenderer, ReadAloudRenderer } from './speaking'
import { DictationRenderer, WritingTextRenderer } from './writing'

/**
 * Renderer dispatch. The `renderer` key comes from the database row, so adding
 * a task type is a content change plus one entry here — not a rewrite of the
 * practice player.
 */
export function QuestionRenderer(props: RendererProps) {
  switch (props.question.renderer) {
    case 'speaking-read-aloud':
      return <ReadAloudRenderer {...props} />
    case 'speaking-audio-prompt':
      return <AudioPromptRenderer {...props} />
    case 'speaking-image-prompt':
      return <ImagePromptRenderer {...props} />
    case 'writing-text':
      return <WritingTextRenderer {...props} />
    case 'choice-single':
      return <SingleChoiceRenderer {...props} />
    case 'choice-multiple':
      return <MultipleChoiceRenderer {...props} />
    case 'reorder':
      return <ReorderRenderer {...props} />
    case 'fill-blanks-dropdown':
      return <DropdownBlanksRenderer {...props} />
    case 'fill-blanks-typed':
      return <TypedBlanksRenderer {...props} />
    case 'highlight-words':
      return <HighlightWordsRenderer {...props} />
    case 'dictation':
      return <DictationRenderer {...props} />
    default:
      return (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This question type is not supported by your version of the practice engine. Please refresh the page.
        </p>
      )
  }
}
