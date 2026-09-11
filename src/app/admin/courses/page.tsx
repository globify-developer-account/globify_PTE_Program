import { Card, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, pluralize } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Courses',
  description: 'Video lessons, vocabulary and drills grouped into courses.',
  path: '/admin/courses',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminCoursesPage() {
  await requireStaff('content.view')

  const courses = await prisma.course.findMany({
    orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      title: true,
      section: true,
      status: true,
      isPremium: true,
      lessonCount: true,
      estimatedMinutes: true,
      updatedAt: true,
      _count: { select: { lessons: true, enrollments: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Courses</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          The guided lessons behind the Learn area. Courses are seeded — run the seed script to
          publish the starter set.
        </p>
      </div>

      <Card>
        <CardHeader title={pluralize(courses.length, 'course')} />
        <DataTable
          rows={courses}
          rowKey={(course) => course.id}
          rowHref={(course) => `/admin/courses/${course.id}`}
          empty={{
            title: 'No courses yet',
            description: 'Run the seed script to publish the starter courses.',
          }}
          columns={[
            {
              key: 'title',
              header: 'Course',
              render: (course) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{course.title}</p>
                  <p className="truncate font-mono text-xs text-ink-400">{course.slug}</p>
                </div>
              ),
            },
            {
              key: 'section',
              header: 'Section',
              secondary: true,
              render: (course) => (
                <span className="text-sm">
                  {course.section ? SECTION_META[course.section].label : 'All sections'}
                </span>
              ),
            },
            {
              key: 'lessons',
              header: 'Lessons',
              align: 'right',
              render: (course) => (
                <span className="text-sm tabular">
                  {/* Published count against the total, since `lessonCount`
                      only tracks what students can actually open. */}
                  {course.lessonCount}
                  <span className="text-ink-400">/{course._count.lessons}</span>
                </span>
              ),
            },
            {
              key: 'minutes',
              header: 'Length',
              align: 'right',
              secondary: true,
              render: (course) => <span className="text-sm tabular">{course.estimatedMinutes} min</span>,
            },
            {
              key: 'enrolled',
              header: 'Enrolled',
              align: 'right',
              secondary: true,
              render: (course) => <span className="text-sm tabular">{course._count.enrollments}</span>,
            },
            {
              key: 'access',
              header: 'Access',
              secondary: true,
              render: (course) => (
                <Badge tone={course.isPremium ? 'navy' : 'outline'} size="sm">
                  {course.isPremium ? 'Premium' : 'Free'}
                </Badge>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (course) => (
                <Badge tone={statusTone(course.status)} size="sm">
                  {humanizeStatus(course.status)}
                </Badge>
              ),
            },
            {
              key: 'updated',
              header: 'Updated',
              align: 'right',
              secondary: true,
              render: (course) => (
                <span className="text-sm text-ink-500">{formatDate(course.updatedAt)}</span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
