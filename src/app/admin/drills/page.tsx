import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { ButtonLink } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { LinkTabs } from '@/components/ui/tabs'
import { requireStaff } from '@/lib/auth/guards'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, pluralize } from '@/lib/utils'
import type { ContentStatus, Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Dictation & Shadowing',
  description: 'Author the dictation and shadowing exercise library.',
  path: '/admin/drills',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Drafts' },
  { key: 'ARCHIVED', label: 'Archived' },
  { key: 'all', label: 'All' },
]

export default async function AdminDrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const staff = await requireStaff('content.view')
  const { status } = await searchParams
  const canManage = hasPermission(staff.role, staff.adminProfile?.permissions ?? [], 'content.manage')

  const where: Prisma.DrillWhereInput =
    status && status !== 'all' ? { status: status as ContentStatus } : {}

  const [drills, counts] = await Promise.all([
    prisma.drill.findMany({
      where,
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        difficulty: true,
        isPremium: true,
        timesAttempted: true,
        updatedAt: true,
        category: { select: { name: true } },
        _count: { select: { segments: true } },
      },
    }),
    prisma.drill.groupBy({ by: ['status'], _count: { _all: true } }),
  ])

  const total = counts.reduce((sum, row) => sum + row._count._all, 0)
  const countFor = (key: string) =>
    key === 'all' ? total : (counts.find((row) => row.status === key)?._count._all ?? 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Dictation &amp; Shadowing</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            One recording per exercise, split into lines students type or read aloud.
          </p>
        </div>
        {canManage ? <ButtonLink href="/admin/drills/new">New exercise</ButtonLink> : null}
      </div>

      <Card>
        <CardHeader title="Exercise library" />

        <LinkTabs
          items={TABS.map((tab) => ({ ...tab, count: countFor(tab.key) }))}
          paramName="status"
          className="px-5"
        />

        <DataTable
          rows={drills}
          rowKey={(drill) => drill.id}
          rowHref={canManage ? (drill) => `/admin/drills/${drill.id}` : undefined}
          empty={{
            title: 'No exercises yet',
            description:
              'Create one by uploading a recording, pasting its transcript and marking where each line falls.',
            action: canManage ? { label: 'New exercise', href: '/admin/drills/new' } : undefined,
          }}
          columns={[
            {
              key: 'title',
              header: 'Exercise',
              render: (drill) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{drill.title}</p>
                  <p className="truncate font-mono text-xs text-ink-400">/drills/{drill.slug}</p>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'Category',
              render: (drill) => <span className="text-sm">{drill.category.name}</span>,
            },
            {
              key: 'lines',
              header: 'Lines',
              align: 'right',
              secondary: true,
              render: (drill) => <span className="tabular">{drill._count.segments}</span>,
            },
            {
              key: 'attempts',
              header: 'Attempts',
              align: 'right',
              secondary: true,
              render: (drill) => <span className="tabular">{drill.timesAttempted}</span>,
            },
            {
              key: 'updated',
              header: 'Updated',
              secondary: true,
              render: (drill) => (
                <span className="text-xs text-ink-500">{formatDate(drill.updatedAt)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (drill) => (
                <span className="flex flex-wrap gap-1.5">
                  <Badge tone={statusTone(drill.status)} size="sm">
                    {humanizeStatus(drill.status)}
                  </Badge>
                  {drill.isPremium ? (
                    <Badge tone="brand" size="sm">
                      Premium
                    </Badge>
                  ) : null}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <p className="text-xs text-ink-400">
        {pluralize(total, 'exercise')} in the library.
      </p>
    </div>
  )
}
