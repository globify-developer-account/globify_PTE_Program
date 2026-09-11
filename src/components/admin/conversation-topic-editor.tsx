'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Checkbox, Input, Select, Textarea } from '@/components/ui/field'
import { notify } from '@/components/ui/toast'

export interface TopicFormValues {
  id?: string
  slug: string
  title: string
  subtitle: string
  description: string
  category: string
  level: string
  emoji: string
  personaName: string
  personaRole: string
  scenario: string
  openingLine: string
  goals: string
  starterPhrases: string
  targetLanguage: string
  isPremium: boolean
  status: string
  displayOrder: number
}

export const EMPTY_TOPIC: TopicFormValues = {
  slug: '',
  title: '',
  subtitle: '',
  description: '',
  category: 'DAILY_LIFE',
  level: 'MEDIUM',
  emoji: '',
  personaName: '',
  personaRole: '',
  scenario: '',
  openingLine: '',
  goals: '',
  starterPhrases: '',
  targetLanguage: '',
  isPremium: false,
  status: 'DRAFT',
  displayOrder: 0,
}

/** One item per line — the shape staff actually type into a textarea. */
function toList(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function ConversationTopicEditor({ initial }: { initial: TopicFormValues }) {
  const router = useRouter()
  const [values, setValues] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  const isNew = !values.id

  function set<K extends keyof TopicFormValues>(key: K, value: TopicFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  async function save() {
    setSaving(true)
    try {
      const body = {
        slug: values.slug || undefined,
        title: values.title,
        subtitle: values.subtitle || null,
        description: values.description || null,
        category: values.category,
        level: values.level,
        emoji: values.emoji || null,
        personaName: values.personaName,
        personaRole: values.personaRole,
        scenario: values.scenario,
        openingLine: values.openingLine,
        goals: toList(values.goals),
        starterPhrases: toList(values.starterPhrases),
        targetLanguage: toList(values.targetLanguage),
        isPremium: values.isPremium,
        status: values.status,
        displayOrder: values.displayOrder,
      }

      const response = await fetch(
        isNew ? '/api/admin/conversation-topics' : `/api/admin/conversation-topics/${values.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      )
      const payload = await response.json()

      if (!response.ok) {
        notify.error('Could not save', payload.error ?? 'Please check the form and try again.')
        return
      }

      notify.success(isNew ? 'Topic created' : 'Topic saved')
      router.push('/admin/conversations')
      router.refresh()
    } catch {
      notify.error('Could not save', 'Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function archive() {
    if (!values.id) return
    setArchiving(true)
    try {
      const response = await fetch(`/api/admin/conversation-topics/${values.id}`, { method: 'DELETE' })
      const payload = await response.json()
      if (!response.ok) {
        notify.error('Could not archive', payload.error ?? 'Please try again.')
        return
      }
      notify.success('Topic archived', 'Existing conversations keep their transcripts.')
      router.push('/admin/conversations')
      router.refresh()
    } finally {
      setArchiving(false)
    }
  }

  const valid =
    values.title.trim().length >= 3 &&
    values.personaName.trim().length > 0 &&
    values.personaRole.trim().length > 0 &&
    values.scenario.trim().length >= 10 &&
    values.openingLine.trim().length >= 3

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader title="Topic" description="What the student sees on the card." />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Title"
            value={values.title}
            onChange={(event) => set('title', event.target.value)}
            required
          />
          <Input
            label="Slug"
            value={values.slug}
            onChange={(event) => set('slug', event.target.value)}
            hint={isNew ? 'Left blank, this is generated from the title.' : undefined}
          />
          <Input
            label="Subtitle"
            value={values.subtitle}
            onChange={(event) => set('subtitle', event.target.value)}
            hint="One line, shown under the title."
          />
          <Input
            label="Emoji"
            value={values.emoji}
            onChange={(event) => set('emoji', event.target.value)}
            hint="Shown on the card. Defaults to 💬."
            maxLength={8}
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Description"
              value={values.description}
              onChange={(event) => set('description', event.target.value)}
              rows={2}
              hint="Why this conversation is worth practising."
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="The scene"
          description="Handed to the model verbatim. Write it as a situation, not as instructions."
        />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Persona name"
            value={values.personaName}
            onChange={(event) => set('personaName', event.target.value)}
            placeholder="Sara"
            required
          />
          <Input
            label="Persona role"
            value={values.personaRole}
            onChange={(event) => set('personaRole', event.target.value)}
            placeholder="a neighbour you have just met"
            required
          />
          <div className="sm:col-span-2">
            <Textarea
              label="Scenario"
              value={values.scenario}
              onChange={(event) => set('scenario', event.target.value)}
              rows={3}
              placeholder="You are both at a weekly language exchange meetup…"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Textarea
              label="Opening line"
              value={values.openingLine}
              onChange={(event) => set('openingLine', event.target.value)}
              rows={2}
              hint="The partner's first turn. Stored, not generated — the chat opens instantly and costs nothing."
              required
            />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Language" description="One item per line." />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Textarea
            label="Goals"
            value={values.goals}
            onChange={(event) => set('goals', event.target.value)}
            rows={5}
            hint="Things the student does. The report checks these."
          />
          <Textarea
            label="Starter phrases"
            value={values.starterPhrases}
            onChange={(event) => set('starterPhrases', event.target.value)}
            rows={5}
            hint="Offered when a student stalls."
          />
          <Textarea
            label="Target language"
            value={values.targetLanguage}
            onChange={(event) => set('targetLanguage', event.target.value)}
            rows={5}
            hint="Words and structures to steer towards."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Publishing" />
        <CardBody className="grid gap-4 sm:grid-cols-3">
          <Select label="Category" value={values.category} onChange={(event) => set('category', event.target.value)}>
            <option value="DAILY_LIFE">Daily conversation</option>
            <option value="SOCIAL">Social</option>
            <option value="TRAVEL">Travel</option>
            <option value="WORK_AND_STUDY">Work &amp; study</option>
            <option value="EXAM_PREP">Exam preparation</option>
            <option value="CUSTOM">Custom</option>
          </Select>
          <Select label="Level" value={values.level} onChange={(event) => set('level', event.target.value)}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </Select>
          <Select label="Status" value={values.status} onChange={(event) => set('status', event.target.value)}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Input
            label="Display order"
            type="number"
            value={String(values.displayOrder)}
            onChange={(event) => set('displayOrder', Number(event.target.value) || 0)}
          />
          <div className="flex items-end pb-1 sm:col-span-2">
            <Checkbox
              label="Premium only"
              checked={values.isPremium}
              onChange={(event) => set('isPremium', event.target.checked)}
            />
          </div>
        </CardBody>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button onClick={save} disabled={!valid || saving}>
          {saving ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}
          {isNew ? 'Create topic' : 'Save changes'}
        </Button>

        {!isNew && values.status !== 'ARCHIVED' ? (
          <Button variant="secondary" onClick={archive} disabled={archiving}>
            {archiving ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            Archive
          </Button>
        ) : null}
      </div>
    </div>
  )
}
