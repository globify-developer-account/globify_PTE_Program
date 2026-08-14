import { notFound, redirect } from 'next/navigation'
import { MockRunner } from '@/components/mock/mock-runner'
import { requireStudent } from '@/lib/auth/guards'
import { loadMockRun } from '@/lib/mock-tests'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Mock test in progress',
  description: 'A full-length PTE mock test under exam timing.',
  path: '/mock-tests',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function MockRunPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ session?: string }>
}) {
  const [{ slug }, { session: sessionId }] = await Promise.all([params, searchParams])
  if (!sessionId) redirect('/mock-tests')

  const user = await requireStudent(`/mock-tests/${slug}/run?session=${sessionId}`)

  // Ownership is scoped inside loadMockRun; a session id from another account
  // simply does not resolve.
  const run = await loadMockRun(sessionId, user.id)
  if (run.slug !== slug) notFound()
  if (run.status === 'COMPLETED') redirect(`/mock-tests/results/${sessionId}`)

  return <MockRunner run={run} />
}
