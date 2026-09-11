import Link from 'next/link'
import { ArrowRight, Clock, Video } from 'lucide-react'
import { CLASS_KIND_LABEL, type UpcomingClass } from '@/lib/classes'
import { cn } from '@/lib/utils'

/**
 * The class schedule beside the study stats.
 *
 * Every time here is rendered in the learner's own timezone. The zone is shown
 * in the header rather than assumed, because this platform's students are
 * spread across several and a class time that silently means something else is
 * a missed class.
 */
export function UpcomingClasses({
  classes,
  timezone,
}: {
  classes: UpcomingClass[]
  timezone: string
}) {
  return (
    <section
      aria-labelledby="upcoming-classes"
      className="flex flex-col overflow-hidden rounded-xl border border-hairline bg-white"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-5 py-3.5">
        <h2 id="upcoming-classes" className="text-[15px] font-semibold text-navy-900">
          Upcoming classes
        </h2>
        <p className="text-xs text-ink-500">
          Times in <span className="font-medium text-ink-600">{timezone.replace(/_/g, ' ')}</span>
        </p>
      </div>

      {classes.length === 0 ? (
        <p className="flex-1 px-5 py-8 text-center text-sm text-ink-500">
          No classes scheduled right now. New sessions are announced every week.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-hairline">
          {classes.map((entry) => (
            <ClassRow key={entry.id} entry={entry} timezone={timezone} />
          ))}
        </ul>
      )}

      <div className="border-t border-hairline px-5 py-3 text-right">
        <Link
          href="/classes"
          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          All classes
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </section>
  )
}

function ClassRow({ entry, timezone }: { entry: UpcomingClass; timezone: string }) {
  const full = entry.seatsLeft === 0 && !entry.booked

  return (
    <li className={cn('flex items-center gap-3 px-4 py-3', entry.isLive && 'bg-brand-50/50')}>
      <div className="w-12 shrink-0 text-center">
        {entry.isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
            Now
          </span>
        ) : (
          <>
            <p className="text-[10px] font-medium uppercase tracking-wide text-ink-400">
              {formatIn(entry.startsAt, timezone, { month: 'short' })}
            </p>
            <p className="text-lg font-semibold leading-tight tabular-nums text-navy-900">
              {formatIn(entry.startsAt, timezone, { day: 'numeric' })}
            </p>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-navy-900">{entry.title}</p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden />
            {formatRange(entry.startsAt, entry.endsAt, timezone)}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600">
            <Video className="size-3" aria-hidden />
            {CLASS_KIND_LABEL[entry.kind]}
          </span>
          {entry.seatsLeft !== null && entry.seatsLeft <= 5 && !entry.booked ? (
            <span className="font-medium text-warning">
              {entry.seatsLeft === 0 ? 'Full' : `${entry.seatsLeft} seats left`}
            </span>
          ) : null}
        </p>
      </div>

      <Link
        href={`/classes/${entry.slug}`}
        aria-disabled={full || undefined}
        className={cn(
          'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
          entry.booked
            ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
            : full
              ? 'pointer-events-none bg-ink-100 text-ink-400'
              : 'bg-brand-600 text-white hover:bg-brand-700',
        )}
      >
        {entry.booked ? (entry.isLive ? 'Join' : 'Booked') : full ? 'Full' : 'Reserve'}
      </Link>
    </li>
  )
}

/**
 * Formats an instant in a named zone.
 *
 * `Intl` does the conversion, so a zone the server does not run in still
 * renders correctly and daylight-saving transitions are handled for us.
 */
function formatIn(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date)
}

function formatRange(start: Date, end: Date, timeZone: string): string {
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  return `${formatIn(start, timeZone, time)}–${formatIn(end, timeZone, time)}`
}
