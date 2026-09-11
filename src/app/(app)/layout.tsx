import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/layout/app-sidebar'
import { AppTopbar } from '@/components/layout/app-topbar'
import { MobileNav } from '@/components/layout/mobile-nav'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { unreadCount } from '@/lib/notifications'

/**
 * Shell for every signed-in student page.
 *
 * `requireStudent` is the real gate — the edge middleware only redirects on a
 * missing cookie, which is a convenience, not a security boundary.
 *
 * The masthead spans the full width and the user-centre rail sits beneath it
 * beside the page, so product navigation and account navigation stay visually
 * distinct.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireStudent()
  const entitlements = await getEntitlements(user.id)
  const [practiceQuota, unread] = await Promise.all([
    getQuota(user.id, 'practice', entitlements),
    unreadCount(user.id),
  ])

  return (
    <div className="min-h-dvh bg-canvas">
      <AppTopbar
        user={{
          name: user.name,
          email: user.email,
          avatarUrl: user.profile?.avatarUrl ?? null,
          isPremium: entitlements.isPremium,
          streakDays: user.profile?.streakDays ?? 0,
          unreadCount: unread,
          pteVariant: user.profile?.pteVariant ?? 'ACADEMIC_UKVI',
        }}
      />

      <div className="container-page flex gap-6 py-5">
        <AppSidebar
          summary={{
            name: user.name,
            avatarUrl: user.profile?.avatarUrl ?? null,
            isPremium: entitlements.isPremium,
            planName: entitlements.plan?.name ?? null,
            daysRemaining: entitlements.daysRemaining,
            practiceUsed: practiceQuota.used,
            practiceLimit: practiceQuota.unlimited ? practiceQuota.used : practiceQuota.limit,
          }}
        />

        {/* Bottom padding clears the mobile tab bar. min-w-0 stops wide tables
            inside a page from forcing the whole flex row to overflow. */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-6">{children}</main>
      </div>

      <MobileNav />
    </div>
  )
}
