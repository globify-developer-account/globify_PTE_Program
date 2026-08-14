import type { AnswerSelection, CorrectAnswer } from './schemas'
import type { QuestionTypeCode } from './question-types'

/**
 * Deterministic scoring for the task types that have an objectively correct
 * answer. AI is never called for these — it would be slower, costlier and less
 * accurate than the marking rules Pearson actually publishes.
 */

export interface RuleScore {
  raw: number
  max: number
  /** 0–90 PTE-style estimate derived from raw/max. */
  scaled: number
  isCorrect: boolean
  breakdown: Record<string, number>
  detail: {
    correctItems: number
    totalItems: number
    /** Per-item verdicts so the review screen can show what went wrong. */
    items: Array<{ key: string; expected: string; given: string; correct: boolean }>
  }
}

/** PTE reports 10–90. A ratio of 0 is a 10, a perfect answer is a 90. */
export function toScaledScore(raw: number, max: number): number {
  if (max <= 0) return 0
  const ratio = Math.min(1, Math.max(0, raw / max))
  return Math.round(10 + ratio * 80)
}

export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\w\s'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function emptyDetail(): RuleScore['detail'] {
  return { correctItems: 0, totalItems: 0, items: [] }
}

function result(raw: number, max: number, detail: RuleScore['detail'], breakdown: Record<string, number> = {}): RuleScore {
  const clampedRaw = Math.max(0, raw)
  return {
    raw: clampedRaw,
    max,
    scaled: toScaledScore(clampedRaw, max),
    isCorrect: max > 0 && clampedRaw >= max,
    breakdown,
    detail,
  }
}

function scoreSingleChoice(correct: CorrectAnswer, selection: AnswerSelection): RuleScore {
  const expected = correct.optionId ?? correct.optionIds?.[0] ?? ''
  const given = selection.optionIds?.[0] ?? ''
  const isRight = Boolean(expected) && expected === given
  return result(isRight ? 1 : 0, 1, {
    correctItems: isRight ? 1 : 0,
    totalItems: 1,
    items: [{ key: 'answer', expected, given, correct: isRight }],
  })
}

/**
 * Multiple answers: +1 for each correct selection, −1 for each incorrect one,
 * never below zero — the published PTE partial-credit rule.
 */
function scoreMultipleChoice(correct: CorrectAnswer, selection: AnswerSelection): RuleScore {
  const expected = new Set(correct.optionIds ?? [])
  const given = selection.optionIds ?? []
  let raw = 0
  const items: RuleScore['detail']['items'] = []

  for (const id of given) {
    const isRight = expected.has(id)
    raw += isRight ? 1 : -1
    items.push({ key: id, expected: isRight ? id : '', given: id, correct: isRight })
  }
  for (const id of expected) {
    if (!given.includes(id)) items.push({ key: id, expected: id, given: '', correct: false })
  }

  const correctCount = given.filter((id) => expected.has(id)).length
  return result(raw, expected.size, { correctItems: correctCount, totalItems: expected.size, items })
}

/** Re-order paragraphs is scored on adjacent pairs, not absolute positions. */
function scoreReorder(correct: CorrectAnswer, selection: AnswerSelection): RuleScore {
  const expected = correct.order ?? []
  const given = selection.order ?? []
  const max = Math.max(0, expected.length - 1)
  if (max === 0) return result(0, 0, emptyDetail())

  let raw = 0
  const items: RuleScore['detail']['items'] = []
  for (let i = 0; i < expected.length - 1; i++) {
    const a = expected[i]!
    const b = expected[i + 1]!
    const givenIndex = given.indexOf(a)
    const pairCorrect = givenIndex !== -1 && given[givenIndex + 1] === b
    if (pairCorrect) raw += 1
    items.push({ key: `pair-${i + 1}`, expected: `${a} → ${b}`, given: givenIndex === -1 ? '' : `${a} → ${given[givenIndex + 1] ?? '—'}`, correct: pairCorrect })
  }
  return result(raw, max, { correctItems: raw, totalItems: max, items })
}

