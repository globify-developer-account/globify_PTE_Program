import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { ScoreRing, Meter } from '@/components/charts/score-ring'
import { HorizontalBarChart } from '@/components/charts/bar-chart'
import { AiEstimateBadge, AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { getRecommendations } from '@/lib/recommendations'
import { SECTIONS, SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDateTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Mock test result',
  description: 'Your section-by-section mock test breakdown.',
  path: '/mock-tests',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const SKILL_LABELS: Record<string, string> = {
  content: 'Content',
  grammar: 'Grammar',
  vocabulary: 'Vocabulary',
  pronunciation: 'Pronunciation',
  fluency: 'Oral fluency',
  spelling: 'Spelling',
  form: 'Form',
  coherence: 'Written discourse',
  development: 'Development',
  listening: 'Listening',
}

export default async function MockResultPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  const user = await requireStudent(`/mock-tests/results/${sessionId}`)

  const result = await prisma.mockTestResult.findFirst({
    where: { sessionId, userId: user.id },
    include: { mockTest: { select: { title: true, slug: true } } },
  })
  if (!result) notFound()

  const [previous, profile, recommendations] = await Promise.all([
    prisma.mockTestResult.findFirst({
      where: { userId: user.id, createdAt: { lt: result.createdAt } },
      orderBy: { createdAt: 'desc' },
      select: { overallScore: true, createdAt: true },
    }),
    prisma.profile.findUnique({ where: { userId: user.id }, select: { targetScore: true } }),
    getRecommendations({ userId: user.id, targetScore: 79 }, 3),
  ])

  const target = profile?.targetScore ?? 79
  const delta = previous ? result.overallScore - previous.overallScore : null

  const sectionScores: Record<string, number> = {
    SPEAKING: result.speakingScore,
    WRITING: result.writingScore,
    READING: result.readingScore,
    LISTENING: result.listeningScore,
  }

  const skills = Object.entries((result.enablingSkills ?? {}) as Record<string, unknown>)
    .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
    .sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/mock-tests"
          className="text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          ← All mock tests
        </Link>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-navy-900">{result.mockTest.title}</h2>
        <p className="mt-1.5 text-sm text-ink-500">Completed {formatDateTime(result.createdAt)}</p>
      </div>

      {/* Overall */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <CardHeader title="Overall estimate" action={<AiEstimateBadge />} />
          <CardBody className="flex flex-col items-center">
            <ScoreRing value={result.overallScore} target={target} label="Mock test estimate" />
            {delta !== null ? (
              <p
                className={`mt-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${
                  delta >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-danger'
                }`}
              >
                {delta >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                {delta > 0 ? '+' : ''}
                {delta} vs your previous mock
              </p>
            ) : (
              <p className="mt-4 text-xs text-ink-500">Your first mock test — this is your baseline.</p>
            )}
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Section breakdown"
            description={
              result.strongestArea && result.weakestArea
                ? `Strongest: ${SECTION_META[result.strongestArea as keyof typeof SECTION_META]?.label ?? result.strongestArea} · Weakest: ${SECTION_META[result.weakestArea as keyof typeof SECTION_META]?.label ?? result.weakestArea}`
                : undefined
            }
          />
          <CardBody className="space-y-4">
            {SECTIONS.map((section) => {
              const meta = SECTION_META[section]
              const score = sectionScores[section] ?? 0
              return (
                <div key={section}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 font-medium text-navy-900">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                    <span className="tabular text-navy-900">
                      {score}
                      <span className="ml-1 text-ink-400">/ 90</span>
                    </span>
                  </div>
                  <Meter
                    value={score}
                    max={90}
                    color={meta.color}
                    trackColor="var(--color-ink-100)"
                    className="mt-2"
                    height={8}
                  />
                </div>
              )
            })}
          </CardBody>
        </Card>
      </div>

      {/* Enabling skills */}
      {skills.length > 0 ? (
        <Card>
          <CardHeader
            title="Enabling skills"
            description="Averaged across every scored response in this test."
            action={<AiEstimateBadge />}
          />
          <CardBody>
            <HorizontalBarChart
              data={skills.map(([key, value]) => ({
                label: SKILL_LABELS[key] ?? key,
                value,
              }))}
              max={90}
              tableCaption="Enabling skill scores"
            />
          </CardBody>
        </Card>
      ) : null}

      {/* What to do next */}
      <Card>
        <CardHeader
          title="What to work on next"
          description="Based on this result and your practice history."
        />
        <CardBody className="space-y-3">
          {recommendations.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-start justify-between gap-4 rounded-xl border border-hairline p-4 transition-colors hover:border-brand-200 hover:bg-brand-50/40"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-ink-500">{item.reason}</p>
              </div>
              <ArrowRight
                className="mt-0.5 size-4 shrink-0 text-brand-600 transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          ))}
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink href="/practice">Practise your weak areas</ButtonLink>
        <ButtonLink href="/progress" variant="secondary">
          See full progress
        </ButtonLink>
      </div>

      <AiEstimateNote className="text-center" />
    </div>
  )
}
