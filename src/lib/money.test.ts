import { describe, expect, it } from 'vitest'
import { computeTotals, formatMoney, minorUnitFactor, toMajor, toMinor } from './money'

/**
 * Money is stored as integer minor units everywhere. These tests pin that down,
 * because a rounding bug here becomes a billing dispute.
 */

describe('minor units', () => {
  it('uses 100 for ordinary currencies and 1 for zero-decimal ones', () => {
    expect(minorUnitFactor('PKR')).toBe(100)
    expect(minorUnitFactor('usd')).toBe(100)
    expect(minorUnitFactor('JPY')).toBe(1)
  })

  it('round-trips a major amount', () => {
    expect(toMinor(5999, 'PKR')).toBe(599_900)
    expect(toMajor(599_900, 'PKR')).toBe(5999)
  })

  it('rounds rather than truncating fractional input', () => {
    expect(toMinor(10.005)).toBe(1001)
    expect(toMinor(10.004)).toBe(1000)
  })
})

describe('computeTotals', () => {
  it('applies a discount before tax', () => {
    const totals = computeTotals(100_000, 20_000, 10)
    expect(totals.discountCents).toBe(20_000)
    // 10% of the discounted 80,000
    expect(totals.taxCents).toBe(8_000)
    expect(totals.totalCents).toBe(88_000)
  })

  it('never discounts below zero', () => {
    const totals = computeTotals(50_000, 90_000, 0)
    expect(totals.discountCents).toBe(50_000)
    expect(totals.totalCents).toBe(0)
  })

  it('ignores a negative discount', () => {
    const totals = computeTotals(50_000, -1_000, 0)
    expect(totals.discountCents).toBe(0)
    expect(totals.totalCents).toBe(50_000)
  })

  it('produces whole minor units even with an awkward tax rate', () => {
    const totals = computeTotals(33_333, 0, 17.5)
    expect(Number.isInteger(totals.taxCents)).toBe(true)
    expect(Number.isInteger(totals.totalCents)).toBe(true)
    expect(totals.totalCents).toBe(totals.subtotalCents + totals.taxCents)
  })

  it('keeps subtotal, discount, tax and total internally consistent', () => {
    const totals = computeTotals(599_900, 89_985, 5)
    expect(totals.totalCents).toBe(totals.subtotalCents - totals.discountCents + totals.taxCents)
  })
})

describe('formatMoney', () => {
  it('renders whole amounts without decimals', () => {
    expect(formatMoney(599_900, 'PKR')).toMatch(/5,999/)
  })

  it('falls back gracefully for an unknown currency code', () => {
    expect(formatMoney(1_000, 'XXX')).toContain('10')
  })
})