function scoreBlanks(correct: CorrectAnswer, selection: AnswerSelection): RuleScore {
  const expected = correct.blanks ?? {}
  const given = selection.blanks ?? {}
  const keys = Object.keys(expected)
  let raw = 0
  const items: RuleScore['detail']['items'] = []

  for (const key of keys) {
    const want = normalizeText(expected[key] ?? '')
    const got = normalizeText(given[key] ?? '')
    const isRight = want.length > 0 && want === got
    if (isRight) raw += 1
    items.push({ key: `Blank ${key}`, expected: expected[key] ?? '', given: given[key] ?? '', correct: isRight })
  }
  return result(raw, keys.length, { correctItems: raw, totalItems: keys.length, items })
}

/** Highlight Incorrect Words: +1 per correct click, −1 per false positive. */
function scoreHighlight(correct: CorrectAnswer, selection: AnswerSelection): RuleScore {
  const expected = new Set(correct.wordIndexes ?? [])
  const given = selection.wordIndexes ?? []
  let raw = 0
  const items: RuleScore['detail']['items'] = []

  for (const index of given) {
    const isRight = expected.has(index)
    raw += isRight ? 1 : -1
    items.push({ key: `word-${index}`, expected: isRight ? String(index) : '', given: String(index), correct: isRight })
  }
  for (const index of expected) {
    if (!given.includes(index)) items.push({ key: `word-${index}`, expected: String(index), given: '', correct: false })
  }

  const hits = given.filter((index) => expected.has(index)).length
  return result(raw, expected.size, { correctItems: hits, totalItems: expected.size, items })
}

/** Write From Dictation is scored word by word against the target sentence. */
function scoreDictation(correct: CorrectAnswer, text: string): RuleScore {
  const expectedWords = normalizeText(correct.text ?? '').split(' ').filter(Boolean)
  const givenWords = normalizeText(text).split(' ').filter(Boolean)
  if (expectedWords.length === 0) return result(0, 0, emptyDetail())

  const remaining = [...givenWords]
  let raw = 0
  const items: RuleScore['detail']['items'] = []

  for (const word of expectedWords) {
    const at = remaining.indexOf(word)
    const found = at !== -1
    if (found) {
      raw += 1
      remaining.splice(at, 1)
    }
    items.push({ key: word, expected: word, given: found ? word : '', correct: found })
  }

  return result(raw, expectedWords.length, { correctItems: raw, totalItems: expectedWords.length, items }, {
    spelling: toScaledScore(raw, expectedWords.length),
    listening: toScaledScore(raw, expectedWords.length),
  })
}

export interface RuleScoreInput {
  typeCode: QuestionTypeCode | string
  correctAnswer: CorrectAnswer
  selection: AnswerSelection
  text?: string | null
}

/**
 * Returns null when the task type has no objective answer key — those go to
 * the AI scoring pipeline instead.
 */
export function scoreByRules(input: RuleScoreInput): RuleScore | null {
  const { typeCode, correctAnswer, selection } = input
  switch (typeCode) {
    case 'READING_MCQ_SINGLE':
    case 'LISTENING_MCQ_SINGLE':
      return scoreSingleChoice(correctAnswer, selection)
    case 'READING_MCQ_MULTIPLE':
    case 'LISTENING_MCQ_MULTIPLE':
      return scoreMultipleChoice(correctAnswer, selection)
    case 'REORDER_PARAGRAPHS':
      return scoreReorder(correctAnswer, selection)
    case 'READING_FILL_BLANKS':
    case 'READING_WRITING_FILL_BLANKS':
    case 'LISTENING_FILL_BLANKS':
      return scoreBlanks(correctAnswer, selection)
    case 'HIGHLIGHT_INCORRECT_WORDS':
      return scoreHighlight(correctAnswer, selection)
    case 'WRITE_FROM_DICTATION':
      return scoreDictation(correctAnswer, input.text ?? '')
    default:
      return null
  }
}

/**
 * Cheap similarity used to sanity-check a Speaking transcript against the text
 * the student was asked to read, before any AI call is made.
 */
export function contentOverlap(expected: string, actual: string): number {
  const want = normalizeText(expected).split(' ').filter(Boolean)
  const got = new Set(normalizeText(actual).split(' ').filter(Boolean))
  if (want.length === 0) return 0
  const hits = want.filter((word) => got.has(word)).length
  return hits / want.length
}
