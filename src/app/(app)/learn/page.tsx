import { GraduationCap } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { LinkTabs } from '@/components/ui/tabs'
import { CourseCard } from '@/components/learn/course-card'
import { requireStudent } from '@/lib/auth/guards'
import { getContinueLearning, listCourses } from '@/lib/learn'
import { SECTION_META, SECTIONS, sectionFromSlug } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Learn',
  description: 'Captioned video lessons, dictation and shadowing drills for every PTE section.',
  path: '/learn',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const TABS = [
  { key: 'all', label: 'All courses' },
  ...SECTIONS.map((section) => ({ key: SECTION_META[section].slug, label: SECTION_META[section].label })),
]

export default async function LearnPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>
}) {
  const user = await requireStudent('/learn')
  const { section: sectionSlug = 'all' } = await searchParams
  const section = sectionSlug === 'all' ? null : sectionFromSlug(sectionSlug)

  const [courses, continuing] = await Promise.all([
    listCourses(user.id, { section }),
    getContinueLearning(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Learn</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          Captioned lessons, dictation and shadowing — the listening and speaking work that practice
          questions alone will not build.
        </p>
      </div>

      {continuing.length > 0 ? (
        <section aria-labelledby="continue-learning">
          <Card>
            <CardHeader
              title={<span id="continue-learning">Pick up where you left off</span>}
              description="Courses you have started but not finished."
            />
            <CardBody className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {continuing.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}

      <LinkTabs items={TABS} paramName="section" />

      {courses.length === 0 ? (
        <Card>
          <EmptyState
            icon={<GraduationCap aria-hidden />}
            title={section ? `No ${SECTION_META[section].label.toLowerCase()} courses yet` : 'No courses published yet'}
            description="Once your administrator publishes a course it will appear here, with your progress tracked lesson by lesson."
            action={{ label: 'Back to dashboard', href: '/dashboard' }}
            secondaryAction={section ? { label: 'See all courses', href: '/learn' } : undefined}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  )
}
