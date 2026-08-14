import { Card, CardBody } from '@/components/ui/card'
import { UpgradePrompt } from '@/components/ui/states'
import { WritingEvaluator } from '@/components/ai-tools/writing-evaluator'
import { ProgressAnalysis } from '@/components/ai-tools/progress-analysis'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'AI tools',
  description: 'Evaluate any piece of writing and get a written read of your progress.',
  path: '/ai-tools',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AiToolsPage() {
  const user = await requireStudent('/ai-tools')
  const entitlements = await getEntitlements(user.id)
  const writingQuota = await getQuota(user.id, 'ai_writing', entitlements)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">AI tools</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          The same evaluators the practice engine uses, available on any text you bring.
        </p>
      </div>

      {env.demoMode ? (
        <Card>
          <CardBody className="flex items-start gap-3 bg-amber-50/60">
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">Demo mode is on.</strong> Evaluations come from the built-in
              simulated scorer, which uses measurable signals such as length, word-limit compliance, lexical
              variety and source overlap. Set <code className="font-mono text-xs">AI_PROVIDER</code> and{' '}
              <code className="font-mono text-xs">AI_API_KEY</code> to use a live provider.
            </p>
          </CardBody>
        </Card>
      ) : null}

      <WritingEvaluator remaining={writingQuota.unlimited ? null : writingQuota.remaining} />

      <ProgressAnalysis />

      {!entitlements.isPremium ? (
        <UpgradePrompt
          title="Unlimited AI evaluation"
          description="Premium removes the monthly cap on AI speaking and writing evaluations, so you can get feedback on every response you write."
        />
      ) : null}

      <AiEstimateNote />
    </div>
  )
}
