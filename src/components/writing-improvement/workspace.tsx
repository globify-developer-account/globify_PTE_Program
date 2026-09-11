'use client'

import { useMemo, useRef, useState } from 'react'
import { BookOpenCheck, Check, Copy, Loader2, PenLine, Search, Sparkles, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/states'
import { notify } from '@/components/ui/toast'
import { AiEstimateBadge } from '@/components/dashboard/ai-estimate'
import { DiffView } from './diff-view'
import { cn, countWords } from '@/lib/utils'
import type { DiffToken } from '@/lib/text-diff'
import type { WritingExerciseSummary } from '@/lib/writing-exercises'

type TaskKind = 'ESSAY' | 'SUMMARIZE_WRITTEN_TEXT' | 'SUMMARIZE_SPOKEN_TEXT' | 'FREEFORM'
type Focus = 'all' | 'grammar' | 'vocabulary' | 'structure'

interface Edit {
  original: string
  replacement: string
  category: string
  explanation: string
}

interface Result {
  id: string
  original: string
  improved: string
  summary: string
  edits: Edit[]
  byCategory: Record<string, number>
  diff: DiffToken[]
  stats: { added: number; removed: number; unchanged: number }
  words: { before: number; after: number }
  strengths: string[]
  focusNext: string[]
  simulated: boolean
}

const TASK_LABEL: Record<TaskKind, string> = {
  ESSAY: 'Write Essay',
  SUMMARIZE_WRITTEN_TEXT: 'Summarize Written Text',
  SUMMARIZE_SPOKEN_TEXT: 'Summarize Spoken Text',
  FREEFORM: 'Freeform — my own writing',
}

const FOCUS_LABEL: Record<Focus, string> = {
  all: 'Full polish',
  grammar: 'Grammar, spelling and punctuation only',
  vocabulary: 'Word choice and precision',
  structure: 'Structure, linking and flow',
}

const CATEGORY_TONE: Record<string, 'danger' | 'warning' | 'info' | 'brand' | 'neutral'> = {
  GRAMMAR: 'danger',
  SPELLING: 'danger',
  PUNCTUATION: 'warning',
  VOCABULARY: 'info',
  COHERENCE: 'brand',
  STRUCTURE: 'brand',
  CONCISENESS: 'neutral',
}

function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

export function WritingImprovementWorkspace({
  exercises,
  remaining,
  isPremium,
}: {
  exercises: WritingExerciseSummary[]
  remaining: number | null
  isPremium: boolean
}) {
  const [exercise, setExercise] = useState<WritingExerciseSummary | null>(null)
  const [taskKind, setTaskKind] = useState<TaskKind>('FREEFORM')
  const [focus, setFocus] = useState<Focus>('all')
  const [prompt, setPrompt] = useState('')
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const words = countWords(text)
  const limit = exercise && exercise.taskKind !== 'FREEFORM' ? { min: exercise.wordMin, max: exercise.wordMax } : null
  const outOfRange = limit ? words > 0 && (words < limit.min || words > limit.max) : false

  function choose(next: WritingExerciseSummary) {
    setExercise(next)
    setTaskKind(next.taskKind as TaskKind)
    setPrompt(next.prompt)
    setResult(null)
    editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function clearExercise() {
    setExercise(null)
    setTaskKind('FREEFORM')
    setPrompt('')
  }

  async function improve() {
    setLoading(true)
    setResult(null)
    try {
      const response = await fetch('/api/ai/improve-writing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          focus,
          taskKind,
          ...(exercise ? { exerciseId: exercise.id } : prompt.trim() ? { prompt: prompt.trim() } : {}),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error(
          response.status === 402 ? 'Allowance reached' : 'Could not improve this draft',
          payload.error,
        )
        return
      }
      setResult(payload.data as Result)
    } catch {
      notify.error('Could not improve this draft', 'Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div ref={editorRef} className="grid gap-5 lg:grid-cols-2">
        <div className="surface-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Wand2 className="size-4 text-brand-600" aria-hidden />
              Freeform improvement
            </h3>
            {remaining !== null ? (
              <span className="text-xs text-ink-500">{remaining} left this month</span>
            ) : (
              <span className="text-xs text-green-700">Unlimited</span>
            )}
          </div>
          <p className="mt-1.5 text-sm text-ink-500">
            Write freely and stop worrying about the English. Say what you mean, then let the tutor repair
            the grammar, wording and flow — and show you every change it made.
          </p>

          {exercise ? (
            <div className="mt-4 rounded-xl border border-brand-100 bg-brand-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">
                    {exercise.category}
                  </p>
                  <p className="mt-1 text-sm font-medium text-navy-900">{exercise.title}</p>
                </div>
                <button
                  type="button"
                  onClick={clearExercise}
                  className="shrink-0 text-xs font-medium text-ink-500 underline-offset-2 hover:text-navy-900 hover:underline"
                >
                  Clear
                </button>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{exercise.prompt}</p>
              {exercise.passage ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-medium text-brand-700">
                    Read the {exercise.taskKind === 'SUMMARIZE_SPOKEN_TEXT' ? 'lecture notes' : 'passage'}
                  </summary>
                  <p className="mt-2 max-h-56 overflow-y-auto whitespace-pre-line text-sm leading-relaxed text-ink-600">
                    {exercise.passage}
                  </p>
                </details>
              ) : null}
              {exercise.guidance ? (
                <p className="mt-3 border-t border-brand-100 pt-3 text-xs leading-relaxed text-ink-600">
                  <span className="font-semibold text-navy-900">Tip. </span>
                  {exercise.guidance}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-5 space-y-4">
            {!exercise ? (
              <>
                <Select
                  label="What are you writing?"
                  value={taskKind}
                  onChange={(event) => setTaskKind(event.target.value as TaskKind)}
                >
                  {(Object.keys(TASK_LABEL) as TaskKind[]).map((value) => (
                    <option key={value} value={value}>
                      {TASK_LABEL[value]}
                    </option>
                  ))}
                </Select>

                <Input
                  label="Prompt or topic"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Optional — the question you are answering"
                  hint="Leave this blank to have your writing improved on its own terms."
                />
              </>
            ) : null}

            <Select
              label="What should it change?"
              value={focus}
              onChange={(event) => setFocus(event.target.value as Focus)}
              hint="Narrow this when you want to work on one habit at a time."
            >
              {(Object.keys(FOCUS_LABEL) as Focus[]).map((value) => (
                <option key={value} value={value}>
                  {FOCUS_LABEL[value]}
                </option>
              ))}
            </Select>

            <Textarea
              label="Your writing"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={14}
              spellCheck={false}
              placeholder="Just write. Errors are fine — that is the point."
              hint={
                limit
                  ? `${words} word${words === 1 ? '' : 's'} · target ${limit.min}–${limit.max}`
                  : `${words} word${words === 1 ? '' : 's'}`
              }
              error={outOfRange ? `This task requires ${limit?.min}–${limit?.max} words.` : null}
              required
            />

            <Button onClick={improve} disabled={loading || text.trim().length < 40} block size="lg">
              {loading ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
              {loading ? 'Improving…' : 'Improve my writing'}
            </Button>
            <p className="text-center text-xs text-ink-400">
              Uses one of your monthly AI writing evaluations.
            </p>
          </div>
        </div>

        <div className="surface-card p-5">
          {result ? <ResultPanel result={result} /> : <ResultPlaceholder />}
        </div>
      </div>

      <ExerciseLibrary
        exercises={exercises}
        activeId={exercise?.id ?? null}
        isPremium={isPremium}
        onChoose={choose}
      />
    </div>
  )
}

function ResultPlaceholder() {
  return (
    <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
      <span className="grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600">
        <PenLine className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-sm font-medium text-navy-900">Your improved draft appears here</p>
      <p className="mt-1.5 max-w-xs text-sm text-ink-500">
        You will see your text rewritten, every change marked against what you wrote, and a plain
        explanation of why each one was made.
      </p>
    </div>
  )
}

function ResultPanel({ result }: { result: Result }) {
  const [copied, setCopied] = useState(false)

  const categories = useMemo(
    () => Object.entries(result.byCategory).sort(([, a], [, b]) => b - a),
    [result.byCategory],
  )

  async function copyImproved() {
    try {
      await navigator.clipboard.writeText(result.improved)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      notify.error('Could not copy', 'Your browser blocked clipboard access.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">Changes made</p>
          <p className="mt-1 text-[40px] font-semibold leading-none text-navy-900 tabular">
            {result.edits.length}
          </p>
          <p className="mt-1.5 text-xs text-ink-500">
            {result.stats.removed} word{result.stats.removed === 1 ? '' : 's'} removed ·{' '}
            {result.stats.added} added · {result.words.before} → {result.words.after} words
          </p>
        </div>
        <AiEstimateBadge />
      </div>

      {result.simulated ? (
        <p className="rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
          Produced by the built-in simulated editor, which fixes mechanical errors only. Configure a live
          AI provider for judgement on argument, development and structure.
        </p>
      ) : null}

      <p className="text-sm leading-relaxed text-ink-600">{result.summary}</p>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {categories.map(([category, count]) => (
            <Badge key={category} tone={CATEGORY_TONE[category] ?? 'neutral'} size="sm">
              {titleCase(category)} · {count}
            </Badge>
          ))}
        </div>
      ) : null}

      <DiffView diff={result.diff} original={result.original} improved={result.improved} />

      <Button onClick={copyImproved} variant="secondary" size="sm">
        {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        {copied ? 'Copied' : 'Copy the improved version'}
      </Button>

      {result.edits.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
            Every change, and why
          </p>
          <ul className="mt-2.5 space-y-2.5">
            {result.edits.map((edit, index) => (
              <li key={index} className="rounded-xl border border-hairline p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 text-sm leading-relaxed">
                    <del className="text-red-700 decoration-red-400">{edit.original}</del>
                    <span className="mx-1.5 text-ink-400" aria-label="becomes">
                      →
                    </span>
                    <span className="font-medium text-green-800">{edit.replacement}</span>
                  </p>
                  <Badge tone={CATEGORY_TONE[edit.category] ?? 'neutral'} size="sm">
                    {titleCase(edit.category)}
                  </Badge>
                </div>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{edit.explanation}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BulletList title="What your draft already did well" items={result.strengths} tone="good" />
      <BulletList title="Habits to work on next" items={result.focusNext} tone="info" />
    </div>
  )
}

function BulletList({ title, items, tone }: { title: string; items: string[]; tone: 'good' | 'info' }) {
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
                tone === 'good' ? 'bg-green-600' : 'bg-brand-500',
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

const ALL = 'All categories'

function ExerciseLibrary({
  exercises,
  activeId,
  isPremium,
  onChoose,
}: {
  exercises: WritingExerciseSummary[]
  activeId: string | null
  isPremium: boolean
  onChoose: (exercise: WritingExerciseSummary) => void
}) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const [kind, setKind] = useState<'ALL' | TaskKind>('ALL')

  const categories = useMemo(
    () => [ALL, ...[...new Set(exercises.map((item) => item.category))].sort()],
    [exercises],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return exercises.filter((item) => {
      if (category !== ALL && item.category !== category) return false
      if (kind !== 'ALL' && item.taskKind !== kind) return false
      if (!needle) return true
      return (
        item.title.toLowerCase().includes(needle) ||
        item.prompt.toLowerCase().includes(needle) ||
        item.tags.some((tag) => tag.toLowerCase().includes(needle))
      )
    })
  }, [category, exercises, kind, query])

  return (
    <section className="surface-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
          <BookOpenCheck className="size-4 text-brand-600" aria-hidden />
          Exercise library
        </h3>
        <span className="text-xs text-ink-500">
          {visible.length} of {exercises.length} exercise{exercises.length === 1 ? '' : 's'}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-ink-500">
        Nothing to write about? Pick a prompt, write your answer, and improve it in place.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto]">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompts and topics…"
          leading={<Search aria-hidden />}
          aria-label="Search the exercise library"
        />
        <Select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <Select
          value={kind}
          onChange={(event) => setKind(event.target.value as 'ALL' | TaskKind)}
          aria-label="Task type"
        >
          <option value="ALL">All task types</option>
          {(Object.keys(TASK_LABEL) as TaskKind[]).map((value) => (
            <option key={value} value={value}>
              {value === 'FREEFORM' ? 'Everyday writing' : TASK_LABEL[value]}
            </option>
          ))}
        </Select>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          className="py-10"
          icon={<Search aria-hidden />}
          title="No exercises match"
          description="Try a broader search term, or clear the category and task-type filters."
        />
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {visible.map((item) => {
            const locked = item.isPremium && !isPremium
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onChoose(item)}
                  disabled={locked}
                  className={cn(
                    'flex h-full w-full flex-col rounded-xl border p-4 text-left transition-colors',
                    activeId === item.id
                      ? 'border-brand-300 bg-brand-50/50'
                      : 'border-hairline hover:border-brand-200',
                    locked && 'cursor-not-allowed opacity-60 hover:border-hairline',
                  )}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="outline" size="sm">
                      {item.category}
                    </Badge>
                    {item.taskKind !== 'FREEFORM' ? (
                      <Badge tone="neutral" size="sm">
                        {item.wordMin}–{item.wordMax} words
                      </Badge>
                    ) : null}
                    {locked ? (
                      <Badge tone="brand" size="sm">
                        Premium
                      </Badge>
                    ) : null}
                    {item.attempts > 0 ? (
                      <Badge tone="success" size="sm">
                        Done {item.attempts}×
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm font-medium text-navy-900">{item.title}</p>
                  <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-ink-500">{item.prompt}</p>
                  <p className="mt-3 text-xs text-ink-400">
                    {locked ? 'Included with Premium' : `About ${item.minutes} minutes`}
                  </p>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
