'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Lock, MessageSquarePlus, Sparkles } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { Input, Select, Textarea } from '@/components/ui/field'
import { Badge } from '@/components/ui/badge'
import { notify } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

export interface GalleryTopic {
  id: string
  slug: string
  title: string
  subtitle: string | null
  category: string
  level: string
  emoji: string | null
  personaName: string
  goals: string[]
  isPremium: boolean
  locked: boolean
}

const CATEGORY_LABELS: Record<string, string> = {
  DAILY_LIFE: 'Daily conversation',
  SOCIAL: 'Social',
  TRAVEL: 'Travel',
  WORK_AND_STUDY: 'Work & study',
  EXAM_PREP: 'Exam preparation',
  CUSTOM: 'Custom',
}

const CATEGORY_ORDER = ['DAILY_LIFE', 'SOCIAL', 'TRAVEL', 'WORK_AND_STUDY', 'EXAM_PREP', 'CUSTOM']

export function TopicGallery({ topics, canStart }: { topics: GalleryTopic[]; canStart: boolean }) {
  const router = useRouter()
  const [starting, setStarting] = useState<string | null>(null)
  const [customOpen, setCustomOpen] = useState(false)

  async function start(body: Record<string, unknown>, key: string) {
    if (starting) return
    setStarting(key)
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const payload = await response.json()

      if (!response.ok) {
        notify.error(
          response.status === 402 ? 'Allowance reached' : 'Could not start',
          payload.error ?? 'Please try again.',
        )
        return
      }
      router.push(`/conversations/${payload.data.conversation.id}`)
    } catch {
      notify.error('Could not start', 'Check your connection and try again.')
    } finally {
      setStarting(null)
    }
  }

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: topics.filter((topic) => topic.category === category),
  })).filter((group) => group.items.length > 0)

  return (
    <>
      <div className="space-y-8">
        {grouped.map((group) => (
          <section key={group.category}>
            <h3 className="text-sm font-semibold text-navy-900">
              {CATEGORY_LABELS[group.category] ?? group.category}
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  busy={starting === topic.id}
                  disabled={Boolean(starting) || !canStart}
                  onStart={() => void start({ kind: 'topic', topicId: topic.id }, topic.id)}
                />
              ))}
            </div>
          </section>
        ))}

        <section>
          <h3 className="text-sm font-semibold text-navy-900">Your own topic</h3>
          <button
            type="button"
            onClick={() => setCustomOpen(true)}
            disabled={Boolean(starting) || !canStart}
            className="mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-ink-300 p-4 text-left transition-colors hover:border-brand-400 hover:bg-brand-50/40 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:min-w-[320px]"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
              <MessageSquarePlus className="size-5" aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-medium text-navy-900">
                Create a conversation on any topic
              </span>
              <span className="block text-xs text-ink-500">
                Describe the situation and we will play the other person.
              </span>
            </span>
          </button>
        </section>
      </div>

      <CustomTopicModal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        busy={starting === 'custom'}
        onSubmit={(values) => void start({ kind: 'custom', ...values }, 'custom')}
      />
    </>
  )
}

function TopicCard({
  topic,
  busy,
  disabled,
  onStart,
}: {
  topic: GalleryTopic
  busy: boolean
  disabled: boolean
  onStart: () => void
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-hairline bg-white p-4 transition-shadow',
        !topic.locked && 'hover:shadow-sm',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl leading-none" aria-hidden>
          {topic.emoji ?? '💬'}
        </span>
        {topic.isPremium ? (
          <Badge tone="brand" size="sm">
            Premium
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 text-sm font-semibold text-navy-900">{topic.title}</p>
      {topic.subtitle ? <p className="mt-1 text-xs leading-relaxed text-ink-500">{topic.subtitle}</p> : null}

      <p className="mt-2 text-xs text-ink-400">
        With {topic.personaName} · {topic.level.toLowerCase()}
      </p>

      <div className="mt-4 pt-1">
        {topic.locked ? (
          <ButtonLink size="sm" variant="secondary" href="/pricing" block>
            <Lock aria-hidden />
            Unlock with Premium
          </ButtonLink>
        ) : (
          <Button size="sm" onClick={onStart} disabled={disabled} block>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            {busy ? 'Starting…' : 'Start chatting'}
          </Button>
        )}
      </div>
    </div>
  )
}

function CustomTopicModal({
  open,
  onClose,
  busy,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  busy: boolean
  onSubmit: (values: { title: string; scenario: string; level: string }) => void
}) {
  const [title, setTitle] = useState('')
  const [scenario, setScenario] = useState('')
  const [level, setLevel] = useState('MEDIUM')

  const valid = title.trim().length >= 3 && scenario.trim().length >= 10

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create your own conversation"
      description="Tell us the situation, and we will play the other person."
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ title: title.trim(), scenario: scenario.trim(), level })}
            disabled={!valid || busy}
          >
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Sparkles aria-hidden />}
            Start chatting
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Topic"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Returning a faulty laptop"
          maxLength={80}
          required
        />
        <Textarea
          label="The situation"
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
          rows={4}
          maxLength={600}
          placeholder="I bought a laptop last week and the screen flickers. I am at the shop counter asking for a refund, and the assistant is reluctant."
          hint="Say who the other person is and what you want from the conversation."
          required
        />
        <Select label="Level" value={level} onChange={(event) => setLevel(event.target.value)}>
          <option value="EASY">Easy — short sentences, everyday words</option>
          <option value="MEDIUM">Medium — natural everyday English</option>
          <option value="HARD">Hard — idiomatic, and it will push back</option>
        </Select>
      </div>
    </Modal>
  )
}
