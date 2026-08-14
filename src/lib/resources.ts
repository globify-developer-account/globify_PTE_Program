import 'server-only'
import type { Resource } from '@prisma/client'
import { prisma, safeQuery } from './db'

export const RESOURCE_CATEGORIES = [
  'PTE Tips',
  'Grammar',
  'Vocabulary',
  'Speaking Templates',
  'Writing Templates',
  'Practice Strategies',
  'Study Guides',
] as const

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number]

export async function listPublishedResources(options: { category?: string; premiumIncluded: boolean }) {
  return safeQuery(
    () =>
      prisma.resource.findMany({
        where: {
          status: 'PUBLISHED',
          ...(options.category ? { category: options.category } : {}),
          ...(options.premiumIncluded ? {} : { isPremium: false }),
        },
        orderBy: [{ displayOrder: 'asc' }, { publishedAt: 'desc' }],
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          category: true,
          tags: true,
          readMinutes: true,
          isPremium: true,
          publishedAt: true,
        },
      }),
    [],
  )
}

export async function getResourceBySlug(slug: string): Promise<Resource | null> {
  return safeQuery(
    () => prisma.resource.findFirst({ where: { slug, status: 'PUBLISHED' } }),
    null,
  )
}

export async function listResourceCategories(): Promise<Array<{ category: string; count: number }>> {
  const grouped = await safeQuery(
    () =>
      prisma.resource.groupBy({
        by: ['category'],
        where: { status: 'PUBLISHED' },
        _count: { _all: true },
        orderBy: { category: 'asc' },
      }),
    [],
  )
  return grouped.map((row) => ({ category: row.category, count: row._count._all }))
}

/**
 * Minimal, safe Markdown rendering for resource bodies.
 *
 * Resource content is authored by staff in the admin panel, but it is still
 * escaped before any formatting is applied, so a paste of untrusted HTML can
 * never become live markup.
 */
export function renderMarkdown(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const lines = escaped.split(/\r?\n/)
  const html: string[] = []
  let inList = false
  let inCode = false

  const closeList = () => {
    if (inList) {
      html.push('</ul>')
      inList = false
    }
  }

  for (const line of lines) {
    if (line.trim().startsWith('```')) {
      closeList()
      html.push(inCode ? '</code></pre>' : '<pre><code>')
      inCode = !inCode
      continue
    }
    if (inCode) {
      html.push(line)
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.*)$/)
    if (heading) {
      closeList()
      const level = Math.min(6, heading[1]!.length + 1)
      html.push(`<h${level}>${inline(heading[2]!)}</h${level}>`)
      continue
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      if (!inList) {
        html.push('<ul>')
        inList = true
      }
      html.push(`<li>${inline(bullet[1]!)}</li>`)
      continue
    }

    if (line.trim() === '') {
      closeList()
      continue
    }

    closeList()
    html.push(`<p>${inline(line)}</p>`)
  }

  closeList()
  if (inCode) html.push('</code></pre>')
  return html.join('\n')
}

function inline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2">$1</a>')
}
