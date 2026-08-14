import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // Signed-in surfaces hold personal practice data and must never be indexed.
        disallow: [
          '/api/',
          '/admin',
          '/admin/',
          '/dashboard',
          '/practice',
          '/mock-tests',
          '/progress',
          '/profile',
          '/subscription',
          '/checkout',
          '/notifications',
          '/ai-tools',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
