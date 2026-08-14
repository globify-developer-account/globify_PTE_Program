import Link from 'next/link'
import { ArrowRight, Minus, TrendingDown, TrendingUp } from 'lucide-react'
import type { PteSection } from '@prisma/client'
import { SECTION_META } from '@/lib/pte/question-types'
import { cn } from '@/lib/utils'
import { Meter } from '@/components/charts/score-ring'

export interface SectionScore {
  section: PteSection
  score: number
  previousScore: number | null
  attempts: number
}

export function ScoreCard({ data, target }: { data: SectionScore; target: number }) {
  const meta = SECTION_META[data.section]
  const delta = data.previousScore === null ? null : data.score - data.previousScore
  const TrendIcon = delta === null || delta === 0 ? Minus : delta > 0 ? TrendingUp : TrendingDown

  return (
    <div className="surface-card group flex flex-col p-5 transition-shadow hover:shadow-lift">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
          {meta.label}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-medium',
            delta === null || delta === 0 ? 'text-ink-400' : delta > 0 ? 'text-green-700' : 'text-danger',
          )}
        >
          <TrendIcon className="size-3.5" aria-hidden />
          {delta === null ? 'New' : delta === 0 ? 'No change' : `${delta > 0 ? '+' : ''}${delta}`}
        </span>
      </div>

      <p className="mt-3 text-[32px] font-semibold leading-none text-navy-900">
        {data.attempts === 0 ? '—' : data.score}
      </p>
      <p className="mt-1.5 text-xs text-ink-500">
        {data.attempts === 0
          ? 'No attempts yet'
          : data.previousScore === null
            ? `${data.attempts} attempt${data.attempts === 1 ? '' : 's'}`
            : `Previously ${data.previousScore} · ${data.attempts} attempts`}
      </p>

      <Meter
        value={data.attempts === 0 ? 0 : data.score}
        max={target}
        color={meta.color}
        trackColor="var(--color-ink-100)"
        className="mt-4"
        height={6}
      />

      <Link
        href={`/practice/${meta.slug}`}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        Practise {meta.label}
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </div>
  )
}
