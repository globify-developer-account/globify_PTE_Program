import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { MarkAllRead } from '@/components/notifications/mark-all-read'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { cn, relativeTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Notifications',
  description: 'Score updates, subscription changes and announcements.',
  path: '/notifications',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  const user = await requireStudent('/notifications')

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, title: true, body: true, href: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, readAt: null } }),
  ])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Notifications</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            {unread > 0 ? `${unread} unread` : 'You are all caught up.'}
          </p>
        </div>
        {unread > 0 ? <MarkAllRead /> : null}
      </div>

      <Card>
        <CardHeader title="Recent" description="The last 50 notifications on your account." />
        {notifications.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {notifications.map((notification) => {
              const content = (
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      notification.readAt ? 'bg-transparent' : 'bg-brand-600',
                    )}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        notification.readAt ? 'text-ink-600' : 'font-semibold text-navy-900',
                      )}
                    >
                      {notification.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-ink-500">{notification.body}</p>
                    <p className="mt-1.5 text-xs text-ink-400">{relativeTime(notification.createdAt)}</p>
                  </div>
                </div>
              )

              return (
                <li key={notification.id}>
                  {notification.href ? (
                    <Link
                      href={notification.href}
                      className="block px-5 py-4 transition-colors hover:bg-ink-50"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="px-5 py-4">{content}</div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <EmptyState
            icon={<Bell aria-hidden />}
            title="No notifications yet"
            description="Score updates, subscription changes and announcements appear here."
            action={{ label: 'Start practising', href: '/practice' }}
          />
        )}
      </Card>
    </div>
  )
}
