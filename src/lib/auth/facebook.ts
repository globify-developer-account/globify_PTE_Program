import 'server-only'
import { createHmac } from 'node:crypto'
import { env } from '../env'
import { badRequest } from '../http'
import type { OAuthProfile, OAuthProvider } from './oauth'

/**
 * Facebook Login via the Graph API authorization-code flow.
 *
 * Graph API versions are supported for roughly two years after release; bump
 * this when Meta's dashboard warns the app is on a version nearing end of life.
 */
const GRAPH_VERSION = 'v23.0'
const AUTH_ENDPOINT = `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`
const GRAPH_ENDPOINT = `https://graph.facebook.com/${GRAPH_VERSION}`

export const facebookProvider: OAuthProvider = {
  id: 'facebook',
  label: 'Facebook',

  enabled() {
    return Boolean(env.auth.facebook.appId && env.auth.facebook.appSecret)
  },

  authUrl(state, redirectUri) {
    const params = new URLSearchParams({
      client_id: env.auth.facebook.appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      state,
    })
    // Apps set up as "Facebook Login for Business" define their permissions in
    // a configuration and must pass its id; consumer apps request scopes directly.
    if (env.auth.facebook.configId) params.set('config_id', env.auth.facebook.configId)
    else params.set('scope', 'public_profile,email')
    return `${AUTH_ENDPOINT}?${params.toString()}`
  },

  async exchangeCode(code, redirectUri): Promise<OAuthProfile> {
    const tokenParams = new URLSearchParams({
      client_id: env.auth.facebook.appId,
      client_secret: env.auth.facebook.appSecret,
      redirect_uri: redirectUri,
      code,
    })
    const tokenResponse = await fetch(`${GRAPH_ENDPOINT}/oauth/access_token?${tokenParams.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!tokenResponse.ok) {
      throw badRequest('Facebook sign-in could not be completed. Please try again.')
    }

    const tokens = (await tokenResponse.json()) as { access_token?: string }
    if (!tokens.access_token) throw badRequest('Facebook did not return an access token.')

    // appsecret_proof proves the call comes from our server, so a leaked user
    // token cannot be replayed against the Graph API as our app.
    const profileParams = new URLSearchParams({
      fields: 'id,name,email',
      access_token: tokens.access_token,
      appsecret_proof: createHmac('sha256', env.auth.facebook.appSecret).update(tokens.access_token).digest('hex'),
    })
    const profileResponse = await fetch(`${GRAPH_ENDPOINT}/me?${profileParams.toString()}`, {
      signal: AbortSignal.timeout(10_000),
    })
    if (!profileResponse.ok) throw badRequest('Facebook did not return a profile.')

    const profile = (await profileResponse.json()) as { id?: string; name?: string; email?: string }
    if (!profile.id) throw badRequest('Facebook did not return an account id.')

    // Email is absent when the account was registered with a phone number or
    // the person declined the email permission.
    const email = profile.email?.trim().toLowerCase() || null
    return {
      providerAccountId: profile.id,
      email,
      // Facebook does not say whether an address was confirmed, so it is never
      // trusted to claim an existing account. See `canLinkByEmail`.
      emailVerified: false,
      name: profile.name?.trim() || email?.split('@')[0] || 'Student',
      // Facebook picture URLs are signed and expire, so they are not stored.
      picture: undefined,
    }
  },
}
