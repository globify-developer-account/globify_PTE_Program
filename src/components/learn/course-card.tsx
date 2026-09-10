import Link from 'next/link'
import { Clock, Lock, PlayCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Meter } from '@/components/charts/score-ring'
import type { CourseSummary } from '@/lib/learn'
import { SECTION_META } from '@/lib/pte/question-types'
import { cn, pluralize } from '@/lib/utils'

const LEVEL_LABEL = { EASY: 'Foundation', MEDIUM: 'Intermediate', HARD: 'Advanced' } as const

export function CourseCard({ course }: { course: CourseSummary }) {
  const section = course.section ? SECTION_META[course.section] : null
  const started = course.percentComplete !== null

  return (
    <Link
      href={`/learn/${course.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-hairline bg-white transition-colors hover:border-brand-200"
    >
      <div
        className={cn('relative aspect-[16/9] overflow-hidden', section ? section.tint : 'bg-brand-50')}
        style={section ? { backgroundColor: `${section.color}1a` } : undefined}
      >
        {course.coverImageUrl ? (
          // A course cover is authored artwork, not user content, so it is
          // served as-is rather than through the image optimiser.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={course.coverImageUrl}
            alt=""
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="grid size-full place-items-center">
            <PlayCircle
              className="size-10 opacity-40"
              style={{ color: section?.color ?? 'var(--color-brand-600)' }}
              aria-hidden
            />
          </span>
        )}

        {course.isPremium ? (
          <span className="absolute right-3 top-3">
            <Badge tone="navy" size="sm">
              <Lock aria-hidden />
              Premium
            </Badge>
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          {section ? (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `${section.color}1a`, color: section.color }}
            >
              {section.label}
            </span>
          ) : (
            <Badge tone="outline" size="sm">
              All sections
            </Badge>
          )}
          <Badge tone="outline" size="sm">
            {LEVEL_LABEL[course.level]}
          </Badge>
        </div>

        <h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-navy-900">{course.title}</h3>
        {course.subtitle ? (
          <p className="mt-1 line-clamp-2 text-sm text-ink-500">{course.subtitle}</p>
        ) : null}

        <p className="mt-3 flex items-center gap-3 text-xs text-ink-500">
          <span>{pluralize(course.lessonCount, 'lesson')}</span>
          <span className="flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden />
            {course.estimatedMinutes} min
          </span>
        </p>

        {started ? (
          <div className="mt-3.5 border-t border-hairline pt-3.5">
            <p className="flex items-center justify-between text-xs">
              <span className="font-medium text-navy-900">
                {course.completedAt ? 'Completed' : `${course.percentComplete}% complete`}
              </span>
              <span className="text-ink-500">
                {course.lessonsDone}/{course.lessonCount}
              </span>
            </p>
            <Meter value={course.percentComplete ?? 0} max={100} className="mt-2" height={5} />
          </div>
        ) : null}
      </div>
    </Link>
  )
}
