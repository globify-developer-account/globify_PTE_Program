import 'server-only'
import type { InstituteRole } from '@prisma/client'
import { prisma } from '@/lib/db'

export interface InstituteMembership {
  instituteId: string
  name: string
  slug: string
  logoUrl: string | null
  role: InstituteRole
  batch: string | null
  joinedAt: Date
  seatLimit: number
  memberCount: number
}

export interface CohortMember {
  userId: string
  name: string
  email: string
  avatarUrl: string | null
  role: InstituteRole
  batch: string | null
  joinedAt: Date
  /** Questions submitted, all time. Null when they have never practised. */
  attempts: number
  lastPracticeDate: Date | null
}

/**
 * The institute this learner belongs to, if any.
 *
 * A learner belongs to at most one institute in practice, but the schema
 * permits several, so the most recently joined wins — that is the one they
 * are currently studying with.
 */
export async function getMembership(userId: string): Promise<InstituteMembership | null> {
  const row = await prisma.instituteMember.findFirst({
    where: { userId, institute: { status: 'ACTIVE' } },
    orderBy: { joinedAt: 'desc' },
    select: {
      role: true,
      batch: true,
      joinedAt: true,
      institute: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          seatLimit: true,
          _count: { select: { members: true } },
        },
      },
    },
  })
  if (!row) return null

  return {
    instituteId: row.institute.id,
    name: row.institute.name,
    slug: row.institute.slug,
    logoUrl: row.institute.logoUrl,
    role: row.role,
    batch: row.batch,
    joinedAt: row.joinedAt,
    seatLimit: row.institute.seatLimit,
    memberCount: row.institute._count.members,
  }
}

/**
 * The student roster, for an institute owner or teacher.
 *
 * Callers must check the viewer's role before calling this — it returns every
 * student's email and practice history, which a fellow student has no business
 * seeing.
 */
export async function getCohort(instituteId: string): Promise<CohortMember[]> {
  const rows = await prisma.instituteMember.findMany({
    where: { instituteId, role: 'STUDENT' },
    orderBy: [{ batch: 'asc' }, { joinedAt: 'asc' }],
    select: {
      role: true,
      batch: true,
      joinedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profile: { select: { avatarUrl: true, lastPracticeDate: true } },
          _count: { select: { attempts: true } },
        },
      },
    },
  })

  return rows.map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    avatarUrl: row.user.profile?.avatarUrl ?? null,
    role: row.role,
    batch: row.batch,
    joinedAt: row.joinedAt,
    attempts: row.user._count.attempts,
    lastPracticeDate: row.user.profile?.lastPracticeDate ?? null,
  }))
}

/** Owners and teachers may see the roster; students may not. */
export function canManageCohort(role: InstituteRole): boolean {
  return role === 'OWNER' || role === 'TEACHER'
}

export const INSTITUTE_ROLE_LABEL: Record<InstituteRole, string> = {
  OWNER: 'Owner',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
}
