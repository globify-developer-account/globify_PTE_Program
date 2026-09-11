import 'server-only'
import type { VocabMode } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface VocabBookCard {
  id: string
  slug: string
  title: string
  description: string | null
  badge: string
  color: string
  modes: VocabMode[]
  isPremium: boolean
  wordCount: number
  /** Words this learner has reached FAMILIAR or MASTERED on. */
  familiarCount: number
  /** 0-100, rounded. Zero when the book has no words yet. */
  percent: number
}

/**
 * The vocab book grid.
 *
 * Familiar counts are fetched in one grouped query rather than per book —
 * the grid renders every book the platform ships, so a per-card query would
 * mean a dozen round trips on a page that is mostly static.
 */
export async function getVocabBooks(userId: string, mode?: VocabMode): Promise<VocabBookCard[]> {
  const [books, progress] = await Promise.all([
    prisma.vocabBook.findMany({
      where: {
        status: 'PUBLISHED',
        ...(mode ? { modes: { has: mode } } : {}),
      },
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        badge: true,
        color: true,
        modes: true,
        isPremium: true,
        wordCount: true,
      },
    }),
    prisma.vocabWordProgress.groupBy({
      by: ['wordId'],
      where: { userId, familiarity: { in: ['FAMILIAR', 'MASTERED'] } },
      _count: true,
    }),
  ])

  // One extra query maps the familiar word ids back to their books. Doing it
  // this way keeps the count accurate when a word belongs to more than one book.
  const familiarWordIds = progress.map((row) => row.wordId)
  const familiarByBook = new Map<string, number>()
  if (familiarWordIds.length > 0) {
    const grouped = await prisma.vocabWord.groupBy({
      by: ['bookId'],
      where: { id: { in: familiarWordIds } },
      _count: true,
    })
    for (const row of grouped) familiarByBook.set(row.bookId, row._count)
  }

  return books.map((book) => {
    const familiarCount = familiarByBook.get(book.id) ?? 0
    return {
      ...book,
      familiarCount,
      percent: book.wordCount === 0 ? 0 : Math.round((familiarCount / book.wordCount) * 100),
    }
  })
}

/** The learner's personal list — words they flagged while practising. */
export async function getSavedVocabCount(userId: string): Promise<number> {
  return prisma.savedVocabWord.count({ where: { userId } })
}

export const VOCAB_MODE_LABEL: Record<VocabMode, string> = {
  READING: 'Reading Mode',
  LISTENING: 'Listening Mode',
}
