import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable, Pagination } from '@/components/ui/data-table'
import { AdminSearch } from '@/components/admin/admin-search'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { formatDateTime } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Audit log',
  description: 'Every administrative action, recorded.',
  path: '/admin/audit',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

/** Colour by consequence, not by entity — destructive actions must stand out. */
function toneFor(action: string): 'danger' | 'success' | 'warning' | 'neutral' {
  if (/(rejected|deleted|archived|deactivated|suspended|refunded)/.test(action)) return 'danger'
  if (/(approved|activated|created|published)/.test(action)) return 'success'
  if (/(updated|changed|logout_all)/.test(action)) return 'warning'
  return 'neutral'
}

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  await requireStaff('audit.view')
  const { q = '', page = '1' } = await searchParams
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)

  const where: Prisma.AuditLogWhereInput = q
    ? {
        OR: [
          { action: { contains: q, mode: 'insensitive' } },
          { entity: { contains: q, mode: 'insensitive' } },
          { actor: { name: { contains: q, mode: 'insensitive' } } },
          { actor: { email: { contains: q, mode: 'insensitive' } } },
        ],
      }
    : {}

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        metadata: true,
        ip: true,
        createdAt: true,
        actorRole: true,
        actor: { select: { name: true, email: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Audit log</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Append-only record of administrative and security-relevant actions. Entries are never edited or
          removed from the application.
        </p>
      </div>

      <Card>
        <CardHeader title={`${total} entries`} action={<AdminSearch placeholder="Action, entity or actor…" />} />

        <DataTable
          rows={entries}
          rowKey={(entry) => entry.id}
          empty={{
            title: q ? 'No entries match that search' : 'No entries yet',
            description: 'Administrative actions are recorded here as they happen.',
          }}
          columns={[
            {
              key: 'action',
              header: 'Action',
              render: (entry) => (
                <Badge tone={toneFor(entry.action)}>
                  <span className="font-mono text-[11px]">{entry.action}</span>
                </Badge>
              ),
            },
            {
              key: 'actor',
              header: 'Actor',
              render: (entry) => (
                <div className="min-w-0">
                  <p className="truncate text-sm text-navy-900">
                    {entry.actor?.name ?? <span className="text-ink-400">System</span>}
                  </p>
                  {entry.actorRole ? (
                    <p className="text-xs text-ink-400">{entry.actorRole.toLowerCase()}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'entity',
              header: 'Entity',
              secondary: true,
              render: (entry) => (
                <div className="min-w-0">
                  <p className="text-sm text-ink-700">{entry.entity}</p>
                  {entry.entityId ? (
                    <p className="truncate font-mono text-[11px] text-ink-400">{entry.entityId}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'metadata',
              header: 'Detail',
              secondary: true,
              render: (entry) => {
                const meta = entry.metadata as Record<string, unknown>
                const text = Object.entries(meta ?? {})
                  .map(([key, value]) => `${key}=${String(value)}`)
                  .join(' · ')
                return text ? (
                  <span className="block max-w-[280px] truncate font-mono text-[11px] text-ink-500" title={text}>
                    {text}
                  </span>
                ) : (
                  <span className="text-ink-300">—</span>
                )
              },
            },
            {
              key: 'ip',
              header: 'IP',
              secondary: true,
              render: (entry) => (
                <span className="font-mono text-[11px] text-ink-500">{entry.ip ?? '—'}</span>
              ),
            },
            {
              key: 'when',
              header: 'When',
              align: 'right',
              render: (entry) => (
                <span className="whitespace-nowrap text-xs text-ink-500">
                  {formatDateTime(entry.createdAt)}
                </span>
              ),
            },
          ]}
        />

        <Pagination
          page={pageNumber}
          pageSize={PAGE_SIZE}
          total={total}
          buildHref={(next) => {
            const params = new URLSearchParams()
            if (q) params.set('q', q)
            params.set('page', String(next))
            return `/admin/audit?${params.toString()}`
          }}
        />
      </Card>
    </div>
  )
}
