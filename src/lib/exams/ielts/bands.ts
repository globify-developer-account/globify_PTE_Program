import type { IeltsVariant, PteSection } from '@prisma/client'

/**
 * IELTS band arithmetic.
 *
 * Every band the platform reports is produced here. The rules below are not
 * ordinary rounding and not an ordinary average, and getting either wrong
 * hands a student a band the real test would not have given them:
 *
 *  - A mean ending in .25 rounds UP to the half band; one ending in .75 rounds
 *    UP to the whole band. `Math.round(x * 2) / 2` gets the .25 case wrong.
 *  - Writing weights Task 2 twice as heavily as Task 1.
 *  - Reading and Listening bands come from a raw-score lookup, not a model,
 *    and the Reading table differs between Academic and General Training.
 *
 * The raw-score tables are indicative. Official conversions vary slightly by
 * test version, so anything shown to a student must be framed as an estimate —
 * see /ai-disclaimer for the wording the platform already uses.
 */

export const BAND_MIN = 0
export const BAND_MAX = 9

/** Bands are reported in half steps, so 0, 0.5, 1 … 9. */
export const BAND_STEP = 0.5

/** Guards against binary floating point turning 6.25 into 6.249999999999999. */
const EPSILON = 1e-9

export function isBand(value: number): boolean {
  if (!Number.isFinite(value)) return false
  if (value < BAND_MIN || value > BAND_MAX) return false
  return Math.abs(value / BAND_STEP - Math.round(value / BAND_STEP)) < EPSILON
}

export function clampBand(value: number): number {
  if (!Number.isFinite(value)) return BAND_MIN
  return Math.min(BAND_MAX, Math.max(BAND_MIN, value))
}

/**
 * The IELTS rounding rule. A fraction below .25 rounds down to the whole band,
 * below .75 rounds to the half band, and .75 or above rounds up to the next
 * whole band.
 */
export function roundToHalfBand(mean: number): number {
  const clamped = clampBand(mean)
  const whole = Math.floor(clamped + EPSILON)
  const frac = clamped - whole
  if (frac < 0.25 - EPSILON) return whole
  if (frac < 0.75 - EPSILON) return whole + 0.5
  return Math.min(BAND_MAX, whole + 1)
}

/**
 * Mean of the four assessment criteria for a single Speaking or Writing task.
 * Criteria are reported as whole or half bands, so the mean is rounded the
 * same way an overall band is.
 */
export function criteriaBand(criteria: number[]): number {
  const usable = criteria.filter((value) => Number.isFinite(value))
  if (usable.length === 0) return BAND_MIN
  const mean = usable.reduce((sum, value) => sum + clampBand(value), 0) / usable.length
  return roundToHalfBand(mean)
}

/**
 * The Writing section band. Task 2 carries twice the weight of Task 1 because
 * it is twice the length and carries twice the marks. When a student has only
 * attempted one task, that task's band stands on its own rather than being
 * averaged against a zero the student never earned.
 */
export function writingSectionBand(task1: number | null, task2: number | null): number {
  const hasTask1 = task1 !== null && Number.isFinite(task1)
  const hasTask2 = task2 !== null && Number.isFinite(task2)

  if (hasTask1 && hasTask2) {
    return roundToHalfBand((clampBand(task1) + clampBand(task2) * 2) / 3)
  }
  if (hasTask2) return roundToHalfBand(clampBand(task2))
  if (hasTask1) return roundToHalfBand(clampBand(task1))
  return BAND_MIN
}

/**
 * The overall band: the mean of the four section bands, rounded to the nearest
 * half band. Sections the student has not sat are excluded rather than counted
 * as zero, so a partial mock still reports something meaningful.
 */
export function overallBand(sections: {
  speaking?: number | null
  writing?: number | null
  reading?: number | null
  listening?: number | null
}): number {
  const values = [sections.speaking, sections.writing, sections.reading, sections.listening].filter(
    (value): value is number => value !== null && value !== undefined && Number.isFinite(value),
  )
  if (values.length === 0) return BAND_MIN
  const mean = values.reduce((sum, value) => sum + clampBand(value), 0) / values.length
  return roundToHalfBand(mean)
}

