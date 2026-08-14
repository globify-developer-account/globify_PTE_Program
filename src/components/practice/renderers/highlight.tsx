'use client'

import { PromptAudio } from '../prompt-audio'
import type { RendererProps } from '../types'
import { cn } from '@/lib/utils'

/**
 * Highlight Incorrect Words.
 *
 * Each word is its own button so the task is fully keyboard-operable and every
 * selection is announced. The word list arrives pre-tokenised from the server,
 * which keeps the indexes the scorer expects and the indexes the UI produces in
 * exact agreement.
 */
export function HighlightWordsRenderer({ question, value, onChange, disabled }: RendererProps) {
  const selected = new Set(value.selection.wordIndexes ?? [])
  const words = question.words ?? []

  function toggle(index: number) {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    onChange({ ...value, selection: { wordIndexes: [...next].sort((a, b) => a - b) } })
  }

  return (
    <div className="space-y-5">
      {question.audioUrl ? <PromptAudio src={question.audioUrl} label="Recording" /> : null}

      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        Click each word in the transcript that differs from what you hear. Wrong clicks cancel out correct
        ones, so only mark words you are sure about.
      </p>

      <div className="rounded-xl border border-hairline bg-white p-6 text-[15px] leading-[2] text-ink-700">
        {words.map((word, index) => {
          const active = selected.has(index)
          return (
            <button
              key={`${word}-${index}`}
              type="button"
              onClick={() => toggle(index)}
              disabled={disabled}
              aria-pressed={active}
              className={cn(
                'mr-1 rounded px-1 py-0.5 transition-colors',
                active
                  ? 'bg-brand-600 font-medium text-white'
                  : 'hover:bg-brand-50 hover:text-brand-700 disabled:hover:bg-transparent',
              )}
            >
              {word}
            </button>
          )
        })}
      </div>

      <p className="text-xs text-ink-500" aria-live="polite">
        {selected.size} word{selected.size === 1 ? '' : 's'} marked
      </p>
    </div>
  )
}
