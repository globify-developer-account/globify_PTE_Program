import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { LinkTabs } from '@/components/ui/tabs'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'
import { relativeTime } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Teacher reviews',
  description: 'Human review requests from premium students.',
  path: '/admin/reviews',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'REQUESTED', label: 'Requested' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'all', label: 'All' },
]

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await requireStaff('reviews.view')
  const { status = 'REQUESTED' } = await searchParams

  const where: Prisma.TeacherReviewWhereInput =
    status && status !== 'all'
      ? { status: status as Prisma.EnumReviewStatusFilter['equals'] }
      : {}

  const [reviews, counts] = await Promise.all([
    prisma.teacherReview.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        status: true,
        score: true,
        requestedAt: true,
        reviewedAt: true,
        teacher: { select: { name: true } },
        attempt: {
          select: {
            user: { select: { name: true, email: true } },
            question: { select: { title: true, questionType: { select: { name: true } } } },
          },
        },
      },
    }),
    prisma.teacherReview.groupBy({ by: ['status'], _count: true }),
  ])

  const countFor = (key: string) => counts.find((row) => row.status === key)?._count ?? 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Teacher reviews</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Human review requests from students on plans that include them. A teacher score replaces the AI
          estimate on that attempt.
        </p>
      </div>

      <Card>
        <CardHeader title="Review queue" />
        <LinkTabs
          items={TABS.map((tab) => ({
            ...tab,
            count: tab.key === 'all' ? undefined : countFor(tab.key),
          }))}
          paramName="status"
          className="px-5"
        />

        <DataTable
          rows={reviews}
          rowKey={(review) => review.id}
          empty={{
            title: status === 'REQUESTED' ? 'Nothing waiting for review' : 'No reviews found',
            description:
              'Students on the Premium and Intensive plans can request a human review of a response.',
          }}
          columns={[
            {
              key: 'student',
              header: 'Student',
              render: (review) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{review.attempt.user.name}</p>
                  <p className="truncate text-xs text-ink-500">{review.attempt.user.email}</p>
                </div>
              ),
            },
            {
              key: 'question',
              header: 'Question',
              render: (review) => (
                <div className="min-w-0">
                  <p className="truncate text-sm text-navy-900">{review.attempt.question.title}</p>
                  <p className="truncate text-xs text-ink-500">
                    {review.attempt.question.questionType.name}
                  </p>
                </div>
              ),
            },
            {
              key: 'teacher',
              header: 'Teacher',
              secondary: true,
              render: (review) => (
                <span className="text-sm text-ink-600">{review.teacher?.name ?? 'Unassigned'}</span>
              ),
            },
            {
              key: 'score',
              header: 'Score',
              align: 'right',
              render: (review) => (
                <span className="tabular text-sm">{review.score ?? <span className="text-ink-300">—</span>}</span>
              ),
            },
            {
              key: 'requested',
              header: 'Requested',
              secondary: true,
              render: (review) => (
                <span className="text-xs text-ink-500">{relativeTime(review.requestedAt)}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (review) => (
                <Badge tone={statusTone(review.status)}>{humanizeStatus(review.status)}</Badge>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
