'use client'

import { PromptAudio } from '../prompt-audio'
import type { RendererProps } from '../types'
import { cn, countWords } from '@/lib/utils'

/**
 * Summarize Written Text, Write Essay and Summarize Spoken Text.
 *
 * Word count is shown against the limit and turns amber outside it, because in
 * PTE an out-of-range response loses the Form mark outright — students need to
 * see that before they submit, not in the feedback afterwards.
 */
export function WritingTextRenderer({ question, value, onChange, disabled }: RendererProps) {
  const words = countWords(value.text)
  const min = question.wordLimitMin
  const max = question.wordLimitMax
  const outOfRange = (min !== null && words > 0 && words < min) || (max !== null && words > max)

  return (
    <div className="space-y-5">
      {question.audioUrl ? <PromptAudio src={question.audioUrl} label="Lecture audio" /> : null}

      {question.passage ? (
        <div className="rounded-xl border border-hairline bg-white p-6">
          <p className="whitespace-pre-line text-[15px] leading-[1.8] text-ink-700">{question.passage}</p>
        </div>
      ) : null}

      {question.prompt ? (
        <p className="rounded-lg border-l-2 border-brand-400 bg-brand-50/50 p-4 text-sm font-medium text-navy-900">
          {question.prompt}
        </p>
      ) : null}

      <div>
        <label htmlFor="response" className="sr-only">
          Your response
        </label>
        <textarea
          id="response"
          value={value.text}
          onChange={(event) => onChange({ ...value, text: event.target.value })}
          disabled={disabled}
          rows={question.renderer === 'writing-text' && (max ?? 0) > 100 ? 14 : 7}
          placeholder="Type your response here…"
          spellCheck={false}
          className="w-full resize-y rounded-xl border border-hairline bg-white p-4 text-[15px] leading-relaxed text-navy-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50"
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className={cn('font-medium tabular', outOfRange ? 'text-amber-700' : 'text-ink-500')}>
            {words} word{words === 1 ? '' : 's'}
            {min !== null || max !== null ? (
              <span className="ml-1 font-normal text-ink-400">
                (required {min ?? 0}–{max ?? '∞'})
              </span>
            ) : null}
          </span>
          <span className="text-ink-400">
            Spell-check is off, as it is in the real exam.
          </span>
        </div>

        {outOfRange ? (
          <p className="mt-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
            Responses outside the word limit score zero for Form. Adjust the length before submitting.
          </p>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Write From Dictation. The recording plays once and the answer box is plain —
 * no passage, no hints, because the whole task is recall.
 */
export function DictationRenderer({ question, value, onChange, disabled }: RendererProps) {
  return (
    <div className="space-y-5">
      {question.audioUrl ? (
        <PromptAudio src={question.audioUrl} label="Sentence audio" />
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This question has no audio attached yet.
        </p>
      )}

      <div>
        <label htmlFor="dictation" className="mb-2 block text-sm font-medium text-navy-900">
          Type the sentence exactly as you hear it
        </label>
        <textarea
          id="dictation"
          value={value.text}
          onChange={(event) => onChange({ ...value, text: event.target.value })}
          disabled={disabled}
          rows={3}
          spellCheck={false}
          autoComplete="off"
          className="w-full resize-none rounded-xl border border-hairline bg-white p-4 text-[15px] leading-relaxed text-navy-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50"
          placeholder="Type what you heard…"
        />
        <p className="mt-2 text-xs text-ink-500">
          Every correctly spelled word earns a mark, so write down as many as you can remember.
        </p>
      </div>
    </div>
  )
}
