import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import Script from 'next/script'
import { Toaster } from '@/components/ui/toast'
import { env } from '@/lib/env'
import { siteConfig } from '@/lib/site'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.product} — ${siteConfig.tagline}`,
    template: `%s | ${siteConfig.product}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.product,
  authors: [{ name: siteConfig.company }],
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon.svg' },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#0b1533',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          Skip to content
        </a>
        {children}
        <Toaster />

        {env.analytics.gtm ? (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${env.analytics.gtm}');`}
          </Script>
        ) : null}

        {env.analytics.ga ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${env.analytics.ga}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${env.analytics.ga}');`}
            </Script>
          </>
        ) : null}

        {env.analytics.metaPixel ? (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${env.analytics.metaPixel}');fbq('track','PageView');`}
          </Script>
        ) : null}
      </body>
    </html>
  )
}
