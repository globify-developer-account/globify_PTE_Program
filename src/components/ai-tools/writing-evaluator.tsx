'use client'

import { useState } from 'react'
import { Loader2, Sparkles, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, Textarea, Input } from '@/components/ui/field'
import { Meter } from '@/components/charts/score-ring'
import { AiEstimateBadge } from '@/components/dashboard/ai-estimate'
import { notify } from '@/components/ui/toast'
import { cn, countWords } from '@/lib/utils'

interface Evaluation {
  overall: number
  words: number
  wordLimit: { min: number; max: number }
  outOfRange: boolean
  breakdown: Record<string, number>
  feedback: string[]
  strengths: string[]
  improvements: string[]
  suggestions: string[]
  suggestedRewrite: string | null
  simulated: boolean
}

const TASK_LABELS: Record<string, { label: string; limit: string; placeholder: string }> = {
  ESSAY: {
    label: 'Write Essay',
    limit: '200–300 words',
    placeholder: 'Some people believe that…',
  },
  SUMMARIZE_WRITTEN_TEXT: {
    label: 'Summarize Written Text',
    limit: '5–75 words, one sentence',
    placeholder: 'Paste the passage you were asked to summarise…',
  },
  SUMMARIZE_SPOKEN_TEXT: {
    label: 'Summarize Spoken Text',
    limit: '50–70 words',
    placeholder: 'Describe the lecture you listened to…',
  },
}

const TRAIT_LABELS: Record<string, string> = {
  content: 'Content',
  form: 'Form',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  coherence: 'Coherence',
  development: 'Development',
  spelling: 'Spelling',
}

export function WritingEvaluator({ remaining }: { remaining: number | null }) {
  const [taskType, setTaskType] = useState('ESSAY')
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Evaluation | null>(null)

  const task = TASK_LABELS[taskType]!
  const words = countWords(response)

  async function evaluate() {
    setLoading(true)
    setResult(null)
    try {
      const apiResponse = await fetch('/api/ai/evaluate-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskType, prompt, response }),
      })
      const payload = await apiResponse.json()

      if (!apiResponse.ok) {
        notify.error(
          apiResponse.status === 402 ? 'Allowance reached' : 'Could not evaluate',
          payload.error,
        )
        return
      }
      setResult(payload.data as Evaluation)
    } catch {
      notify.error('Could not evaluate', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="surface-card p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Wand2 className="size-4 text-brand-600" aria-hidden />
            Writing evaluator
          </h3>
          {remaining !== null ? (
            <span className="text-xs text-ink-500">{remaining} left this month</span>
          ) : (
            <span className="text-xs text-green-700">Unlimited</span>
          )}
        </div>
        <p className="mt-1.5 text-sm text-ink-500">
          Paste any essay or summary — from a class, a book or your own practice — and get it scored against
          the same traits the practice engine uses.
        </p>

        <div className="mt-5 space-y-4">
          <Select
            label="Task type"
            value={taskType}
            onChange={(event) => setTaskType(event.target.value)}
            hint={task.limit}
          >
            {Object.entries(TASK_LABELS).map(([value, meta]) => (
              <option key={value} value={value}>
                {meta.label}
              </option>
            ))}
          </Select>

          <Input
            label="Prompt or passage"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={task.placeholder}
            required
          />

          <Textarea
            label="Your response"
            value={response}
            onChange={(event) => setResponse(event.target.value)}
            rows={12}
            spellCheck={false}
            placeholder="Paste or type your response here…"
            hint={`${words} word${words === 1 ? '' : 's'} · target ${task.limit}`}
            required
          />

          <Button
            onClick={evaluate}
            disabled={loading || response.trim().length < 20 || prompt.trim().length === 0}
            block
            size="lg"
          >
            {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {loading ? 'Evaluating…' : 'Evaluate my writing'}
          </Button>
        </div>
      </div>

      <div className="surface-card p-5">
        {result ? (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-ink-500">Estimated score</p>
                <p className="mt-1 text-[40px] font-semibold leading-none text-navy-900 tabular">
                  {result.overall}
                  <span className="ml-1 text-base font-medium text-ink-400">/ 90</span>
                </p>
              </div>
              <AiEstimateBadge />
            </div>

            {result.outOfRange ? (
              <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
                Your response is {result.words} words. This task requires {result.wordLimit.min}–
                {result.wordLimit.max}, and responses outside that range score zero for Form.
              </p>
            ) : null}

            {result.simulated ? (
              <p className="rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
                Produced by the built-in simulated scorer, not a live AI provider.
              </p>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {Object.entries(result.breakdown).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-sm">
                    <span className="text-ink-600">{TRAIT_LABELS[key] ?? key}</span>
                    <span className="font-medium text-navy-900 tabular">{value}</span>
                  </div>
                  <Meter value={value} max={90} className="mt-1.5" height={5} />
                </div>
              ))}
            </div>

            {result.feedback.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Feedback</p>
                <ul className="mt-2 space-y-2">
                  {result.feedback.map((line, index) => (
                    <li key={index} className="text-sm leading-relaxed text-ink-600">
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <FeedbackList title="What worked" items={result.strengths} tone="good" />
            <FeedbackList title="What to fix" items={result.improvements} tone="bad" />
            <FeedbackList title="How to improve" items={result.suggestions} tone="info" />

            {result.suggestedRewrite ? (
              <details className="rounded-xl border border-hairline p-4">
                <summary className="cursor-pointer text-sm font-medium text-navy-900">
                  See a stronger version
                </summary>
                <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-600">
                  {result.suggestedRewrite}
                </p>
              </details>
            ) : null}
          </div>
        ) : (
          <div className="flex h-full min-h-[300px] flex-col items-center justify-center text-center">
            <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
              <Sparkles className="size-5" aria-hidden />
            </span>
            <p className="mt-4 text-sm font-medium text-navy-900">Your evaluation appears here</p>
            <p className="mt-1.5 max-w-xs text-sm text-ink-500">
              You will get a score out of 90, a trait-by-trait breakdown and specific things to change.
            </p>
          </div>
        )}
      </div>
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
  tone: 'good' | 'bad' | 'info'
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
                tone === 'good' ? 'bg-green-600' : tone === 'bad' ? 'bg-amber-500' : 'bg-brand-500',
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
