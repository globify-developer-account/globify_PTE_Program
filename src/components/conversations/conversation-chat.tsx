'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, CircleStop, Flag, Loader2, Send, Volume2, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { PushToTalk } from './push-to-talk'
import { useAutoSpeak, useSpeech } from './use-speech'
import { ConversationReportCard, type ReportPayload } from './report-card'

export interface ChatMessage {
  id: string
  role: 'USER' | 'ASSISTANT'
  index: number
  content: string
  correction: string | null
  correctionNote: string | null
  suggestions: string[]
  transcribed: boolean
}

interface ConversationChatProps {
  conversationId: string
  title: string
  personaName: string
  goals: string[]
  level: string
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED'
  maxTurns: number
  userTurns: number
  minTurnsForReport: number
  initialMessages: ChatMessage[]
  initialReport: ReportPayload | null
}

export function ConversationChat({
  conversationId,
  title,
  personaName,
  goals,
  level,
  status,
  maxTurns,
  userTurns: initialTurns,
  minTurnsForReport,
  initialMessages,
  initialReport,
}: ConversationChatProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [finishing, setFinishing] = useState(false)
  const [userTurns, setUserTurns] = useState(initialTurns)
  const [goalsMet, setGoalsMet] = useState<string[]>([])
  const [simulated, setSimulated] = useState(false)
  const [report, setReport] = useState<ReportPayload | null>(initialReport)
  const [active, setActive] = useState(status === 'ACTIVE')

  const listRef = useRef<HTMLDivElement>(null)
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const { speak, stop, state: speechState, speakingId } = useSpeech()
  const [autoSpeak, setAutoSpeak] = useAutoSpeak()

  const lastPartner = useMemo(
    () => [...messages].reverse().find((message) => message.role === 'ASSISTANT') ?? null,
    [messages],
  )
  const suggestions = lastPartner?.suggestions ?? []
  const turnsLeft = maxTurns - userTurns

  // Keep the newest turn in view without yanking the page on first paint.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length, report])

  const autoSpokenRef = useRef<string | null>(null)
  useEffect(() => {
    if (!autoSpeak || !lastPartner) return
    if (autoSpokenRef.current === lastPartner.id) return
    autoSpokenRef.current = lastPartner.id
    void speak(lastPartner.content, lastPartner.id)
  }, [autoSpeak, lastPartner, speak])

  const send = useCallback(
    async (payload: { text: string } | { audio: Blob }) => {
      if (sending || !active) return
      setSending(true)

      // Show the student's own words immediately. A conversation that pauses
      // before echoing what you said feels broken, even when it is only slow.
      const optimisticId = `pending-${Date.now()}`
      if ('text' in payload) {
        setMessages((current) => [
          ...current,
          {
            id: optimisticId,
            role: 'USER',
            index: current.length,
            content: payload.text,
            correction: null,
            correctionNote: null,
            suggestions: [],
            transcribed: false,
          },
        ])
        setDraft('')
      }

      try {
        const response = await fetch(`/api/conversations/${conversationId}/messages`, {
          method: 'POST',
          ...('text' in payload
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: payload.text }),
              }
            : {
                body: (() => {
                  const form = new FormData()
                  form.append('audio', payload.audio, 'turn.webm')
                  return form
                })(),
              }),
        })

        const body = await response.json()

        if (!response.ok) {
          // Roll the optimistic turn back so the student can edit and retry it
          // rather than losing what they wrote.
          setMessages((current) => current.filter((message) => message.id !== optimisticId))
          if ('text' in payload) setDraft(payload.text)
          notify.error(
            response.status === 402 ? 'Allowance reached' : 'Could not send',
            body.error ?? 'Please try again.',
          )
          return
        }

        const data = body.data as {
          studentMessage: ChatMessage
          partnerMessage: ChatMessage
          goalsMet: string[]
          isClosing: boolean
          simulated: boolean
          turnsRemaining: number
        }

        setMessages((current) => [
          ...current.filter((message) => message.id !== optimisticId),
          data.studentMessage,
          data.partnerMessage,
        ])
        setGoalsMet(data.goalsMet)
        setSimulated(data.simulated)
        setUserTurns(maxTurns - data.turnsRemaining)
      } catch {
        setMessages((current) => current.filter((message) => message.id !== optimisticId))
        if ('text' in payload) setDraft(payload.text)
        notify.error('Could not send', 'Check your connection and try again.')
      } finally {
        setSending(false)
        composerRef.current?.focus()
      }
    },
    [active, conversationId, maxTurns, sending],
  )

  async function finish() {
    setFinishing(true)
    stop()
    try {
      const response = await fetch(`/api/conversations/${conversationId}/finish`, { method: 'POST' })
      const body = await response.json()
      if (!response.ok) {
        notify.error('Could not finish', body.error ?? 'Please try again.')
        return
      }
      setReport(body.data.report as ReportPayload)
      setActive(false)
      router.refresh()
    } catch {
      notify.error('Could not finish', 'Check your connection and try again.')
    } finally {
      setFinishing(false)
    }
  }

  const canFinish = active && userTurns >= minTurnsForReport

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="flex min-h-[600px] flex-col overflow-hidden rounded-xl border border-hairline bg-white">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy-900">{title}</p>
            <p className="truncate text-xs text-ink-500">
              You are talking to {personaName} · {level.toLowerCase()}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-ink-500">
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(event) => setAutoSpeak(event.target.checked)}
                className="size-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
              />
              Read aloud
            </label>
            {active ? (
              <Button size="sm" variant="secondary" onClick={finish} disabled={!canFinish || finishing}>
                {finishing ? <Loader2 className="animate-spin" aria-hidden /> : <Flag aria-hidden />}
                Finish
              </Button>
            ) : null}
          </div>
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((message) =>
            message.role === 'ASSISTANT' ? (
              <PartnerBubble
                key={message.id}
                message={message}
                personaName={personaName}
                speaking={speakingId === message.id && speechState === 'speaking'}
                loading={speakingId === message.id && speechState === 'loading'}
                onSpeak={() => void speak(message.content, message.id)}
              />
            ) : (
              <StudentBubble key={message.id} message={message} />
            ),
          )}

          {sending ? (
            <div className="flex items-center gap-2 text-sm text-ink-400" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {personaName} is replying…
            </div>
          ) : null}

          {report ? <ConversationReportCard report={report} /> : null}
        </div>

        {/* Composer */}
        {active ? (
          <div className="border-t border-hairline px-5 py-4">
            {suggestions.length > 0 && !sending ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setDraft(suggestion)
                      composerRef.current?.focus()
                    }}
                    className="rounded-full border border-hairline bg-ink-50 px-3 py-1.5 text-xs text-ink-600 transition-colors hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    if (draft.trim()) void send({ text: draft.trim() })
                  }
                }}
                rows={2}
                disabled={sending}
                placeholder={`Say something to ${personaName}… or press the microphone`}
                aria-label="Your message"
                className="min-h-[46px] flex-1 resize-none rounded-xl border border-hairline bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60"
              />

              <PushToTalk
                disabled={sending}
                onRecorded={(blob) => void send({ audio: blob })}
                onError={(message) => notify.error('Microphone', message)}
              />

              <button
                type="button"
                onClick={() => draft.trim() && void send({ text: draft.trim() })}
                disabled={sending || !draft.trim()}
                aria-label="Send message"
                className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition-colors hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {sending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Send className="size-4" aria-hidden />
                )}
              </button>
            </div>

            <p className="mt-2 text-xs text-ink-400">
              Speak or type — mixing languages is fine, and grammar does not have to be perfect.
              {turnsLeft <= 5 ? ` ${turnsLeft} turn${turnsLeft === 1 ? '' : 's'} left in this conversation.` : ''}
            </p>
          </div>
        ) : (
          <div className="border-t border-hairline bg-ink-50 px-5 py-4 text-sm text-ink-500">
            This conversation is finished.{' '}
            {!report ? 'It was left without a report.' : 'Your report is above.'}
          </div>
        )}
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        {goals.length > 0 ? (
          <div className="surface-card p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Try to</p>
            <ul className="mt-3 space-y-2.5">
              {goals.map((goal) => {
                const met = goalsMet.includes(goal) || (report?.goalsMet ?? []).includes(goal)
                return (
                  <li key={goal} className="flex items-start gap-2 text-sm">
                    <span
                      className={cn(
                        'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border transition-colors',
                        met ? 'border-green-600 bg-green-600 text-white' : 'border-ink-300',
                      )}
                      aria-hidden
                    >
                      {met ? <Check className="size-2.5" strokeWidth={3} /> : null}
                    </span>
                    <span className={cn(met ? 'text-ink-400 line-through' : 'text-ink-600')}>{goal}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}

        <div className="surface-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">This conversation</p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-500">Your turns</dt>
              <dd className="tabular font-medium text-navy-900">
                {userTurns} / {maxTurns}
              </dd>
            </div>
            {active ? (
              <div className="flex justify-between">
                <dt className="text-ink-500">Report at</dt>
                <dd className="tabular font-medium text-navy-900">{minTurnsForReport} turns</dd>
              </div>
            ) : null}
          </dl>
          {active && !canFinish ? (
            <p className="mt-3 text-xs text-ink-400">
              Take {minTurnsForReport - userTurns} more turn
              {minTurnsForReport - userTurns === 1 ? '' : 's'} to unlock your feedback report.
            </p>
          ) : null}
        </div>

        {simulated ? (
          <p className="rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
            You are talking to the built-in simulated partner, not a live AI provider.
          </p>
        ) : null}
      </aside>
    </div>
  )
}

function PartnerBubble({
  message,
  personaName,
  speaking,
  loading,
  onSpeak,
}: {
  message: ChatMessage
  personaName: string
  speaking: boolean
  loading: boolean
  onSpeak: () => void
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
        aria-hidden
      >
        {personaName.slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-tl-sm bg-ink-50 px-3.5 py-2.5">
          <p className="whitespace-pre-line text-sm leading-relaxed text-navy-900">{message.content}</p>
        </div>
        <button
          type="button"
          onClick={onSpeak}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-400 transition-colors hover:text-brand-600"
          aria-label={speaking ? `Stop reading ${personaName}'s message` : `Read ${personaName}'s message aloud`}
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : speaking ? (
            <CircleStop className="size-3.5" aria-hidden />
          ) : (
            <Volume2 className="size-3.5" aria-hidden />
          )}
          {speaking ? 'Stop' : 'Listen'}
        </button>
      </div>
    </div>
  )
}

function StudentBubble({ message }: { message: ChatMessage }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-brand-600 px-3.5 py-2.5">
        <p className="whitespace-pre-line text-sm leading-relaxed text-white">{message.content}</p>
      </div>

      {message.transcribed ? (
        <p className="text-[11px] text-ink-400">Transcribed from your recording</p>
      ) : null}

      {message.correction ? (
        <div className="max-w-[85%] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
            <Wand2 className="size-3" aria-hidden />
            A more natural way to say it
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-900">{message.correction}</p>
          {message.correctionNote ? (
            <p className="mt-1 text-xs text-amber-800/80">{message.correctionNote}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
