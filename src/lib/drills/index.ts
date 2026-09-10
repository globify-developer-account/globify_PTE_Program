import 'server-only'
import type { Difficulty, DrillMode, Prisma } from '@prisma/client'
import { prisma } from '../db'
import {
  assertPremiumContent,
  assertQuota,
  consumeQuota,
  getEntitlements,
  type Entitlements,
} from '../access'
import { badRequest, notFound } from '../http'
import { storage, resolveMediaUrl } from '../storage'
import { transcriptionProvider } from '../ai'
import {
  accuracyBand,
  diffWords,
  paceVerdict,
  tokenize,
  wordsPerMinute,
  type AccuracyBand,
  type DiffToken,
} from './diff'

/**
 * Dictation & shadowing service.
 *
 * The rule this file exists to enforce: in DICTATION mode the segment text
 * never reaches the browser before an answer has been posted. `toPracticeDrill`
 * is the only path a drill takes to the client, and it nulls the text out — the
 * same discipline `toPublicQuestion` applies to the question bank, for the same
 * reason. SHADOWING sends the text, because reading along *is* the exercise.
 */

export interface DrillModeProgress {
  attempts: number
  bestAccuracy: number
  lastAccuracy: number
  segmentsCompleted: number
  completedAt: Date | null
}

export interface DrillCard {
  id: string
  slug: string
  title: string
  description: string | null
  categorySlug: string
  categoryName: string
  accent: string | null
  difficulty: Difficulty
  isPremium: boolean
  wordCount: number
  segmentCount: number
  audioDurationMs: number | null
  tags: string[]
  /** Null until the learner has attempted the drill in that mode. */
  dictation: DrillModeProgress | null
  shadowing: DrillModeProgress | null
}

export interface PracticeSegment {
  id: string
  order: number
  startMs: number
  endMs: number
  /**
   * Null in DICTATION mode — the answer key is not shipped with the question.
   * The submit endpoint returns it once there is something to compare against.
   */
  text: string | null
}

export interface PracticeDrill {
  id: string
  slug: string
  title: string
  description: string | null
  categoryName: string
  accent: string | null
  difficulty: Difficulty
  isPremium: boolean
  audioUrl: string | null
  audioDurationMs: number | null
  wordCount: number
  /** Whole-transcript reading text. Null in DICTATION mode, for the same reason. */
  transcript: string | null
  segments: PracticeSegment[]
}

export interface DrillFeedback {
  attemptId: string
  mode: DrillMode
  segmentId: string
  accuracy: number
  band: AccuracyBand
  /** Revealed here and only here for a dictation answer. */
  expectedText: string
  /** What was typed, or what the recording was heard as. */
  responseText: string
  tokens: DiffToken[]
  correct: number
  total: number
  wrong: number
  missing: number
  extra: number
  wordsPerMinute: number | null
  pace: 'slow' | 'good' | 'fast' | null
  /** Pace of the reference recording for this segment, when its timing is known. */
  referenceWordsPerMinute: number | null
  /** True when transcription produced nothing — the UI says so plainly. */
  inaudible: boolean
  progress: DrillModeProgress
}

const MODES: DrillMode[] = ['DICTATION', 'SHADOWING']

// --- reading ------------------------------------------------------------------

export async function listDrillCategories() {
  return prisma.drillCategory.findMany({
    where: { drills: { some: { status: 'PUBLISHED' } } },
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      _count: { select: { drills: { where: { status: 'PUBLISHED' } } } },
    },
  })
}

