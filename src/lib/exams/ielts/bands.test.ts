import { describe, expect, it } from 'vitest'
import {
  bandToNormalized,
  criteriaBand,
  formatBand,
  isBand,
  normalizedToBand,
  overallBand,
  rawToBand,
  roundToHalfBand,
  writingSectionBand,
} from './bands'

/**
 * These tests encode the published IELTS reporting rules. As with the PTE
 * marking tests, a failure here means a student is shown the wrong band, so
 * the rules are asserted rather than assumed.
 */

describe('roundToHalfBand', () => {
  it('rounds a .25 mean UP to the half band', () => {
    // The case naive rounding gets wrong: Math.round(6.25 * 2) / 2 is 6.
    expect(roundToHalfBand(6.25)).toBe(6.5)
    expect(roundToHalfBand(4.25)).toBe(4.5)
  })

  it('rounds a .75 mean UP to the next whole band', () => {
    expect(roundToHalfBand(6.75)).toBe(7)
    expect(roundToHalfBand(8.75)).toBe(9)
  })

  it('rounds anything below .25 down to the whole band', () => {
    expect(roundToHalfBand(6.2)).toBe(6)
    expect(roundToHalfBand(6.0)).toBe(6)
  })

  it('rounds the range between .25 and .75 to the half band', () => {
    expect(roundToHalfBand(6.3)).toBe(6.5)
    expect(roundToHalfBand(6.5)).toBe(6.5)
    expect(roundToHalfBand(6.74)).toBe(6.5)
  })

  it('survives the floating point a four-way mean produces', () => {
    // (6 + 6.5 + 6.5 + 6) / 4 = 6.25 and must not fall to 6.
    expect(roundToHalfBand((6 + 6.5 + 6.5 + 6) / 4)).toBe(6.5)
    // (7 + 7 + 6.5 + 7.5) / 4 = 7.0
    expect(roundToHalfBand((7 + 7 + 6.5 + 7.5) / 4)).toBe(7)
  })

  it('stays inside the reporting range', () => {
    expect(roundToHalfBand(9.4)).toBe(9)
    expect(roundToHalfBand(-2)).toBe(0)
  })
})

describe('overallBand', () => {
  it('averages the four sections and rounds to the nearest half band', () => {
    expect(overallBand({ speaking: 6.5, writing: 6, reading: 7, listening: 7 })).toBe(6.5)
  })

  it('applies the .25 rule to the section mean', () => {
    // Mean is 6.625 -> the half band.
    expect(overallBand({ speaking: 6.5, writing: 6, reading: 7, listening: 7 })).toBe(6.5)
    // Mean is 7.25 -> rounds up to 7.5, not down to 7.
    expect(overallBand({ speaking: 7, writing: 7, reading: 7, listening: 8 })).toBe(7.5)
    expect(overallBand({ speaking: 7, writing: 7.5, reading: 7, listening: 7.5 })).toBe(7.5)
  })

  it('ignores sections the student has not sat rather than scoring them zero', () => {
    expect(overallBand({ speaking: 7, writing: 7, reading: null, listening: undefined })).toBe(7)
  })

  it('returns the floor when nothing has been sat', () => {
    expect(overallBand({})).toBe(0)
  })
})

describe('writingSectionBand', () => {
  it('weights Task 2 twice as heavily as Task 1', () => {
    // (6 + 7*2) / 3 = 6.67 -> 6.5
    expect(writingSectionBand(6, 7)).toBe(6.5)
    // (7 + 6*2) / 3 = 6.33 -> 6.5
    expect(writingSectionBand(7, 6)).toBe(6.5)
  })

  it('is not a plain average', () => {
    // A plain mean of 5 and 8 would be 6.5; weighted it is (5 + 16) / 3 = 7.
    expect(writingSectionBand(5, 8)).toBe(7)
  })

  it('lets a single attempted task stand alone', () => {
    expect(writingSectionBand(null, 6.5)).toBe(6.5)
    expect(writingSectionBand(7, null)).toBe(7)
    expect(writingSectionBand(null, null)).toBe(0)
  })
})

describe('criteriaBand', () => {
  it('averages the four assessment criteria', () => {
    expect(criteriaBand([6, 6, 7, 7])).toBe(6.5)
  })

  it('applies the .25 rule', () => {
    // Mean 6.25 -> 6.5
    expect(criteriaBand([6, 6, 6, 7])).toBe(6.5)
    expect(criteriaBand([6, 6.5, 6.5, 6])).toBe(6.5)
  })

  it('ignores criteria a provider failed to return', () => {
    expect(criteriaBand([7, 7, Number.NaN, 7])).toBe(7)
    expect(criteriaBand([])).toBe(0)
  })
})

describe('rawToBand', () => {
  it('converts Listening raw scores', () => {
    expect(rawToBand('LISTENING', null, 40)).toBe(9)
    expect(rawToBand('LISTENING', null, 30)).toBe(7)
    expect(rawToBand('LISTENING', null, 23)).toBe(6)
    expect(rawToBand('LISTENING', null, 0)).toBe(0)
  })

  it('marks General Training Reading on a stricter curve than Academic', () => {
    // The headline difference: band 6 costs 23 correct on Academic, 30 on GT.
    expect(rawToBand('READING', 'ACADEMIC', 23)).toBe(6)
    expect(rawToBand('READING', 'GENERAL_TRAINING', 23)).toBe(5)
    expect(rawToBand('READING', 'GENERAL_TRAINING', 30)).toBe(6)
  })

  it('defaults an unspecified Reading variant to Academic', () => {
    expect(rawToBand('READING', null, 23)).toBe(6)
  })

  it('clamps a raw score outside 0-40', () => {
    expect(rawToBand('READING', 'ACADEMIC', 99)).toBe(9)
    expect(rawToBand('READING', 'ACADEMIC', -5)).toBe(0)
  })

  it('refuses the sections that are assessed on criteria', () => {
    expect(() => rawToBand('WRITING', null, 20)).toThrow(/criteria/)
    expect(() => rawToBand('SPEAKING', null, 20)).toThrow(/criteria/)
  })
})

describe('the normalised 0-90 currency', () => {
  it('maps the ends of the band scale to the ends of the score scale', () => {
    expect(bandToNormalized(9)).toBe(90)
    expect(bandToNormalized(0)).toBe(10)
  })

  it('round-trips a band through the normalised score', () => {
    for (const band of [4, 5.5, 6, 6.5, 7, 7.5, 8, 9]) {
      expect(normalizedToBand(bandToNormalized(band))).toBe(band)
    }
  })
})

describe('presentation helpers', () => {
  it('reports a band with one decimal place, the way IELTS prints it', () => {
    expect(formatBand(7)).toBe('7.0')
    expect(formatBand(6.5)).toBe('6.5')
  })

  it('recognises valid half-step bands', () => {
    expect(isBand(6.5)).toBe(true)
    expect(isBand(6.25)).toBe(false)
    expect(isBand(9.5)).toBe(false)
    expect(isBand(Number.NaN)).toBe(false)
  })
})
