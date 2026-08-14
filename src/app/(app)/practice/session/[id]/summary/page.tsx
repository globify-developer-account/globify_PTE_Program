import Link from 'next/link'
import { CheckCircle2, Clock, Repeat } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/states'
import { StartPracticeButton } from '@/components/practice/start-practice-button'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { loadSession } from '@/lib/practice'
import { SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Session summary',
  description: 'How you performed across this practice session.',
  path: '/practice',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function SessionSummaryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireStudent(`/practice/session/${id}/summary`)
  const session = await loadSession(id, user.id)

  const scored = session.items.filter((item) => item.score !== null)
  const average =
    scored.length > 0
      ? Math.round(scored.reduce((sum, item) => sum + (item.score?.overall ?? 0), 0) / scored.length)
      : null
  const best = scored.reduce<number | null>(
    (max, item) => (item.score && (max === null || item.score.overall > max) ? item.score.overall : max),
    null,
  )

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-green-50 text-green-700">
          <CheckCircle2 className="size-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">Session complete</h2>
        <p className="mt-1.5 text-sm text-ink-500">
          {scored.length} of {session.items.length} questions answered
          {session.section ? ` · ${SECTION_META[session.section].label}` : ''}
        </p>
      </div>

      {scored.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-ink-500">Session average</p>
              <p className="mt-2 text-[32px] font-semibold leading-none text-navy-900 tabular">{average}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="text-sm text-ink-500">Best answer</p>
              <p className="mt-2 text-[32px] font-semibold leading-none text-navy-900 tabular">{best}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm text-ink-500">
                <Clock className="size-4 text-ink-300" aria-hidden />
                Answered
              </p>
              <p className="mt-2 text-[32px] font-semibold leading-none text-navy-900 tabular">
                {scored.length}
              </p>
            </CardBody>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader title="Question by question" />
        {session.items.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {session.items.map((item, index) => (
              <li key={item.attemptId} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-xs font-semibold text-ink-600 tabular">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-navy-900">{item.question.title}</p>
                    <p className="mt-0.5 text-xs text-ink-500">{item.question.typeName}</p>
                  </div>
                </div>
                <span className="shrink-0 text-sm font-semibold text-navy-900 tabular">
                  {item.score ? item.score.overall : <span className="text-ink-400">Skipped</span>}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing recorded" description="This session had no questions." />
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <StartPracticeButton
          section={session.section ?? undefined}
          typeCode={session.questionTypeCode ?? undefined}
          count={session.totalQuestions}
          label="Practise again"
        />
        <ButtonLink href="/progress" variant="secondary">
          <Repeat aria-hidden />
          See your progress
        </ButtonLink>
        <Link href="/dashboard" className="text-sm font-medium text-ink-500 hover:text-ink-700">
          Back to dashboard
        </Link>
      </div>

      <AiEstimateNote className="text-center" />
    </div>
  )
}
