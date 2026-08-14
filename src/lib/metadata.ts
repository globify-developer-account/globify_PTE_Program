import type { Metadata } from 'next'
import { siteConfig } from './site'

interface PageMetaInput {
  title: string
  description: string
  path?: string
  keywords?: string[]
  noIndex?: boolean
}

export function pageMetadata({ title, description, path = '/', keywords, noIndex }: PageMetaInput): Metadata {
  const url = `${siteConfig.url}${path}`
  const fullTitle = path === '/' ? `${siteConfig.product} — ${siteConfig.tagline}` : `${title} | ${siteConfig.product}`

  return {
    title: fullTitle,
    description,
    keywords: keywords ?? [...siteConfig.keywords],
    alternates: { canonical: url },
    robots: noIndex ? { index: false, follow: false } : undefined,
    openGraph: {
      type: 'website',
      url,
      siteName: siteConfig.product,
      title: fullTitle,
      description,
      locale: siteConfig.locale,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
    },
  }
}

/** Organization + product structured data for the marketing pages. */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: siteConfig.company,
    url: siteConfig.url,
    description: siteConfig.description,
    slogan: siteConfig.tagline,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '2nd Floor, Kohinoor Plaza, Jaranwala Road',
      addressLocality: 'Faisalabad',
      addressRegion: 'Punjab',
      addressCountry: 'PK',
    },
  }
}

export function courseJsonLd(name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    provider: {
      '@type': 'EducationalOrganization',
      name: siteConfig.company,
      sameAs: siteConfig.url,
    },
  }
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}

