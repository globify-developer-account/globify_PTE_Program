import Link from 'next/link'
import { Plus } from 'lucide-react'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable, Pagination } from '@/components/ui/data-table'
import { LinkTabs } from '@/components/ui/tabs'
import { ButtonLink } from '@/components/ui/button'
import { AdminSearch } from '@/components/admin/admin-search'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'
import type { Prisma } from '@prisma/client'

export const metadata = pageMetadata({
  title: 'Questions',
  description: 'Author and manage the question bank.',
  path: '/admin/questions',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'PUBLISHED', label: 'Published' },
  { key: 'DRAFT', label: 'Draft' },
  { key: 'ARCHIVED', label: 'Archived' },
]

export default async function AdminQuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; section?: string; page?: string }>
}) {
  await requireStaff('questions.view')
  const { q = '', status = 'all', section = '', page = '1' } = await searchParams
  const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)

  const where: Prisma.QuestionWhereInput = {
    ...(status !== 'all' ? { status: status as Prisma.EnumContentStatusFilter['equals'] } : {}),
    ...(section ? { questionType: { section: section as Prisma.EnumPteSectionFilter['equals'] } } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { code: { contains: q, mode: 'insensitive' } },
            { passage: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  }

  const [questions, total, counts] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (pageNumber - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        code: true,
        title: true,
        status: true,
        difficulty: true,
        isPremium: true,
        timesAttempted: true,
        averageScore: true,
        createdAt: true,
        questionType: { select: { name: true, shortName: true, section: true } },
      },
    }),
    prisma.question.count({ where }),
    prisma.question.groupBy({ by: ['status'], _count: true }),
  ])

  const countFor = (key: string) => counts.find((row) => row.status === key)?._count ?? 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Questions</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            {total} questions. Only published ones reach students.
          </p>
        </div>
        <ButtonLink href="/admin/questions/new">
          <Plus aria-hidden />
          New question
        </ButtonLink>
      </div>

      {/* Section filter */}
      <div className="flex flex-wrap gap-2">
        <SectionChip label="All sections" href="/admin/questions" active={!section} />
        {Object.entries(SECTION_META).map(([key, meta]) => (
          <SectionChip
            key={key}
            label={meta.label}
            href={`/admin/questions?section=${key}`}
            active={section === key}
            color={meta.color}
          />
        ))}
      </div>

      <Card>
        <CardHeader title="Question bank" action={<AdminSearch placeholder="Title, code or passage…" />} />

        <LinkTabs
          items={TABS.map((tab) => ({
            ...tab,
            count: tab.key === 'all' ? total : countFor(tab.key),
          }))}
          paramName="status"
          className="px-5"
        />

        <DataTable
          rows={questions}
          rowKey={(question) => question.id}
          rowHref={(question) => `/admin/questions/${question.id}`}
          empty={{
            title: q ? 'No questions match that search' : 'No questions yet',
            description: q
              ? 'Try a different title or code.'
              : 'Create your first question to get the practice engine running.',
            action: { label: 'New question', href: '/admin/questions/new' },
          }}
          columns={[
            {
              key: 'title',
              header: 'Question',
              render: (question) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{question.title}</p>
                  <p className="truncate font-mono text-xs text-ink-400">{question.code}</p>
                </div>
              ),
            },
            {
              key: 'type',
              header: 'Type',
              render: (question) => (
                <span className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SECTION_META[question.questionType.section].color }}
                    aria-hidden
                  />
                  <span className="truncate">{question.questionType.name}</span>
                </span>
              ),
            },
            {
              key: 'difficulty',
              header: 'Difficulty',
              secondary: true,
              render: (question) => (
                <span className="text-xs text-ink-500">{humanizeStatus(question.difficulty)}</span>
              ),
            },
            {
              key: 'attempts',
              header: 'Attempts',
              align: 'right',
              secondary: true,
              render: (question) => <span className="tabular">{question.timesAttempted}</span>,
            },
            {
              key: 'avg',
              header: 'Avg score',
              align: 'right',
              secondary: true,
              render: (question) => (
                <span className="tabular">
                  {question.averageScore !== null ? Math.round(question.averageScore) : '—'}
                </span>
              ),
            },
            {
              key: 'access',
              header: 'Access',
              secondary: true,
              render: (question) =>
                question.isPremium ? (
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
              render: (question) => (
                <Badge tone={statusTone(question.status)}>{humanizeStatus(question.status)}</Badge>
              ),
            },
            {
              key: 'created',
              header: 'Created',
              align: 'right',
              secondary: true,
              render: (question) => (
                <span className="text-xs text-ink-500">{formatDate(question.createdAt)}</span>
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
            if (status) params.set('status', status)
            if (section) params.set('section', section)
            params.set('page', String(next))
            return `/admin/questions?${params.toString()}`
          }}
        />
      </Card>
    </div>
  )
}

function SectionChip({
  label,
  href,
  active,
  color,
}: {
  label: string
  href: string
  active: boolean
  color?: string
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-brand-300 bg-brand-50 text-brand-700'
          : 'border-hairline bg-white text-ink-600 hover:border-brand-200'
      }`}
    >
      {color ? (
        <span className="size-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      ) : null}
      {label}
    </Link>
  )
}