export async function listDrills(
  userId: string,
  options: { categorySlug?: string | null } = {},
): Promise<DrillCard[]> {
  const where: Prisma.DrillWhereInput = { status: 'PUBLISHED' }
  if (options.categorySlug) where.category = { slug: options.categorySlug }

  const [drills, progress] = await Promise.all([
    prisma.drill.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        accent: true,
        difficulty: true,
        isPremium: true,
        wordCount: true,
        audioDurationMs: true,
        tags: true,
        category: { select: { slug: true, name: true } },
        _count: { select: { segments: true } },
      },
    }),
    prisma.drillProgress.findMany({ where: { userId } }),
  ])

  const byDrill = new Map<string, Map<DrillMode, DrillModeProgress>>()
  for (const row of progress) {
    const modes = byDrill.get(row.drillId) ?? new Map<DrillMode, DrillModeProgress>()
    modes.set(row.mode, {
      attempts: row.attempts,
      bestAccuracy: row.bestAccuracy,
      lastAccuracy: row.lastAccuracy,
      segmentsCompleted: row.segmentsCompleted,
      completedAt: row.completedAt,
    })
    byDrill.set(row.drillId, modes)
  }

  return drills.map((drill) => ({
    id: drill.id,
    slug: drill.slug,
    title: drill.title,
    description: drill.description,
    categorySlug: drill.category.slug,
    categoryName: drill.category.name,
    accent: drill.accent,
    difficulty: drill.difficulty,
    isPremium: drill.isPremium,
    wordCount: drill.wordCount,
    segmentCount: drill._count.segments,
    audioDurationMs: drill.audioDurationMs,
    tags: drill.tags,
    dictation: byDrill.get(drill.id)?.get('DICTATION') ?? null,
    shadowing: byDrill.get(drill.id)?.get('SHADOWING') ?? null,
  }))
}

export async function getPracticeDrill(
  slug: string,
  mode: DrillMode,
  entitlements: Entitlements,
): Promise<PracticeDrill> {
  const drill = await prisma.drill.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      accent: true,
      difficulty: true,
      isPremium: true,
      audioUrl: true,
      audioDurationMs: true,
      transcript: true,
      wordCount: true,
      category: { select: { name: true } },
      segments: {
        orderBy: { order: 'asc' },
        select: { id: true, order: true, text: true, startMs: true, endMs: true },
      },
    },
  })
  if (!drill) throw notFound('That exercise does not exist.')

  if (drill.isPremium) {
    await assertPremiumContent(entitlements, `“${drill.title}”`)
  }

  const reveal = mode === 'SHADOWING'

  return {
    id: drill.id,
    slug: drill.slug,
    title: drill.title,
    description: drill.description,
    categoryName: drill.category.name,
    accent: drill.accent,
    difficulty: drill.difficulty,
    isPremium: drill.isPremium,
    audioUrl: await resolveMediaUrl(drill.audioUrl),
    audioDurationMs: drill.audioDurationMs,
    wordCount: drill.wordCount,
    transcript: reveal ? drill.transcript : null,
    segments: drill.segments.map((segment) => ({
      id: segment.id,
      order: segment.order,
      startMs: segment.startMs,
      endMs: segment.endMs,
      text: reveal ? segment.text : null,
    })),
  }
}

export async function getDrillProgress(
  userId: string,
  drillId: string,
): Promise<Record<DrillMode, DrillModeProgress | null>> {
  const rows = await prisma.drillProgress.findMany({ where: { userId, drillId } })
  const result: Record<DrillMode, DrillModeProgress | null> = { DICTATION: null, SHADOWING: null }
  for (const row of rows) {
    result[row.mode] = {
      attempts: row.attempts,
      bestAccuracy: row.bestAccuracy,
      lastAccuracy: row.lastAccuracy,
      segmentsCompleted: row.segmentsCompleted,
      completedAt: row.completedAt,
    }
  }
  return result
}

/** Recent drill work for the dashboard and progress pages. */
export async function recentDrillAttempts(userId: string, take = 5) {
  return prisma.drillAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      mode: true,
      accuracy: true,
      createdAt: true,
      drill: { select: { slug: true, title: true } },
    },
  })
}

// --- submitting ---------------------------------------------------------------

interface SubmitBase {
  userId: string
  drillSlug: string
  segmentId: string
  playCount?: number
  timeSpentSeconds?: number
  entitlements?: Entitlements
}

