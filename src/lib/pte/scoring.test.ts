import { describe, expect, it } from 'vitest'
import { contentOverlap, normalizeText, scoreByRules, toScaledScore } from './scoring'

/**
 * These tests encode the published PTE marking rules. If one of them fails, a
 * student's score is wrong — which is the most damaging bug this product can
 * ship, so the rules are asserted rather than assumed.
 */

describe('toScaledScore', () => {
  it('maps a perfect answer to 90 and a blank one to 10', () => {
    expect(toScaledScore(5, 5)).toBe(90)
    expect(toScaledScore(0, 5)).toBe(10)
  })

  it('is linear between the bounds', () => {
    expect(toScaledScore(1, 2)).toBe(50)
  })

  it('never returns above 90 for an over-count, and never divides by zero', () => {
    expect(toScaledScore(9, 5)).toBe(90)
    expect(toScaledScore(3, 0)).toBe(0)
  })
})

describe('normalizeText', () => {
  it('folds case, curly quotes and punctuation', () => {
    expect(normalizeText('The  “Cat’s” hat!')).toBe("the cat's hat")
  })
})

describe('single choice', () => {
  const correct = { optionId: 'b' }

  it('awards the full mark for the right option', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_SINGLE',
      correctAnswer: correct,
      selection: { optionIds: ['b'] },
    })!
    expect(result.raw).toBe(1)
    expect(result.scaled).toBe(90)
    expect(result.isCorrect).toBe(true)
  })

  it('awards nothing for the wrong option', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_SINGLE',
      correctAnswer: correct,
      selection: { optionIds: ['a'] },
    })!
    expect(result.raw).toBe(0)
    expect(result.isCorrect).toBe(false)
  })
})

describe('multiple choice partial credit', () => {
  const correct = { optionIds: ['a', 'c', 'd'] }

  it('gives one mark per correct selection', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_MULTIPLE',
      correctAnswer: correct,
      selection: { optionIds: ['a', 'c'] },
    })!
    expect(result.raw).toBe(2)
    expect(result.max).toBe(3)
  })

  it('subtracts a mark for each incorrect selection', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_MULTIPLE',
      correctAnswer: correct,
      selection: { optionIds: ['a', 'c', 'b'] },
    })!
    expect(result.raw).toBe(1)
  })

  it('floors at zero rather than going negative', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_MULTIPLE',
      correctAnswer: correct,
      selection: { optionIds: ['b', 'e'] },
    })!
    expect(result.raw).toBe(0)
    expect(result.scaled).toBe(10)
  })

  it('selecting everything does not guarantee full marks', () => {
    const result = scoreByRules({
      typeCode: 'READING_MCQ_MULTIPLE',
      correctAnswer: correct,
      selection: { optionIds: ['a', 'b', 'c', 'd', 'e'] },
    })!
    expect(result.raw).toBe(1)
  })
})

describe('re-order paragraphs', () => {
  const correct = { order: ['p1', 'p2', 'p3', 'p4'] }

  it('scores on adjacent pairs, not absolute positions', () => {
    const result = scoreByRules({
      typeCode: 'REORDER_PARAGRAPHS',
      correctAnswer: correct,
      selection: { order: ['p1', 'p2', 'p3', 'p4'] },
    })!
    expect(result.max).toBe(3)
    expect(result.raw).toBe(3)
  })

  it('credits the pairs that survive a wrong arrangement', () => {
    // p1→p2 is intact; p2→p3 and p3→p4 are broken.
    const result = scoreByRules({
      typeCode: 'REORDER_PARAGRAPHS',
      correctAnswer: correct,
      selection: { order: ['p1', 'p2', 'p4', 'p3'] },
    })!
    expect(result.raw).toBe(1)
  })

  it('gives nothing for a fully reversed order', () => {
    const result = scoreByRules({
      typeCode: 'REORDER_PARAGRAPHS',
      correctAnswer: correct,
      selection: { order: ['p4', 'p3', 'p2', 'p1'] },
    })!
    expect(result.raw).toBe(0)
  })
})

