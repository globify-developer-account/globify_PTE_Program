import { Headphones } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { LinkTabs } from '@/components/ui/tabs'
import { DrillCard } from '@/components/drills/drill-card'
import { requireStudent } from '@/lib/auth/guards'
import { getEntitlements } from '@/lib/access'
import { listDrillCategories, listDrills } from '@/lib/drills'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Dictation & Shadowing',
  description: 'Train your ear and your speaking with dictation and shadowing exercises.',
  path: '/drills',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function DrillsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const user = await requireStudent('/drills')
  const { category } = await searchParams

  const entitlements = await getEntitlements(user.id)
  const [categories, drills] = await Promise.all([
    listDrillCategories(),
    listDrills(user.id, { categorySlug: category && category !== 'all' ? category : null }),
  ])

  const totalDrills = categories.reduce((sum, item) => sum + item._count.drills, 0)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Dictation &amp; Shadowing</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Two ways through the same recording. Type what you hear to sharpen your listening and spelling,
          or read it aloud with the speaker to work on rhythm and pronunciation. Every line is marked
          word by word.
        </p>
      </div>

      {totalDrills === 0 ? (
        <Card>
          <EmptyState
            icon={<Headphones aria-hidden />}
            title="No exercises published yet"
            description="Once your administrator publishes dictation and shadowing exercises they will appear here, grouped by category."
            action={{ label: 'Back to dashboard', href: '/dashboard' }}
          />
        </Card>
      ) : (
        <>
          <LinkTabs
            paramName="category"
            items={[
              { key: 'all', label: 'All', count: totalDrills },
              ...categories.map((item) => ({
                key: item.slug,
                label: item.name,
                count: item._count.drills,
              })),
            ]}
          />

          {drills.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Headphones aria-hidden />}
                title="Nothing in this category yet"
                description="Try another category — more exercises are added regularly."
              />
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {drills.map((drill) => (
                <DrillCard
                  key={drill.id}
                  drill={drill}
                  locked={drill.isPremium && !entitlements.isPremium}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
