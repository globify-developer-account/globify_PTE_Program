'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'
import { QUESTION_TYPES, questionType } from '@/lib/pte/question-types'
import { cn } from '@/lib/utils'

export interface QuestionDraft {
  id?: string
  code: string
  typeCode: string
  title: string
  prompt: string
  passage: string
  audioTranscript: string
  imageUrl: string
  audioUrl: string
  explanation: string
  sampleAnswer: string
  options: unknown
  correctAnswer: Record<string, unknown>
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  tags: string[]
  timeLimitSeconds: number | null
  preparationSeconds: number | null
  wordLimitMin: number | null
  wordLimitMax: number | null
  isPremium: boolean
}

interface Choice {
  id: string
  text: string
}
interface Blank {
  index: number
  choices: string[]
}

export function QuestionEditor({ initial }: { initial: QuestionDraft }) {
  const router = useRouter()
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  const definition = questionType(draft.typeCode)
  const renderer = definition?.renderer

  const set = <K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const setAnswer = (patch: Record<string, unknown>) =>
    setDraft((current) => ({ ...current, correctAnswer: { ...current.correctAnswer, ...patch } }))

  // The shape of `options` depends entirely on the renderer, so it is read
  // through a narrow accessor rather than trusted as a fixed type.
  const choices = useMemo<Choice[]>(
    () =>
      Array.isArray(draft.options) && draft.options.length > 0 && 'id' in (draft.options[0] as object)
        ? (draft.options as Choice[])
        : [],
    [draft.options],
  )

  const blanks = useMemo<Blank[]>(
    () =>
      Array.isArray(draft.options) && draft.options.length > 0 && 'index' in (draft.options[0] as object)
        ? (draft.options as Blank[])
        : [],
    [draft.options],
  )

  const needsChoices = renderer === 'choice-single' || renderer === 'choice-multiple' || renderer === 'reorder'
  const needsBlanks = renderer === 'fill-blanks-dropdown'
  const needsTypedBlanks = renderer === 'fill-blanks-typed'
  const needsWords = renderer === 'highlight-words'
  const needsText = renderer === 'dictation'
  const needsAudio = definition
    ? ['speaking-audio-prompt', 'fill-blanks-typed', 'highlight-words', 'dictation'].includes(renderer ?? '') ||
      draft.typeCode === 'SUMMARIZE_SPOKEN_TEXT' ||
      draft.typeCode === 'LISTENING_MCQ_SINGLE' ||
      draft.typeCode === 'LISTENING_MCQ_MULTIPLE'
    : false

  async function save() {
    setSaving(true)
    try {
      const response = await fetch(
        draft.id ? `/api/admin/questions/${draft.id}` : '/api/admin/questions',
        {
          method: draft.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        },
      )
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Could not save', payload.error ?? 'Check the fields and try again.')
        return
      }

      notify.success(draft.id ? 'Question updated' : 'Question created')
      router.push('/admin/questions')
      router.refresh()
    } catch {
      notify.error('Could not save', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/questions"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All questions
        </Link>
        <Button onClick={save} loading={saving}>
          {saving ? null : <Save aria-hidden />}
          {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create question'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Code"
                value={draft.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                hint="Unique reference, e.g. RA-014"
                required
              />
              <Select
                label="Task type"
                value={draft.typeCode}
                onChange={(e) => set('typeCode', e.target.value)}
                hint={definition?.description}
              >
                {QUESTION_TYPES.map((type) => (
                  <option key={type.code} value={type.code}>
                    {type.section.charAt(0)}
                    {type.section.slice(1).toLowerCase()} — {type.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Title"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
                wrapperClassName="sm:col-span-2"
                required
              />
              <Textarea
                label="Prompt / instruction"
                value={draft.prompt}
                onChange={(e) => set('prompt', e.target.value)}
                rows={3}
                wrapperClassName="sm:col-span-2"
                hint="Shown above the task."
              />
            </div>
          </Section>

          <Section
            title="Content"
            description={
              needsBlanks || needsTypedBlanks
                ? 'Mark each blank in the passage with {{1}}, {{2}} and so on.'
                : undefined
            }
          >
            <div className="space-y-4">
              <Textarea
                label="Passage"
                value={draft.passage}
                onChange={(e) => set('passage', e.target.value)}
                rows={8}
                hint={
                  needsWords
                    ? 'The transcript the student reads — it must differ from the audio at the words they should click.'
                    : 'The reading text, or the text to be read aloud.'
                }
              />

              {needsAudio || needsWords ? (
                <Textarea
                  label="Audio transcript"
                  value={draft.audioTranscript}
                  onChange={(e) => set('audioTranscript', e.target.value)}
                  rows={5}
                  hint="What the recording actually says. Used for AI scoring and accessibility."
                />
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Audio URL or storage key"
                  value={draft.audioUrl}
                  onChange={(e) => set('audioUrl', e.target.value)}
                  placeholder="question-media/audio/…"
                />
                <Input
                  label="Image URL or storage key"
                  value={draft.imageUrl}
                  onChange={(e) => set('imageUrl', e.target.value)}
                  placeholder="question-media/image/…"
                />
              </div>
            </div>
          </Section>

          {/* Answer key — shape depends on the renderer */}
          <Section title="Answer key" description="Validated against the same schema the scorer uses.">
            {needsChoices ? (
              <ChoiceEditor
                choices={choices}
                onChange={(next) => set('options', next)}
                mode={renderer === 'reorder' ? 'order' : renderer === 'choice-multiple' ? 'multiple' : 'single'}
                correct={draft.correctAnswer}
                onCorrectChange={setAnswer}
              />
            ) : null}

            {needsBlanks ? (
              <BlankEditor
                blanks={blanks}
                onChange={(next) => set('options', next)}
                correct={(draft.correctAnswer.blanks as Record<string, string>) ?? {}}
                onCorrectChange={(nextBlanks) => setAnswer({ blanks: nextBlanks })}
              />
            ) : null}

            {needsTypedBlanks ? (
              <TypedBlankEditor
                correct={(draft.correctAnswer.blanks as Record<string, string>) ?? {}}
                onChange={(nextBlanks) => setAnswer({ blanks: nextBlanks })}
              />
            ) : null}

            {needsWords ? (
              <WordIndexEditor
                passage={draft.passage}
                selected={(draft.correctAnswer.wordIndexes as number[]) ?? []}
                onChange={(indexes) => setAnswer({ wordIndexes: indexes })}
              />
            ) : null}

            {needsText ? (
              <Textarea
                label="Exact sentence"
                value={(draft.correctAnswer.text as string) ?? ''}
                onChange={(e) => setAnswer({ text: e.target.value })}
                rows={3}
                hint="Scored word by word against what the student types."
              />
            ) : null}

            {!needsChoices && !needsBlanks && !needsTypedBlanks && !needsWords && !needsText ? (
              <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-600">
                This task type is evaluated by AI rather than an answer key. Provide a strong sample answer
                below so students have something to compare against.
              </p>
            ) : null}
          </Section>

          <Section title="Explanation and sample answer">
            <div className="space-y-4">
              <Textarea
                label="Explanation"
                value={draft.explanation}
                onChange={(e) => set('explanation', e.target.value)}
                rows={4}
                hint="Shown after the student submits. Explain why the answer is right."
              />
              <Textarea
                label="Sample answer"
                value={draft.sampleAnswer}
                onChange={(e) => set('sampleAnswer', e.target.value)}
                rows={5}
              />
            </div>
          </Section>
        </div>

        {/* Settings rail */}
        <div className="space-y-6">
          <Section title="Publishing">
            <div className="space-y-4">
              <Select
                label="Status"
                value={draft.status}
                onChange={(e) => set('status', e.target.value as QuestionDraft['status'])}
                hint="Only published questions appear in practice."
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>

              <Select
                label="Difficulty"
                value={draft.difficulty}
                onChange={(e) => set('difficulty', e.target.value as QuestionDraft['difficulty'])}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>

              <Checkbox
                label="Premium only"
                checked={draft.isPremium}
                onChange={(e) => set('isPremium', e.target.checked)}
                description="Free accounts never see this question."
              />

              <Input
                label="Tags"
                value={draft.tags.join(', ')}
                onChange={(e) =>
                  set(
                    'tags',
                    e.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  )
                }
                hint="Comma separated."
              />
            </div>
          </Section>

          <Section title="Timing">
            <div className="space-y-4">
              <Input
                label="Time limit (seconds)"
                type="number"
                value={draft.timeLimitSeconds ?? ''}
                onChange={(e) => set('timeLimitSeconds', e.target.value ? Number(e.target.value) : null)}
                hint={
                  definition?.defaultTimeLimitSeconds
                    ? `Default for this type: ${definition.defaultTimeLimitSeconds}s`
                    : 'Leave blank for untimed.'
                }
              />
              <Input
                label="Preparation (seconds)"
                type="number"
                value={draft.preparationSeconds ?? ''}
                onChange={(e) => set('preparationSeconds', e.target.value ? Number(e.target.value) : null)}
                hint={
                  definition?.defaultPreparationSeconds
                    ? `Default: ${definition.defaultPreparationSeconds}s`
                    : undefined
                }
              />

              {definition?.requiresTextResponse ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Min words"
                    type="number"
                    value={draft.wordLimitMin ?? ''}
                    onChange={(e) => set('wordLimitMin', e.target.value ? Number(e.target.value) : null)}
                  />
                  <Input
                    label="Max words"
                    type="number"
                    value={draft.wordLimitMax ?? ''}
                    onChange={(e) => set('wordLimitMax', e.target.value ? Number(e.target.value) : null)}
                  />
                </div>
              ) : null}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function Section({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="surface-card p-5">
      <h3 className="text-sm font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}

function ChoiceEditor({
  choices,
  onChange,
  mode,
  correct,
  onCorrectChange,
}: {
  choices: Choice[]
  onChange: (next: Choice[]) => void
  mode: 'single' | 'multiple' | 'order'
  correct: Record<string, unknown>
  onCorrectChange: (patch: Record<string, unknown>) => void
}) {
  const selectedIds = (correct.optionIds as string[]) ?? []
  const selectedId = (correct.optionId as string) ?? ''
  const order = (correct.order as string[]) ?? []

  function add() {
    const nextId = String.fromCharCode(97 + choices.length)
    onChange([...choices, { id: nextId, text: '' }])
  }

  function update(index: number, text: string) {
    onChange(choices.map((choice, i) => (i === index ? { ...choice, text } : choice)))
  }

  function remove(index: number) {
    const removed = choices[index]!
    onChange(choices.filter((_, i) => i !== index))
    if (mode === 'order') onCorrectChange({ order: order.filter((id) => id !== removed.id) })
    if (mode === 'multiple') onCorrectChange({ optionIds: selectedIds.filter((id) => id !== removed.id) })
    if (mode === 'single' && selectedId === removed.id) onCorrectChange({ optionId: '' })
  }

  return (
    <div className="space-y-3">
      {choices.map((choice, index) => {
        const isCorrect =
          mode === 'single'
            ? selectedId === choice.id
            : mode === 'multiple'
              ? selectedIds.includes(choice.id)
              : false

        return (
          <div
            key={choice.id}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3',
              isCorrect ? 'border-green-300 bg-green-50/50' : 'border-hairline',
            )}
          >
            {mode !== 'order' ? (
              <label className="mt-2 flex shrink-0 items-center gap-2">
                <input
                  type={mode === 'single' ? 'radio' : 'checkbox'}
                  name="correct"
                  checked={isCorrect}
                  onChange={() => {
                    if (mode === 'single') onCorrectChange({ optionId: choice.id, optionIds: undefined })
                    else
                      onCorrectChange({
                        optionIds: selectedIds.includes(choice.id)
                          ? selectedIds.filter((id) => id !== choice.id)
                          : [...selectedIds, choice.id],
                      })
                  }}
                  className="size-4"
                />
                <span className="text-xs font-semibold uppercase text-ink-500">{choice.id}</span>
              </label>
            ) : (
              <span className="mt-2 grid size-7 shrink-0 place-items-center rounded-md bg-ink-100 text-xs font-semibold text-ink-600">
                {order.indexOf(choice.id) >= 0 ? order.indexOf(choice.id) + 1 : '–'}
              </span>
            )}

            <textarea
              value={choice.text}
              onChange={(event) => update(index, event.target.value)}
              rows={2}
              placeholder={mode === 'order' ? 'Paragraph text…' : 'Option text…'}
              className="min-w-0 flex-1 resize-y rounded-lg border border-hairline px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
            />

            <button
              type="button"
              onClick={() => remove(index)}
              className="mt-1.5 shrink-0 rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-danger"
              aria-label={`Remove option ${choice.id}`}
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </div>
        )
      })}

      {mode === 'order' ? (
        <Input
          label="Correct order"
          value={order.join(', ')}
          onChange={(event) =>
            onCorrectChange({
              order: event.target.value
                .split(',')
                .map((id) => id.trim())
                .filter(Boolean),
            })
          }
          hint="Option ids in the correct sequence, comma separated. Scored on adjacent pairs."
        />
      ) : null}

      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Plus aria-hidden />
        Add option
      </Button>
    </div>
  )
}

function BlankEditor({
  blanks,
  onChange,
  correct,
  onCorrectChange,
}: {
  blanks: Blank[]
  onChange: (next: Blank[]) => void
  correct: Record<string, string>
  onCorrectChange: (next: Record<string, string>) => void
}) {
  function add() {
    onChange([...blanks, { index: blanks.length + 1, choices: ['', ''] }])
  }

  function updateChoices(index: number, raw: string) {
    onChange(
      blanks.map((blank, i) =>
        i === index
          ? { ...blank, choices: raw.split(',').map((choice) => choice.trim()).filter(Boolean) }
          : blank,
      ),
    )
  }

  return (
    <div className="space-y-3">
      {blanks.map((blank, index) => (
        <div key={blank.index} className="rounded-xl border border-hairline p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Blank {`{{${blank.index}}}`}
          </p>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Input
              label="Options"
              value={blank.choices.join(', ')}
              onChange={(event) => updateChoices(index, event.target.value)}
              hint="Comma separated. Shown in the dropdown."
            />
            <Select
              label="Correct answer"
              value={correct[String(blank.index)] ?? ''}
              onChange={(event) =>
                onCorrectChange({ ...correct, [String(blank.index)]: event.target.value })
              }
            >
              <option value="">Choose…</option>
              {blank.choices.map((choice) => (
                <option key={choice} value={choice}>
                  {choice}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={() => onChange(blanks.filter((_, i) => i !== index))}
            className="mt-2 text-xs font-medium text-danger hover:underline"
          >
            Remove blank
          </button>
        </div>
      ))}
      <Button type="button" variant="secondary" size="sm" onClick={add}>
        <Plus aria-hidden />
        Add blank
      </Button>
    </div>
  )
}

function TypedBlankEditor({
  correct,
  onChange,
}: {
  correct: Record<string, string>
  onChange: (next: Record<string, string>) => void
}) {
  const entries = Object.entries(correct)

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="flex items-end gap-3">
          <Input
            label={`Blank {{${key}}}`}
            value={value}
            onChange={(event) => onChange({ ...correct, [key]: event.target.value })}
            wrapperClassName="flex-1"
          />
          <button
            type="button"
            onClick={() => {
              const next = { ...correct }
              delete next[key]
              onChange(next)
            }}
            className="mb-1 rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-danger"
            aria-label={`Remove blank ${key}`}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => onChange({ ...correct, [String(entries.length + 1)]: '' })}
      >
        <Plus aria-hidden />
        Add blank
      </Button>
      <p className="text-xs text-ink-500">
        Blank numbers must match the {'{{n}}'} markers in the passage above.
      </p>
    </div>
  )
}

function WordIndexEditor({
  passage,
  selected,
  onChange,
}: {
  passage: string
  selected: number[]
  onChange: (next: number[]) => void
}) {
  const words = passage.split(/(\s+)/).filter((token) => token.trim().length > 0)

  if (words.length === 0) {
    return <p className="rounded-lg bg-ink-50 p-4 text-sm text-ink-600">Enter the passage first.</p>
  }

  function toggle(index: number) {
    onChange(
      selected.includes(index)
        ? selected.filter((value) => value !== index)
        : [...selected, index].sort((a, b) => a - b),
    )
  }

  return (
    <div>
      <p className="mb-2 text-sm text-ink-500">
        Click each word that differs from the recording. Indexes are stored, so re-editing the passage
        requires re-selecting.
      </p>
      <div className="rounded-xl border border-hairline p-4 leading-loose">
        {words.map((word, index) => (
          <button
            key={`${word}-${index}`}
            type="button"
            onClick={() => toggle(index)}
            className={cn(
              'mr-1 rounded px-1 py-0.5 text-sm transition-colors',
              selected.includes(index)
                ? 'bg-brand-600 font-medium text-white'
                : 'hover:bg-brand-50 hover:text-brand-700',
            )}
          >
            {word}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-500">{selected.length} word(s) marked as incorrect</p>
    </div>
  )
}
