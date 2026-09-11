import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { StartPracticeButton } from '@/components/practice/start-practice-button'
import { requireStudent } from '@/lib/auth/guards'
import { getTypeSummaries } from '@/lib/practice'
import { ieltsQuestionType, IELTS_SECTION_META } from '@/lib/exams/ielts/question-types'
import { formatBand, normalizedToBand } from '@/lib/exams/ielts/bands'
import { pageMetadata } from '@/lib/metadata'

/**
 * IELTS practice.
 *
 * This is a static route segment, so it takes precedence over the sibling
 * `[section]` segment and never reaches `sectionFromSlug`.
 *
 * Only the Writing tasks appear, because they are the only IELTS tasks the
 * practice engine can currently render and score. The rest of the catalogue is
 * defined in src/lib/exams/ielts/question-types.ts but deliberately unseeded.
 */

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'IELTS practice',
  description: 'Practise IELTS Writing Task 1 and Task 2 with band-scored feedback.',
  path: '/practice/ielts',
  noIndex: true,
})

export default async function IeltsPracticePage() {
  const user = await requireStudent('/practice/ielts')
  const types = await getTypeSummaries(user.id, undefined, 'IELTS')
  const writing = IELTS_SECTION_META.WRITING

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All practice
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">IELTS Writing</h2>
            <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{writing.blurb}</p>
          </div>
        </div>
      </div>

      <Card>
        <CardBody>
          <p className="text-sm text-ink-600">
            Your responses are assessed against the four public IELTS criteria and reported as a band from 0 to 9 in
            half steps. Bands are study estimates, not official IELTS results.
          </p>
        </CardBody>
      </Card>

      {types.length === 0 ? (
        <Card>
          <EmptyState
            title="No IELTS tasks yet"
            description="Tasks appear here as soon as they are published."
            action={{ label: 'Back to practice', href: '/practice' }}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {types.map((type) => {
            const definition = ieltsQuestionType(type.code)
            const minutes = definition?.defaultTimeLimitSeconds
              ? Math.round(definition.defaultTimeLimitSeconds / 60)
              : null

            return (
              <Card key={type.code}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-navy-900">{type.name}</h3>
                      {type.description ? (
                        <p className="mt-1.5 text-sm text-ink-500">{type.description}</p>
                      ) : null}
                    </div>
                    <span className="shrink-0 rounded-md bg-ink-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                      {type.shortName}
                    </span>
                  </div>

                  <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-500">
                    {minutes ? (
                      <div className="flex gap-1.5">
                        <dt>Time</dt>
                        <dd className="font-medium text-navy-900 tabular">{minutes} min</dd>
                      </div>
                    ) : null}
                    {definition?.wordLimitMin ? (
                      <div className="flex gap-1.5">
                        <dt>Minimum</dt>
                        <dd className="font-medium text-navy-900 tabular">{definition.wordLimitMin} words</dd>
                      </div>
                    ) : null}
                    {definition?.taskWeight === 2 ? (
                      <div className="flex gap-1.5">
                        <dt>Weighting</dt>
                        <dd className="font-medium text-navy-900">Counts double</dd>
                      </div>
                    ) : null}
                    <div className="flex gap-1.5">
                      <dt>Tasks</dt>
                      <dd className="font-medium text-navy-900 tabular">{type.questionCount}</dd>
                    </div>
                  </dl>

                  {type.attemptedCount > 0 && type.averageScore !== null ? (
                    <p className="mt-3 text-xs text-ink-500">
                      {type.attemptedCount} attempt{type.attemptedCount === 1 ? '' : 's'} · average band{' '}
                      <span className="font-medium text-navy-900 tabular">
                        {formatBand(normalizedToBand(type.averageScore))}
                      </span>
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <StartPracticeButton
                      typeCode={type.code}
                      count={1}
                      label="Start task"
                      block
                    />
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
