import 'server-only'
import type { Difficulty, LessonKind, LessonState, PteSection, Prisma } from '@prisma/client'
import { prisma } from './db'
import { getEntitlements, type Entitlements } from './access'
import { notFound } from './http'
import { parseLessonContent, type VocabularyTerm } from './pte/schemas'
import { resolveMediaUrl } from './storage'

/**
 * Learn service — the course library, the lesson player and progress tracking.
 *
 * Learn is the curriculum layer, not a second exercise engine. A lesson that
 * needs scored work hands it to the engine that already does it: attached bank
 * questions run through the practice player (`getLessonDrillQuestionIds`), and
 * a dictation or shadowing lesson points at a drill in `src/lib/drills` through
 * the `drillSlug` on its content. What lives here is the part neither of those
 * owns — courses, ordering, captioned media and progress.
 *
 * Premium lessons are locked here, on the server. A locked lesson comes back
 * with no media, no transcript and no body, so there is nothing to unlock in
 * devtools.
 */

// --- public shapes ------------------------------------------------------------

export interface PublicCue {
  index: number
  start: number
  end: number
  text: string
  /** Word count, shown beside a line so a learner can gauge its length. */
  wordCount: number
}

export interface PublicLesson {
  id: string
  slug: string
  number: number
  title: string
  summary: string | null
  kind: LessonKind
  estimatedMinutes: number
  isPremium: boolean
  locked: boolean
  videoUrl: string | null
  audioUrl: string | null
  body: string | null
  keyPoints: string[]
  cues: PublicCue[]
  terms: VocabularyTerm[]
  /** Slug of the drill this lesson sends the student to, when it has one. */
  drillSlug: string | null
  source: { label: string; href?: string } | null
}

export interface LessonRef {
  id: string
  slug: string
  number: number
  title: string
  kind: LessonKind
  estimatedMinutes: number
  isPremium: boolean
  moduleId: string | null
  state: LessonState
}

export interface CourseSummary {
  id: string
  slug: string
  title: string
  subtitle: string | null
  section: PteSection | null
  level: Difficulty
  coverImageUrl: string | null
  isPremium: boolean
  tags: string[]
  lessonCount: number
  estimatedMinutes: number
  /** Null when the student has never opened the course. */
  percentComplete: number | null
  lessonsDone: number
  lastActivityAt: Date | null
  completedAt: Date | null
}

export interface CourseModuleView {
  id: string | null
  title: string
  description: string | null
  lessons: LessonRef[]
}

export interface CourseDetail extends CourseSummary {
  description: string | null
  modules: CourseModuleView[]
  /** Flattened running order, used for "start" and "continue". */
  lessons: LessonRef[]
  nextLesson: LessonRef | null
}

export interface LessonDrill {
  questionId: string
  title: string
  typeName: string
  shortName: string
  section: PteSection
}

export interface LessonView {
  course: { id: string; slug: string; title: string; isPremium: boolean }
  module: { id: string; title: string } | null
  lesson: PublicLesson
  drills: LessonDrill[]
  progress: { state: LessonState; secondsSpent: number; completedAt: Date | null }
  previous: { slug: string; title: string } | null
  next: { slug: string; title: string } | null
  position: { index: number; total: number }
}

// --- reads --------------------------------------------------------------------

const lessonRefSelect = {
  id: true,
  slug: true,
  number: true,
  title: true,
  kind: true,
  estimatedMinutes: true,
  isPremium: true,
  moduleId: true,
  order: true,
} satisfies Prisma.LessonSelect

const courseSummarySelect = {
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  section: true,
  level: true,
  coverImageUrl: true,
  isPremium: true,
  tags: true,
  lessonCount: true,
  estimatedMinutes: true,
} satisfies Prisma.CourseSelect

type CourseSummaryRow = Prisma.CourseGetPayload<{ select: typeof courseSummarySelect }>

interface EnrollmentRollup {
  percentComplete: number
  lessonsDone: number
  lastActivityAt: Date
  completedAt: Date | null
}

async function toCourseSummary(
  row: CourseSummaryRow,
  enrollment: EnrollmentRollup | undefined,
): Promise<CourseSummary> {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    section: row.section,
    level: row.level,
    coverImageUrl: await resolveMediaUrl(row.coverImageUrl),
    isPremium: row.isPremium,
    tags: row.tags,
    lessonCount: row.lessonCount,
    estimatedMinutes: row.estimatedMinutes,
    percentComplete: enrollment?.percentComplete ?? null,
    lessonsDone: enrollment?.lessonsDone ?? 0,
    lastActivityAt: enrollment?.lastActivityAt ?? null,
    completedAt: enrollment?.completedAt ?? null,
  }
}

