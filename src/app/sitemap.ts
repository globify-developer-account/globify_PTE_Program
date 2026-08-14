import type { MetadataRoute } from 'next'
import { prisma, safeQuery } from '@/lib/db'
import { SECTIONS, SECTION_META } from '@/lib/pte/question-types'
import { siteConfig } from '@/lib/site'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const paths: Array<{
    url: string
    changeFrequency: NonNullable<MetadataRoute.Sitemap[number]['changeFrequency']>
    priority: number
  }> = [
    { url: '/', changeFrequency: 'weekly', priority: 1 },
    { url: '/pte', changeFrequency: 'monthly', priority: 0.9 },
    { url: '/features', changeFrequency: 'monthly', priority: 0.8 },
    { url: '/pricing', changeFrequency: 'weekly', priority: 0.9 },
    { url: '/resources', changeFrequency: 'weekly', priority: 0.7 },
    { url: '/about', changeFrequency: 'yearly', priority: 0.5 },
    { url: '/contact', changeFrequency: 'yearly', priority: 0.5 },
    { url: '/faq', changeFrequency: 'monthly', priority: 0.6 },
    { url: '/register', changeFrequency: 'yearly', priority: 0.6 },
    { url: '/login', changeFrequency: 'yearly', priority: 0.4 },
    { url: '/terms', changeFrequency: 'yearly', priority: 0.3 },
    { url: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
    { url: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
    { url: '/ai-disclaimer', changeFrequency: 'yearly', priority: 0.4 },
  ]

  const staticRoutes: MetadataRoute.Sitemap = paths.map((entry) => ({
    ...entry,
    url: `${siteConfig.url}${entry.url}`,
    lastModified: now,
  }))

  const sectionRoutes: MetadataRoute.Sitemap = SECTIONS.map((section) => ({
    url: `${siteConfig.url}/pte/${SECTION_META[section].slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  const resources = await safeQuery(
    () =>
      prisma.resource.findMany({
        where: { status: 'PUBLISHED', isPremium: false },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
    [],
  )

  const resourceRoutes: MetadataRoute.Sitemap = resources.map((resource) => ({
    url: `${siteConfig.url}/resources/${resource.slug}`,
    lastModified: resource.updatedAt,
    changeFrequency: 'monthly',
    priority: 0.6,
  }))

  return [...staticRoutes, ...sectionRoutes, ...resourceRoutes]
}
