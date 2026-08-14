import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { GOOGLE_STATE_COOKIE, createOauthState, googleAuthUrl, googleEnabled } from '@/lib/auth/google'
import { safeNextPath } from '@/lib/auth/schemas'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (!googleEnabled()) {
    return NextResponse.redirect(`${env.appUrl}/login?error=google_unavailable`)
  }

  const url = new URL(request.url)
  const state = createOauthState(safeNextPath(url.searchParams.get('next')))

  const store = await cookies()
  store.set(GOOGLE_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    maxAge: 600,
  })

  return NextResponse.redirect(googleAuthUrl(state))
}
