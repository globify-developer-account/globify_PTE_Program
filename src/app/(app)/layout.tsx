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
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireStudent()
  const entitlements = await getEntitlements(user.id)
  const [practiceQuota, unread] = await Promise.all([
    getQuota(user.id, 'practice', entitlements),
    unreadCount(user.id),
  ])

  return (
    <div className="min-h-dvh bg-ink-50">
      <AppSidebar
        summary={{
          isPremium: entitlements.isPremium,
          planName: entitlements.plan?.name ?? null,
          daysRemaining: entitlements.daysRemaining,
          practiceUsed: practiceQuota.used,
          practiceLimit: practiceQuota.unlimited ? practiceQuota.used : practiceQuota.limit,
        }}
      />

      <div className="lg:pl-64">
        <AppTopbar
          user={{
            name: user.name,
            email: user.email,
            avatarUrl: user.profile?.avatarUrl ?? null,
            isPremium: entitlements.isPremium,
            streakDays: user.profile?.streakDays ?? 0,
            unreadCount: unread,
          }}
        />
        {/* Bottom padding clears the mobile tab bar. */}
        <main className="container-page py-6 pb-24 lg:pb-10">{children}</main>
      </div>

      <MobileNav />
    </div>
  )
}
