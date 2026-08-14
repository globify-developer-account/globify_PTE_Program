import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { LockedState } from '@/components/ui/states'
import { getCurrentUser } from '@/lib/auth/session'
import { getEntitlements } from '@/lib/access'
import { pageMetadata } from '@/lib/metadata'
import { getResourceBySlug, renderMarkdown } from '@/lib/resources'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)
  if (!resource) {
    return pageMetadata({ title: 'Resource', description: 'PTE preparation resource', path: '/resources', noIndex: true })
  }
  return pageMetadata({
    title: resource.title,
    description: resource.excerpt ?? `${resource.category} guide from Globify Consultants.`,
    path: `/resources/${resource.slug}`,
    keywords: resource.tags,
  })
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const resource = await getResourceBySlug(slug)
  if (!resource) notFound()

  const user = await getCurrentUser()
  const entitlements = user ? await getEntitlements(user.id) : null
  const locked = resource.isPremium && !(entitlements?.isPremium ?? false)

  return (
    <article className="container-page max-w-3xl py-16 sm:py-20">
      <Link
        href="/resources"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All resources
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Badge tone="brand">{resource.category}</Badge>
        {resource.isPremium ? <Badge tone="navy">Premium</Badge> : null}
      </div>

      <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-navy-900 sm:text-4xl">
        {resource.title}
      </h1>

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-500">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" aria-hidden />
          {resource.readMinutes} min read
        </span>
        {resource.publishedAt ? <span>Published {formatDate(resource.publishedAt, 'long')}</span> : null}
      </p>

      {resource.excerpt ? (
        <p className="mt-6 text-[17px] leading-relaxed text-ink-600">{resource.excerpt}</p>
      ) : null}

      {locked ? (
        <div className="mt-10 surface-card">
          <LockedState
            title="This guide is part of Globify PTE Premium"
            description="Upgrade to read the full guide, along with every other premium resource, template and strategy."
          />
        </div>
      ) : (
        <div
          className="mt-10 space-y-4 text-[16px] leading-relaxed text-ink-700 [&_a]:text-brand-600 [&_a]:underline [&_code]:rounded [&_code]:bg-ink-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-navy-900 [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-navy-900 [&_li]:ml-5 [&_li]:list-disc [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-navy-900 [&_pre]:p-4 [&_pre]:text-sm [&_pre]:text-white [&_ul]:space-y-2"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(resource.contentMd) }}
        />
      )}

      {resource.tags.length > 0 ? (
        <ul className="mt-12 flex flex-wrap gap-2 border-t border-hairline pt-6">
          {resource.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs text-ink-600">
              #{tag}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  )
}
