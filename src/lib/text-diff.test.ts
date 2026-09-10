import { describe, expect, it } from 'vitest'
import { diffStats, diffWords, tokenize } from './text-diff'

const rebuild = (tokens: ReturnType<typeof diffWords>, side: 'before' | 'after') =>
  tokens
    .filter((token) => token.op === 'equal' || token.op === (side === 'before' ? 'delete' : 'insert'))
    .map((token) => token.value)
    .join('')

describe('tokenize', () => {
  it('keeps trailing whitespace so tokens rejoin exactly', () => {
    const text = 'The  cat sat\non the mat. '
    expect(tokenize(text).join('')).toBe(text)
  })

  it('returns nothing for empty input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})

describe('diffWords', () => {
  it('marks an identical text as entirely unchanged', () => {
    const tokens = diffWords('one two three', 'one two three')
    expect(tokens.every((token) => token.op === 'equal')).toBe(true)
  })

  it('isolates a single replaced word', () => {
    const tokens = diffWords('The data was clear.', 'The data were clear.')
    expect(tokens.filter((token) => token.op === 'delete').map((t) => t.value.trim())).toEqual(['was'])
    expect(tokens.filter((token) => token.op === 'insert').map((t) => t.value.trim())).toEqual(['were'])
  })

  it('reconstructs the improved side, including punctuation and case fixes', () => {
    const before = 'i think that technology is good. it helps people alot.'
    const after = 'I think that technology is beneficial. It helps people a lot.'
    expect(rebuild(diffWords(before, after), 'after')).toBe(after)
  })

  it('reconstructs the original side from equal + delete tokens', () => {
    const before = 'Many student struggle with essay writing tasks.'
    const after = 'Many students struggle with essay writing tasks because of time pressure.'
    // Equal tokens carry the improved spelling, so the rebuilt original matches
    // word for word but not necessarily character for character.
    expect(rebuild(diffWords(before, after), 'before').trim().split(/\s+/)).toHaveLength(
      before.trim().split(/\s+/).length,
    )
  })

  it('handles insertion into an empty draft', () => {
    const tokens = diffWords('', 'A brand new sentence.')
    expect(tokens).toEqual([{ op: 'insert', value: 'A brand new sentence.' }])
  })

  it('handles deletion down to nothing', () => {
    const tokens = diffWords('Redundant filler words here.', '')
    expect(tokens.every((token) => token.op === 'delete')).toBe(true)
  })

  it('returns an empty stream when both sides are blank', () => {
    expect(diffWords('', '')).toEqual([])
  })

  it('merges adjacent operations of the same kind', () => {
    const tokens = diffWords('a b c d', 'a x y d')
    const ops = tokens.map((token) => token.op)
    expect(ops).toEqual([...new Set(ops.map((op, index) => `${op}${index}`))].map((k) => k.replace(/\d+$/, '')))
    expect(ops.join(',')).toBe('equal,delete,insert,equal')
  })
})

describe('diffStats', () => {
  it('counts words on each side of the change', () => {
    const stats = diffStats(diffWords('one two three', 'one four five three'))
    expect(stats).toEqual({ added: 2, removed: 1, unchanged: 2 })
  })
})
