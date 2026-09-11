import { describe, expect, it } from 'vitest'
import { parseQuestionReference, questionHref, questionLabel } from './question-ref'

describe('parseQuestionReference', () => {
  it('reads the spaced form students type most often', () => {
    expect(parseQuestionReference('RA 677')).toEqual({ shortName: 'RA', number: 677 })
  })

  it('reads the hash form with and without spaces', () => {
    expect(parseQuestionReference('RA#677')).toEqual({ shortName: 'RA', number: 677 })
    expect(parseQuestionReference('RA #677')).toEqual({ shortName: 'RA', number: 677 })
    expect(parseQuestionReference('RA # 677')).toEqual({ shortName: 'RA', number: 677 })
  })

  it('is case insensitive and normalises to upper case', () => {
    expect(parseQuestionReference('ra 677')).toEqual({ shortName: 'RA', number: 677 })
  })

  it('handles hyphenated short names', () => {
    expect(parseQuestionReference('RW-FIB 12')).toEqual({ shortName: 'RW-FIB', number: 12 })
    expect(parseQuestionReference('l-mcm #3')).toEqual({ shortName: 'L-MCM', number: 3 })
  })

  it('treats a bare number as a search across every type', () => {
    expect(parseQuestionReference('677')).toEqual({ shortName: null, number: 677 })
    expect(parseQuestionReference('#677')).toEqual({ shortName: null, number: 677 })
  })

  it('trims surrounding whitespace', () => {
    expect(parseQuestionReference('  RA 677  ')).toEqual({ shortName: 'RA', number: 677 })
  })

  it('strips a stray hyphen rather than treating it as part of the name', () => {
    expect(parseQuestionReference('RA- 12')).toEqual({ shortName: 'RA', number: 12 })
  })

  it('returns null for free text, so the caller can fall back to content search', () => {
    expect(parseQuestionReference('the industrial revolution')).toBeNull()
    expect(parseQuestionReference('RA')).toBeNull()
    expect(parseQuestionReference('')).toBeNull()
    expect(parseQuestionReference('   ')).toBeNull()
  })

  it('rejects zero and numbers longer than any real bank', () => {
    expect(parseQuestionReference('RA 0')).toBeNull()
    expect(parseQuestionReference('RA 12345678')).toBeNull()
  })

  it('rejects a number carrying a decimal or a sign', () => {
    expect(parseQuestionReference('RA 67.7')).toBeNull()
    expect(parseQuestionReference('RA -677')).toBeNull()
  })
})

describe('questionLabel', () => {
  it('pairs the short name with the number', () => {
    expect(questionLabel('READ_ALOUD', 677)).toBe('RA #677')
    expect(questionLabel('WRITE_FROM_DICTATION', 1)).toBe('WFD #1')
  })

  it('drops the number for an unnumbered draft', () => {
    expect(questionLabel('READ_ALOUD', null)).toBe('RA')
  })

  it('falls back to the raw code when the type is not in the catalogue', () => {
    expect(questionLabel('SOME_FUTURE_TASK', 4)).toBe('SOME_FUTURE_TASK #4')
  })
})

describe('questionHref', () => {
  it('builds a practice URL that opens one question', () => {
    expect(questionHref('speaking', 'READ_ALOUD', 'abc123')).toBe(
      '/practice/speaking/read-aloud?q=abc123',
    )
  })

  it('encodes ids that are not URL safe', () => {
    expect(questionHref('reading', 'REORDER_PARAGRAPHS', 'a b&c')).toBe(
      '/practice/reading/reorder-paragraphs?q=a%20b%26c',
    )
  })
})
