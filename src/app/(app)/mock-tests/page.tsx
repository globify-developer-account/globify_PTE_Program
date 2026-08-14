import Link from 'next/link'
import { Clock, FileText, Lock, Sparkles } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { StartMockButton } from '@/components/mock/start-mock-button'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { listMockTests } from '@/lib/mock-tests'
import { pageMetadata } from '@/lib/metadata'
import { formatDate } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Mock tests',
  description: 'Full-length PTE mock tests under exam timing.',
  path: '/mock-tests',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function MockTestsPage() {
  const user = await requireStudent('/mock-tests')
  const entitlements = await getEntitlements(user.id)
  const [tests, quota] = await Promise.all([
    listMockTests(user.id),
    getQuota(user.id, 'mock_test', entitlements),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Mock tests</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
            Full-length papers under exam timing. The most reliable estimate of where you actually stand.
          </p>
        </div>
        {!quota.unlimited ? (
          <span className="rounded-full bg-ink-100 px-3.5 py-1.5 text-xs font-medium text-ink-600">
            {quota.remaining} of {quota.limit} left this month
          </span>
        ) : null}
      </div>

      {tests.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText aria-hidden />}
            title="No mock tests published yet"
            description="Full-length papers appear here as soon as they are published."
            action={{ label: 'Practise instead', href: '/practice' }}
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tests.map((test) => {
            const locked = test.isPremium && !entitlements.isPremium
            return (
              <Card key={test.id}>
                <CardBody>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-navy-900">{test.title}</h3>
                      {test.description ? (
                        <p className="mt-1.5 text-sm text-ink-500">{test.description}</p>
                      ) : null}
                    </div>
                    {test.isPremium ? (
                      <Badge tone="brand">
                        <Sparkles aria-hidden />
                        Premium
                      </Badge>
                    ) : (
                      <Badge tone="success">Free</Badge>
                    )}
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-ink-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" aria-hidden />
                      {test.durationMinutes} minutes
                    </span>
                    <span>{test.sectionCount} sections</span>
                    <span>{test.difficulty.toLowerCase()} difficulty</span>
                  </div>

                  {test.lastResult ? (
                    <div className="mt-4 flex items-center justify-between rounded-xl bg-ink-50 p-3.5">
                      <div>
                        <p className="text-xs text-ink-500">
                          Last attempt {formatDate(test.lastResult.createdAt)}
                        </p>
                        <p className="mt-0.5 text-sm font-medium text-navy-900">
                          Estimated {test.lastResult.overallScore} overall
                        </p>
                      </div>
                      <Link
                        href={`/mock-tests/results/${test.lastResult.sessionId}`}
                        className="text-sm font-medium text-brand-600 hover:text-brand-700"
                      >
                        View result
                      </Link>
                    </div>
                  ) : null}

                  <div className="mt-5">
                    {locked ? (
                      <Link
                        href="/pricing"
                        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-hairline text-sm font-medium text-ink-600 hover:border-brand-200 hover:text-brand-700"
                      >
                        <Lock className="size-4" aria-hidden />
                        Unlock with Premium
                      </Link>
                    ) : (
                      <StartMockButton
                        slug={test.slug}
                        resumeSessionId={test.openSessionId}
                        attempts={test.attempts}
                      />
                    )}
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>
      )}

      {!entitlements.isPremium ? <UpgradePrompt /> : null}
      <AiEstimateNote />
    </div>
  )
}
