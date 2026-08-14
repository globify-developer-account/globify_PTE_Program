import 'server-only'
import { randomBytes } from 'node:crypto'
import { env } from '../env'
import { badRequest } from '../http'

/**
 * Google Sign-In implemented directly against the OAuth 2.0 endpoints.
 *
 * A full auth library would be a heavy dependency for one provider, and the
 * authorization-code flow is small enough to own: redirect with a state cookie,
 * exchange the code server-side, read the profile, done.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export const GOOGLE_STATE_COOKIE = 'globify_oauth_state'

export function googleEnabled(): boolean {
  return Boolean(env.auth.google.clientId && env.auth.google.clientSecret)
}

export function googleRedirectUri(): string {
  return `${env.appUrl}/api/auth/google/callback`
}

export function createOauthState(nextPath: string): string {
  // The state carries both CSRF entropy and the post-login destination.
  const nonce = randomBytes(16).toString('base64url')
  return `${nonce}.${Buffer.from(nextPath).toString('base64url')}`
}

export function readOauthState(state: string): { nonce: string; nextPath: string } | null {
  const [nonce, encodedPath] = state.split('.')
  if (!nonce || !encodedPath) return null
  try {
    return { nonce, nextPath: Buffer.from(encodedPath, 'base64url').toString('utf8') }
  } catch {
    return null
  }
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: env.auth.google.clientId,
    redirect_uri: googleRedirectUri(),
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  })
  return `${AUTH_ENDPOINT}?${params.toString()}`
}

export interface GoogleProfile {
  sub: string
  email: string
  emailVerified: boolean
  name: string
  picture?: string
}

export async function exchangeGoogleCode(code: string): Promise<GoogleProfile> {
  const tokenResponse = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.auth.google.clientId,
      client_secret: env.auth.google.clientSecret,
      redirect_uri: googleRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    throw badRequest('Google sign-in could not be completed. Please try again.')
  }

  const tokens = (await tokenResponse.json()) as { access_token?: string }
  if (!tokens.access_token) throw badRequest('Google did not return an access token.')

  const profileResponse = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  if (!profileResponse.ok) throw badRequest('Google did not return a profile.')

  const profile = (await profileResponse.json()) as {
    sub?: string
    email?: string
    email_verified?: boolean
    name?: string
    picture?: string
  }

  if (!profile.sub || !profile.email) {
    throw badRequest('Google did not return an email address for this account.')
  }

  return {
    sub: profile.sub,
    email: profile.email.toLowerCase(),
    emailVerified: profile.email_verified ?? false,
    name: profile.name?.trim() || profile.email.split('@')[0] || 'Student',
    picture: profile.picture,
  }
}
