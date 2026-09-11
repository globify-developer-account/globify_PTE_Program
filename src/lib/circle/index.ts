import 'server-only'
import type { CirclePostCategory, PteSection } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface CircleFeedPost {
  id: string
  title: string
  excerpt: string
  category: CirclePostCategory
  section: PteSection | null
  reportedScore: number | null
  examDate: Date | null
  tags: string[]
  likeCount: number
  commentCount: number
  isPinned: boolean
  createdAt: Date
  authorName: string
  authorAvatarUrl: string | null
  /** True when the signed-in learner has already reacted. */
  liked: boolean
}

const EXCERPT_LENGTH = 240

export const CIRCLE_CATEGORY_LABEL: Record<CirclePostCategory, string> = {
  EXAM_EXPERIENCE: 'Exam experience',
  QUESTION_PREDICTION: 'Question predictions',
  STUDY_TIP: 'Study tips',
  SCORE_REPORT: 'Score reports',
  GENERAL: 'General',
}

/**
 * The Circle feed.
 *
 * Pinned posts lead, then newest first. Only PUBLISHED posts are returned —
 * a hidden or removed post stays out of every feed, including its author's,
 * so moderation is not something a reader can route around.
 */
export async function getCircleFeed(
  userId: string,
  options: { category?: CirclePostCategory; take?: number } = {},
): Promise<CircleFeedPost[]> {
  const rows = await prisma.circlePost.findMany({
    where: {
      status: 'PUBLISHED',
      ...(options.category ? { category: options.category } : {}),
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
    take: options.take ?? 20,
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      section: true,
      reportedScore: true,
      examDate: true,
      tags: true,
      likeCount: true,
      commentCount: true,
      isPinned: true,
      createdAt: true,
      author: { select: { name: true, profile: { select: { avatarUrl: true } } } },
      reactions: { where: { userId }, select: { id: true }, take: 1 },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    excerpt: excerpt(row.body),
    category: row.category,
    section: row.section,
    reportedScore: row.reportedScore,
    examDate: row.examDate,
    tags: row.tags,
    likeCount: row.likeCount,
    commentCount: row.commentCount,
    isPinned: row.isPinned,
    createdAt: row.createdAt,
    authorName: row.author.name,
    authorAvatarUrl: row.author.profile?.avatarUrl ?? null,
    liked: row.reactions.length > 0,
  }))
}

/** First couple of lines of a post, cut on a word boundary. */
function excerpt(body: string): string {
  const flat = body.replace(/\s+/g, ' ').trim()
  if (flat.length <= EXCERPT_LENGTH) return flat
  const cut = flat.slice(0, EXCERPT_LENGTH)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`
}