async function loadSegment(drillSlug: string, segmentId: string, entitlements: Entitlements) {
  const segment = await prisma.drillSegment.findFirst({
    where: { id: segmentId, drill: { slug: drillSlug, status: 'PUBLISHED' } },
    select: {
      id: true,
      text: true,
      startMs: true,
      endMs: true,
      drill: { select: { id: true, title: true, isPremium: true } },
    },
  })
  if (!segment) throw notFound('That exercise line does not exist.')
  if (segment.drill.isPremium) {
    await assertPremiumContent(entitlements, `“${segment.drill.title}”`)
  }
  return segment
}

/**
 * Dictation is scored entirely from text the server already holds, so it costs
 * nothing to serve and is not metered. Shadowing is — see `submitShadowing`.
 */
export async function submitDictation(input: SubmitBase & { text: string }): Promise<DrillFeedback> {
  const entitlements = input.entitlements ?? (await getEntitlements(input.userId))
  const segment = await loadSegment(input.drillSlug, input.segmentId, entitlements)

  const response = input.text.trim()
  if (!response) throw badRequest('Type what you heard before checking your answer.')

  return persistAttempt({
    userId: input.userId,
    drillId: segment.drill.id,
    segmentId: segment.id,
    mode: 'DICTATION',
    expectedText: segment.text,
    responseText: response,
    audioUrl: null,
    audioDurationMs: null,
    segmentDurationMs: segment.endMs - segment.startMs,
    playCount: input.playCount ?? 0,
    timeSpentSeconds: input.timeSpentSeconds ?? 0,
  })
}

/**
 * Shadowing transcribes the learner's recording and compares that.
 *
 * The transcriber is deliberately given no hint. Whisper-style models will bend
 * an ambiguous transcript towards a prompt, and a prompt containing the target
 * sentence would quietly hand back the answer the learner was meant to produce —
 * inflating every score and hiding exactly the mistakes worth hearing about.
 *
 * It consumes the daily practice allowance because it makes a paid AI call.
 */
export async function submitShadowing(
  input: SubmitBase & { audioKey: string; audioDurationMs?: number | null },
): Promise<DrillFeedback> {
  const entitlements = input.entitlements ?? (await getEntitlements(input.userId))
  const segment = await loadSegment(input.drillSlug, input.segmentId, entitlements)

  await assertQuota(input.userId, 'practice', entitlements)

  let transcript = ''
  let durationMs = input.audioDurationMs ?? null
  try {
    const audio = await storage().get(input.audioKey)
    const result = await transcriptionProvider().transcribe({
      audio,
      mimeType: 'audio/webm',
      hint: null,
    })
    transcript = result.data.text
    durationMs = result.data.durationMs ?? durationMs
  } catch (error) {
    console.error('[drills] transcription failed:', error instanceof Error ? error.message : error)
    // An empty transcript scores zero, which is the honest outcome when we could
    // not hear anything. The feedback flags it as inaudible rather than as a
    // bad attempt.
  }

  const feedback = await persistAttempt({
    userId: input.userId,
    drillId: segment.drill.id,
    segmentId: segment.id,
    mode: 'SHADOWING',
    expectedText: segment.text,
    responseText: transcript,
    audioUrl: input.audioKey,
    audioDurationMs: durationMs,
    segmentDurationMs: segment.endMs - segment.startMs,
    playCount: input.playCount ?? 0,
    timeSpentSeconds: input.timeSpentSeconds ?? 0,
  })

  await consumeQuota(input.userId, 'practice')
  return feedback
}

interface PersistInput {
  userId: string
  drillId: string
  segmentId: string
  mode: DrillMode
  expectedText: string
  responseText: string
  audioUrl: string | null
  audioDurationMs: number | null
  segmentDurationMs: number
  playCount: number
  timeSpentSeconds: number
}

