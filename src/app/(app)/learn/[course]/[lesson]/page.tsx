import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock, ExternalLink } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { LockedState } from '@/components/ui/states'
import { Badge } from '@/components/ui/badge'
import { ArticleBody } from '@/components/learn/article-body'
import { CaptionedMedia } from '@/components/learn/captioned-media'
import { DrillLink } from '@/components/learn/drill-link'
import { LessonKindBadge, LESSON_KIND_META } from '@/components/learn/kind-badge'
import { LessonTracker } from '@/components/learn/lesson-tracker'
import { StartDrillButton } from '@/components/learn/start-drill-button'
import { FlashcardDeck, VocabularyList } from '@/components/learn/vocabulary'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { getLessonView } from '@/lib/learn'
import { pageMetadata } from '@/lib/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>
}) {
  const { course, lesson } = await params
  return pageMetadata({
    title: 'Lesson',
    description: 'A captioned PTE lesson with drills.',
    path: `/learn/${course}/${lesson}`,
    noIndex: true,
  })
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>
}) {
  const { course: courseSlug, lesson: lessonSlug } = await params
  const user = await requireStudent(`/learn/${courseSlug}/${lessonSlug}`)

  const entitlements = await getEntitlements(user.id)
  const view = await getLessonView(courseSlug, lessonSlug, user.id, entitlements)
  if (!view) notFound()

  const { lesson, drills } = view
  const meta = LESSON_KIND_META[lesson.kind]
  const isDrillLesson = lesson.kind === 'DICTATION' || lesson.kind === 'SHADOWING'

  return (
    <div className="space-y-6">
      <Link
        href={`/learn/${view.course.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {view.course.title}
      </Link>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <LessonKindBadge kind={lesson.kind} />
          <span className="text-xs text-ink-500">
            Lesson {view.position.index + 1} of {view.position.total}
          </span>
          {view.module ? (
            <>
              <span className="text-xs text-ink-300" aria-hidden>
                ·
              </span>
              <span className="text-xs text-ink-500">{view.module.title}</span>
            </>
          ) : null}
          <span className="flex items-center gap-1 text-xs text-ink-500">
            <Clock className="size-3.5" aria-hidden />
            {lesson.estimatedMinutes} min
          </span>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{lesson.title}</h2>
        {lesson.summary ? <p className="text-sm text-ink-500">{lesson.summary}</p> : null}
      </div>

      {lesson.locked ? (
        <Card>
          <LockedState
            title="This lesson is part of Globify PTE Premium"
            description="Upgrade to unlock the video, the transcript and the drills that go with it."
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="How to work through this" description={meta.blurb} />
            <CardBody className="space-y-6">
              {/* Dictation and shadowing are run by the drill engine. The lesson
                  still shows the recording first, so the student hears the whole
                  thing before working through it line by line. */}
              {isDrillLesson ? (
                <DrillLink kind={lesson.kind} drillSlug={lesson.drillSlug} />
              ) : null}

              {lesson.kind === 'FLASHCARD' ? (
                <FlashcardDeck terms={lesson.terms} />
              ) : lesson.videoUrl || lesson.audioUrl ? (
                <CaptionedMedia
                  videoUrl={lesson.videoUrl}
                  audioUrl={lesson.audioUrl}
                  cues={lesson.cues}
                  title={lesson.title}
                />
              ) : null}

              <ArticleBody body={lesson.body} keyPoints={lesson.keyPoints} />

              {lesson.kind !== 'FLASHCARD' && lesson.terms.length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-navy-900">Words from this lesson</h3>
                  <VocabularyList terms={lesson.terms} />
                </div>
              ) : null}

              {lesson.source ? (
                <p className="flex items-center gap-1.5 text-xs text-ink-500">
                  Source:
                  {lesson.source.href ? (
                    <a
                      href={lesson.source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700"
                    >
                      {lesson.source.label}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : (
                    <span>{lesson.source.label}</span>
                  )}
                </p>
              ) : null}
            </CardBody>
          </Card>

          {drills.length > 0 ? (
            <Card>
              <CardHeader
                title="Practise what this lesson covered"
                description="These run in the normal practice player and count towards your daily allowance."
                action={<StartDrillButton lessonId={lesson.id} count={drills.length} />}
              />
              <CardBody className="flex flex-wrap gap-2">
                {drills.map((drill) => (
                  <Badge key={drill.questionId} tone="outline" size="sm">
                    {drill.shortName} · {drill.title}
                  </Badge>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </>
      )}

      <LessonTracker
        lessonId={lesson.id}
        initialState={view.progress.state}
        nextHref={view.next ? `/learn/${view.course.slug}/${view.next.slug}` : null}
        courseHref={`/learn/${view.course.slug}`}
      />

      <nav className="flex flex-wrap items-center justify-between gap-3" aria-label="Lesson navigation">
        {view.previous ? (
          <Link
            href={`/learn/${view.course.slug}/${view.previous.slug}`}
            className="inline-flex max-w-[45%] items-center gap-1.5 text-sm text-ink-500 hover:text-navy-900"
          >
            <ArrowLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{view.previous.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {view.next ? (
          <Link
            href={`/learn/${view.course.slug}/${view.next.slug}`}
            className="inline-flex max-w-[45%] items-center gap-1.5 text-sm text-ink-500 hover:text-navy-900"
          >
            <span className="truncate">{view.next.title}</span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
