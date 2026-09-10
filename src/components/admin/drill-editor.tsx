'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Play, Plus, Save, Trash2, Upload, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'
import { splitIntoSegments } from '@/lib/drills/diff'
import { slugify } from '@/lib/utils'

export interface DrillSegmentDraft {
  text: string
  startMs: number
  endMs: number
}

export interface DrillDraft {
  id?: string
  slug: string
  title: string
  description: string
  categoryId: string
  audioUrl: string
  audioDurationMs: number | null
  transcript: string
  accent: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  isPremium: boolean
  tags: string[]
  displayOrder: number
  segments: DrillSegmentDraft[]
}

export interface DrillCategoryOption {
  id: string
  name: string
}

/**
 * Authoring for a dictation & shadowing exercise.
 *
 * Timings are the fiddly part — every line needs a start and an end inside one
 * recording — so they are captured from the preview player rather than typed:
 * play the clip, press "Start" when the line begins and "End" when it stops.
 * Typing them by hand stays possible, because a corrected value is usually a
 * tenth of a second away from the captured one.
 */
export function DrillEditor({
  initial,
  categories,
  previewUrl,
}: {
  initial: DrillDraft
  categories: DrillCategoryOption[]
  /** Signed URL for audio already attached to this exercise. */
  previewUrl: string | null
}) {
  const router = useRouter()
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(previewUrl)
  const audioRef = useRef<HTMLAudioElement>(null)
  const stopAtRef = useRef<number | null>(null)

  const set = <K extends keyof DrillDraft>(key: K, value: DrillDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  function setSegment(index: number, patch: Partial<DrillSegmentDraft>) {
    setDraft((current) => ({
      ...current,
      segments: current.segments.map((segment, position) =>
        position === index ? { ...segment, ...patch } : segment,
      ),
    }))
  }

  function splitTranscript() {
    const lines = splitIntoSegments(draft.transcript)
    if (lines.length === 0) {
      notify.error('Nothing to split', 'Paste the transcript first.')
      return
    }
    // Timings already set are kept by position, so re-splitting after a wording
    // fix does not throw away an afternoon of marking up the audio.
    setDraft((current) => ({
      ...current,
      segments: lines.map((text, index) => ({
        text,
        startMs: current.segments[index]?.startMs ?? 0,
        endMs: current.segments[index]?.endMs ?? 0,
      })),
    }))
    notify.success(`Split into ${lines.length} line${lines.length === 1 ? '' : 's'}`)
  }

  async function uploadAudio(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('audio', file)
      const response = await fetch('/api/admin/drills/audio', { method: 'POST', body: form })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Upload failed', payload.error ?? 'Try a different file.')
        return
      }
      set('audioUrl', payload.data.key)
      setPreview(URL.createObjectURL(file))
      notify.success('Audio uploaded')
    } catch {
      notify.error('Upload failed', 'Check your connection and try again.')
    } finally {
      setUploading(false)
    }
  }

  function playRange(startMs: number, endMs: number) {
    const element = audioRef.current
    if (!element) return
    element.currentTime = startMs / 1000
    stopAtRef.current = endMs > startMs ? endMs / 1000 : null
    void element.play().catch(() => undefined)
  }

  function capture(index: number, edge: 'startMs' | 'endMs') {
    const element = audioRef.current
    if (!element) {
      notify.error('No audio loaded', 'Upload the recording first.')
      return
    }
    setSegment(index, { [edge]: Math.round(element.currentTime * 1000) })
  }

  async function save() {
    setSaving(true)
    try {
      const response = await fetch(draft.id ? `/api/admin/drills/${draft.id}` : '/api/admin/drills', {
        method: draft.id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not save', payload.error ?? 'Check the fields and try again.')
        return
      }
      notify.success(draft.id ? 'Exercise updated' : 'Exercise created')
      router.push('/admin/drills')
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
          href="/admin/drills"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All exercises
        </Link>
        <Button onClick={save} loading={saving}>
          {saving ? null : <Save aria-hidden />}
          {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create exercise'}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Title"
                value={draft.title}
                onChange={(event) => {
                  const title = event.target.value
                  setDraft((current) => ({
                    ...current,
                    title,
                    // Keep the address in step with the title until it is saved;
                    // changing it afterwards would break every existing link.
                    slug: current.id ? current.slug : slugify(title),
                  }))
                }}
                required
              />
              <Input
                label="Web address"
                value={draft.slug}
                onChange={(event) => set('slug', slugify(event.target.value))}
                hint="/drills/…"
                required
              />
              <Select
                label="Category"
                value={draft.categoryId}
                onChange={(event) => set('categoryId', event.target.value)}
                required
              >
                {categories.length === 0 ? <option value="">No categories yet</option> : null}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
              <Input
                label="Accent"
                value={draft.accent}
                onChange={(event) => set('accent', event.target.value)}
                hint="Shown on the card, e.g. British"
              />
            </div>
            <Textarea
              label="Description"
              value={draft.description}
              onChange={(event) => set('description', event.target.value)}
              rows={2}
              wrapperClassName="mt-4"
            />
          </Section>

          <Section
            title="Recording"
            description="One audio file for the whole exercise. Each line plays a slice of it."
          >
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-hairline bg-white px-4 py-2.5 text-sm font-medium text-navy-900 hover:border-brand-200">
                <Upload className="size-4" aria-hidden />
                {uploading ? 'Uploading…' : 'Upload audio'}
                <input
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) void uploadAudio(file)
                    event.target.value = ''
                  }}
                />
              </label>
              {draft.audioUrl ? (
                <span className="truncate text-xs text-ink-500">{draft.audioUrl}</span>
              ) : (
                <span className="text-xs text-ink-400">MP3, M4A, WAV, OGG or WebM.</span>
              )}
            </div>

            {preview ? (
              <audio
                ref={audioRef}
                src={preview}
                controls
                className="mt-4 w-full"
                onLoadedMetadata={(event) => {
                  const seconds = event.currentTarget.duration
                  if (Number.isFinite(seconds)) set('audioDurationMs', Math.round(seconds * 1000))
                }}
                onTimeUpdate={(event) => {
                  const stopAt = stopAtRef.current
                  if (stopAt !== null && event.currentTarget.currentTime >= stopAt) {
                    event.currentTarget.pause()
                    stopAtRef.current = null
                  }
                }}
              />
            ) : null}
          </Section>

          <Section
            title="Transcript & lines"
            description="Paste the transcript, split it into lines, then mark where each line falls in the recording."
          >
            <Textarea
              label="Transcript"
              value={draft.transcript}
              onChange={(event) => set('transcript', event.target.value)}
              rows={6}
              required
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={splitTranscript}>
                <Wand2 aria-hidden />
                Split into lines
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  set('segments', [...draft.segments, { text: '', startMs: 0, endMs: 0 }])
                }
              >
                <Plus aria-hidden />
                Add a line
              </Button>
            </div>

            <ol className="mt-4 space-y-3">
              {draft.segments.map((segment, index) => (
                <li key={index} className="rounded-lg border border-hairline bg-ink-50/60 p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-2.5 w-6 shrink-0 text-xs font-medium text-ink-400 tabular">
                      {index + 1}
                    </span>
                    <Textarea
                      value={segment.text}
                      onChange={(event) => setSegment(index, { text: event.target.value })}
                      rows={2}
                      wrapperClassName="flex-1"
                      aria-label={`Line ${index + 1} text`}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          'segments',
                          draft.segments.filter((_, position) => position !== index),
                        )
                      }
                      className="mt-2 grid size-8 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-red-50 hover:text-danger"
                      aria-label={`Remove line ${index + 1}`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-end gap-2 pl-8">
                    <TimeField
                      label="Start"
                      valueMs={segment.startMs}
                      onChange={(startMs) => setSegment(index, { startMs })}
                      onCapture={() => capture(index, 'startMs')}
                    />
                    <TimeField
                      label="End"
                      valueMs={segment.endMs}
                      onChange={(endMs) => setSegment(index, { endMs })}
                      onCapture={() => capture(index, 'endMs')}
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => playRange(segment.startMs, segment.endMs)}
                      disabled={!preview}
                    >
                      <Play aria-hidden />
                      Play line
                    </Button>
                  </div>
                </li>
              ))}
            </ol>

            {draft.segments.length === 0 ? (
              <p className="mt-4 rounded-lg border border-dashed border-ink-200 p-4 text-center text-sm text-ink-500">
                No lines yet. Paste a transcript and press “Split into lines”.
              </p>
            ) : null}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Publishing">
            <div className="space-y-4">
              <Select
                label="Status"
                value={draft.status}
                onChange={(event) => set('status', event.target.value as DrillDraft['status'])}
                hint="Only published exercises appear in the library."
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
              <Select
                label="Difficulty"
                value={draft.difficulty}
                onChange={(event) => set('difficulty', event.target.value as DrillDraft['difficulty'])}
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </Select>
              <Input
                label="Display order"
                type="number"
                min={0}
                value={draft.displayOrder}
                onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
              />
              <Input
                label="Tags"
                value={draft.tags.join(', ')}
                onChange={(event) =>
                  set(
                    'tags',
                    event.target.value
                      .split(',')
                      .map((tag) => tag.trim())
                      .filter(Boolean),
                  )
                }
                hint="Comma separated"
              />
              <Checkbox
                label="Premium only"
                checked={draft.isPremium}
                onChange={(event) => set('isPremium', event.target.checked)}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function TimeField({
  label,
  valueMs,
  onChange,
  onCapture,
}: {
  label: string
  valueMs: number
  onChange: (ms: number) => void
  onCapture: () => void
}) {
  return (
    <div className="flex items-end gap-1">
      <Input
        label={label}
        type="number"
        min={0}
        step={0.1}
        value={(valueMs / 1000).toFixed(1)}
        onChange={(event) => onChange(Math.max(0, Math.round(Number(event.target.value) * 1000) || 0))}
        className="w-24"
      />
      <button
        type="button"
        onClick={onCapture}
        className="mb-1.5 rounded-md border border-hairline bg-white px-2 py-1.5 text-[11px] font-medium text-ink-600 hover:border-brand-200 hover:text-navy-900"
      >
        Set
      </button>
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
      <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  )
}