async function persistAttempt(input: PersistInput): Promise<DrillFeedback> {
  const diff = diffWords(input.expectedText, input.responseText)
  const spokenWords = tokenize(input.responseText).length
  const wpm = input.mode === 'SHADOWING' ? wordsPerMinute(spokenWords, input.audioDurationMs) : null

  const attempt = await prisma.drillAttempt.create({
    data: {
      userId: input.userId,
      drillId: input.drillId,
      segmentId: input.segmentId,
      mode: input.mode,
      responseText: input.responseText,
      audioUrl: input.audioUrl,
      audioDurationMs: input.audioDurationMs,
      accuracy: diff.accuracy,
      wordsCorrect: diff.correct,
      wordsTotal: diff.total,
      wordsPerMinute: wpm,
      detail: diff.tokens as unknown as Prisma.InputJsonValue,
      playCount: input.playCount,
      timeSpentSeconds: input.timeSpentSeconds,
    },
    select: { id: true },
  })

  await prisma.drill.update({
    where: { id: input.drillId },
    data: { timesAttempted: { increment: 1 } },
  })

  const progress = await rollUpProgress(input.userId, input.drillId, input.mode)

  return {
    attemptId: attempt.id,
    mode: input.mode,
    segmentId: input.segmentId,
    accuracy: diff.accuracy,
    band: accuracyBand(diff.accuracy),
    expectedText: input.expectedText,
    responseText: input.responseText,
    tokens: diff.tokens,
    correct: diff.correct,
    total: diff.total,
    wrong: diff.wrong,
    missing: diff.missing,
    extra: diff.extra,
    wordsPerMinute: wpm,
    pace: paceVerdict(wpm),
    referenceWordsPerMinute:
      input.mode === 'SHADOWING' ? wordsPerMinute(diff.total, input.segmentDurationMs) : null,
    inaudible: input.mode === 'SHADOWING' && spokenWords === 0,
    progress,
  }
}

/**
 * Recomputes the rollup from the attempt history rather than incrementing it.
 * `segmentsCompleted` counts *distinct* segments, which an increment cannot
 * know, and recomputing keeps the cached row honest if an attempt is ever
 * removed.
 */
async function rollUpProgress(
  userId: string,
  drillId: string,
  mode: DrillMode,
): Promise<DrillModeProgress> {
  const [totals, distinctSegments, latest, segmentCount] = await Promise.all([
    prisma.drillAttempt.aggregate({
      where: { userId, drillId, mode },
      _count: { _all: true },
      _max: { accuracy: true },
    }),
    prisma.drillAttempt.findMany({
      where: { userId, drillId, mode, segmentId: { not: null } },
      distinct: ['segmentId'],
      select: { segmentId: true },
    }),
    prisma.drillAttempt.findFirst({
      where: { userId, drillId, mode },
      orderBy: { createdAt: 'desc' },
      select: { accuracy: true },
    }),
    prisma.drillSegment.count({ where: { drillId } }),
  ])

  const segmentsCompleted = distinctSegments.length
  const finished = segmentCount > 0 && segmentsCompleted >= segmentCount
  const counters = {
    attempts: totals._count._all,
    bestAccuracy: totals._max.accuracy ?? 0,
    lastAccuracy: latest?.accuracy ?? 0,
    segmentsCompleted,
  }

  // `update` deliberately leaves completedAt alone: once a drill has been
  // finished the date stands, and re-practising a line must not move it.
  const row = await prisma.drillProgress.upsert({
    where: { userId_drillId_mode: { userId, drillId, mode } },
    create: {
      userId,
      drillId,
      mode,
      ...counters,
      completedAt: finished ? new Date() : null,
    },
    update: { ...counters, lastActivityAt: new Date() },
    select: { completedAt: true },
  })

  let completedAt = row.completedAt
  if (finished && !completedAt) {
    completedAt = new Date()
    await prisma.drillProgress.update({
      where: { userId_drillId_mode: { userId, drillId, mode } },
      data: { completedAt },
    })
  }

  return { ...counters, completedAt }
}

export { MODES as DRILL_MODES }