export async function listCourses(
  userId: string,
  filter: { section?: PteSection | null } = {},
): Promise<CourseSummary[]> {
  const [courses, enrollments] = await Promise.all([
    prisma.course.findMany({
      where: { status: 'PUBLISHED', ...(filter.section ? { section: filter.section } : {}) },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
      select: courseSummarySelect,
    }),
    prisma.courseEnrollment.findMany({
      where: { userId },
      select: {
        courseId: true,
        percentComplete: true,
        lessonsDone: true,
        lastActivityAt: true,
        completedAt: true,
      },
    }),
  ])

  const byCourse = new Map(enrollments.map((row) => [row.courseId, row]))
  return Promise.all(courses.map((course) => toCourseSummary(course, byCourse.get(course.id))))
}

/** Courses the student has opened but not finished, most recent first. */
export async function getContinueLearning(userId: string, take = 3): Promise<CourseSummary[]> {
  const enrollments = await prisma.courseEnrollment.findMany({
    where: { userId, completedAt: null, course: { status: 'PUBLISHED' } },
    orderBy: { lastActivityAt: 'desc' },
    take,
    select: {
      percentComplete: true,
      lessonsDone: true,
      lastActivityAt: true,
      completedAt: true,
      course: { select: courseSummarySelect },
    },
  })

  return Promise.all(enrollments.map((row) => toCourseSummary(row.course, row)))
}

export async function getCourseDetail(slug: string, userId: string): Promise<CourseDetail | null> {
  const course = await prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: {
      ...courseSummarySelect,
      description: true,
      modules: {
        orderBy: { order: 'asc' },
        select: { id: true, title: true, description: true },
      },
      lessons: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ order: 'asc' }, { number: 'asc' }],
        select: lessonRefSelect,
      },
    },
  })
  if (!course) return null

  const [enrollment, progress] = await Promise.all([
    prisma.courseEnrollment.findUnique({
      where: { userId_courseId: { userId, courseId: course.id } },
      select: { percentComplete: true, lessonsDone: true, lastActivityAt: true, completedAt: true },
    }),
    prisma.lessonProgress.findMany({
      where: { userId, lesson: { courseId: course.id } },
      select: { lessonId: true, state: true },
    }),
  ])

  const stateByLesson = new Map(progress.map((row) => [row.lessonId, row.state]))
  const lessons: LessonRef[] = course.lessons.map((lesson) => ({
    id: lesson.id,
    slug: lesson.slug,
    number: lesson.number,
    title: lesson.title,
    kind: lesson.kind,
    estimatedMinutes: lesson.estimatedMinutes,
    isPremium: lesson.isPremium,
    moduleId: lesson.moduleId,
    state: stateByLesson.get(lesson.id) ?? 'NOT_STARTED',
  }))

  // Modules are display grouping only — `order` on the lesson decides the
  // running order, so a course can mix grouped and ungrouped lessons freely.
  const modules: CourseModuleView[] = []
  const ungrouped = lessons.filter((lesson) => lesson.moduleId === null)
  if (ungrouped.length > 0) {
    modules.push({ id: null, title: 'Lessons', description: null, lessons: ungrouped })
  }
  for (const courseModule of course.modules) {
    const owned = lessons.filter((lesson) => lesson.moduleId === courseModule.id)
    if (owned.length > 0) {
      modules.push({ id: courseModule.id, title: courseModule.title, description: courseModule.description, lessons: owned })
    }
  }

  const summary = await toCourseSummary(course, enrollment ?? undefined)

  return {
    ...summary,
    description: course.description,
    modules,
    lessons,
    nextLesson: lessons.find((lesson) => lesson.state !== 'COMPLETED') ?? null,
  }
}

/** True when this lesson needs a subscription the student does not have. */
function isLocked(
  lesson: { isPremium: boolean },
  course: { isPremium: boolean },
  entitlements: Entitlements,
): boolean {
  return (lesson.isPremium || course.isPremium) && !entitlements.isPremium
}

