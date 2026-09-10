/**
 * Word-level diff between a student's draft and the improved version.
 *
 * The improvement tool has to show *what changed*, not just hand back a better
 * paragraph — a student who only reads the polished text learns nothing. This
 * produces the token stream the UI renders as strikethrough / insertion.
 *
 * The algorithm is a classic LCS with the usual pre/post-trim of the common
 * head and tail, which is what keeps a 300-word essay inside a small table.
 */

export type DiffOp = 'equal' | 'insert' | 'delete'

export interface DiffToken {
  op: DiffOp
  /** The token text, including the whitespace that followed it. */
  value: string
}

/** Guards the O(n·m) table. Beyond this the two texts are reported as a wholesale replacement. */
const MAX_TOKENS = 1500

/**
 * Splits into words while keeping trailing whitespace attached, so joining the
 * tokens of any one side reproduces that side byte for byte.
 */
export function tokenize(text: string): string[] {
  return text.match(/\S+\s*/g) ?? []
}

/** Case- and punctuation-insensitive key, so "Word," and "word" line up. */
function key(token: string): string {
  return token.trim().toLowerCase().replace(/[^\p{L}\p{N}']/gu, '')
}

export function diffWords(before: string, after: string): DiffToken[] {
  const a = tokenize(before)
  const b = tokenize(after)

  if (a.length === 0 && b.length === 0) return []

  // Common head and tail cost nothing to detect and usually remove most of the
  // text, since an improved essay keeps the majority of its words in place.
  let head = 0
  while (head < a.length && head < b.length && key(a[head]!) === key(b[head]!)) head++

  let tail = 0
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    key(a[a.length - 1 - tail]!) === key(b[b.length - 1 - tail]!)
  ) {
    tail++
  }

  const midA = a.slice(head, a.length - tail)
  const midB = b.slice(head, b.length - tail)

  const tokens: DiffToken[] = []
  const push = (op: DiffOp, value: string) => {
    const last = tokens[tokens.length - 1]
    if (last && last.op === op) last.value += value
    else tokens.push({ op, value })
  }

  // Equal tokens always carry the *improved* spelling. A head or tail token can
  // still differ in case or punctuation, since `key()` ignores both, and the
  // merged stream has to read correctly once the insertions are accepted.
  for (let i = 0; i < head; i++) push('equal', b[i]!)

  if (midA.length * midB.length > MAX_TOKENS * MAX_TOKENS || midA.length + midB.length > MAX_TOKENS * 2) {
    // Too large to align word by word; report the middle as replaced wholesale
    // rather than spending seconds on a table nobody will read.
    if (midA.length > 0) push('delete', midA.join(''))
    if (midB.length > 0) push('insert', midB.join(''))
  } else {
    for (const token of alignMiddle(midA, midB)) push(token.op, token.value)
  }

  for (let i = b.length - tail; i < b.length; i++) push('equal', b[i]!)

  return tokens
}

/** Standard LCS table, walked back to produce the edit script. */
function alignMiddle(a: string[], b: string[]): DiffToken[] {
  const rows = a.length + 1
  const cols = b.length + 1
  const lcs = new Uint32Array(rows * cols)

  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * cols + j] =
        key(a[i]!) === key(b[j]!)
          ? lcs[(i + 1) * cols + (j + 1)]! + 1
          : Math.max(lcs[(i + 1) * cols + j]!, lcs[i * cols + (j + 1)]!)
    }
  }

  const tokens: DiffToken[] = []
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (key(a[i]!) === key(b[j]!)) {
      // Same word, but possibly different capitalisation or punctuation —
      // prefer the improved spelling so the merged text reads correctly.
      tokens.push({ op: 'equal', value: b[j]! })
      i++
      j++
    } else if (lcs[(i + 1) * cols + j]! >= lcs[i * cols + (j + 1)]!) {
      tokens.push({ op: 'delete', value: a[i]! })
      i++
    } else {
      tokens.push({ op: 'insert', value: b[j]! })
      j++
    }
  }
  while (i < a.length) tokens.push({ op: 'delete', value: a[i++]! })
  while (j < b.length) tokens.push({ op: 'insert', value: b[j++]! })

  return tokens
}

export interface DiffStats {
  added: number
  removed: number
  unchanged: number
}

export function diffStats(tokens: DiffToken[]): DiffStats {
  const count = (value: string) => tokenize(value).length
  return tokens.reduce<DiffStats>(
    (stats, token) => {
      if (token.op === 'insert') stats.added += count(token.value)
      else if (token.op === 'delete') stats.removed += count(token.value)
      else stats.unchanged += count(token.value)
      return stats
    },
    { added: 0, removed: 0, unchanged: 0 },
  )
}
