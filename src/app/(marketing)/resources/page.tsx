import Link from 'next/link'
import { BookOpen, Clock, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/states'
import { SectionHeading } from '@/components/marketing/sections'
import { getCurrentUser } from '@/lib/auth/session'
import { getEntitlements } from '@/lib/access'
import { pageMetadata } from '@/lib/metadata'
import { listPublishedResources, listResourceCategories } from '@/lib/resources'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'Resources',
  description:
    'PTE tips, grammar and vocabulary guides, speaking and writing templates, practice strategies and study guides from Globify Consultants.',
  path: '/resources',
})

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>
}) {
  const { category } = await searchParams
  const user = await getCurrentUser()
  const entitlements = user ? await getEntitlements(user.id) : null
  const isPremium = entitlements?.isPremium ?? false

  const [resources, categories] = await Promise.all([
    listPublishedResources({ category, premiumIncluded: true }),
    listResourceCategories(),
  ])

  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="Resources"
        title="Guides, templates and strategies"
        description="Short, practical material written by our teachers. Read them between practice sessions — not instead of them."
      />

      {categories.length > 0 ? (
        <nav className="mt-10 flex flex-wrap justify-center gap-2" aria-label="Resource categories">
          <CategoryChip href="/resources" label="All" active={!category} />
          {categories.map((item) => (
            <CategoryChip
              key={item.category}
              href={`/resources?category=${encodeURIComponent(item.category)}`}
              label={`${item.category} (${item.count})`}
              active={category === item.category}
            />
          ))}
        </nav>
      ) : null}

      {resources.length === 0 ? (
        <div className="mt-12 surface-card">
          <EmptyState
            title="No resources published yet"
            description="Our teachers are writing the first guides now. In the meantime, the fastest way to improve is to start practising."
            icon={<BookOpen />}
            action={{ label: 'Start practising', href: '/register' }}
          />
        </div>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => {
            const locked = resource.isPremium && !isPremium
            return (
              <Link
                key={resource.id}
                href={locked ? '/pricing' : `/resources/${resource.slug}`}
                className="group surface-card flex h-full flex-col p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="brand" size="sm">
                    {resource.category}
                  </Badge>
                  {resource.isPremium ? (
                    <Badge tone={locked ? 'neutral' : 'success'} size="sm">
                      {locked ? <Lock aria-hidden /> : null}
                      Premium
                    </Badge>
                  ) : null}
                </div>

                <h2 className="mt-4 text-lg font-semibold leading-snug text-navy-900 group-hover:text-brand-700">
                  {resource.title}
                </h2>
                {resource.excerpt ? (
                  <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-ink-600">{resource.excerpt}</p>
                ) : null}

                <p className="mt-auto flex items-center gap-1.5 pt-5 text-xs text-ink-500">
                  <Clock className="size-3.5" aria-hidden />
                  {resource.readMinutes} min read
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CategoryChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-brand-600 bg-brand-600 text-white'
          : 'border-hairline bg-white text-ink-600 hover:border-brand-200 hover:text-navy-900',
      )}
    >
      {label}
    </Link>
  )
}
