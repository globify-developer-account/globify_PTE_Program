import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Target } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { StartPracticeButton } from '@/components/practice/start-practice-button'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { QUESTION_TYPES, SECTION_META, questionType, sectionFromSlug } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, formatDuration } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/** `read-aloud` in the URL, `READ_ALOUD` in the database. */
function codeFromSlug(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_')
}

export async function generateMetadata({ params }: { params: Promise<{ section: string; type: string }> }) {
  const { section: sectionSlug, type: typeSlug } = await params
  const definition = questionType(codeFromSlug(typeSlug))
  return pageMetadata({
    title: definition ? `${definition.name} practice` : 'Practice',
    description: definition?.description ?? 'Practise a PTE Academic task type with instant scoring.',
    path: `/practice/${sectionSlug}/${typeSlug}`,
    noIndex: true,
  })
}

export function generateStaticParams() {
  return QUESTION_TYPES.map((type) => ({
    section: SECTION_META[type.section].slug,
    type: type.code.toLowerCase().replace(/_/g, '-'),
  }))
}

export default async function TypePracticePage({
  params,
}: {
  params: Promise<{ section: string; type: string }>
}) {
  const { section: sectionSlug, type: typeSlug } = await params
  const section = sectionFromSlug(sectionSlug)
  const code = codeFromSlug(typeSlug)
  const definition = questionType(code)
  if (!section || !definition || definition.section !== section) notFound()

  const user = await requireStudent(`/practice/${sectionSlug}/${typeSlug}`)
  const meta = SECTION_META[section]

  const [available, history] = await Promise.all([
    prisma.question.count({ where: { status: 'PUBLISHED', questionType: { code } } }),
    prisma.attempt.findMany({
      where: { userId: user.id, status: 'SCORED', question: { questionType: { code } } },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        submittedAt: true,
        timeSpentSeconds: true,
        question: { select: { title: true } },
        score: { select: { overall: true, isCorrect: true } },
      },
    }),
  ])

  const scores = history.map((attempt) => attempt.score?.overall ?? 0).filter(Boolean)
  const average = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/practice/${sectionSlug}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          {meta.label}
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{definition.name}</h2>
            <p className="mt-1.5 text-sm text-ink-500">{definition.description}</p>
          </div>
          <StartPracticeButton
            typeCode={definition.code}
            count={5}
            label={available === 0 ? 'No questions yet' : 'Start practice'}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardBody>
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              <Clock className="size-4 text-ink-300" aria-hidden />
              Time allowed
            </p>
            <p className="mt-2 text-xl font-semibold text-navy-900">
              {definition.defaultTimeLimitSeconds
                ? formatDuration(definition.defaultTimeLimitSeconds)
                : 'Untimed'}
            </p>
            {definition.defaultPreparationSeconds ? (
              <p className="mt-1 text-xs text-ink-500">
                {definition.defaultPreparationSeconds}s preparation
              </p>
            ) : null}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="flex items-center gap-1.5 text-sm text-ink-500">
              <Target className="size-4 text-ink-300" aria-hidden />
              Your average
            </p>
            <p className="mt-2 text-xl font-semibold text-navy-900 tabular">{average ?? '—'}</p>
            <p className="mt-1 text-xs text-ink-500">
              {history.length > 0 ? `Last ${history.length} attempts` : 'No attempts yet'}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-ink-500">Scoring</p>
            <p className="mt-2 text-xl font-semibold text-navy-900">
              {definition.autoScorable ? 'Rule based' : 'AI evaluated'}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {definition.autoScorable
                ? 'Marked against the published PTE rules'
                : `Assessed on ${definition.skills.length} scoring traits`}
            </p>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent attempts" description="Your last ten answers for this task type." />
        {history.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {history.map((attempt) => (
              <li key={attempt.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-navy-900">{attempt.question.title}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {formatDate(attempt.submittedAt)} · {formatDuration(attempt.timeSpentSeconds)}
                  </p>
                </div>
                <span className="shrink-0 text-lg font-semibold text-navy-900 tabular">
                  {attempt.score?.overall ?? '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="No attempts yet"
            description={`Start a session to get your first ${definition.name} score.`}
          />
        )}
      </Card>

      {!definition.autoScorable ? <AiEstimateNote /> : null}
    </div>
  )
}
