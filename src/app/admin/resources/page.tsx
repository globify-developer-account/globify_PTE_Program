import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Resources',
  description: 'Study guides and articles.',
  path: '/admin/resources',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminResourcesPage() {
  await requireStaff('content.view')

  const resources = await prisma.resource.findMany({ orderBy: { displayOrder: 'asc' } })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Resources</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Study guides shown on the public resources page and inside the app.
        </p>
      </div>

      <Card>
        <CardHeader title={`${resources.length} articles`} />
        <DataTable
          rows={resources}
          rowKey={(resource) => resource.id}
          empty={{
            title: 'No resources yet',
            description: 'Run the seed script to publish the starter study guides.',
          }}
          columns={[
            {
              key: 'title',
              header: 'Article',
              render: (resource) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{resource.title}</p>
                  <p className="truncate font-mono text-xs text-ink-400">{resource.slug}</p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              render: (resource) => <span className="text-sm">{resource.category}</span>,
            },
            {
              key: 'read',
              header: 'Read time',
              align: 'right',
              secondary: true,
              render: (resource) => <span className="tabular text-sm">{resource.readMinutes} min</span>,
            },
            {
              key: 'access',
              header: 'Access',
              secondary: true,
              render: (resource) =>
                resource.isPremium ? (
                  <Badge tone="brand" size="sm">
                    Premium
                  </Badge>
                ) : (
                  <Badge tone="neutral" size="sm">
                    Free
                  </Badge>
                ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (resource) => (
                <Badge tone={statusTone(resource.status)}>{humanizeStatus(resource.status)}</Badge>
              ),
            },
            {
              key: 'published',
              header: 'Published',
              align: 'right',
              secondary: true,
              render: (resource) => (
                <span className="text-xs text-ink-500">
                  {resource.publishedAt ? formatDate(resource.publishedAt) : '—'}
                </span>
              ),
            },
            {
              key: 'view',
              header: '',
              align: 'right',
              render: (resource) => (
                <Link
                  href={`/resources/${resource.slug}`}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  View
                </Link>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
