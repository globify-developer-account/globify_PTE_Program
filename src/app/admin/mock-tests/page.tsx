import Link from 'next/link'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Mock tests',
  description: 'Full-length papers and their question sets.',
  path: '/admin/mock-tests',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminMockTestsPage() {
  await requireStaff('mocks.view')

  const tests = await prisma.mockTest.findMany({
    orderBy: { displayOrder: 'asc' },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          section: true,
          title: true,
          durationSeconds: true,
          _count: { select: { questions: true } },
        },
      },
      _count: { select: { results: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Mock tests</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Each paper is a fixed, ordered question set. Answers are scored by the same pipeline as practice, so
          results are directly comparable.
        </p>
      </div>

      {tests.map((test) => (
        <Card key={test.id}>
          <CardHeader
            title={test.title}
            description={test.description ?? undefined}
            action={
              <div className="flex items-center gap-2">
                {test.isPremium ? <Badge tone="brand">Premium</Badge> : <Badge tone="success">Free</Badge>}
                <Badge tone={statusTone(test.status)}>{humanizeStatus(test.status)}</Badge>
              </div>
            }
          />

          <DataTable
            rows={test.sections}
            rowKey={(section) => section.id}
            empty={{ title: 'No sections', description: 'This paper has no sections configured.' }}
            columns={[
              {
                key: 'section',
                header: 'Section',
                render: (section) => (
                  <span className="flex items-center gap-2 text-sm font-medium text-navy-900">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: SECTION_META[section.section].color }}
                      aria-hidden
                    />
                    {section.title}
                  </span>
                ),
              },
              {
                key: 'questions',
                header: 'Questions',
                align: 'right',
                render: (section) => <span className="tabular">{section._count.questions}</span>,
              },
              {
                key: 'duration',
                header: 'Duration',
                align: 'right',
                render: (section) => (
                  <span className="tabular">{Math.round(section.durationSeconds / 60)} min</span>
                ),
              },
            ]}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-5 py-3 text-sm">
            <span className="text-ink-500">
              {test._count.results} recorded sitting{test._count.results === 1 ? '' : 's'} ·{' '}
              {test.durationMinutes} minutes · {humanizeStatus(test.difficulty)}
            </span>
            <Link
              href={`/mock-tests/${test.slug}`}
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              View as student
            </Link>
          </div>
        </Card>
      ))}

      {tests.length === 0 ? (
        <Card>
          <div className="p-10 text-center">
            <p className="text-sm text-ink-500">
              No mock tests configured. Run the seed script to create three full-length papers.
            </p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
