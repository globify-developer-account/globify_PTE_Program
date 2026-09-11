import 'server-only'
import type { LiveClassKind } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface UpcomingClass {
  id: string
  slug: string
  title: string
  kind: LiveClassKind
  instructorName: string
  startsAt: Date
  endsAt: Date
  isPremium: boolean
  /** True while the class is running, which the schedule shows as "Now". */
  isLive: boolean
  /** Set when this learner already holds a booking. */
  booked: boolean
  seatsLeft: number | null
}

/**
 * The next few classes, newest first.
 *
 * A class that has started but not finished is still "upcoming" — it is the
 * one a learner most wants to see, because they can still join it. That is why
 * the window opens at `endsAt` rather than `startsAt`.
 */
export async function getUpcomingClasses(userId: string, take = 4): Promise<UpcomingClass[]> {
  const now = new Date()

  const rows = await prisma.liveClass.findMany({
    where: { status: 'PUBLISHED', endsAt: { gte: now } },
    orderBy: { startsAt: 'asc' },
    take,
    select: {
      id: true,
      slug: true,
      title: true,
      kind: true,
      instructorName: true,
      startsAt: true,
      endsAt: true,
      isPremium: true,
      capacity: true,
      bookings: {
        where: { userId, status: { in: ['RESERVED', 'ATTENDED'] } },
        select: { id: true },
        take: 1,
      },
      _count: { select: { bookings: { where: { status: { in: ['RESERVED', 'ATTENDED'] } } } } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    instructorName: row.instructorName,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    isPremium: row.isPremium,
    isLive: row.startsAt <= now && row.endsAt >= now,
    booked: row.bookings.length > 0,
    seatsLeft: row.capacity === null ? null : Math.max(0, row.capacity - row._count.bookings),
  }))
}

export const CLASS_KIND_LABEL: Record<LiveClassKind, string> = {
  LIVE_CLASS: 'Live Class',
  LECTURE: 'Lecture',
  PRACTICE_SESSION: 'Practice Session',
  WORKSHOP: 'Workshop',
}
