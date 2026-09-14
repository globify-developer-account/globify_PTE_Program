import { describe, expect, it } from 'vitest'
import { pickSessionQuestions } from './practice-selection'

function seeded(seed = 11): () => number {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

const pool = ['q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8']
const at = (day: number) => new Date(Date.UTC(2026, 8, day))

describe('pickSessionQuestions', () => {
  it('never repeats a question within a session', () => {
    const picked = pickSessionQuestions(pool, new Map(), 5, seeded())
    expect(picked).toHaveLength(5)
    expect(new Set(picked).size).toBe(5)
  })

  it('uses unanswered questions before any the student has answered', () => {
    const history = new Map([
      ['q1', at(1)],
      ['q2', at(2)],
      ['q3', at(3)],
    ])
    const picked = pickSessionQuestions(pool, history, 5, seeded())
    expect(picked.sort()).toEqual(['q4', 'q5', 'q6', 'q7', 'q8'])
  })

  it('refills from the questions practised longest ago once the pool is used up', () => {
    const history = new Map(pool.map((id, index) => [id, at(10 - index)]))
    // q8 was answered longest ago (day 3), q1 most recently (day 10).
    expect(pickSessionQuestions(pool, history, 3, seeded())).toEqual(['q8', 'q7', 'q6'])
  })

  it('rotates through the pool across consecutive sessions', () => {
    const history = new Map<string, Date>()
    const served: string[] = []
    for (let session = 0; session < 4; session++) {
      const picked = pickSessionQuestions(pool, history, 2, seeded(session + 1))
      picked.forEach((id, index) => history.set(id, at(session * 2 + index + 1)))
      served.push(...picked)
    }
    // Four sessions of two over eight questions: every question exactly once.
    expect(served.sort()).toEqual([...pool].sort())
  })

  it('returns what exists when the pool is smaller than the session', () => {
    expect(pickSessionQuestions(['q1', 'q2'], new Map(), 5, seeded()).sort()).toEqual(['q1', 'q2'])
  })
})
