/**
 * Money helpers. Every amount in the database is an integer in minor units
 * (paisa for PKR, cents for USD) so no floating point ever touches a price.
 */

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND'])

export function minorUnitFactor(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 1 : 100
}

export function toMinor(amount: number, currency = 'PKR'): number {
  return Math.round(amount * minorUnitFactor(currency))
}

export function toMajor(minor: number, currency = 'PKR'): number {
  return minor / minorUnitFactor(currency)
}

export function formatMoney(minor: number, currency = 'PKR', options: { compact?: boolean } = {}): string {
  const value = toMajor(minor, currency)
  try {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
      notation: options.compact ? 'compact' : 'standard',
    }).format(value)
  } catch {
    return `${currency.toUpperCase()} ${value.toLocaleString('en-PK')}`
  }
}

export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return new Intl.NumberFormat('en-PK', options).format(value)
}

export interface PriceBreakdown {
  subtotalCents: number
  discountCents: number
  taxCents: number
  totalCents: number
}

export function computeTotals(
  subtotalCents: number,
  discountCents: number,
  taxPercent: number,
): PriceBreakdown {
  const discount = Math.min(Math.max(0, Math.round(discountCents)), subtotalCents)
  const taxable = subtotalCents - discount
  const taxCents = Math.round((taxable * taxPercent) / 100)
  return {
    subtotalCents,
    discountCents: discount,
    taxCents,
    totalCents: taxable + taxCents,
  }
}
