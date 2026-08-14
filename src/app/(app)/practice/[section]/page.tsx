import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { Meter } from '@/components/charts/score-ring'
import { StartPracticeButton } from '@/components/practice/start-practice-button'
import { requireStudent } from '@/lib/auth/guards'
import { getTypeSummaries } from '@/lib/practice'
import { SECTIONS, SECTION_META, sectionFromSlug } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params
  const section = sectionFromSlug(slug)
  if (!section) {
    return pageMetadata({
      title: 'Practice',
      description: 'Practise every PTE task type with instant scoring.',
      path: '/practice',
      noIndex: true,
    })
  }
  return pageMetadata({
    title: `${SECTION_META[section].label} practice`,
    description: SECTION_META[section].blurb,
    path: `/practice/${slug}`,
    noIndex: true,
  })
}

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section: SECTION_META[section].slug }))
}

export default async function SectionPracticePage({
  params,
}: {
  params: Promise<{ section: string }>
}) {
  const { section: slug } = await params
  const section = sectionFromSlug(slug)
  if (!section) notFound()

  const user = await requireStudent(`/practice/${slug}`)
  const meta = SECTION_META[section]
  const types = await getTypeSummaries(user.id, section)

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/practice"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All sections
        </Link>

        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2.5 text-2xl font-semibold tracking-tight text-navy-900">
              <span className="size-3 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
              {meta.label}
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm text-ink-500">{meta.blurb}</p>
          </div>
          <StartPracticeButton section={section} count={5} label={`Mixed ${meta.label} session`} />
        </div>
      </div>

      {types.length === 0 ? (
        <Card>
          <EmptyState
            title={`No ${meta.label} questions yet`}
            description="Questions appear here as soon as they are published."
            action={{ label: 'Back to practice', href: '/practice' }}
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {types.map((type) => (
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

                {type.attemptedCount > 0 ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink-500">
                        {type.attemptedCount} attempt{type.attemptedCount === 1 ? '' : 's'}
                      </span>
                      <span className="font-medium text-navy-900 tabular">Avg {type.averageScore}</span>
                    </div>
                    <Meter
                      value={type.averageScore ?? 0}
                      max={90}
                      color={meta.color}
                      trackColor="var(--color-ink-100)"
                      className="mt-2"
                      height={5}
                    />
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-ink-400">Not attempted yet</p>
                )}

                <div className="mt-5 flex items-center justify-between gap-3">
                  <span className="text-xs text-ink-500">
                    {type.questionCount} question{type.questionCount === 1 ? '' : 's'} available
                  </span>
                  <Link
                    href={`/practice/${slug}/${type.code.toLowerCase().replace(/_/g, '-')}`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Open
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
