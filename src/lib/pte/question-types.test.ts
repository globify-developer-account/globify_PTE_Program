import { describe, expect, it } from 'vitest'
import {
  PTE_VARIANTS,
  QUESTION_TYPES,
  QUESTION_TYPE_CODES,
  SECTIONS,
  codeFromTypeSlug,
  formatScoreWeight,
  practiceHref,
  questionType,
  questionTypesForVariant,
  typeSlug,
} from './question-types'

describe('the task catalogue', () => {
  it('defines exactly one entry per declared code', () => {
    expect(QUESTION_TYPES).toHaveLength(QUESTION_TYPE_CODES.length)
    const codes = QUESTION_TYPES.map((type) => type.code)
    expect(new Set(codes).size).toBe(codes.length)
    for (const code of QUESTION_TYPE_CODES) {
      expect(questionType(code)).toBeDefined()
    }
  })

  it('gives every task at least one variant that offers it', () => {
    for (const type of QUESTION_TYPES) {
      expect(type.variants.length, `${type.code} is offered by no exam`).toBeGreaterThan(0)
    }
  })

  it('keeps display order unique, so menus do not reshuffle between renders', () => {
    const orders = QUESTION_TYPES.map((type) => type.displayOrder)
    expect(new Set(orders).size).toBe(orders.length)
  })

  it('covers all four sections', () => {
    for (const section of SECTIONS) {
      expect(QUESTION_TYPES.some((type) => type.section === section)).toBe(true)
    }
  })

  it('gives every task a positive score weight', () => {
    for (const type of QUESTION_TYPES) {
      expect(type.scoreWeight, `${type.code} has no weight`).toBeGreaterThan(0)
    }
  })

  it('scores every non-auto-scorable task through a model or a human', () => {
    // Anything requiring speech or free text cannot have an answer key.
    for (const type of QUESTION_TYPES) {
      if (type.requiresAudioResponse || type.requiresTextResponse) {
        expect(type.autoScorable, `${type.code} cannot be auto scored`).toBe(false)
      }
    }
  })
})

describe('questionTypesForVariant', () => {
  it('returns only tasks the chosen exam offers', () => {
    for (const variant of PTE_VARIANTS) {
      for (const type of questionTypesForVariant(variant)) {
        expect(type.variants).toContain(variant)
      }
    }
  })

  it('gives PTE Core the tasks that replace the Academic-only ones', () => {
    const core = questionTypesForVariant('CORE').map((type) => type.code)
    expect(core).toContain('WRITE_EMAIL')
    expect(core).toContain('RESPOND_TO_SITUATION')
    // Core drops the three long-form Academic tasks.
    expect(core).not.toContain('DESCRIBE_IMAGE')
    expect(core).not.toContain('RETELL_LECTURE')
    expect(core).not.toContain('ESSAY')
  })

  it('keeps Write Email out of Academic', () => {
    const academic = questionTypesForVariant('ACADEMIC_UKVI').map((type) => type.code)
    expect(academic).not.toContain('WRITE_EMAIL')
    expect(academic).toContain('ESSAY')
  })

  it('narrows to one section when asked', () => {
    const speaking = questionTypesForVariant('ACADEMIC_UKVI', 'SPEAKING')
    expect(speaking.length).toBeGreaterThan(0)
    for (const type of speaking) expect(type.section).toBe('SPEAKING')
  })
})

describe('formatScoreWeight', () => {
  it('renders sub-one-percent weights as "<1%"', () => {
    expect(formatScoreWeight(0.5)).toBe('<1%')
  })

  it('renders whole percentages plainly', () => {
    expect(formatScoreWeight(1)).toBe('1%')
    expect(formatScoreWeight(15)).toBe('15%')
  })
})

describe('slugs', () => {
  it('round-trips every code in the catalogue', () => {
    for (const type of QUESTION_TYPES) {
      expect(codeFromTypeSlug(typeSlug(type.code))).toBe(type.code)
    }
  })

  it('builds a practice URL under the task section', () => {
    expect(practiceHref(questionType('READ_ALOUD')!)).toBe('/practice/speaking/read-aloud')
    expect(practiceHref(questionType('WRITE_FROM_DICTATION')!)).toBe(
      '/practice/listening/write-from-dictation',
    )
  })
})
