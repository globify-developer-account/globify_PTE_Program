import Link from 'next/link'
import { CalendarClock, Clock, Video } from 'lucide-react'
import type { LiveClassKind } from '@prisma/client'
import { EmptyState } from '@/components/ui/states'
import { requireStudent } from '@/lib/auth/guards'
import { CLASS_KIND_LABEL, getUpcomingClasses, type UpcomingClass } from '@/lib/classes'
import { pageMetadata } from '@/lib/metadata'
import { cn } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Live Classes',
  description: 'Lectures and practice sessions with a Globify instructor.',
  path: '/classes',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const KINDS = Object.keys(CLASS_KIND_LABEL) as LiveClassKind[]

function parseKind(value: string | undefined): LiveClassKind | undefined {
  const upper = value?.toUpperCase()
  return KINDS.find((candidate) => candidate === upper)
}

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>
}) {
  const { kind: rawKind } = await searchParams
  const kind = parseKind(rawKind)

  const user = await requireStudent('/classes')
  const timezone = user.profile?.timezone ?? 'Asia/Karachi'
  const all = await getUpcomingClasses(user.id, 50)
  const classes = kind ? all.filter((entry) => entry.kind === kind) : all

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Live classes</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Lectures and practice sessions with an instructor. Times are shown in{' '}
            <span className="font-medium text-ink-600">{timezone.replace(/_/g, ' ')}</span> — change
            it in your{' '}
            <Link href="/profile" className="font-medium text-brand-600 hover:text-brand-700">
              profile
            </Link>
            .
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/classes" label="All" active={kind === undefined} />
        {KINDS.map((candidate) => (
          <FilterChip
            key={candidate}
            href={`/classes?kind=${candidate.toLowerCase()}`}
            label={CLASS_KIND_LABEL[candidate]}
            active={kind === candidate}
          />
        ))}
      </div>

      {classes.length === 0 ? (
        <EmptyState
          icon={<CalendarClock aria-hidden />}
          title="No classes scheduled"
          description={
            kind
              ? 'Nothing of this kind is on the calendar right now. Try another filter.'
              : 'New sessions are announced every week. In the meantime, keep practising.'
          }
          action={{ label: 'Go to practice', href: '/practice' }}
        />
      ) : (
        <ul className="space-y-3">
          {classes.map((entry) => (
            <ClassCard key={entry.id} entry={entry} timezone={timezone} />
          ))}
        </ul>
      )}
    </div>
  )
}

function FilterChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-brand-200 bg-brand-50 text-brand-700'
          : 'border-hairline bg-white text-ink-600 hover:border-brand-200 hover:text-brand-700',
      )}
    >
      {label}
    </Link>
  )
}

function ClassCard({ entry, timezone }: { entry: UpcomingClass; timezone: string }) {
  const full = entry.seatsLeft === 0 && !entry.booked

  return (
    <li
      className={cn(
        'flex flex-wrap items-center gap-4 rounded-xl border bg-white p-5',
        entry.isLive ? 'border-brand-200 bg-brand-50/40' : 'border-hairline',
      )}
    >
      <div className="w-16 shrink-0 text-center">
        {entry.isLive ? (
          <span className="inline-flex items-center rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-bold uppercase text-white">
            Live now
          </span>
        ) : (
          <>
            <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">
              {formatIn(entry.startsAt, timezone, { month: 'short' })}
            </p>
            <p className="text-2xl font-semibold leading-tight tabular-nums text-navy-900">
              {formatIn(entry.startsAt, timezone, { day: 'numeric' })}
            </p>
            <p className="text-[11px] text-ink-400">
              {formatIn(entry.startsAt, timezone, { weekday: 'short' })}
            </p>
          </>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-navy-900">{entry.title}</p>
        <p className="mt-1 text-sm text-ink-500">with {entry.instructorName}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {formatRange(entry.startsAt, entry.endsAt, timezone)}
          </span>
          <span className="inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-600">
            <Video className="size-3" aria-hidden />
            {CLASS_KIND_LABEL[entry.kind]}
          </span>
          {entry.isPremium ? (
            <span className="rounded bg-brand-50 px-1.5 py-0.5 font-medium text-brand-700">
              Premium
            </span>
          ) : (
            <span className="rounded bg-success/10 px-1.5 py-0.5 font-medium text-success">Free</span>
          )}
          {entry.seatsLeft !== null ? (
            <span className={cn(entry.seatsLeft <= 5 && 'font-medium text-warning')}>
              {entry.seatsLeft === 0 ? 'Full' : `${entry.seatsLeft} seats left`}
            </span>
          ) : null}
        </p>
      </div>

      <Link
        href={`/classes/${entry.slug}`}
        aria-disabled={full || undefined}
        className={cn(
          'shrink-0 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
          entry.booked
            ? 'bg-brand-50 text-brand-700 hover:bg-brand-100'
            : full
              ? 'pointer-events-none bg-ink-100 text-ink-400'
              : 'bg-brand-600 text-white hover:bg-brand-700',
        )}
      >
        {entry.booked ? (entry.isLive ? 'Join now' : 'Booked') : full ? 'Full' : 'Reserve seat'}
      </Link>
    </li>
  )
}

function formatIn(date: Date, timeZone: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).format(date)
}

function formatRange(start: Date, end: Date, timeZone: string): string {
  const time: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: false }
  return `${formatIn(start, timeZone, time)}–${formatIn(end, timeZone, time)}`
}
