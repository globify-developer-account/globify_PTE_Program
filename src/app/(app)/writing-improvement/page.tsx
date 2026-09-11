import { PenLine } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { EmptyState, UpgradePrompt } from '@/components/ui/states'
import { WritingImprovementWorkspace } from '@/components/writing-improvement/workspace'
import { AiEstimateNote } from '@/components/dashboard/ai-estimate'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements, getQuota } from '@/lib/access'
import { listWritingExercises } from '@/lib/writing-exercises'
import { env } from '@/lib/env'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Writing improvement',
  description:
    'Write freely and have your English repaired — with every change marked against your draft and explained.',
  path: '/writing-improvement',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function WritingImprovementPage() {
  const user = await requireStudent('/writing-improvement')
  const entitlements = await getEntitlements(user.id)
  const [writingQuota, exercises] = await Promise.all([
    getQuota(user.id, 'ai_writing', entitlements),
    listWritingExercises(user.id),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Writing improvement</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          The fastest way to improve is to write badly first and then see exactly what a marker would
          change. Write without stopping to fix anything, and get your own sentences back repaired, with
          every correction marked and explained.
        </p>
      </div>

      {env.demoMode ? (
        <Card>
          <CardBody className="flex items-start gap-3 bg-amber-50/60">
            <p className="text-sm text-amber-900">
              <strong className="font-semibold">Demo mode is on.</strong> Rewrites come from a built-in
              rule-based editor that fixes spelling, punctuation, register and cohesion only. It does not
              judge your argument or restructure your paragraphs. Set{' '}
              <code className="font-mono text-xs">AI_PROVIDER</code> and{' '}
              <code className="font-mono text-xs">AI_API_KEY</code> to use a live provider.
            </p>
          </CardBody>
        </Card>
      ) : null}

      {exercises.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PenLine aria-hidden />}
            title="No exercises published yet"
            description="You can still paste your own writing below once your administrator publishes the exercise library."
            action={{ label: 'Back to dashboard', href: '/dashboard' }}
          />
        </Card>
      ) : null}

      <WritingImprovementWorkspace
        exercises={exercises}
        remaining={writingQuota.unlimited ? null : writingQuota.remaining}
        isPremium={entitlements.isPremium}
      />

      {!entitlements.isPremium ? (
        <UpgradePrompt
          title="Unlimited writing improvement"
          description="Premium removes the monthly cap on AI writing, so you can rewrite and re-rewrite every draft until the corrections stop appearing."
        />
      ) : null}

      <AiEstimateNote />
    </div>
  )
}
