import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { GOOGLE_STATE_COOKIE, exchangeGoogleCode, googleEnabled, readOauthState } from '@/lib/auth/google'
import { safeNextPath } from '@/lib/auth/schemas'
import { createSession, isStaffRole } from '@/lib/auth/session'
import { linkReferral } from '@/lib/auth/register'
import { writeAudit } from '@/lib/audit'
import { env } from '@/lib/env'
import { NOTIFICATION_TYPES, notifyUser } from '@/lib/notifications'
import { getSettings } from '@/lib/settings'
import { slugify } from '@/lib/utils'
import { randomBytes } from 'node:crypto'

export const runtime = 'nodejs'

function fail(reason: string) {
  return NextResponse.redirect(`${env.appUrl}/login?error=${reason}`)
}

export async function GET(request: Request) {
  if (!googleEnabled()) return fail('google_unavailable')

  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (url.searchParams.get('error') || !code || !state) return fail('google_cancelled')

  const store = await cookies()
  const expectedState = store.get(GOOGLE_STATE_COOKIE)?.value
  store.delete(GOOGLE_STATE_COOKIE)

  // Constant-time comparison is unnecessary here — a mismatch is fatal either way.
  if (!expectedState || expectedState !== state) return fail('google_state_mismatch')

  const parsedState = readOauthState(state)
  const nextPath = safeNextPath(parsedState?.nextPath)

  try {
    const profile = await exchangeGoogleCode(code)

    const linked = await prisma.oAuthAccount.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: profile.sub } },
      include: { user: true },
    })

    let user = linked?.user ?? (await prisma.user.findUnique({ where: { email: profile.email } }))

    if (!user) {
      const settings = await getSettings()
      if (!settings.registrationEnabled) return fail('registration_disabled')

      const base = slugify(profile.name).split('-')[0]?.toUpperCase().slice(0, 12) || 'STUDENT'
      user = await prisma.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          emailVerified: profile.emailVerified ? new Date() : null,
          profile: {
            create: {
              targetScore: settings.defaultTargetScore,
              timezone: settings.timezone,
              avatarUrl: profile.picture ?? null,
              referralCode: `GLOBIFY-${base}-${randomBytes(2).toString('hex').toUpperCase()}`,
            },
          },
        },
      })

      await linkReferral(url.searchParams.get('ref'), user.id)
      await notifyUser({
        userId: user.id,
        type: NOTIFICATION_TYPES.welcome,
        title: 'Welcome to Globify PTE Premium',
        body: 'Set your target score, then take your first practice task. Your free account includes 5 AI speaking evaluations and 1 full mock test.',
        href: '/dashboard',
      })
    }

    if (user.status !== 'ACTIVE') return fail('account_suspended')

    if (!linked) {
      await prisma.oAuthAccount.create({
        data: { userId: user.id, provider: 'google', providerAccountId: profile.sub },
      })
    }

    await createSession(user.id)
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await writeAudit({
      actorId: user.id,
      actorRole: user.role,
      action: 'auth.login.google',
      entity: 'User',
      entityId: user.id,
    })

    const fallback = isStaffRole(user.role) && user.role !== 'STUDENT' ? '/admin' : '/dashboard'
    return NextResponse.redirect(`${env.appUrl}${nextPath === '/dashboard' ? fallback : nextPath}`)
  } catch (error) {
    console.error('[auth] google callback failed:', error instanceof Error ? error.message : error)
    return fail('google_failed')
  }
}
