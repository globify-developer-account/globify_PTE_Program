import 'server-only'
import type { NotificationChannel, Prisma } from '@prisma/client'
import { prisma } from './db'

/**
 * Notification service.
 *
 * Only the in-app channel is delivered today. Email, WhatsApp and SMS rows can
 * already be written — they simply stay unsent until a dispatcher for those
 * channels is wired up, which keeps the data model stable when it is.
 */

export const NOTIFICATION_TYPES = {
  welcome: 'welcome',
  subscriptionActivated: 'subscription.activated',
  subscriptionExpiring: 'subscription.expiring',
  subscriptionExpired: 'subscription.expired',
  paymentReceived: 'payment.received',
  paymentApproved: 'payment.approved',
  paymentRejected: 'payment.rejected',
  mockAvailable: 'mock.available',
  resourcePublished: 'resource.published',
  practiceReminder: 'practice.reminder',
  announcement: 'announcement',
  scoreReady: 'score.ready',
  teacherReviewed: 'review.completed',
} as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[keyof typeof NOTIFICATION_TYPES]

export interface NotifyInput {
  userId: string
  type: NotificationType
  title: string
  body: string
  href?: string
  channel?: NotificationChannel
}

export async function notifyUser(input: NotifyInput): Promise<void> {
  const channel = input.channel ?? 'IN_APP'
  await prisma.notification
    .create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        href: input.href ?? null,
        channel,
        // In-app notifications are "sent" the moment they are stored.
        sentAt: channel === 'IN_APP' ? new Date() : null,
      },
    })
    .catch((error: unknown) => {
      console.error('[notifications] failed to create:', error instanceof Error ? error.message : error)
    })
}

export async function notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<number> {
  if (userIds.length === 0) return 0
  const now = new Date()
  const channel = input.channel ?? 'IN_APP'
  const data: Prisma.NotificationCreateManyInput[] = userIds.map((userId) => ({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    channel,
    sentAt: channel === 'IN_APP' ? now : null,
  }))
  const result = await prisma.notification.createMany({ data })
  return result.count
}

export async function unreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } }).catch(() => 0)
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  })
}
