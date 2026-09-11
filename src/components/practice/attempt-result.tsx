'use client'

import { Check, ChevronRight, Lightbulb, Sparkles, X } from 'lucide-react'
import type { ScoredAttempt } from '@/lib/attempt-scoring'
import type { PublicQuestion } from '@/lib/practice'
import { AiEstimateBadge } from '@/components/dashboard/ai-estimate'
import { Button } from '@/components/ui/button'
import { Meter } from '@/components/charts/score-ring'
import { formatBand } from '@/lib/exams/ielts/bands'
import { cn } from '@/lib/utils'

const TRAIT_LABELS: Record<string, string> = {
  content: 'Content',
  pronunciation: 'Pronunciation',
  fluency: 'Oral fluency',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  form: 'Form',
  coherence: 'Coherence',
  development: 'Development',
  spelling: 'Spelling',
  listening: 'Listening',
  // IELTS assessment criteria.
  task: 'Task achievement / response',
  coherenceCohesion: 'Coherence and cohesion',
  lexicalResource: 'Lexical resource',
  grammaticalRangeAccuracy: 'Grammatical range and accuracy',
}

function bandTone(score: number): { label: string; className: string } {
  if (score >= 79) return { label: 'Excellent', className: 'text-green-700 bg-green-50' }
  if (score >= 65) return { label: 'Good', className: 'text-brand-700 bg-brand-50' }
  if (score >= 50) return { label: 'Developing', className: 'text-amber-700 bg-amber-50' }
  return { label: 'Needs work', className: 'text-red-700 bg-red-50' }
}

export function AttemptResult({
  result,
  question,
  onNext,
  isLast,
}: {
  result: ScoredAttempt
  question: PublicQuestion
  onNext: () => void
  isLast: boolean
}) {
  const band = bandTone(result.overall)
  const traits = Object.entries(result.breakdown).filter(([, value]) => typeof value === 'number')
  // IELTS reports a band out of 9; the normalised 0-90 number it is stored
  // alongside is an internal comparison value and is never shown here.
  const isIelts = result.scale === 'IELTS_BAND'
  const headline = isIelts ? formatBand(result.band ?? 0) : String(result.overall)
  const traitMax = isIelts ? 9 : 90

  return (
    <div className="space-y-5">
      {/* Headline score */}
      <div className="surface-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-ink-500">Your result</p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-[40px] font-semibold leading-none text-navy-900 tabular">
                {headline}
              </span>
              <span className="text-sm text-ink-400">{isIelts ? '/ 9' : '/ 90'}</span>
              <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', band.className)}>
                {band.label}
              </span>
            </p>
          </div>
          {result.source === 'AI' ? <AiEstimateBadge /> : null}
        </div>

        {result.simulated ? (
          <p className="mt-4 flex items-start gap-2 rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>
              This score came from the built-in simulated scorer, not a live AI provider. It uses measurable
              signals such as pace, length and content overlap — useful for practice, but less nuanced than a
              configured provider.
            </span>
          </p>
        ) : null}

        {traits.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {traits.map(([key, score]) => (
              <div key={key}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-600">{TRAIT_LABELS[key] ?? key}</span>
                  <span className="font-medium text-navy-900 tabular">
                    {isIelts ? formatBand(score) : score}
                  </span>
                </div>
                <Meter value={score} max={traitMax} className="mt-1.5" height={5} />
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Per-item marking for rule-scored tasks */}
      {result.detail && result.detail.items.length > 0 ? (
        <div className="surface-card overflow-hidden">
          <div className="border-b border-hairline px-5 py-3.5">
            <h4 className="text-sm font-semibold text-navy-900">
              Marking detail — {result.detail.correctItems} of {result.detail.totalItems} correct
            </h4>
          </div>
          <ul className="divide-y divide-hairline">
            {result.detail.items.map((item, index) => (
              <li key={`${item.key}-${index}`} className="flex items-start gap-3 px-5 py-3">
                <span
                  className={cn(
                    'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full',
                    item.correct ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                  )}
                  aria-hidden
                >
                  {item.correct ? <Check className="size-3" /> : <X className="size-3" />}
                </span>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-medium text-navy-900">{item.key}</p>
                  {!item.correct ? (
                    <p className="mt-0.5 text-ink-500">
                      You answered <span className="text-danger">{item.given || '—'}</span> · correct answer{' '}
                      <span className="text-green-700">{item.expected || '—'}</span>
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* AI feedback */}
      {result.feedback ? (
        <div className="surface-card p-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Lightbulb className="size-4 text-brand-600" aria-hidden />
            Feedback
          </h4>

          {result.feedback.summary.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {result.feedback.summary.map((line, index) => (
                <li key={index} className="text-sm leading-relaxed text-ink-600">
                  {line}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            <FeedbackList title="What worked" items={result.feedback.strengths} tone="good" />
            <FeedbackList title="What to fix" items={result.feedback.improvements} tone="bad" />
          </div>

          {result.feedback.suggestions.length > 0 ? (
            <div className="mt-5 rounded-xl bg-brand-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">How to improve</p>
              <ul className="mt-2 space-y-1.5">
                {result.feedback.suggestions.map((line, index) => (
                  <li key={index} className="text-sm leading-relaxed text-ink-700">
                    {line}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.feedback.suggestedRewrite ? (
            <details className="mt-5 rounded-xl border border-hairline p-4">
              <summary className="cursor-pointer text-sm font-medium text-navy-900">
                See a stronger version of your response
              </summary>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {result.feedback.suggestedRewrite}
              </p>
            </details>
          ) : null}
        </div>
      ) : null}

      {/* Model answer & explanation */}
      {result.explanation || result.sampleAnswer ? (
        <div className="surface-card p-6">
          {result.explanation ? (
            <>
              <h4 className="text-sm font-semibold text-navy-900">Explanation</h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {result.explanation}
              </p>
            </>
          ) : null}
          {result.sampleAnswer ? (
            <div className={cn(result.explanation && 'mt-5 border-t border-hairline pt-5')}>
              <h4 className="text-sm font-semibold text-navy-900">Sample answer</h4>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                {result.sampleAnswer}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={onNext} size="lg">
          {isLast ? 'Finish session' : `Next question`}
          <ChevronRight aria-hidden />
        </Button>
      </div>

      <p className="text-center text-xs text-ink-400">{question.typeName}</p>
    </div>
  )
}

function FeedbackList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: 'good' | 'bad'
}) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item, index) => (
          <li key={index} className="flex items-start gap-2 text-sm leading-relaxed text-ink-600">
            <span
              className={cn(
                'mt-1.5 size-1.5 shrink-0 rounded-full',
                tone === 'good' ? 'bg-green-600' : 'bg-amber-500',
              )}
              aria-hidden
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}
