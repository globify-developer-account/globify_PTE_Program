import { describe, expect, it } from 'vitest'
import {
  parseBlankOptions,
  parseChoiceOptions,
  parseCorrectAnswer,
  parseSelection,
  segmentPassage,
  tokenizeWords,
} from './schemas'

/**
 * Question content comes from JSON columns an admin can edit, and answers come
 * off the wire. Both are untrusted: a malformed value must degrade to an empty
 * state, never throw inside a renderer.
 */

describe('parseChoiceOptions', () => {
  it('accepts a well-formed option list', () => {
    expect(parseChoiceOptions([{ id: 'a', text: 'First' }])).toEqual([{ id: 'a', text: 'First' }])
  })

  it('returns an empty list for malformed input rather than throwing', () => {
    expect(parseChoiceOptions(null)).toEqual([])
    expect(parseChoiceOptions('not an array')).toEqual([])
    expect(parseChoiceOptions([{ id: '', text: '' }])).toEqual([])
    expect(parseChoiceOptions([{ wrong: 'shape' }])).toEqual([])
  })
})

describe('parseBlankOptions', () => {
  it('requires at least two choices per blank', () => {
    expect(parseBlankOptions([{ index: 1, choices: ['one', 'two'] }])).toHaveLength(1)
    expect(parseBlankOptions([{ index: 1, choices: ['only'] }])).toEqual([])
  })

  it('rejects a zero or negative blank index', () => {
    expect(parseBlankOptions([{ index: 0, choices: ['a', 'b'] }])).toEqual([])
  })
})

describe('parseCorrectAnswer', () => {
  it('keeps the recognised keys and drops the rest', () => {
    const parsed = parseCorrectAnswer({ optionId: 'b', somethingElse: 'ignored' })
    expect(parsed.optionId).toBe('b')
    expect('somethingElse' in parsed).toBe(false)
  })

  it('returns an empty object for junk', () => {
    expect(parseCorrectAnswer('nonsense')).toEqual({})
    expect(parseCorrectAnswer(undefined)).toEqual({})
  })
})

describe('parseSelection', () => {
  it('caps oversized submissions instead of accepting them', () => {
    const tooMany = Array.from({ length: 500 }, (_, i) => i)
    expect(parseSelection({ wordIndexes: tooMany })).toEqual({})
  })

  it('accepts a valid selection', () => {
    expect(parseSelection({ optionIds: ['a', 'b'] })).toEqual({ optionIds: ['a', 'b'] })
  })
})

describe('segmentPassage', () => {
  it('splits text around {{n}} markers', () => {
    expect(segmentPassage('Start {{1}} middle {{2}} end')).toEqual([
      { kind: 'text', value: 'Start ' },
      { kind: 'blank', index: 1 },
      { kind: 'text', value: ' middle ' },
      { kind: 'blank', index: 2 },
      { kind: 'text', value: ' end' },
    ])
  })

  it('handles a passage that starts or ends with a blank', () => {
    expect(segmentPassage('{{1}} tail')).toEqual([
      { kind: 'blank', index: 1 },
      { kind: 'text', value: ' tail' },
    ])
    expect(segmentPassage('head {{1}}')).toEqual([
      { kind: 'text', value: 'head ' },
      { kind: 'blank', index: 1 },
    ])
  })

  it('returns a single text segment when there are no markers', () => {
    expect(segmentPassage('plain text')).toEqual([{ kind: 'text', value: 'plain text' }])
  })
})

describe('tokenizeWords', () => {
  it('produces stable indexes that the scorer and the UI both rely on', () => {
    const words = tokenizeWords('The  quick\nbrown fox')
    expect(words).toEqual(['The', 'quick', 'brown', 'fox'])
    expect(words[2]).toBe('brown')
  })

  it('returns nothing for an empty passage', () => {
    expect(tokenizeWords('   ')).toEqual([])
  })
})
