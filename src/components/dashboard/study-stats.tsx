import Link from 'next/link'
import { ArrowRight, CalendarClock } from 'lucide-react'
import type { PracticeCounts } from '@/lib/progress'
import { formatDate } from '@/lib/utils'

/**
 * The headline counters: what the learner did today, what they have done in
 * total, and how many days they have shown up.
 *
 * The exam date sits in the header rather than a separate tile because it is
 * the number every other number on this page is measured against.
 */
export function StudyStats({
  counts,
  examDate,
  daysToTest,
}: {
  counts: PracticeCounts
  examDate: Date | null
  daysToTest: number | null
}) {
  return (
    <section
      aria-labelledby="study-stats"
      className="overflow-hidden rounded-xl border border-hairline bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-600 px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm font-medium text-white">
          <CalendarClock className="size-4 shrink-0 text-brand-100" aria-hidden />
          {examDate ? (
            <>
              Exam date: {formatDate(examDate)}
              {daysToTest !== null && daysToTest > 0 ? (
                <span className="text-brand-100"> · {daysToTest} days to go</span>
              ) : null}
            </>
          ) : (
            <span className="text-brand-50">No exam date set</span>
          )}
        </p>
        <Link
          href="/profile"
          className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/25"
        >
          {examDate ? 'Change target' : 'Set target'}
        </Link>
      </div>

      <h2 id="study-stats" className="sr-only">
        Study statistics
      </h2>

      <div className="grid grid-cols-3 divide-x divide-hairline px-2 py-6">
        <Stat value={counts.today} label="Today practised" />
        <Stat value={counts.total} label="Total practised" />
        <Stat value={counts.days} label="Practice days" />
      </div>

      <div className="border-t border-hairline px-5 py-3 text-right">
        <Link
          href="/progress"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Study centre
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="px-2 text-center">
      <p className="text-[32px] font-semibold leading-none tabular-nums text-brand-600">{value}</p>
      <p className="mt-2 text-xs text-ink-500">{label}</p>
    </div>
  )
}