describe('fill in the blanks', () => {
  const correct = { blanks: { '1': 'migration', '2': 'revealed', '3': 'reduces' } }

  it('awards one mark per exactly-correct blank', () => {
    const result = scoreByRules({
      typeCode: 'READING_FILL_BLANKS',
      correctAnswer: correct,
      selection: { blanks: { '1': 'migration', '2': 'concealed', '3': 'reduces' } },
    })!
    expect(result.raw).toBe(2)
    expect(result.max).toBe(3)
  })

  it('ignores case and surrounding whitespace', () => {
    const result = scoreByRules({
      typeCode: 'LISTENING_FILL_BLANKS',
      correctAnswer: correct,
      selection: { blanks: { '1': '  Migration ', '2': 'REVEALED', '3': 'reduces' } },
    })!
    expect(result.raw).toBe(3)
  })

  it('does not credit a missing blank', () => {
    const result = scoreByRules({
      typeCode: 'READING_FILL_BLANKS',
      correctAnswer: correct,
      selection: { blanks: { '1': 'migration' } },
    })!
    expect(result.raw).toBe(1)
  })
})

describe('highlight incorrect words', () => {
  const correct = { wordIndexes: [3, 7, 11] }

  it('subtracts a mark for each false positive', () => {
    const result = scoreByRules({
      typeCode: 'HIGHLIGHT_INCORRECT_WORDS',
      correctAnswer: correct,
      selection: { wordIndexes: [3, 7, 4] },
    })!
    expect(result.raw).toBe(1)
  })

  it('clicking every word does not score well', () => {
    const result = scoreByRules({
      typeCode: 'HIGHLIGHT_INCORRECT_WORDS',
      correctAnswer: correct,
      selection: { wordIndexes: Array.from({ length: 20 }, (_, i) => i) },
    })!
    // 3 hits minus 17 misses, floored at zero.
    expect(result.raw).toBe(0)
  })
})

describe('write from dictation', () => {
  const correct = { text: 'The assignment deadline has been extended by one week.' }

  it('gives a mark per correctly recalled word', () => {
    const result = scoreByRules({
      typeCode: 'WRITE_FROM_DICTATION',
      correctAnswer: correct,
      selection: {},
      text: 'The assignment deadline has been extended by one week.',
    })!
    expect(result.raw).toBe(9)
    expect(result.scaled).toBe(90)
  })

  it('credits partial recall', () => {
    const result = scoreByRules({
      typeCode: 'WRITE_FROM_DICTATION',
      correctAnswer: correct,
      selection: {},
      text: 'The assignment deadline has been extended',
    })!
    expect(result.raw).toBe(6)
    expect(result.max).toBe(9)
  })

  it('does not credit a word twice when the student repeats it', () => {
    const result = scoreByRules({
      typeCode: 'WRITE_FROM_DICTATION',
      correctAnswer: { text: 'one week' },
      selection: {},
      text: 'week week week',
    })!
    expect(result.raw).toBe(1)
  })

  it('ignores punctuation and capitalisation', () => {
    const result = scoreByRules({
      typeCode: 'WRITE_FROM_DICTATION',
      correctAnswer: correct,
      selection: {},
      text: 'the ASSIGNMENT deadline, has been extended by one week!!',
    })!
    expect(result.raw).toBe(9)
  })
})

describe('scoreByRules dispatch', () => {
  it('returns null for task types that need AI evaluation', () => {
    expect(scoreByRules({ typeCode: 'ESSAY', correctAnswer: {}, selection: {} })).toBeNull()
    expect(scoreByRules({ typeCode: 'READ_ALOUD', correctAnswer: {}, selection: {} })).toBeNull()
    expect(scoreByRules({ typeCode: 'DESCRIBE_IMAGE', correctAnswer: {}, selection: {} })).toBeNull()
  })
})

describe('contentOverlap', () => {
  it('is 1 for an exact match and 0 for no overlap', () => {
    expect(contentOverlap('the cat sat', 'the cat sat')).toBe(1)
    expect(contentOverlap('the cat sat', 'zzz qqq')).toBe(0)
  })

  it('reports the proportion of expected words that appear', () => {
    expect(contentOverlap('the cat sat down', 'the cat')).toBe(0.5)
  })

  it('is 0 rather than NaN when the expected text is empty', () => {
    expect(contentOverlap('', 'anything')).toBe(0)
  })
})
