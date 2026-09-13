import { randomBytes } from 'node:crypto'

/**
 * Pure helpers for the OAuth flow, kept free of `server-only`, Prisma and
 * Next.js so they can be unit tested.
 */

export const OAUTH_PROVIDER_IDS = ['google', 'facebook'] as const
export type OAuthProviderId = (typeof OAUTH_PROVIDER_IDS)[number]

export interface OAuthStatePayload {
  /** Where to send the user afterwards. Validated again on the way back. */
  next?: string
  /** Referral code from the sign-up page — the provider drops our query string. */
  ref?: string
}

/**
 * The state doubles as CSRF protection (it must match the cookie set when the
 * flow began) and as a carrier for values the provider will not hand back.
 */
export function createOauthState(payload: OAuthStatePayload): string {
  const nonce = randomBytes(16).toString('base64url')
  const body: OAuthStatePayload = {}
  if (payload.next) body.next = payload.next.slice(0, 300)
  const ref = sanitizeReferralCode(payload.ref)
  if (ref) body.ref = ref
  return `${nonce}.${Buffer.from(JSON.stringify(body)).toString('base64url')}`
}

export function readOauthState(state: string): OAuthStatePayload | null {
  const [nonce, encoded, extra] = state.split('.')
  if (!nonce || !encoded || extra !== undefined) return null
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'))
    if (!parsed || typeof parsed !== 'object') return null
    const { next, ref } = parsed as Record<string, unknown>
    return {
      next: typeof next === 'string' ? next : undefined,
      ref: sanitizeReferralCode(typeof ref === 'string' ? ref : undefined),
    }
  } catch {
    return null
  }
}

export function sanitizeReferralCode(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim().toUpperCase()
  if (!trimmed || trimmed.length > 40 || !/^[A-Z0-9-]+$/.test(trimmed)) return undefined
  return trimmed
}

/**
 * Whether a provider identity may be attached to an existing account that
 * merely shares its email address.
 *
 * Only when the provider vouches that the person controls that inbox. Linking
 * on an unverified address would let anyone who can create a provider account
 * with someone else's email sign in as them — including as staff.
 */
export function canLinkByEmail(profile: { emailVerified: boolean }): boolean {
  return profile.emailVerified
}
