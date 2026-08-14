import type { ReactNode } from 'react'
import Link from 'next/link'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { AdminUserMenu } from '@/components/admin/admin-user-menu'
import { getCurrentUser, isStaffRole } from '@/lib/auth/session'
import { permissionsFor } from '@/lib/auth/permissions'
import { env } from '@/lib/env'

/**
 * Admin shell.
 *
 * This layout wraps `/admin/login` and `/admin/no-access` too, so it must not
 * itself redirect — it renders a bare frame for signed-out visitors and lets
 * each page enforce its own `requireStaff(permission)`.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser()
  const staff = user && isStaffRole(user.role) ? user : null

  if (!staff) {
    return <div className="min-h-dvh bg-ink-50">{children}</div>
  }

  const permissions = [...permissionsFor(staff.role, staff.adminProfile?.permissions ?? [])]

  return (
    <div className="min-h-dvh bg-ink-50">
      <AdminSidebar permissions={permissions} />

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hairline bg-white/90 px-4 pl-16 backdrop-blur-md sm:px-6 lg:pl-6">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold text-navy-900">Administration</p>
          </div>

          {env.demoMode ? (
            <span className="hidden rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 sm:inline">
              Demo mode
            </span>
          ) : null}

          <Link
            href="/dashboard"
            className="hidden rounded-lg px-3 py-1.5 text-sm font-medium text-ink-600 hover:bg-ink-100 sm:block"
          >
            Student view
          </Link>

          <AdminUserMenu
            name={staff.name}
            email={staff.email}
            role={staff.role}
            title={staff.adminProfile?.title ?? null}
          />
        </header>

        <main className="container-page py-6">{children}</main>
      </div>
    </div>
  )
}
