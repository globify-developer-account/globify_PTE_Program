import { describe, expect, it } from 'vitest'
import {
  accuracyBand,
  diffWords,
  normalizeWord,
  paceVerdict,
  splitIntoSegments,
  tokenize,
  wordsPerMinute,
} from './diff'

/**
 * The accuracy figure here is the whole feedback loop of a drill — if the
 * alignment is wrong, the review panel points at the wrong word and the learner
 * practises the wrong thing.
 */

describe('normalizeWord', () => {
  it('ignores case and surrounding punctuation', () => {
    expect(normalizeWord('Snow,')).toBe('snow')
    expect(normalizeWord('"House."')).toBe('house')
  })

  it('keeps internal apostrophes and hyphens so contractions stay distinct', () => {
    expect(normalizeWord('we’re')).toBe("we're")
    expect(normalizeWord('well-known')).toBe('well-known')
    expect(normalizeWord("we're")).not.toBe('were')
  })

  it('reduces pure punctuation to nothing', () => {
    expect(normalizeWord('—')).toBe('')
  })
})

describe('tokenize', () => {
  it('drops standalone punctuation but keeps every real word', () => {
    expect(tokenize('The first snowfall — quiet, soft.')).toEqual([
      'The',
      'first',
      'snowfall',
      'quiet,',
      'soft.',
    ])
  })

  it('returns nothing for empty input', () => {
    expect(tokenize('   ')).toEqual([])
  })
})

describe('diffWords', () => {
  it('scores an exact answer 100, ignoring case and punctuation', () => {
    const result = diffWords('The snow fell all night.', 'the snow fell all night')
    expect(result.accuracy).toBe(100)
    expect(result.correct).toBe(5)
    expect(result.tokens.every((token) => token.status === 'correct')).toBe(true)
  })

  it('reports a substitution as one wrong word, not a deletion plus an insertion', () => {
    const result = diffWords('They left their coats there', 'They left there coats there')
    expect(result.wrong).toBe(1)
    expect(result.missing).toBe(0)
    expect(result.extra).toBe(0)
    expect(result.tokens[2]).toEqual({ status: 'wrong', expected: 'their', given: 'there' })
  })

  it('marks an omitted word as missing and keeps the rest aligned', () => {
    const result = diffWords('a day at the park', 'a day at park')
    expect(result.missing).toBe(1)
    expect(result.correct).toBe(4)
    expect(result.tokens.find((token) => token.status === 'missing')?.expected).toBe('the')
    expect(result.accuracy).toBe(80)
  })

  it('penalises invented words, so padding an answer cannot pay', () => {
    const bare = diffWords('the park', 'the park')
    const padded = diffWords('the park', 'the park and the garden and the lake')
    expect(bare.accuracy).toBe(100)
    expect(padded.extra).toBe(6)
    expect(padded.accuracy).toBe(0)
  })

  it('floors accuracy at zero rather than going negative', () => {
    expect(diffWords('one two', 'completely different words entirely here now').accuracy).toBe(0)
  })

  it('treats an empty answer as every word missing', () => {
    const result = diffWords('the snow fell', '')
    expect(result.accuracy).toBe(0)
    expect(result.missing).toBe(3)
    expect(result.tokens).toHaveLength(3)
  })

  it('reports everything as extra when there is no target text', () => {
    const result = diffWords('', 'something typed')
    expect(result.total).toBe(0)
    expect(result.extra).toBe(2)
    expect(result.accuracy).toBe(0)
  })

  it('keeps the target word order when a word is repeated', () => {
    const result = diffWords('she said she would come', 'she said she would come')
    expect(result.correct).toBe(5)
    expect(result.tokens.map((token) => token.expected)).toEqual([
      'she',
      'said',
      'she',
      'would',
      'come',
    ])
  })
})

describe('wordsPerMinute', () => {
  it('converts a word count and duration into a pace', () => {
    expect(wordsPerMinute(30, 12_000)).toBe(150)
  })

  it('refuses to guess from a clip that is too short to measure', () => {
    expect(wordsPerMinute(3, 400)).toBeNull()
    expect(wordsPerMinute(0, 10_000)).toBeNull()
    expect(wordsPerMinute(10, null)).toBeNull()
  })
})

describe('paceVerdict', () => {
  it('accepts a natural range and flags the extremes', () => {
    expect(paceVerdict(150)).toBe('good')
    expect(paceVerdict(80)).toBe('slow')
    expect(paceVerdict(210)).toBe('fast')
    expect(paceVerdict(null)).toBeNull()
  })
})

describe('accuracyBand', () => {
  it('bands on the boundaries the UI colours against', () => {
    expect(accuracyBand(90)).toBe('excellent')
    expect(accuracyBand(89)).toBe('good')
    expect(accuracyBand(75)).toBe('good')
    expect(accuracyBand(74)).toBe('fair')
    expect(accuracyBand(49)).toBe('poor')
  })
})

describe('splitIntoSegments', () => {
  it('splits a transcript on sentence boundaries', () => {
    expect(splitIntoSegments('The snow fell. It was quiet! Was it cold? Yes.')).toEqual([
      'The snow fell.',
      'It was quiet!',
      'Was it cold?',
      'Yes.',
    ])
  })

  it('collapses stray whitespace and drops empty fragments', () => {
    expect(splitIntoSegments('  One   sentence.\n\n  Another one.  ')).toEqual([
      'One sentence.',
      'Another one.',
    ])
  })

  it('returns nothing for a transcript with no words', () => {
    expect(splitIntoSegments('   ')).toEqual([])
  })
})
