import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable, Pagination } from '@/components/ui/data-table'
import { LinkTabs } from '@/components/ui/tabs'
import { AdminSearch } from '@/components/admin/admin-search'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, relativeTime } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Students',
  description: 'Every student account on the platform.',
  path: '/admin/students',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'premium', label: 'Premium' },
  { key: 'free', label: 'Free' },
  { key: 'suspended', label: 'Suspended' },
]

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; page?: string }>
}) {
  await requireStaff('students.view')
  const { q = '', filter = '', page = '1' } = await searchParams

  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)
  const now = new Date()

  const where: Prisma.UserWhereInput = {
    role: 'STUDENT',
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { email: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
    ...(filter === 'suspended' ? { status: 'SUSPENDED' } : {}),
    ...(filter === 'premium'
      ? { subscriptions: { some: { status: 'ACTIVE', expiresAt: { gt: now } } } }
      : {}),
    ...(filter === 'free'
      ? { subscriptions: { none: { status: 'ACTIVE', expiresAt: { gt: now } } } }
      : {}),
  }

  const [students, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        profile: { select: { targetScore: true, currentEstimateScore: true, city: true } },
        subscriptions: {
          where: { status: 'ACTIVE', expiresAt: { gt: now } },
          select: { expiresAt: true, plan: { select: { name: true } } },
          take: 1,
        },
        _count: { select: { attempts: true } },
      },
    }),
    prisma.user.count({ where }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Students</h2>
        <p className="mt-1.5 text-sm text-ink-500">{total} accounts</p>
      </div>

      <Card>
        <CardHeader
          title="All students"
          action={<AdminSearch placeholder="Search name or email…" />}
        />

        <LinkTabs items={FILTERS} paramName="filter" className="px-5" />

        <DataTable
          rows={students}
          rowKey={(student) => student.id}
          rowHref={(student) => `/admin/students/${student.id}`}
          empty={{
            title: q ? 'No students match that search' : 'No students yet',
            description: q ? 'Try a different name or email.' : 'Accounts appear here as students register.',
          }}
          columns={[
            {
              key: 'name',
              header: 'Student',
              render: (student) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{student.name}</p>
                  <p className="truncate text-xs text-ink-500">{student.email}</p>
                </div>
              ),
            },
            {
              key: 'plan',
              header: 'Plan',
              render: (student) =>
                student.subscriptions[0] ? (
                  <Badge tone="success">{student.subscriptions[0].plan.name}</Badge>
                ) : (
                  <Badge tone="neutral">Free</Badge>
                ),
            },
            {
              key: 'score',
              header: 'Estimate',
              align: 'right',
              secondary: true,
              render: (student) => (
                <span className="tabular">
                  {student.profile?.currentEstimateScore ?? '—'}
                  <span className="text-ink-400"> / {student.profile?.targetScore ?? 79}</span>
                </span>
              ),
            },
            {
              key: 'attempts',
              header: 'Answers',
              align: 'right',
              secondary: true,
              render: (student) => <span className="tabular">{student._count.attempts}</span>,
            },
            {
              key: 'lastSeen',
              header: 'Last seen',
              secondary: true,
              render: (student) => (
                <span className="text-xs text-ink-500">
                  {student.lastLoginAt ? relativeTime(student.lastLoginAt) : 'Never'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (student) => (
                <Badge tone={statusTone(student.status)}>{humanizeStatus(student.status)}</Badge>
              ),
            },
            {
              key: 'joined',
              header: 'Joined',
              align: 'right',
              secondary: true,
              render: (student) => (
                <span className="text-xs text-ink-500">{formatDate(student.createdAt)}</span>
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
            if (filter) params.set('filter', filter)
            params.set('page', String(next))
            return `/admin/students?${params.toString()}`
          }}
        />
      </Card>

      <p className="text-xs text-ink-400">
        Need to change a subscription manually?{' '}
        <Link href="/admin/payments" className="font-medium text-brand-600 hover:text-brand-700">
          Approve a payment
        </Link>{' '}
        — that is the path that keeps the audit log complete.
      </p>
    </div>
  )
}
