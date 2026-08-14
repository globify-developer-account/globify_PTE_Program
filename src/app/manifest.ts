import type { MetadataRoute } from 'next'
import { siteConfig } from '@/lib/site'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.product,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f6f8fc',
    theme_color: '#0b1533',
    categories: ['education', 'productivity'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Practice', url: '/practice' },
      { name: 'Mock Tests', url: '/mock-tests' },
      { name: 'Progress', url: '/progress' },
    ],
  }
}
