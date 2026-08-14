import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { cache } from 'react'
import type { Role, User, Profile, AdminUser } from '@prisma/client'
import { prisma } from '../db'
import { env } from '../env'

export const SESSION_COOKIE = 'globify_session'

export interface SessionUser extends User {
  profile: Profile | null
  adminProfile: AdminUser | null
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/**
 * Issues a new session. The raw token only ever exists in the cookie; the
 * database stores its SHA-256 digest, so a database leak cannot be replayed.
 */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + env.auth.sessionDays * 86_400_000)

  const headerList = await headers()
  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: headerList.get('user-agent')?.slice(0, 400) ?? null,
      ip: clientIp(headerList),
    },
  })

  const store = await cookies()
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProduction,
    path: '/',
    expires: expiresAt,
  })
}

export function clientIp(headerList: Headers): string | null {
  const forwarded = headerList.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim().slice(0, 64)
  return headerList.get('x-real-ip')?.slice(0, 64) ?? null
}

/**
 * Resolves the signed-in user for the current request. Memoised per request so
 * a page and its nested layouts share a single database round trip.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  if (!env.databaseUrl) return null
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: { include: { profile: true, adminProfile: true } } },
    })

    if (!session || session.revokedAt || session.expiresAt < new Date()) return null
    if (session.user.status !== 'ACTIVE') return null

    return session.user
  } catch (error) {
    console.error('[auth] session lookup failed:', error instanceof Error ? error.message : error)
    return null
  }
})

/** Refreshes `lastSeenAt`. Fire-and-forget — never block a render on it. */
export async function touchSession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return
  await prisma.session
    .updateMany({ where: { tokenHash: hashToken(token) }, data: { lastSeenAt: new Date() } })
    .catch(() => undefined)
}

export async function destroySession(): Promise<void> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (token) {
    await prisma.session
      .updateMany({ where: { tokenHash: hashToken(token) }, data: { revokedAt: new Date() } })
      .catch(() => undefined)
  }
  store.delete(SESSION_COOKIE)
}

/** Signs the user out everywhere — used by "Log out all sessions" in Profile. */
export async function destroyAllSessions(userId: string): Promise<number> {
  const result = await prisma.session.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  })
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  return result.count
}

export function isAdminRole(role: Role): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'CONTENT_MANAGER'
}

export function isStaffRole(role: Role): boolean {
  return role !== 'STUDENT'
}
