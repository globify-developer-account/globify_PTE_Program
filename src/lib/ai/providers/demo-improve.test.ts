import { describe, expect, it } from 'vitest'
import { demoProvider } from './demo'
import { editCategories, type WritingImprovementInput } from '../types'

/**
 * The simulated rewriter is what students get in demo mode and whenever a live
 * provider fails, so its output has to be defensible on its own: it must fix
 * what is genuinely wrong, must not invent changes, and must describe each
 * change in words a student can read.
 */

const base: Omit<WritingImprovementInput, 'text'> = {
  taskKind: 'FREEFORM',
  prompt: null,
  passage: null,
  wordLimitMin: null,
  wordLimitMax: null,
  focus: 'all',
  targetScore: 79,
}

const improve = (text: string, overrides: Partial<WritingImprovementInput> = {}) =>
  demoProvider.improveWriting({ ...base, ...overrides, text })

describe('demoProvider.improveWriting', () => {
  it('capitalises the first-person pronoun', async () => {
    const { data } = await improve('However, i believe that this is correct.')
    expect(data.improved_text).toContain('I believe')
    expect(data.edits.some((edit) => edit.replacement === 'I')).toBe(true)
  })

  it('corrects high-frequency misspellings', async () => {
    const { data } = await improve('However, this occured beacuse of thier choice.')
    expect(data.improved_text).toContain('occurred')
    expect(data.improved_text).toContain('because')
    expect(data.improved_text).toContain('their')
    expect(data.edits.filter((edit) => edit.category === 'SPELLING').length).toBeGreaterThanOrEqual(3)
  })

  it('raises informal wording to an academic register', async () => {
    const { data } = await improve('However, lots of kids enjoy this stuff every day.')
    expect(data.improved_text).toContain('many')
    expect(data.improved_text).toContain('children')
    expect(data.edits.some((edit) => edit.category === 'VOCABULARY')).toBe(true)
  })

  it('tightens wordy phrases', async () => {
    const { data } = await improve('However, the majority of people study in order to progress.')
    // 'the majority of' sits mid-sentence here, so the fix keeps the lower case.
    expect(data.improved_text).toContain('most people')
    expect(data.improved_text).toContain('study to progress')
    expect(data.edits.some((edit) => edit.category === 'CONCISENESS')).toBe(true)
  })

  it('removes an accidentally repeated word', async () => {
    const { data } = await improve('However, the the argument is sound.')
    expect(data.improved_text).not.toContain('the the')
    expect(data.edits.some((edit) => edit.original === 'the the')).toBe(true)
  })

  it('adds a missing full stop at the end', async () => {
    const { data } = await improve('However, this is a complete thought without an ending')
    expect(data.improved_text.endsWith('.')).toBe(true)
  })

  it('introduces a linking word when the draft has none', async () => {
    const { data } = await improve('Technology helps students. Teachers use it daily.')
    expect(data.improved_text).toContain('Furthermore,')
    expect(data.edits.some((edit) => edit.category === 'COHERENCE')).toBe(true)
  })

  it('leaves correct academic prose essentially alone', async () => {
    const clean =
      'Technology has reshaped classroom instruction. However, its benefits are unevenly distributed, because reliable access remains contingent on household income.'
    const { data } = await improve(clean)
    expect(data.improved_text).toBe(clean)
    expect(data.edits).toHaveLength(0)
  })

  it('returns guidance rather than an edit list for an empty draft', async () => {
    const { data } = await improve('   ')
    expect(data.improved_text).toBe('')
    expect(data.edits).toHaveLength(0)
    expect(data.focus_next.join(' ')).toMatch(/first draft/i)
  })

  it('reports a word-count shortfall against the task limit', async () => {
    const { data } = await improve('However, this response is far too short for the task.', {
      taskKind: 'ESSAY',
      wordLimitMin: 200,
      wordLimitMax: 300,
    })
    expect(data.focus_next.join(' ')).toMatch(/short of the required minimum of 200/)
  })

  it('only ever emits known edit categories', async () => {
    const { data } = await improve(
      'i think alot of kids  benefit,but the the majority of them cant access it in order to learn',
    )
    expect(data.edits.length).toBeGreaterThan(0)
    for (const edit of data.edits) {
      expect(editCategories).toContain(edit.category)
    }
  })

  it('describes each change in whole words, not character fragments', async () => {
    const { data } = await improve('we need computers,but only for  the students. they deserve it')
    for (const edit of data.edits) {
      // A fragment like "r  p" or ".\nt" is unreadable in the change list; every
      // reported edit must start and end on a word boundary or punctuation.
      expect(edit.original).not.toMatch(/^\w\s/)
      expect(edit.original).not.toMatch(/\n/)
    }
    expect(data.edits.some((edit) => edit.original === 'computers,but')).toBe(true)
    // The sentence-start fix reports the first offending word in the draft.
    expect(data.edits.some((edit) => edit.original === 'we')).toBe(true)
  })

  it('never reports an edit whose replacement equals the original', async () => {
    const { data } = await improve('i think alot of kids benefit from this,but not all of them do')
    for (const edit of data.edits) {
      expect(edit.replacement).not.toBe(edit.original)
    }
  })
})
