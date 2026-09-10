/**
 * Word-level comparison behind both drill modes.
 *
 * Dictation compares what was typed against the segment; shadowing compares the
 * transcript of the recording against the same segment. One aligner serves both,
 * which is what makes an accuracy figure comparable across the two modes.
 *
 * `scoreDictation` in src/lib/pte/scoring.ts stays as it is: Write From
 * Dictation is marked on the published PTE rule — a bag of words, order
 * irrelevant, no penalty for extras. That is the right rule for a *score*, and
 * the wrong one for a *lesson*, because it cannot say where the sentence went
 * wrong. This module aligns positionally so the review panel can point at the
 * word that was missed, substituted or invented.
 */

export type TokenStatus = 'correct' | 'wrong' | 'missing' | 'extra'

export interface DiffToken {
  status: TokenStatus
  /** The word from the target text — absent on an `extra`. */
  expected?: string
  /** The word the learner produced — absent on a `missing`. */
  given?: string
}

export interface DiffResult {
  tokens: DiffToken[]
  /** Words matched, in position. */
  correct: number
  /** Words in the target text. */
  total: number
  /** Substituted words: present, but not the right one. */
  wrong: number
  /** Target words with nothing aligned to them. */
  missing: number
  /** Words produced that the target does not contain. */
  extra: number
  /** 0–100. See `accuracyOf` for how extras are treated. */
  accuracy: number
}

/**
 * Comparison form of a word: case, surrounding punctuation and curly quotes are
 * noise here. A learner who hears "don't" and types "dont" has heard it; one who
 * writes "Dont," at the start of a sentence has too.
 *
 * Internal apostrophes and hyphens survive, so "well-known" stays one word and
 * "we're" never collapses into "were".
 */
export function normalizeWord(word: string): string {
  return word
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}'-]/gu, '')
    .replace(/^[-']+|[-']+$/g, '')
}

/** Splits text into display words, dropping anything that is pure punctuation. */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0 && normalizeWord(word).length > 0)
}

/**
 * Accuracy as one minus the word error rate, floored at zero.
 *
 * Every kind of error costs the same, extras included — otherwise typing the
 * whole alphabet after a half-heard sentence would score as well as hearing it,
 * and the number would stop meaning anything.
 */
function accuracyOf(correct: number, total: number, extra: number): number {
  if (total === 0) return 0
  const errors = total - correct + extra
  return Math.max(0, Math.min(100, Math.round(((total - errors) / total) * 100)))
}

type Op = 'match' | 'sub' | 'del' | 'ins'

/**
 * Levenshtein alignment over words.
 *
 * Edit distance rather than a longest-common-subsequence: LCS can only say a
 * word is present or absent, so a near miss ("their" for "there") comes back as
 * a deletion *and* an insertion. Substitution is its own operation here, which
 * is what lets the UI show the two words side by side — the single most useful
 * thing a dictation review can tell someone.
 *
 * Cost is O(n·m) in words. Segments are one sentence, so n and m are ~10–40.
 */
function align(expected: string[], given: string[]): Op[] {
  const n = expected.length
  const m = given.length

  // distance[i][j] = edits turning expected[0..i) into given[0..j)
  const distance: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i++) distance[i]![0] = i
  for (let j = 0; j <= m; j++) distance[0]![j] = j

  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const substitution = distance[i - 1]![j - 1]! + (expected[i - 1] === given[j - 1] ? 0 : 1)
      const deletion = distance[i - 1]![j]! + 1
      const insertion = distance[i]![j - 1]! + 1
      distance[i]![j] = Math.min(substitution, deletion, insertion)
    }
  }

  const ops: Op[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const isMatch = expected[i - 1] === given[j - 1]
      if (distance[i]![j] === distance[i - 1]![j - 1]! + (isMatch ? 0 : 1)) {
        ops.push(isMatch ? 'match' : 'sub')
        i--
        j--
        continue
      }
    }
    // Prefer deletions over insertions on a tie so the target's word order
    // drives the output — the learner is reading it left to right.
    if (i > 0 && distance[i]![j] === distance[i - 1]![j]! + 1) {
      ops.push('del')
      i--
      continue
    }
    ops.push('ins')
    j--
  }

  return ops.reverse()
}

export function diffWords(expectedText: string, givenText: string): DiffResult {
  const expectedDisplay = tokenize(expectedText)
  const givenDisplay = tokenize(givenText)
  const expected = expectedDisplay.map(normalizeWord)
  const given = givenDisplay.map(normalizeWord)

  const tokens: DiffToken[] = []
  let correct = 0
  let wrong = 0
  let missing = 0
  let extra = 0

  let i = 0
  let j = 0
  for (const op of align(expected, given)) {
    switch (op) {
      case 'match':
        tokens.push({ status: 'correct', expected: expectedDisplay[i], given: givenDisplay[j] })
        correct++
        i++
        j++
        break
      case 'sub':
        tokens.push({ status: 'wrong', expected: expectedDisplay[i], given: givenDisplay[j] })
        wrong++
        i++
        j++
        break
      case 'del':
        tokens.push({ status: 'missing', expected: expectedDisplay[i] })
        missing++
        i++
        break
      case 'ins':
        tokens.push({ status: 'extra', given: givenDisplay[j] })
        extra++
        j++
        break
    }
  }

  return {
    tokens,
    correct,
    total: expected.length,
    wrong,
    missing,
    extra,
    accuracy: accuracyOf(correct, expected.length, extra),
  }
}

/** Speaking pace. Returns null when the clip is too short to mean anything. */
export function wordsPerMinute(wordCount: number, durationMs: number | null | undefined): number | null {
  if (!durationMs || durationMs < 1000 || wordCount <= 0) return null
  return Math.round(wordCount / (durationMs / 60_000))
}

/**
 * A native-ish conversational range is roughly 130–170 wpm. Anything outside
 * 100–190 is worth a nudge, in one direction or the other.
 */
export function paceVerdict(wpm: number | null): 'slow' | 'good' | 'fast' | null {
  if (wpm === null) return null
  if (wpm < 100) return 'slow'
  if (wpm > 190) return 'fast'
  return 'good'
}

export type AccuracyBand = 'excellent' | 'good' | 'fair' | 'poor'

export function accuracyBand(accuracy: number): AccuracyBand {
  if (accuracy >= 90) return 'excellent'
  if (accuracy >= 75) return 'good'
  if (accuracy >= 50) return 'fair'
  return 'poor'
}

/** Splits a transcript into sentence-length segments for authoring. */
export function splitIntoSegments(transcript: string): string[] {
  return transcript
    .split(/(?<=[.!?])\s+(?=[A-Z"'“])/)
    .map((sentence) => sentence.replace(/\s+/g, ' ').trim())
    .filter((sentence) => tokenize(sentence).length > 0)
}
