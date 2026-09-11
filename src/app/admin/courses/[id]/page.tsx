import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { LESSON_KIND_META } from '@/components/learn/kind-badge'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { pluralize } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Course',
  description: 'Lessons inside a course.',
  path: '/admin/courses',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminCoursePage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('content.view')
  const { id } = await params

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      modules: { orderBy: { order: 'asc' }, select: { id: true, title: true } },
      lessons: {
        orderBy: [{ order: 'asc' }, { number: 'asc' }],
        select: {
          id: true,
          slug: true,
          number: true,
          title: true,
          kind: true,
          status: true,
          isPremium: true,
          estimatedMinutes: true,
          moduleId: true,
          _count: { select: { questions: true, progress: true } },
        },
      },
      _count: { select: { enrollments: true } },
    },
  })
  if (!course) notFound()

  const moduleTitles = new Map(course.modules.map((module) => [module.id, module.title]))

  return (
    <div className="space-y-6">
      <Link
        href="/admin/courses"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All courses
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{course.title}</h2>
          <p className="mt-1.5 font-mono text-xs text-ink-400">{course.slug}</p>
        </div>
        {course.status === 'PUBLISHED' ? (
          <Link
            href={`/learn/${course.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            View as a student
            <ExternalLink className="size-3.5" aria-hidden />
          </Link>
        ) : null}
      </div>

      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Status">
            <Badge tone={statusTone(course.status)} size="sm">
              {humanizeStatus(course.status)}
            </Badge>
          </Fact>
          <Fact label="Section">
            {course.section ? SECTION_META[course.section].label : 'All sections'}
          </Fact>
          <Fact label="Access">
            <Badge tone={course.isPremium ? 'navy' : 'outline'} size="sm">
              {course.isPremium ? 'Premium' : 'Free'}
            </Badge>
          </Fact>
          <Fact label="Enrolled students">{course._count.enrollments}</Fact>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title={pluralize(course.lessons.length, 'lesson')}
          description={`${course.lessonCount} published · about ${course.estimatedMinutes} minutes of study.`}
        />
        <DataTable
          rows={course.lessons}
          rowKey={(lesson) => lesson.id}
          empty={{ title: 'No lessons yet', description: 'This course has no lessons attached.' }}
          columns={[
            {
              key: 'lesson',
              header: 'Lesson',
              render: (lesson) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">
                    <span className="mr-2 text-xs tabular text-ink-400">
                      {String(lesson.number).padStart(2, '0')}
                    </span>
                    {lesson.title}
                  </p>
                  <p className="truncate font-mono text-xs text-ink-400">{lesson.slug}</p>
                </div>
              ),
            },
            {
              key: 'module',
              header: 'Module',
              secondary: true,
              render: (lesson) => (
                <span className="text-sm text-ink-500">
                  {lesson.moduleId ? (moduleTitles.get(lesson.moduleId) ?? '—') : '—'}
                </span>
              ),
            },
            {
              key: 'kind',
              header: 'Type',
              render: (lesson) => <span className="text-sm">{LESSON_KIND_META[lesson.kind].label}</span>,
            },
            {
              key: 'drills',
              header: 'Drills',
              align: 'right',
              secondary: true,
              render: (lesson) => <span className="text-sm tabular">{lesson._count.questions}</span>,
            },
            {
              key: 'started',
              header: 'Started by',
              align: 'right',
              secondary: true,
              render: (lesson) => <span className="text-sm tabular">{lesson._count.progress}</span>,
            },
            {
              key: 'minutes',
              header: 'Length',
              align: 'right',
              secondary: true,
              render: (lesson) => <span className="text-sm tabular">{lesson.estimatedMinutes} min</span>,
            },
            {
              key: 'status',
              header: 'Status',
              render: (lesson) => (
                <Badge tone={statusTone(lesson.status)} size="sm">
                  {humanizeStatus(lesson.status)}
                </Badge>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-ink-500">{label}</p>
      <div className="mt-1.5 text-sm text-navy-900">{children}</div>
    </div>
  )
}
