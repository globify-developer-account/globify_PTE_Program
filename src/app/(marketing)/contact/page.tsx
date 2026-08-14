import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react'
import { ContactForm } from '@/components/marketing/contact-form'
import { SectionHeading } from '@/components/marketing/sections'
import { pageMetadata } from '@/lib/metadata'
import { contactInfo, siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Contact',
  description: `Contact ${siteConfig.company} about Globify PTE Premium — plans, payments, teacher review or technical support.`,
  path: '/contact',
})

export default function ContactPage() {
  return (
    <section className="container-page py-16 sm:py-20">
      <SectionHeading
        eyebrow="Contact"
        title="Tell us where you are stuck"
        description="Send a message and our team will reply within one business day. For anything urgent, WhatsApp is the fastest route."
      />

      <div className="mt-14 grid gap-8 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-4">
          <a
            href={`https://wa.me/${contactInfo.whatsapp}`}
            target="_blank"
            rel="noreferrer noopener"
            className="surface-card flex items-start gap-4 p-5 transition-shadow hover:shadow-lift"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-green-50 text-green-600" aria-hidden>
              <MessageCircle className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">WhatsApp</span>
              <span className="mt-0.5 block text-sm text-ink-600">{contactInfo.whatsappDisplay}</span>
              <span className="mt-1 block text-xs text-ink-500">Fastest reply during office hours</span>
            </span>
          </a>

          <a href={`tel:${contactInfo.phoneHref}`} className="surface-card flex items-start gap-4 p-5 transition-shadow hover:shadow-lift">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600" aria-hidden>
              <Phone className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">Call us</span>
              <span className="mt-0.5 block text-sm text-ink-600">{contactInfo.phoneDisplay}</span>
            </span>
          </a>

          <a href={`mailto:${contactInfo.email}`} className="surface-card flex items-start gap-4 p-5 transition-shadow hover:shadow-lift">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600" aria-hidden>
              <Mail className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-navy-900">Email</span>
              <span className="mt-0.5 block text-sm text-ink-600">{contactInfo.email}</span>
            </span>
          </a>

          <div className="surface-card p-5">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-600" aria-hidden>
                <MapPin className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy-900">Office</p>
                <p className="mt-0.5 text-sm leading-relaxed text-ink-600">
                  {contactInfo.address.street}
                  <br />
                  {contactInfo.address.locality}, {contactInfo.address.region}
                  <br />
                  {contactInfo.address.country}
                </p>
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 border-t border-hairline pt-4 text-sm text-ink-500">
              <Clock className="size-4" aria-hidden />
              {contactInfo.hours}
            </p>
          </div>
        </div>

        <ContactForm />
      </div>
    </section>
  )
}
