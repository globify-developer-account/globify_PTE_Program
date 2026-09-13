import { describe, expect, it } from 'vitest'
import { canLinkByEmail, createOauthState, readOauthState, sanitizeReferralCode } from './oauth-state'

describe('oauth state', () => {
  it('round-trips the post-login path and referral code', () => {
    const state = createOauthState({ next: '/practice/speaking', ref: 'globify-adnan' })
    expect(readOauthState(state)).toEqual({ next: '/practice/speaking', ref: 'GLOBIFY-ADNAN' })
  })

  it('uses a fresh nonce every time', () => {
    expect(createOauthState({})).not.toBe(createOauthState({}))
  })

  it('rejects malformed state', () => {
    expect(readOauthState('')).toBeNull()
    expect(readOauthState('nonce-only')).toBeNull()
    expect(readOauthState('a.b.c')).toBeNull()
    expect(readOauthState(`nonce.${Buffer.from('not json').toString('base64url')}`)).toBeNull()
  })

  it('ignores fields of the wrong type', () => {
    const encoded = Buffer.from(JSON.stringify({ next: 42, ref: ['x'] })).toString('base64url')
    expect(readOauthState(`nonce.${encoded}`)).toEqual({ next: undefined, ref: undefined })
  })
})

describe('sanitizeReferralCode', () => {
  it('normalises valid codes and drops anything else', () => {
    expect(sanitizeReferralCode(' globify-sara-4k2 ')).toBe('GLOBIFY-SARA-4K2')
    expect(sanitizeReferralCode('')).toBeUndefined()
    expect(sanitizeReferralCode('<script>')).toBeUndefined()
    expect(sanitizeReferralCode('A'.repeat(41))).toBeUndefined()
  })
})

describe('canLinkByEmail', () => {
  it('only links existing accounts when the provider verified the email', () => {
    expect(canLinkByEmail({ emailVerified: true })).toBe(true)
    expect(canLinkByEmail({ emailVerified: false })).toBe(false)
  })
})
