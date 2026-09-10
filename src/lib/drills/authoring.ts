import 'server-only'
import { prisma } from '../db'
import { badRequest } from '../http'
import { tokenize } from './diff'
import type { DrillInput } from '../admin/drill-schema'

/**
 * Writes shared by the create and update endpoints.
 *
 * Segments are reconciled by position rather than deleted and re-created: a
 * DrillAttempt points at the segment it answered, and rewriting the rows on
 * every save would strand a learner's history the first time an admin fixed a
 * typo.
 */

export function drillFields(input: DrillInput) {
  return {
    slug: input.slug,
    title: input.title,
    description: input.description?.trim() || null,
    categoryId: input.categoryId,
    audioUrl: input.audioUrl,
    audioDurationMs: input.audioDurationMs ?? null,
    transcript: input.transcript,
    accent: input.accent?.trim() || null,
    wordCount: tokenize(input.transcript).length,
    difficulty: input.difficulty,
    status: input.status,
    isPremium: input.isPremium,
    tags: input.tags,
    displayOrder: input.displayOrder,
  }
}

export async function assertCategoryExists(categoryId: string): Promise<void> {
  const category = await prisma.drillCategory.findUnique({
    where: { id: categoryId },
    select: { id: true },
  })
  if (!category) throw badRequest('That category does not exist.')
}

export async function syncSegments(drillId: string, segments: DrillInput['segments']): Promise<void> {
  const existing = await prisma.drillSegment.findMany({
    where: { drillId },
    orderBy: { order: 'asc' },
    select: { id: true, order: true },
  })

  const byOrder = new Map(existing.map((segment) => [segment.order, segment.id]))

  await prisma.$transaction([
    // Surplus lines go first, so a shortened drill cannot collide with the
    // unique (drillId, order) index while the rest are being rewritten.
    prisma.drillSegment.deleteMany({ where: { drillId, order: { gte: segments.length } } }),
    ...segments.map((segment, index) => {
      const id = byOrder.get(index)
      const data = { text: segment.text, startMs: segment.startMs, endMs: segment.endMs }
      return id
        ? prisma.drillSegment.update({ where: { id }, data })
        : prisma.drillSegment.create({ data: { ...data, drillId, order: index } })
    }),
  ])
}