// -----------------------------------------------------------------------------
// The normalised 0-90 currency
//
// Score.overall stays on the 10-90 scale for every exam so that Progress, the
// charts and the recommendation engine have one comparable number to read.
// For IELTS rows the band is authoritative and `overall` is derived from it.
// -----------------------------------------------------------------------------

const NORMALISED_MIN = 10
const NORMALISED_MAX = 90

export function bandToNormalized(band: number): number {
  const ratio = clampBand(band) / BAND_MAX
  return Math.round(NORMALISED_MIN + ratio * (NORMALISED_MAX - NORMALISED_MIN))
}

export function normalizedToBand(overall: number): number {
  const clamped = Math.min(NORMALISED_MAX, Math.max(NORMALISED_MIN, overall))
  const ratio = (clamped - NORMALISED_MIN) / (NORMALISED_MAX - NORMALISED_MIN)
  return roundToHalfBand(ratio * BAND_MAX)
}

// -----------------------------------------------------------------------------
// Raw score to band
// -----------------------------------------------------------------------------

/** Reading and Listening are both 40-item sections. */
export const ITEMS_PER_SECTION = 40

interface BandRow {
  /** Minimum number of correct answers that earns this band. */
  min: number
  band: number
}

/** Listening is the same test for Academic and General Training. */
const LISTENING_TABLE: BandRow[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 32, band: 7.5 },
  { min: 30, band: 7 },
  { min: 26, band: 6.5 },
  { min: 23, band: 6 },
  { min: 18, band: 5.5 },
  { min: 16, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 6, band: 3.5 },
  { min: 4, band: 3 },
  { min: 3, band: 2.5 },
  { min: 2, band: 2 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
]

const ACADEMIC_READING_TABLE: BandRow[] = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 13, band: 4.5 },
  { min: 10, band: 4 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
  { min: 3, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
]

/**
 * General Training Reading is marked on a noticeably stricter curve — band 6
 * needs 30 correct here against 23 on the Academic paper. This is the reason
 * the lookup is keyed by variant and not by section alone.
 */
const GENERAL_READING_TABLE: BandRow[] = [
  { min: 40, band: 9 },
  { min: 39, band: 8.5 },
  { min: 37, band: 8 },
  { min: 36, band: 7.5 },
  { min: 34, band: 7 },
  { min: 32, band: 6.5 },
  { min: 30, band: 6 },
  { min: 27, band: 5.5 },
  { min: 23, band: 5 },
  { min: 19, band: 4.5 },
  { min: 15, band: 4 },
  { min: 12, band: 3.5 },
  { min: 9, band: 3 },
  { min: 6, band: 2.5 },
  { min: 4, band: 2 },
  { min: 2, band: 1.5 },
  { min: 1, band: 1 },
  { min: 0, band: 0 },
]

function lookup(table: BandRow[], correct: number): number {
  const capped = Math.min(ITEMS_PER_SECTION, Math.max(0, Math.round(correct)))
  for (const row of table) {
    if (capped >= row.min) return row.band
  }
  return BAND_MIN
}

/**
 * Converts a raw 0-40 score into a band. Only Reading and Listening are marked
 * this way; Speaking and Writing are assessed against criteria and never reach
 * this function.
 */
export function rawToBand(
  section: PteSection,
  variant: IeltsVariant | null,
  correct: number,
): number {
  if (section === 'LISTENING') return lookup(LISTENING_TABLE, correct)
  if (section === 'READING') {
    return lookup(variant === 'GENERAL_TRAINING' ? GENERAL_READING_TABLE : ACADEMIC_READING_TABLE, correct)
  }
  throw new Error(`rawToBand does not apply to the ${section} section — it is assessed on criteria.`)
}

/** Formats a band the way IELTS reports it: one decimal place, always. */
export function formatBand(band: number): string {
  return clampBand(band).toFixed(1)
}
