import { PublicNavbar } from '@/components/layout/public-navbar'
import { Footer } from '@/components/layout/footer'
import { SupportWidget } from '@/components/layout/support-widget'
import { JsonLd } from '@/components/seo/json-ld'
import { getCurrentUser } from '@/lib/auth/session'
import { organizationJsonLd } from '@/lib/metadata'
import { getSettings } from '@/lib/settings'

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()])

  return (
    <div className="flex min-h-dvh flex-col">
      <JsonLd data={organizationJsonLd()} />
      <PublicNavbar signedIn={Boolean(user)} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
      <SupportWidget
        whatsapp={settings.supportWhatsapp}
        email={settings.supportEmail}
        ticketsEnabled={settings.supportTicketsEnabled}
      />
    </div>
  )
}
