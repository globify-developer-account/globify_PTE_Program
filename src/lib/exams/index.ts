import type { Exam, ScoreScale } from '@prisma/client'
import { formatBand } from './ielts/bands'

/**
 * The exam registry.
 *
 * Anything that needs to know "which exam is this and how is it reported"
 * asks here rather than branching on an enum inline. The single most important
 * export is `formatScore` — it is the one place a raw number becomes something
 * a student reads, which is what stops a band leaking into a 10-90 label or
 * the reverse.
 */

export const EXAMS: Exam[] = ['PTE', 'IELTS']

export const EXAM_META: Record<
  Exam,
  {
    label: string
    /** Full name, for page titles and marketing copy. */
    longLabel: string
    slug: string
    scale: ScoreScale
    /** What a score is called in this exam's own vocabulary. */
    scoreNoun: string
    blurb: string
  }
> = {
  PTE: {
    label: 'PTE',
    longLabel: 'PTE Academic',
    slug: 'pte',
    scale: 'PTE_10_90',
    scoreNoun: 'score',
    blurb: 'Pearson Test of English Academic, reported 10 to 90.',
  },
  IELTS: {
    label: 'IELTS',
    longLabel: 'IELTS',
    slug: 'ielts',
    scale: 'IELTS_BAND',
    scoreNoun: 'band',
    blurb: 'International English Language Testing System, reported as bands 0 to 9.',
  },
}

export function examFromSlug(slug: string): Exam | null {
  const match = EXAMS.find((exam) => EXAM_META[exam].slug === slug.toLowerCase())
  return match ?? null
}

export function scaleForExam(exam: Exam): ScoreScale {
  return EXAM_META[exam].scale
}

export function examForScale(scale: ScoreScale): Exam {
  return scale === 'IELTS_BAND' ? 'IELTS' : 'PTE'
}

/**
 * Renders a stored score the way its own exam reports it.
 *
 * `Score.overall` is the normalised 0-90 number every exam carries so the
 * charts and progress rollups have one comparable value. For an IELTS row the
 * band is authoritative, so it is preferred whenever it is present and the
 * normalised score is only a fallback for rows written before the band was
 * recorded.
 */
export function formatScore(
  scale: ScoreScale,
  score: { overall: number; band?: number | null },
): string {
  if (scale === 'IELTS_BAND') {
    const band = score.band ?? normalizedToBandFallback(score.overall)
    return formatBand(band)
  }
  return String(Math.round(score.overall))
}

/** The label that belongs next to a formatted score, e.g. "Band 7.0". */
export function scoreLabel(scale: ScoreScale, score: { overall: number; band?: number | null }): string {
  const value = formatScore(scale, score)
  return scale === 'IELTS_BAND' ? `Band ${value}` : value
}

/**
 * Deliberately local rather than imported from ielts/bands so that PTE code
 * paths never pull the IELTS tables in. Kept in step with `normalizedToBand`.
 */
function normalizedToBandFallback(overall: number): number {
  const clamped = Math.min(90, Math.max(10, overall))
  const ratio = (clamped - 10) / 80
  const raw = ratio * 9
  const whole = Math.floor(raw + 1e-9)
  const frac = raw - whole
  if (frac < 0.25 - 1e-9) return whole
  if (frac < 0.75 - 1e-9) return whole + 0.5
  return Math.min(9, whole + 1)
}
