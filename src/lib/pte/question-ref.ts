import { questionType, typeSlug } from './question-types'

/**
 * Reading and writing the references students use for questions — "RA #677".
 *
 * Kept free of server imports so the search box, the practice player and the
 * admin can all share one definition of what a reference looks like. The
 * allocator that issues the numbers is server-only and lives in ./numbering.
 */

/** Display label for a numbered question. Unnumbered drafts get the code alone. */
export function questionLabel(code: string, typeNumber: number | null): string {
  const definition = questionType(code)
  const short = definition?.shortName ?? code
  return typeNumber === null ? short : `${short} #${typeNumber}`
}

export interface QuestionReference {
  /** Uppercased task short name, or null when the learner typed a bare number. */
  shortName: string | null
  number: number
}

/**
 * Parses a reference a student typed into the search box.
 *
 * Accepts the forms they actually use: "RA 677", "RA#677", "ra #677",
 * "RW-FIB 12" and a bare "677" (which searches every type). Returns null for
 * anything else, so the caller can fall back to a text search over content.
 */
export function parseQuestionReference(input: string): QuestionReference | null {
  const trimmed = input.trim()
  if (trimmed.length === 0) return null

  const match = /^([a-z-]*)\s*#?\s*(\d{1,7})$/i.exec(trimmed)
  if (!match) return null

  const [, rawShort, rawNumber] = match
  // A trailing hyphen ("RA- 12") is a typo rather than a short name, and a
  // leading one would never match a real code either.
  const shortName = rawShort.replace(/^-+|-+$/g, '').toUpperCase()

  const number = Number.parseInt(rawNumber, 10)
  if (!Number.isSafeInteger(number) || number < 1) return null

  return { shortName: shortName.length > 0 ? shortName : null, number }
}

/** Practice URL that opens one specific question. */
export function questionHref(sectionSlug: string, code: string, questionId: string): string {
  return `/practice/${sectionSlug}/${typeSlug(code)}?q=${encodeURIComponent(questionId)}`
}
