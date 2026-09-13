import 'server-only'
import { env } from '../env'
import { badRequest } from '../http'
import type { OAuthProfile, OAuthProvider } from './oauth'

/**
 * Google Sign-In implemented directly against the OAuth 2.0 endpoints.
 *
 * A full auth library would be a heavy dependency for two providers, and the
 * authorization-code flow is small enough to own. The shared flow — state
 * cookie, account linking, session — lives in `./oauth`.
 */

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const USERINFO_ENDPOINT = 'https://openidconnect.googleapis.com/v1/userinfo'

export const googleProvider: OAuthProvider = {
  id: 'google',
  label: 'Google',

  enabled() {
    return Boolean(env.auth.google.clientId && env.auth.google.clientSecret)
  },

  authUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: env.auth.google.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      access_type: 'online',
      prompt: 'select_account',
    })
    return `${AUTH_ENDPOINT}?${params.toString()}`
  },

  async exchangeCode(code, redirectUri): Promise<OAuthProfile> {
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.auth.google.clientId,
        client_secret: env.auth.google.clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!tokenResponse.ok) {
      throw badRequest('Google sign-in could not be completed. Please try again.')
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string }
    if (!tokens.access_token) throw badRequest('Google did not return an access token.')

    const profileResponse = await fetch(USERINFO_ENDPOINT, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(10_000),
    })
    if (!profileResponse.ok) throw badRequest('Google did not return a profile.')

    const profile = (await profileResponse.json()) as {
      sub?: string
      email?: string
      email_verified?: boolean
      name?: string
      picture?: string
    }

    if (!profile.sub) throw badRequest('Google did not return an account id.')

    const email = profile.email?.trim().toLowerCase() || null
    return {
      providerAccountId: profile.sub,
      email,
      emailVerified: profile.email_verified === true,
      name: profile.name?.trim() || email?.split('@')[0] || 'Student',
      picture: profile.picture,
    }
  },
}
