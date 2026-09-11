import 'server-only'
import type { WritingTaskKind } from '@prisma/client'
import { prisma } from './db'

/**
 * Reads for the writing improvement library.
 *
 * The library is small and entirely public within the app, so it is loaded in
 * one query and filtered in the browser. That keeps the search box instant and
 * avoids a round trip for every keystroke.
 */

export interface WritingExerciseSummary {
  id: string
  slug: string
  title: string
  category: string
  taskKind: WritingTaskKind
  prompt: string
  passage: string | null
  guidance: string | null
  tags: string[]
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  wordMin: number
  wordMax: number
  minutes: number
  isPremium: boolean
  /** How many times this student has already improved a draft of this exercise. */
  attempts: number
}

export async function listWritingExercises(userId: string): Promise<WritingExerciseSummary[]> {
  const [exercises, attempts] = await Promise.all([
    prisma.writingExercise.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        taskKind: true,
        prompt: true,
        passage: true,
        guidance: true,
        tags: true,
        difficulty: true,
        wordMin: true,
        wordMax: true,
        minutes: true,
        isPremium: true,
      },
    }),
    prisma.writingImprovement.groupBy({
      by: ['exerciseId'],
      where: { userId, exerciseId: { not: null } },
      _count: { _all: true },
    }),
  ])

  const counts = new Map(attempts.map((row) => [row.exerciseId, row._count._all]))

  return exercises.map((exercise) => ({
    ...exercise,
    attempts: counts.get(exercise.id) ?? 0,
  }))
}

export interface RecentImprovement {
  id: string
  title: string
  taskKind: WritingTaskKind
  editCount: number
  wordCount: number
  createdAt: Date
}

/** The student's last few runs, shown so a draft is never lost to a refresh. */
export async function listRecentImprovements(userId: string, take = 5): Promise<RecentImprovement[]> {
  const rows = await prisma.writingImprovement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      taskKind: true,
      editCount: true,
      wordCount: true,
      createdAt: true,
      exercise: { select: { title: true } },
    },
  })

  return rows.map((row) => ({
    id: row.id,
    title: row.exercise?.title ?? 'Your own writing',
    taskKind: row.taskKind,
    editCount: row.editCount,
    wordCount: row.wordCount,
    createdAt: row.createdAt,
  }))
}
