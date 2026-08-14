import { describe, expect, it } from 'vitest'
import { addDays, clamp, countWords, formatDuration, initials, slugify, startOfDay } from './utils'

describe('countWords', () => {
  it('counts words the way the PTE word limit does', () => {
    expect(countWords('one two three')).toBe(3)
    expect(countWords('  spaced   out  ')).toBe(2)
    expect(countWords('')).toBe(0)
    expect(countWords('   ')).toBe(0)
  })

  it('treats a hyphenated compound as one word', () => {
    expect(countWords('well-known result')).toBe(2)
  })
})

describe('formatDuration', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(5)).toBe('0:05')
  })

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatDuration(3661)).toBe('1:01:01')
  })

  it('never renders a negative duration', () => {
    expect(formatDuration(-10)).toBe('0:00')
  })
})

describe('clamp', () => {
  it('bounds a value on both sides', () => {
    expect(clamp(5, 0, 10)).toBe(5)
    expect(clamp(-5, 0, 10)).toBe(0)
    expect(clamp(50, 0, 10)).toBe(10)
  })
})

describe('slugify', () => {
  it('produces a URL-safe slug', () => {
    expect(slugify('Read Aloud: Fluency & Pace!')).toBe('read-aloud-fluency-pace')
  })
})

describe('initials', () => {
  it('takes at most two initials', () => {
    expect(initials('Adnan Rafiq')).toBe('AR')
    expect(initials('Muhammad Adnan Rafiq Khan')).toBe('MA')
    expect(initials('Hira')).toBe('H')
  })
})

describe('date helpers', () => {
  it('startOfDay zeroes the time', () => {
    const start = startOfDay(new Date('2026-08-14T15:42:11Z'))
    expect(start.getHours()).toBe(0)
    expect(start.getMinutes()).toBe(0)
    expect(start.getSeconds()).toBe(0)
  })

  it('addDays crosses a month boundary correctly', () => {
    const result = addDays(new Date(2026, 7, 31), 1)
    expect(result.getMonth()).toBe(8)
    expect(result.getDate()).toBe(1)
  })
})
