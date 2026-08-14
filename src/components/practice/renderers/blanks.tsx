'use client'

import { PromptAudio } from '../prompt-audio'
import type { RendererProps } from '../types'
import { cn } from '@/lib/utils'

/**
 * Fill in the Blanks, in both flavours.
 *
 * The passage is rendered as inline segments with real form controls in place
 * of each `{{n}}` marker, so the text still reads as a paragraph and screen
 * readers announce each blank in context.
 */

function useBlanks({ value, onChange }: Pick<RendererProps, 'value' | 'onChange'>) {
  const blanks = value.selection.blanks ?? {}
  const set = (index: number, text: string) =>
    onChange({ ...value, selection: { blanks: { ...blanks, [String(index)]: text } } })
  return { blanks, set }
}

/** Reading FIB and Reading & Writing FIB — a word list per blank. */
export function DropdownBlanksRenderer({ question, value, onChange, disabled }: RendererProps) {
  const { blanks, set } = useBlanks({ value, onChange })
  const choicesFor = (index: number) =>
    question.blanks.find((blank) => blank.index === index)?.choices ?? []

  return (
    <div className="space-y-5">
      {question.prompt ? <p className="text-sm text-ink-600">{question.prompt}</p> : null}

      <div className="rounded-xl border border-hairline bg-white p-6 text-[15px] leading-[2.2] text-ink-700">
        {(question.segments ?? []).map((segment, index) =>
          segment.kind === 'text' ? (
            <span key={index}>{segment.value}</span>
          ) : (
            <span key={index} className="inline-block align-baseline">
              <label className="sr-only" htmlFor={`blank-${segment.index}`}>
                Blank {segment.index}
              </label>
              <select
                id={`blank-${segment.index}`}
                value={blanks[String(segment.index)] ?? ''}
                onChange={(event) => set(segment.index, event.target.value)}
                disabled={disabled}
                className={cn(
                  'mx-1 rounded-lg border bg-white px-2.5 py-1 text-sm font-medium outline-none transition-colors focus:ring-4 focus:ring-brand-100',
                  blanks[String(segment.index)]
                    ? 'border-brand-400 text-navy-900'
                    : 'border-dashed border-ink-300 text-ink-400',
                )}
              >
                <option value="">Select…</option>
                {choicesFor(segment.index).map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            </span>
          ),
        )}
      </div>
    </div>
  )
}

/** Listening FIB — the student types what they heard, no options shown. */
export function TypedBlanksRenderer({ question, value, onChange, disabled }: RendererProps) {
  const { blanks, set } = useBlanks({ value, onChange })

  return (
    <div className="space-y-5">
      {question.audioUrl ? <PromptAudio src={question.audioUrl} label="Transcript audio" /> : null}
      {question.prompt ? <p className="text-sm text-ink-600">{question.prompt}</p> : null}

      <div className="rounded-xl border border-hairline bg-white p-6 text-[15px] leading-[2.4] text-ink-700">
        {(question.segments ?? []).map((segment, index) =>
          segment.kind === 'text' ? (
            <span key={index}>{segment.value}</span>
          ) : (
            <span key={index} className="inline-block align-baseline">
              <label className="sr-only" htmlFor={`blank-${segment.index}`}>
                Blank {segment.index}
              </label>
              <input
                id={`blank-${segment.index}`}
                type="text"
                value={blanks[String(segment.index)] ?? ''}
                onChange={(event) => set(segment.index, event.target.value)}
                disabled={disabled}
                autoComplete="off"
                spellCheck={false}
                size={Math.max(8, (blanks[String(segment.index)] ?? '').length + 2)}
                className={cn(
                  'mx-1 rounded-lg border bg-white px-2.5 py-1 text-sm font-medium text-navy-900 outline-none transition-colors focus:border-brand-400 focus:ring-4 focus:ring-brand-100',
                  blanks[String(segment.index)] ? 'border-brand-400' : 'border-dashed border-ink-300',
                )}
              />
            </span>
          ),
        )}
      </div>

      <p className="text-xs text-ink-500">Spelling counts — each blank is marked exactly.</p>
    </div>
  )
}
