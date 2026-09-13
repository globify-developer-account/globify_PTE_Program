import 'server-only'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { User } from '@prisma/client'
import { writeAudit } from '../audit'
import { prisma } from '../db'
import { env } from '../env'
import { getSettings } from '../settings'
import { facebookProvider } from './facebook'
import { googleProvider } from './google'
import { canLinkByEmail, createOauthState, readOauthState, type OAuthProviderId } from './oauth-state'
import { registerUser } from './register'
import { safeNextPath } from './schemas'
import { createSession, isStaffRole } from './session'

/**
 * The provider-independent half of social sign-in: state cookie, account
 * resolution, session. Each provider only knows how to build its consent URL
 * and turn a code into a profile.
 */

export interface OAuthProfile {
  providerAccountId: string
  /** Lower-cased. Null when the provider has no email for this person. */
  email: string | null
  /** True only when the provider asserts the person controls `email`. */
  emailVerified: boolean
  name: string
  picture?: string
}

export interface OAuthProvider {
  id: OAuthProviderId
  label: string
  enabled(): boolean
  authUrl(state: string, redirectUri: string): string
  exchangeCode(code: string, redirectUri: string): Promise<OAuthProfile>
}

const PROVIDERS: Record<OAuthProviderId, OAuthProvider> = {
  google: googleProvider,
  facebook: facebookProvider,
}

/** Providers with credentials configured, in display order. */
export function enabledOAuthProviders(): OAuthProviderId[] {
  return Object.values(PROVIDERS)
    .filter((provider) => provider.enabled())
    .map((provider) => provider.id)
}

function redirectUri(provider: OAuthProvider): string {
  return `${env.appUrl}/api/auth/${provider.id}/callback`
}

function stateCookie(provider: OAuthProvider): string {
  return `globify_oauth_state_${provider.id}`
}

/** Error codes understood by the login form. */
export type OAuthErrorCode =
  | 'oauth_unavailable'
  | 'oauth_cancelled'
  | 'oauth_state_mismatch'
  | 'oauth_failed'
  | 'oauth_no_email'
  | 'oauth_account_exists'
  | 'account_suspended'
  | 'registration_disabled'

function fail(provider: OAuthProvider, code: OAuthErrorCode) {
  const params = new URLSearchParams({ error: code, provider: provider.id })
  return NextResponse.redirect(`${env.appUrl}/login?${params.toString()}`)
}

class OAuthFailure extends Error {
  constructor(readonly code: OAuthErrorCode) {
    super(code)
  }
}

/** GET /api/auth/{provider} — sends the browser to the provider's consent screen. */
export async function beginOAuth(providerId: OAuthProviderId, request: Request): Promise<NextResponse> {
  const provider = PROVIDERS[providerId]
  if (!provider.enabled()) return fail(provider, 'oauth_unavailable')

  const url = new URL(request.url)
  const state = createOauthState({
    next: url.searchParams.get('next') ?? undefined,
    ref: url.searchParams.get('ref') ?? undefined,
  })

  const store = await cookies()
  store.set(stateCookie(provider), state, {
    httpOnly: true,
    // Lax is required: the callback is a top-level navigation from the provider.
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(provider.authUrl(state, redirectUri(provider)))
}

/** GET /api/auth/{provider}/callback — finishes sign-in or sign-up. */
export async function completeOAuth(providerId: OAuthProviderId, request: Request): Promise<NextResponse> {
  const provider = PROVIDERS[providerId]
  if (!provider.enabled()) return fail(provider, 'oauth_unavailable')

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error') || !code || !state) return fail(provider, 'oauth_cancelled')

  const store = await cookies()
  const expectedState = store.get(stateCookie(provider))?.value
  store.delete(stateCookie(provider))

  // Constant-time comparison is unnecessary here — a mismatch is fatal either way.
  const payload = expectedState && expectedState === state ? readOauthState(state) : null
  if (!payload) return fail(provider, 'oauth_state_mismatch')

  try {
    const profile = await provider.exchangeCode(code, redirectUri(provider))
    const user = await resolveUser(provider, profile, payload.ref)

    if (user.status === 'SUSPENDED') return fail(provider, 'account_suspended')
    if (user.status !== 'ACTIVE') return fail(provider, 'oauth_failed')

    await createSession(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: `auth.login.${provider.id}`,
      entity: 'User',
      entityId: user.id,
    })

    const fallback = isStaffRole(user.role) ? '/admin' : '/dashboard'
    return NextResponse.redirect(`${env.appUrl}${safeNextPath(payload.next, fallback)}`)
  } catch (error) {
    if (error instanceof OAuthFailure) return fail(provider, error.code)
    console.error(`[auth] ${provider.id} callback failed:`, error instanceof Error ? error.message : error)
    return fail(provider, 'oauth_failed')
  }
}

/**
 * Finds the account for a provider identity, in order:
 *   1. an account already linked to this identity;
 *   2. an existing account with the same email, if the provider verified it;
 *   3. a brand-new student account, if registration is open.
 */
async function resolveUser(provider: OAuthProvider, profile: OAuthProfile, ref: string | undefined): Promise<User> {
  const linked = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider: provider.id, providerAccountId: profile.providerAccountId },
    },
    include: { user: true },
  })
  if (linked) return linked.user

  if (!profile.email) throw new OAuthFailure('oauth_no_email')

  const existing = await prisma.user.findUnique({ where: { email: profile.email } })
  if (existing) {
    if (!canLinkByEmail(profile)) throw new OAuthFailure('oauth_account_exists')

    await prisma.oAuthAccount.create({
      data: { userId: existing.id, provider: provider.id, providerAccountId: profile.providerAccountId },
    })
    if (!existing.emailVerified) {
      // The provider just proved control of the inbox.
      return prisma.user.update({ where: { id: existing.id }, data: { emailVerified: new Date() } })
    }
    return existing
  }

  const settings = await getSettings()
  if (!settings.registrationEnabled) throw new OAuthFailure('registration_disabled')

  const user = await registerUser({
    name: profile.name.slice(0, 120),
    email: profile.email,
    password: null,
    emailVerified: profile.emailVerified,
    avatarUrl: profile.picture ?? null,
    referralCode: ref ?? null,
    oauthAccount: { provider: provider.id, providerAccountId: profile.providerAccountId },
  })

  await writeAudit({
    actorId: user.id,
    actorRole: user.role,
    action: `auth.register.${provider.id}`,
    entity: 'User',
    entityId: user.id,
  })

  return user
}
