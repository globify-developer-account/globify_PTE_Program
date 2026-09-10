import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle, CircleDot, Clock, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { Meter } from '@/components/charts/score-ring'
import { LessonKindIcon, LESSON_KIND_META } from '@/components/learn/kind-badge'
import { StartCourseButton } from '@/components/learn/start-course-button'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { getCourseDetail, type LessonRef } from '@/lib/learn'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { cn, pluralize } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const LEVEL_LABEL = { EASY: 'Foundation', MEDIUM: 'Intermediate', HARD: 'Advanced' } as const

export async function generateMetadata({ params }: { params: Promise<{ course: string }> }) {
  const { course } = await params
  return pageMetadata({
    title: 'Course',
    description: 'A guided PTE course with captioned lessons and drills.',
    path: `/learn/${course}`,
    noIndex: true,
  })
}

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params
  const user = await requireStudent(`/learn/${slug}`)

  const [course, entitlements] = await Promise.all([
    getCourseDetail(slug, user.id),
    getEntitlements(user.id),
  ])
  if (!course) notFound()

  const section = course.section ? SECTION_META[course.section] : null
  const locked = course.isPremium && !entitlements.isPremium
  const started = course.percentComplete !== null && course.percentComplete > 0
  const target = course.nextLesson ?? course.lessons[0] ?? null

  return (
    <div className="space-y-6">
      <Link
        href="/learn"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All courses
      </Link>

      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {section ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ backgroundColor: `${section.color}1a`, color: section.color }}
              >
                {section.label}
              </span>
            ) : (
              <Badge tone="outline">All sections</Badge>
            )}
            <Badge tone="outline">{LEVEL_LABEL[course.level]}</Badge>
            {course.isPremium ? (
              <Badge tone="navy">
                <Lock aria-hidden />
                Premium
              </Badge>
            ) : null}
          </div>

          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{course.title}</h2>
            {course.subtitle ? <p className="mt-1.5 text-sm text-ink-500">{course.subtitle}</p> : null}
          </div>

          {course.description ? (
            <p className="max-w-2xl text-[15px] leading-relaxed text-ink-700">{course.description}</p>
          ) : null}

          <p className="flex flex-wrap items-center gap-4 text-sm text-ink-500">
            <span>{pluralize(course.lessonCount, 'lesson')}</span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-4" aria-hidden />
              About {course.estimatedMinutes} minutes
            </span>
            {course.lessonsDone > 0 ? <span>{course.lessonsDone} completed</span> : null}
          </p>

          {started ? (
            <div className="max-w-sm">
              <p className="flex items-center justify-between text-xs font-medium text-navy-900">
                <span>{course.completedAt ? 'Course complete' : `${course.percentComplete}% complete`}</span>
                <span className="text-ink-500">
                  {course.lessonsDone}/{course.lessonCount}
                </span>
              </p>
              <Meter value={course.percentComplete ?? 0} max={100} className="mt-2" height={6} />
            </div>
          ) : null}

          {target ? (
            <div className="flex flex-wrap gap-3 pt-1">
              <StartCourseButton
                slug={course.slug}
                lessonSlug={target.slug}
                label={started ? `Continue: ${target.title}` : 'Start the first lesson'}
              />
            </div>
          ) : null}
        </CardBody>
      </Card>

      {locked ? (
        <UpgradePrompt
          title="This course is part of Globify PTE Premium"
          description="You can see the full outline here. Unlock the lessons, transcripts and drills with a Premium subscription."
        />
      ) : null}

      {course.lessons.length === 0 ? (
        <Card>
          <EmptyState
            title="No lessons published yet"
            description="This course has been created but its lessons are still in draft."
            action={{ label: 'Back to courses', href: '/learn' }}
          />
        </Card>
      ) : (
        course.modules.map((module) => (
          <section key={module.id ?? 'ungrouped'} aria-label={module.title}>
            <Card>
              <CardHeader
                title={module.title}
                description={module.description ?? undefined}
                action={
                  <span className="text-xs text-ink-500">{pluralize(module.lessons.length, 'lesson')}</span>
                }
              />
              <ol className="divide-y divide-hairline">
                {module.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <LessonRow courseSlug={course.slug} lesson={lesson} locked={locked || (lesson.isPremium && !entitlements.isPremium)} />
                  </li>
                ))}
              </ol>
            </Card>
          </section>
        ))
      )}
    </div>
  )
}

function LessonRow({
  courseSlug,
  lesson,
  locked,
}: {
  courseSlug: string
  lesson: LessonRef
  locked: boolean
}) {
  const meta = LESSON_KIND_META[lesson.kind]

  return (
    <Link
      href={`/learn/${courseSlug}/${lesson.slug}`}
      className="flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-brand-50/40"
    >
      <span className="shrink-0">
        {lesson.state === 'COMPLETED' ? (
          <CheckCircle2 className="size-5 text-green-600" aria-label="Completed" />
        ) : lesson.state === 'IN_PROGRESS' ? (
          <CircleDot className="size-5 text-brand-600" aria-label="In progress" />
        ) : (
          <Circle className="size-5 text-ink-300" aria-label="Not started" />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-xs font-semibold tabular text-ink-400">
            {String(lesson.number).padStart(2, '0')}
          </span>
          <span
            className={cn(
              'truncate text-sm font-medium',
              lesson.state === 'COMPLETED' ? 'text-ink-600' : 'text-navy-900',
            )}
          >
            {lesson.title}
          </span>
        </span>
        <span className="mt-1 flex items-center gap-2 text-xs text-ink-500">
          <LessonKindIcon kind={lesson.kind} className="size-3.5" />
          {meta.label}
          <span aria-hidden>·</span>
          {lesson.estimatedMinutes} min
        </span>
      </span>

      {locked ? <Lock className="size-4 shrink-0 text-ink-400" aria-label="Premium" /> : null}
    </Link>
  )
}
