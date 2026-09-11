import { NextResponse, type NextRequest } from 'next/server'

/**
 * Edge middleware does a cheap first pass only: it redirects visitors with no
 * session cookie away from private routes so they never see a loading shell.
 *
 * It is NOT the security boundary. A cookie can be forged; every private page
 * and API route independently verifies the session against the database via
 * `requireUser` / `requireApiUser`. This exists purely for a better experience.
 */

const SESSION_COOKIE = 'globify_session'

const PRIVATE_PREFIXES = [
  '/dashboard',
  '/practice',
  '/mock-tests',
  '/progress',
  '/profile',
  '/subscription',
  '/notifications',
  '/ai-tools',
  '/writing-improvement',
  '/conversations',
  '/checkout',
]

const AUTH_PAGES = ['/login', '/register', '/forgot-password']

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)

  if (!hasSession && PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', `${pathname}${search}`)
    return NextResponse.redirect(loginUrl)
  }

  if (!hasSession && (pathname === '/admin' || pathname.startsWith('/admin/')) && pathname !== '/admin/login') {
    const loginUrl = new URL('/admin/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Everything except Next internals, static assets and the API — API routes
     * do their own authorization and must return JSON, not a redirect.
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|icon-maskable.svg|manifest.webmanifest|robots.txt|sitemap.xml).*)',
  ],
}
