import { Pin } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Announcements',
  description: 'Messages shown to students.',
  path: '/admin/announcements',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminAnnouncementsPage() {
  await requireStaff('content.view')

  const announcements = await prisma.announcement.findMany({ orderBy: { createdAt: 'desc' } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Announcements</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Platform messages, optionally targeted at free, premium or lapsed students.
        </p>
      </div>

      <Card>
        <CardHeader title={`${announcements.length} announcements`} />
        <DataTable
          rows={announcements}
          rowKey={(item) => item.id}
          empty={{
            title: 'No announcements',
            description: 'Announcements appear on the student dashboard and notification list.',
          }}
          columns={[
            {
              key: 'title',
              header: 'Announcement',
              render: (item) => (
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-medium text-navy-900">
                    {item.isPinned ? <Pin className="size-3.5 text-brand-600" aria-hidden /> : null}
                    <span className="truncate">{item.title}</span>
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-xs text-ink-500">{item.body}</p>
                </div>
              ),
            },
            {
              key: 'audience',
              header: 'Audience',
              render: (item) => <Badge tone="neutral">{humanizeStatus(item.audience)}</Badge>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (item) => <Badge tone={statusTone(item.status)}>{humanizeStatus(item.status)}</Badge>,
            },
            {
              key: 'published',
              header: 'Published',
              align: 'right',
              secondary: true,
              render: (item) => (
                <span className="text-xs text-ink-500">
                  {item.publishedAt ? formatDate(item.publishedAt) : '—'}
                </span>
              ),
            },
            {
              key: 'expires',
              header: 'Expires',
              align: 'right',
              secondary: true,
              render: (item) => (
                <span className="text-xs text-ink-500">
                  {item.expiresAt ? formatDate(item.expiresAt) : 'Never'}
                </span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
