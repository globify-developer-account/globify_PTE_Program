import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { LockedState, UpgradePrompt } from '@/components/ui/states'
import { DrillRunner } from '@/components/drills/drill-runner'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { getDrillProgress, getPracticeDrill, type PracticeDrill } from '@/lib/drills'
import { parseMode } from '@/lib/drills/schemas'
import { HttpError, PaywallError } from '@/lib/http'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Exercise',
  description: 'Practise dictation and shadowing on a single recording.',
  path: '/drills',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function DrillPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ mode?: string }>
}) {
  const { slug } = await params
  const { mode: rawMode } = await searchParams
  const mode = parseMode(rawMode)

  const user = await requireStudent(`/drills/${slug}?mode=${mode.toLowerCase()}`)
  const entitlements = await getEntitlements(user.id)

  let drill: PracticeDrill
  try {
    drill = await getPracticeDrill(slug, mode, entitlements)
  } catch (error) {
    // A premium exercise reached by a free account is a paywall, not a crash.
    if (error instanceof PaywallError) {
      return (
        <div className="mx-auto max-w-3xl space-y-5">
          <BackLink />
          <Card>
            <LockedState
              title="This exercise is part of Globify PTE Premium"
              description={error.message}
            />
          </Card>
          <UpgradePrompt />
        </div>
      )
    }
    if (error instanceof HttpError && error.status === 404) notFound()
    throw error
  }

  const progress = await getDrillProgress(user.id, drill.id)

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <BackLink />

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-ink-400">{drill.categoryName}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-navy-900">{drill.title}</h2>
        {drill.description ? <p className="mt-1.5 text-sm text-ink-500">{drill.description}</p> : null}
      </div>

      <DrillRunner drill={drill} mode={mode} progress={progress[mode]} />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/drills"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-navy-900"
    >
      <ArrowLeft className="size-4" aria-hidden />
      All exercises
    </Link>
  )
}
