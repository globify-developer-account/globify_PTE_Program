import Link from 'next/link'
import { ArrowRight, Mic } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { Meter } from '@/components/charts/score-ring'
import { StartPracticeButton } from '@/components/practice/start-practice-button'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { getTypeSummaries } from '@/lib/practice'
import { SECTION_META, SECTIONS } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Practice',
  description: 'Practise every PTE task type with instant scoring.',
  path: '/practice',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  const user = await requireStudent('/practice')
  const entitlements = await getEntitlements(user.id)
  const [summaries, quota] = await Promise.all([
    getTypeSummaries(user.id),
    getQuota(user.id, 'practice', entitlements),
  ])

  const totalQuestions = summaries.reduce((sum, type) => sum + type.questionCount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Practice</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            All 18 PTE Academic task types, scored the moment you submit.
          </p>
        </div>
        <StartPracticeButton count={5} label="Quick 5-question session" />
      </div>

      <Card>
        <CardBody className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-900">Preparing for IELTS instead?</p>
            <p className="mt-1 text-xs text-ink-500">
              IELTS Writing Task 1 and Task 2 are scored against the four official criteria and reported as a band.
            </p>
          </div>
          <Link
            href="/practice/ielts"
            className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            IELTS practice
          </Link>
        </CardBody>
      </Card>

      {!quota.unlimited ? (
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-navy-900">
                {quota.remaining} of {quota.limit} free practice questions left today
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Your allowance resets at midnight. Premium removes the limit entirely.
              </p>
              <Meter value={quota.used} max={quota.limit} className="mt-3 max-w-xs" height={6} />
            </div>
            <Link
              href="/pricing"
              className="shrink-0 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              See plans
            </Link>
          </CardBody>
        </Card>
      ) : null}

      {totalQuestions === 0 ? (
        <Card>
          <EmptyState
            icon={<Mic aria-hidden />}
            title="No questions published yet"
            description="Once your administrator publishes questions they will appear here, grouped by task type."
            action={{ label: 'Back to dashboard', href: '/dashboard' }}
          />
        </Card>
      ) : (
        SECTIONS.map((section) => {
          const meta = SECTION_META[section]
          const types = summaries.filter((type) => type.section === section)
          if (types.length === 0) return null

          return (
            <section key={section} aria-labelledby={`section-${meta.slug}`}>
              <Card>
                <CardHeader
                  title={
                    <span id={`section-${meta.slug}`} className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                  }
                  description={meta.blurb}
                  action={
                    <Link
                      href={`/practice/${meta.slug}`}
                      className="text-sm font-medium text-brand-600 hover:text-brand-700"
                    >
                      Open section
                    </Link>
                  }
                />
                <CardBody className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {types.map((type) => (
                    <Link
                      key={type.code}
                      href={`/practice/${meta.slug}/${type.code.toLowerCase().replace(/_/g, '-')}`}
                      className="group rounded-xl border border-hairline p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-navy-900">{type.name}</p>
                        <span className="shrink-0 rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-500">
                          {type.shortName}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-ink-500">
                        {type.questionCount} question{type.questionCount === 1 ? '' : 's'}
                        {type.attemptedCount > 0
                          ? ` · ${type.attemptedCount} attempted · avg ${type.averageScore}`
                          : ' · not attempted'}
                      </p>
                      <span className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-600">
                        Practise
                        <ArrowRight
                          className="size-3 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </Link>
                  ))}
                </CardBody>
              </Card>
            </section>
          )
        })
      )}

      <AiEstimateNote />
    </div>
  )
}
