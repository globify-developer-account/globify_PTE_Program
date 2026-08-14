import type { Role } from '@prisma/client'

/**
 * Role-based permissions. SUPER_ADMIN implicitly holds every permission;
 * everyone else gets exactly what is listed here plus any extra grants stored
 * on their AdminUser record.
 */
export const PERMISSIONS = [
  'admin.view',
  'students.view',
  'students.manage',
  'questions.view',
  'questions.manage',
  'mocks.view',
  'mocks.manage',
  'plans.view',
  'plans.manage',
  'payments.view',
  'payments.manage',
  'content.view',
  'content.manage',
  'reviews.view',
  'reviews.manage',
  'ai.view',
  'ai.manage',
  'analytics.view',
  'audit.view',
  'admins.manage',
  'settings.manage',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  STUDENT: [],
  TEACHER: ['reviews.view', 'reviews.manage'],
  CONTENT_MANAGER: [
    'admin.view',
    'questions.view',
    'questions.manage',
    'mocks.view',
    'mocks.manage',
    'content.view',
    'content.manage',
  ],
  ADMIN: [
    'admin.view',
    'students.view',
    'students.manage',
    'questions.view',
    'questions.manage',
    'mocks.view',
    'mocks.manage',
    'plans.view',
    'plans.manage',
    'payments.view',
    'payments.manage',
    'content.view',
    'content.manage',
    'reviews.view',
    'reviews.manage',
    'ai.view',
    'analytics.view',
    'audit.view',
  ],
  SUPER_ADMIN: [...PERMISSIONS],
}

export function permissionsFor(role: Role, extraGrants: string[] = []): Set<Permission> {
  if (role === 'SUPER_ADMIN') return new Set(PERMISSIONS)
  const granted = new Set<Permission>(ROLE_PERMISSIONS[role])
  for (const grant of extraGrants) {
    if ((PERMISSIONS as readonly string[]).includes(grant)) granted.add(grant as Permission)
  }
  return granted
}

export function hasPermission(role: Role, extraGrants: string[], permission: Permission): boolean {
  return permissionsFor(role, extraGrants).has(permission)
}
