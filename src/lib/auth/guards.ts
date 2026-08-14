import 'server-only'
import { redirect } from 'next/navigation'
import type { Role } from '@prisma/client'
import { getCurrentUser, isStaffRole, type SessionUser } from './session'
import { hasPermission, type Permission } from './permissions'
import { forbidden, unauthorized } from '../http'

/** Server-component guard: redirects to sign-in, preserving the target path. */
export async function requireUser(nextPath?: string): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) {
    const target = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'
    redirect(target)
  }
  return user
}

/**
 * Student area guard. Staff accounts are allowed through — admins and teachers
 * need the student view to reproduce what a learner sees.
 */
export async function requireStudent(nextPath?: string): Promise<SessionUser> {
  return requireUser(nextPath)
}

export async function requireStaff(permission: Permission = 'admin.view'): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) redirect('/admin/login')
  if (!isStaffRole(user.role)) redirect('/dashboard')
  if (!hasPermission(user.role, user.adminProfile?.permissions ?? [], permission)) {
    redirect('/admin/no-access')
  }
  if (user.adminProfile && !user.adminProfile.isActive) redirect('/admin/no-access')
  return user
}

/** API-route guard: throws instead of redirecting. */
export async function requireApiUser(): Promise<SessionUser> {
  const user = await getCurrentUser()
  if (!user) throw unauthorized()
  return user
}

export async function requireApiStaff(permission: Permission = 'admin.view'): Promise<SessionUser> {
  const user = await requireApiUser()
  if (!isStaffRole(user.role)) throw forbidden()
  if (user.adminProfile && !user.adminProfile.isActive) throw forbidden('This admin account is deactivated.')
  if (!hasPermission(user.role, user.adminProfile?.permissions ?? [], permission)) {
    throw forbidden(`This action requires the "${permission}" permission.`)
  }
  return user
}

export async function requireApiRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireApiUser()
  if (!roles.includes(user.role)) throw forbidden()
  return user
}
