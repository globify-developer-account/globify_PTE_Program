import Link from 'next/link'
import { Heart, MessageSquareText, MessagesSquare, Pin } from 'lucide-react'
import type { CirclePostCategory } from '@prisma/client'
import { EmptyState } from '@/components/ui/states'
import { ButtonLink } from '@/components/ui/button'
import { requireStudent } from '@/lib/auth/guards'
import { CIRCLE_CATEGORY_LABEL, getCircleFeed, type CircleFeedPost } from '@/lib/circle'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { cn, formatDate, initials } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Circle',
  description: 'Exam experiences, question predictions and study tips from other test takers.',
  path: '/circle',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const CATEGORIES = Object.keys(CIRCLE_CATEGORY_LABEL) as CirclePostCategory[]

function parseCategory(value: string | undefined): CirclePostCategory | undefined {
  const upper = value?.toUpperCase()
  return CATEGORIES.find((candidate) => candidate === upper)
}

export default async function CirclePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category: rawCategory } = await searchParams
  const category = parseCategory(rawCategory)

  const user = await requireStudent('/circle')
  const posts = await getCircleFeed(user.id, { category })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Circle</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            What other test takers are seeing in the exam, and what worked for them.
          </p>
        </div>
        <ButtonLink href="/circle/new">
          <MessagesSquare aria-hidden />
          Share a post
        </ButtonLink>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip href="/circle" label="All" active={category === undefined} />
        {CATEGORIES.map((candidate) => (
          <FilterChip
            key={candidate}
            href={`/circle?category=${candidate.toLowerCase()}`}
            label={CIRCLE_CATEGORY_LABEL[candidate]}
            active={category === candidate}
          />
        ))}
      </div>

      {posts.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare aria-hidden />}
          title={category ? 'Nothing here yet' : 'Circle is just getting started'}
          description={
            category
              ? 'No posts in this category so far. Be the first to write one.'
              : 'Share what you saw in your exam, or an approach that moved your score.'
          }
          action={{ label: 'Write a post', href: '/circle/new' }}
        />
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}

      <p className="rounded-xl border border-hairline bg-white px-5 py-4 text-xs leading-relaxed text-ink-500">
        Posts here are written by other students, not by Globify. Treat question predictions as
        study prompts rather than guarantees — Pearson rotates the live question bank, and no
        prediction list is complete or verified.
      </p>
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

function PostCard({ post }: { post: CircleFeedPost }) {
  return (
    <li>
      <Link
        href={`/circle/${post.id}`}
        className="block rounded-xl border border-hairline bg-white p-5 transition-colors hover:border-brand-200"
      >
        <div className="flex items-center gap-2.5">
          {post.authorAvatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.authorAvatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-200 text-[11px] font-semibold text-ink-600">
              {initials(post.authorName)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-navy-900">{post.authorName}</p>
            <p className="text-xs text-ink-400">{formatDate(post.createdAt)}</p>
          </div>
          {post.isPinned ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-1 text-[10px] font-semibold text-brand-700">
              <Pin className="size-3" aria-hidden />
              Pinned
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-navy-900">{post.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{post.excerpt}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="rounded bg-ink-100 px-2 py-1 text-[11px] font-medium text-ink-600">
            {CIRCLE_CATEGORY_LABEL[post.category]}
          </span>
          {post.section ? (
            <span
              className="rounded px-2 py-1 text-[11px] font-medium"
              style={{
                backgroundColor: `${SECTION_META[post.section].color}1a`,
                color: SECTION_META[post.section].color,
              }}
            >
              {SECTION_META[post.section].label}
            </span>
          ) : null}
          {post.reportedScore !== null ? (
            <span className="rounded bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
              Scored {post.reportedScore}
            </span>
          ) : null}
          {post.examDate ? (
            <span className="text-[11px] text-ink-500">Sat {formatDate(post.examDate)}</span>
          ) : null}

          <span className="ml-auto flex items-center gap-3.5 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1">
              <Heart
                className={cn('size-3.5', post.liked && 'fill-danger text-danger')}
                aria-hidden
              />
              {post.likeCount}
            </span>
            <span className="inline-flex items-center gap-1">
              <MessageSquareText className="size-3.5" aria-hidden />
              {post.commentCount}
            </span>
          </span>
        </div>
      </Link>
    </li>
  )
}
