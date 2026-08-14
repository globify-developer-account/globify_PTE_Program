'use client'

import { Check } from 'lucide-react'
import { PromptAudio } from '../prompt-audio'
import type { RendererProps } from '../types'
import { cn } from '@/lib/utils'

function QuestionContext({ question }: { question: RendererProps['question'] }) {
  return (
    <>
      {question.audioUrl ? <PromptAudio src={question.audioUrl} /> : null}
      {question.passage ? (
        <div className="rounded-xl border border-hairline bg-white p-6">
          <p className="whitespace-pre-line text-[15px] leading-[1.8] text-ink-700">{question.passage}</p>
        </div>
      ) : null}
      {question.prompt ? (
        <p className="text-[15px] font-medium text-navy-900">{question.prompt}</p>
      ) : null}
    </>
  )
}

export function SingleChoiceRenderer({ question, value, onChange, disabled }: RendererProps) {
  const selected = value.selection.optionIds?.[0] ?? null

  return (
    <div className="space-y-5">
      <QuestionContext question={question} />

      <fieldset disabled={disabled} className="space-y-2.5">
        <legend className="sr-only">{question.prompt ?? question.title}</legend>
        {question.choices.map((choice, index) => {
          const active = selected === choice.id
          return (
            <label
              key={choice.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                active ? 'border-brand-400 bg-brand-50/60' : 'border-hairline bg-white hover:border-brand-200',
                disabled && 'cursor-not-allowed opacity-70',
              )}
            >
              <input
                type="radio"
                name="choice"
                className="sr-only"
                checked={active}
                onChange={() => onChange({ ...value, selection: { optionIds: [choice.id] } })}
              />
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold',
                  active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 text-ink-500',
                )}
                aria-hidden
              >
                {String.fromCharCode(65 + index)}
              </span>
              <span className="text-[15px] leading-relaxed text-navy-900">{choice.text}</span>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}

export function MultipleChoiceRenderer({ question, value, onChange, disabled }: RendererProps) {
  const selected = value.selection.optionIds ?? []

  function toggle(id: string) {
    const next = selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]
    onChange({ ...value, selection: { optionIds: next } })
  }

  return (
    <div className="space-y-5">
      <QuestionContext question={question} />

      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        More than one answer is correct. Each incorrect selection cancels out a correct one, so only choose
        options you are confident about.
      </p>

      <fieldset disabled={disabled} className="space-y-2.5">
        <legend className="sr-only">{question.prompt ?? question.title}</legend>
        {question.choices.map((choice, index) => {
          const active = selected.includes(choice.id)
          return (
            <label
              key={choice.id}
              className={cn(
                'flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors',
                active ? 'border-brand-400 bg-brand-50/60' : 'border-hairline bg-white hover:border-brand-200',
                disabled && 'cursor-not-allowed opacity-70',
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={active}
                onChange={() => toggle(choice.id)}
              />
              <span
                className={cn(
                  'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border text-xs font-semibold',
                  active ? 'border-brand-600 bg-brand-600 text-white' : 'border-ink-300 text-ink-500',
                )}
                aria-hidden
              >
                {active ? <Check className="size-3.5" /> : String.fromCharCode(65 + index)}
              </span>
              <span className="text-[15px] leading-relaxed text-navy-900">{choice.text}</span>
            </label>
          )
        })}
      </fieldset>
    </div>
  )
}
