'use client'

import { Meter } from '@/components/charts/score-ring'
import { AiEstimateBadge } from '@/components/dashboard/ai-estimate'
import { cn } from '@/lib/utils'

export interface ReportPayload {
  estimatedScore: number
  fluency: number
  vocabulary: number
  grammar: number
  interaction: number
  summary: string
  strengths: string[]
  improvements: string[]
  nextSteps: string[]
  corrections: Array<{ said: string; better: string; why: string }>
  goalsMet: string[]
  simulated: boolean
}

const TRAITS: Array<{ key: keyof ReportPayload; label: string }> = [
  { key: 'fluency', label: 'Fluency' },
  { key: 'vocabulary', label: 'Vocabulary' },
  { key: 'grammar', label: 'Grammar' },
  { key: 'interaction', label: 'Interaction' },
]

export function ConversationReportCard({ report }: { report: ReportPayload }) {
  return (
    <section className="rounded-xl border border-hairline bg-white p-5" aria-label="Conversation report">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-ink-500">Conversation estimate</p>
          <p className="mt-1 text-[40px] font-semibold leading-none text-navy-900 tabular">
            {report.estimatedScore}
            <span className="ml-1 text-base font-medium text-ink-400">/ 90</span>
          </p>
        </div>
        <AiEstimateBadge />
      </div>

      {report.simulated ? (
        <p className="mt-4 rounded-lg bg-ink-100 p-3 text-xs text-ink-600">
          Produced by the built-in simulated scorer, which measures length, variety and turn-taking rather
          than meaning. It is not a live AI provider.
        </p>
      ) : null}

      <p className="mt-4 text-sm leading-relaxed text-ink-600">{report.summary}</p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {TRAITS.map((trait) => {
          const value = report[trait.key] as number
          return (
            <div key={trait.key}>
              <div className="flex justify-between text-sm">
                <span className="text-ink-600">{trait.label}</span>
                <span className="font-medium text-navy-900 tabular">{value}</span>
              </div>
              <Meter value={value} max={90} className="mt-1.5" height={5} />
            </div>
          )
        })}
      </div>

      <div className="mt-5 space-y-4">
        <Bullets title="What worked" items={report.strengths} tone="good" />
        <Bullets title="What to fix" items={report.improvements} tone="bad" />
        <Bullets title="Next steps" items={report.nextSteps} tone="info" />
      </div>

      {report.corrections.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Things you said</p>
          <ul className="mt-2 space-y-3">
            {report.corrections.map((correction, index) => (
              <li key={index} className="rounded-xl border border-hairline p-3">
                <p className="text-sm text-ink-500 line-through decoration-ink-300">{correction.said}</p>
                <p className="mt-1 text-sm font-medium text-navy-900">{correction.better}</p>
                <p className="mt-1 text-xs text-ink-500">{correction.why}</p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

function Bullets({
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
