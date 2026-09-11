import Link from 'next/link'
import { ArrowRight, BookOpen, Headphones, Lock } from 'lucide-react'
import type { VocabMode } from '@prisma/client'
import { EmptyState } from '@/components/ui/states'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { getSavedVocabCount, getVocabBooks, type VocabBookCard } from '@/lib/vocab'
import { pageMetadata } from '@/lib/metadata'
import { cn } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Vocab Books',
  description: 'Build the vocabulary the exam actually tests, one book at a time.',
  path: '/vocab',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const MODES: Array<{ value: VocabMode; label: string; icon: typeof BookOpen; blurb: string }> = [
  {
    value: 'READING',
    label: 'Reading mode',
    icon: BookOpen,
    blurb: 'See the word, recall what it means.',
  },
  {
    value: 'LISTENING',
    label: 'Listening mode',
    icon: Headphones,
    blurb: 'Hear the word, write it correctly.',
  },
]

function parseMode(value: string | undefined): VocabMode {
  return value === 'listening' ? 'LISTENING' : 'READING'
}

export default async function VocabPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode: rawMode } = await searchParams
  const mode = parseMode(rawMode)

  const user = await requireStudent('/vocab')
  const [entitlements, books, savedCount] = await Promise.all([
    getEntitlements(user.id),
    getVocabBooks(user.id, mode),
    getSavedVocabCount(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Vocab books</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Word lists drawn from the task types that reward vocabulary most — dictation, both
          fill-in-the-blanks tasks, and the writing sections.
        </p>
      </div>

      {/* Mode is a URL parameter rather than component state so a learner can
          bookmark the mode they study in. */}
      <div
        role="tablist"
        aria-label="Study mode"
        className="flex flex-wrap gap-2 rounded-xl border border-hairline bg-white p-1.5"
      >
        {MODES.map((entry) => {
          const active = entry.value === mode
          const Icon = entry.icon
          return (
            <Link
              key={entry.value}
              role="tab"
              aria-selected={active}
              href={`/vocab?mode=${entry.value.toLowerCase()}`}
              className={cn(
                'flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-4 py-2.5 transition-colors',
                active ? 'bg-brand-50 text-brand-700' : 'text-ink-600 hover:bg-ink-50',
              )}
            >
              <Icon className={cn('size-4 shrink-0', active ? 'text-brand-600' : 'text-ink-400')} aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{entry.label}</span>
                <span className="block truncate text-xs text-ink-500">{entry.blurb}</span>
              </span>
            </Link>
          )
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <MyListCard count={savedCount} mode={mode} />
        {books.map((book) => (
          <BookCard
            key={book.id}
            book={book}
            mode={mode}
            locked={book.isPremium && !entitlements.isPremium}
          />
        ))}
      </div>

      {books.length === 0 ? (
        <EmptyState
          icon={<BookOpen aria-hidden />}
          title="No books in this mode yet"
          description="Vocabulary books are being prepared. Try the other study mode in the meantime."
          action={{ label: 'Go to practice', href: '/practice' }}
        />
      ) : null}
    </div>
  )
}

/**
 * The learner's own list, which has no VocabBook row because its contents
 * differ per user. It leads the grid because it is the only book on the page
 * made of words they personally struggled with.
 */
function MyListCard({ count, mode }: { count: number; mode: VocabMode }) {
  return (
    <Link
      href={`/vocab/my-list?mode=${mode.toLowerCase()}`}
      className="group flex gap-4 rounded-xl border border-hairline bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
    >
      <Spine badge="My" color="#2e5bff" />
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-navy-900">My vocab list</p>
        <p className="mt-1 text-xs text-ink-500">
          {count === 0 ? 'No words saved yet' : `${count} word${count === 1 ? '' : 's'} saved`}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-600">
          Words you flagged while practising. Save one from any task and it lands here.
        </p>
        <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-600">
          Start learning
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  )
}

function BookCard({
  book,
  mode,
  locked,
}: {
  book: VocabBookCard
  mode: VocabMode
  locked: boolean
}) {
  const body = (
    <>
      <Spine badge={book.badge} color={book.color} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 text-[15px] font-semibold text-navy-900">{book.title}</p>
          <ProgressRing percent={book.percent} />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Familiar {book.familiarCount}/{book.wordCount}
        </p>
        {book.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-600">{book.description}</p>
        ) : null}
        <span
          className={cn(
            'mt-3 inline-flex items-center gap-1 text-xs font-medium',
            locked ? 'text-ink-400' : 'text-brand-600',
          )}
        >
          {locked ? (
            <>
              <Lock className="size-3" aria-hidden />
              Premium book
            </>
          ) : (
            <>
              Start learning
              <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </>
          )}
        </span>
      </div>
    </>
  )

  // A locked book is not a link: sending a free learner to a page that only
  // refuses them is worse than saying so on the card.
  if (locked) {
    return (
      <div className="flex gap-4 rounded-xl border border-hairline bg-white p-5 opacity-75">
        {body}
      </div>
    )
  }

  return (
    <Link
      href={`/vocab/${book.slug}?mode=${mode.toLowerCase()}`}
      className="group flex gap-4 rounded-xl border border-hairline bg-white p-5 transition-colors hover:border-brand-200 hover:bg-brand-50/30"
    >
      {body}
    </Link>
  )
}

/** The book cover: a coloured spine with the list's short code on it. */
function Spine({ badge, color }: { badge: string; color: string }) {
  return (
    <span
      className="relative grid size-14 shrink-0 place-items-center rounded-lg text-sm font-bold uppercase text-white"
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span className="absolute inset-y-0 left-0 w-1.5 rounded-l-lg bg-black/15" />
      {badge}
    </span>
  )
}

/**
 * Familiarity as a ring. The number is printed inside it, so the ring is
 * decoration and the figure is never carried by the arc alone.
 */
function ProgressRing({ percent }: { percent: number }) {
  const size = 38
  const stroke = 3.5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden focusable="false">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-ink-200)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-brand-600)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped / 100)}
        />
      </svg>
      <span className="absolute text-[10px] font-semibold tabular-nums text-ink-600">{clamped}%</span>
    </span>
  )
}
