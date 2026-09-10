import Link from 'next/link'
import { Check, Clock, Keyboard, Lock, Mic } from 'lucide-react'
import type { DrillCard as DrillCardData, DrillModeProgress } from '@/lib/drills'
import { Badge } from '@/components/ui/badge'
import { cn, formatDuration, pluralize } from '@/lib/utils'

const DIFFICULTY_TONE = {
  EASY: 'success',
  MEDIUM: 'info',
  HARD: 'warning',
} as const

/**
 * One exercise in the library.
 *
 * Both modes are offered from the card rather than behind a detail page: the
 * choice between typing a passage and speaking it is the whole decision a
 * learner makes here, and it should not cost a navigation to make it.
 */
export function DrillCard({ drill, locked }: { drill: DrillCardData; locked: boolean }) {
  const minutes = drill.audioDurationMs ? Math.round(drill.audioDurationMs / 1000) : null

  return (
    <article className="surface-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-navy-900">{drill.title}</h3>
          {drill.description ? (
            <p className="mt-1.5 line-clamp-2 text-sm text-ink-500">{drill.description}</p>
          ) : null}
        </div>
        {drill.isPremium ? (
          <Badge tone={locked ? 'neutral' : 'brand'} size="sm">
            {locked ? <Lock aria-hidden /> : null}
            Premium
          </Badge>
        ) : null}
      </div>

      <ul className="mt-3.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
        {minutes !== null ? (
          <li className="flex items-center gap-1">
            <Clock className="size-3.5 text-ink-400" aria-hidden />
            {formatDuration(minutes)}
          </li>
        ) : null}
        <li>{pluralize(drill.segmentCount, 'line')}</li>
        <li>{pluralize(drill.wordCount, 'word')}</li>
        {drill.accent ? <li>{drill.accent}</li> : null}
      </ul>

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={DIFFICULTY_TONE[drill.difficulty]} size="sm">
          {drill.difficulty.charAt(0) + drill.difficulty.slice(1).toLowerCase()}
        </Badge>
        {drill.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} tone="outline" size="sm">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        <ModeButton
          href={`/drills/${drill.slug}?mode=dictation`}
          label="Dictation"
          icon={<Keyboard className="size-4" aria-hidden />}
          progress={drill.dictation}
          segmentCount={drill.segmentCount}
          locked={locked}
        />
        <ModeButton
          href={`/drills/${drill.slug}?mode=shadowing`}
          label="Shadowing"
          icon={<Mic className="size-4" aria-hidden />}
          progress={drill.shadowing}
          segmentCount={drill.segmentCount}
          locked={locked}
        />
      </div>
    </article>
  )
}

function ModeButton({
  href,
  label,
  icon,
  progress,
  segmentCount,
  locked,
}: {
  href: string
  label: string
  icon: React.ReactNode
  progress: DrillModeProgress | null
  segmentCount: number
  locked: boolean
}) {
  const done = progress?.completedAt != null
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-sm font-medium">
        {done ? <Check className="size-4 text-success" aria-hidden /> : icon}
        {label}
      </span>
      <span className="mt-0.5 text-[11px] text-ink-500 tabular">
        {locked
          ? 'Premium'
          : progress && progress.attempts > 0
            ? `Best ${progress.bestAccuracy}% · ${progress.segmentsCompleted}/${segmentCount}`
            : 'Not started'}
      </span>
    </>
  )

  const className = cn(
    'flex flex-col items-center rounded-lg border px-3 py-2.5 text-center transition-colors',
    locked
      ? 'cursor-not-allowed border-hairline bg-ink-50 text-ink-400'
      : 'border-hairline bg-white text-navy-900 hover:border-brand-200 hover:bg-brand-50/60',
  )

  if (locked) {
    return (
      <span className={className} aria-disabled>
        {body}
      </span>
    )
  }

  return (
    <Link href={href} className={className}>
      {body}
    </Link>
  )
}