interface LessonContentRow {
  id: string
  slug: string
  number: number
  title: string
  summary: string | null
  kind: LessonKind
  content: Prisma.JsonValue
  videoUrl: string | null
  audioUrl: string | null
  estimatedMinutes: number
  isPremium: boolean
}

export async function toPublicLesson(
  row: LessonContentRow,
  options: { locked: boolean },
): Promise<PublicLesson> {
  const base = {
    id: row.id,
    slug: row.slug,
    number: row.number,
    title: row.title,
    summary: row.summary,
    kind: row.kind,
    estimatedMinutes: row.estimatedMinutes,
    isPremium: row.isPremium,
    locked: options.locked,
  }

  if (options.locked) {
    return {
      ...base,
      videoUrl: null,
      audioUrl: null,
      body: null,
      keyPoints: [],
      cues: [],
      terms: [],
      drillSlug: null,
      source: null,
    }
  }

  const content = parseLessonContent(row.content)

  return {
    ...base,
    videoUrl: await resolveMediaUrl(row.videoUrl),
    audioUrl: await resolveMediaUrl(row.audioUrl),
    body: content.body ?? null,
    keyPoints: content.keyPoints,
    cues: content.cues.map((cue, index) => ({
      index,
      start: cue.start,
      end: cue.end,
      text: cue.text,
      wordCount: cue.text.trim().split(/\s+/).filter(Boolean).length,
    })),
    terms: content.terms,
    drillSlug: content.drillSlug ?? null,
    source: content.source ?? null,
  }
}

export async function getLessonView(
  courseSlug: string,
  lessonSlug: string,
  userId: string,
  entitlements?: Entitlements,
): Promise<LessonView | null> {
  const ent = entitlements ?? (await getEntitlements(userId))

  const course = await prisma.course.findFirst({
    where: { slug: courseSlug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      title: true,
      isPremium: true,
      lessons: {
        where: { status: 'PUBLISHED' },
        orderBy: [{ order: 'asc' }, { number: 'asc' }],
        select: { id: true, slug: true, title: true },
      },
    },
  })
  if (!course) return null

  const lesson = await prisma.lesson.findFirst({
    where: { courseId: course.id, slug: lessonSlug, status: 'PUBLISHED' },
    select: {
      id: true,
      slug: true,
      number: true,
      title: true,
      summary: true,
      kind: true,
      content: true,
      videoUrl: true,
      audioUrl: true,
      estimatedMinutes: true,
      isPremium: true,
      module: { select: { id: true, title: true } },
      questions: {
        orderBy: { order: 'asc' },
        select: {
          question: {
            select: {
              id: true,
              title: true,
              status: true,
              questionType: { select: { name: true, shortName: true, section: true } },
            },
          },
        },
      },
    },
  })
  if (!lesson) return null

  const index = course.lessons.findIndex((row) => row.id === lesson.id)
  const previous = index > 0 ? course.lessons[index - 1]! : null
  const next = index >= 0 && index < course.lessons.length - 1 ? course.lessons[index + 1]! : null

  const progress = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
    select: { state: true, secondsSpent: true, completedAt: true },
  })

  return {
    course: { id: course.id, slug: course.slug, title: course.title, isPremium: course.isPremium },
    module: lesson.module,
    lesson: await toPublicLesson(lesson, { locked: isLocked(lesson, course, ent) }),
    drills: lesson.questions
      .filter((row) => row.question.status === 'PUBLISHED')
      .map((row) => ({
        questionId: row.question.id,
        title: row.question.title,
        typeName: row.question.questionType.name,
        shortName: row.question.questionType.shortName,
        section: row.question.questionType.section,
      })),
    progress: progress ?? { state: 'NOT_STARTED', secondsSpent: 0, completedAt: null },
    previous: previous ? { slug: previous.slug, title: previous.title } : null,
    next: next ? { slug: next.slug, title: next.title } : null,
    position: { index: index < 0 ? 0 : index, total: course.lessons.length },
  }
}

// --- writes -------------------------------------------------------------------

/**
 * Records time on a lesson and rolls the result up onto the enrolment.
 *
 * `secondsSpent` accumulates, but the enrolment percentage is recomputed from
 * the rows rather than incremented, so a duplicated request or a second open
 * tab cannot push a student past 100%.
 */
export async function saveLessonProgress(input: {
  userId: string
  lessonId: string
  state?: LessonState
  secondsSpent?: number
}): Promise<{ state: LessonState; percentComplete: number; lessonsDone: number }> {
  const lesson = await prisma.lesson.findFirst({
    where: { id: input.lessonId, status: 'PUBLISHED' },
    select: { id: true, courseId: true, course: { select: { status: true } } },
  })
  if (!lesson || lesson.course.status !== 'PUBLISHED') {
    throw notFound('That lesson does not exist, or is not published yet.')
  }

  const seconds = Math.min(Math.max(0, Math.round(input.secondsSpent ?? 0)), 3600)
  const now = new Date()

  const existing = await prisma.lessonProgress.findUnique({
    where: { userId_lessonId: { userId: input.userId, lessonId: lesson.id } },
    select: { state: true, completedAt: true },
  })

  // A finished lesson never falls back to in-progress when it is revisited.
  const nextState: LessonState =
    existing?.state === 'COMPLETED' ? 'COMPLETED' : (input.state ?? 'IN_PROGRESS')

  await prisma.lessonProgress.upsert({
    where: { userId_lessonId: { userId: input.userId, lessonId: lesson.id } },
    create: {
      userId: input.userId,
      lessonId: lesson.id,
      state: nextState,
      secondsSpent: seconds,
      lastViewedAt: now,
      completedAt: nextState === 'COMPLETED' ? now : null,
    },
    update: {
      state: nextState,
      secondsSpent: { increment: seconds },
      lastViewedAt: now,
      ...(nextState === 'COMPLETED' && !existing?.completedAt ? { completedAt: now } : {}),
    },
  })

  const rollup = await refreshEnrollment(input.userId, lesson.courseId)
  return { state: nextState, ...rollup }
}

/**
 * Recomputes the cached course rollup from the underlying lesson rows.
 *
 * `completedAt` is only ever written on the transition to finished: re-opening
 * a completed course must not move the date the student earned it.
 */
export async function refreshEnrollment(
  userId: string,
  courseId: string,
): Promise<{ percentComplete: number; lessonsDone: number }> {
  const [total, done] = await Promise.all([
    prisma.lesson.count({ where: { courseId, status: 'PUBLISHED' } }),
    prisma.lessonProgress.count({
      where: { userId, state: 'COMPLETED', lesson: { courseId, status: 'PUBLISHED' } },
    }),
  ])

  const percentComplete = total > 0 ? Math.round((done / total) * 100) : 0
  const finished = total > 0 && done >= total
  const now = new Date()

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId } },
    create: {
      userId,
      courseId,
      percentComplete,
      lessonsDone: done,
      lastActivityAt: now,
      completedAt: finished ? now : null,
    },
    update: {
      percentComplete,
      lessonsDone: done,
      lastActivityAt: now,
      ...(finished ? {} : { completedAt: null }),
    },
  })

  if (finished) {
    await prisma.courseEnrollment.updateMany({
      where: { userId, courseId, completedAt: null },
      data: { completedAt: now },
    })
  }

  return { percentComplete, lessonsDone: done }
}

export async function enrollInCourse(userId: string, slug: string): Promise<{ courseId: string }> {
  const course = await prisma.course.findFirst({
    where: { slug, status: 'PUBLISHED' },
    select: { id: true },
  })
  if (!course) throw notFound('That course does not exist, or is not published yet.')

  await prisma.courseEnrollment.upsert({
    where: { userId_courseId: { userId, courseId: course.id } },
    create: { userId, courseId: course.id },
    update: { lastActivityAt: new Date() },
  })

  return { courseId: course.id }
}

/** Denormalised totals on Course, recomputed whenever its lessons change. */
export async function refreshCourseTotals(courseId: string): Promise<void> {
  const lessons = await prisma.lesson.findMany({
    where: { courseId, status: 'PUBLISHED' },
    select: { estimatedMinutes: true },
  })

  await prisma.course.update({
    where: { id: courseId },
    data: {
      lessonCount: lessons.length,
      estimatedMinutes: lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0),
    },
  })
}
/** Bank questions attached to a lesson, in the order the author set. */
export async function getLessonDrillQuestionIds(
  lessonId: string,
  entitlements: Entitlements,
): Promise<string[]> {
  const rows = await prisma.lessonQuestion.findMany({
    where: {
      lessonId,
      question: { status: 'PUBLISHED', ...(entitlements.isPremium ? {} : { isPremium: false }) },
    },
    orderBy: { order: 'asc' },
    select: { questionId: true },
  })
  return rows.map((row) => row.questionId)
}
