import Link from 'next/link'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from 'lucide-react'
import { Logo } from './logo'
import { AI_DISCLAIMER, contactInfo, footerLinks, siteConfig } from '@/lib/site'

const SOCIAL_ICONS = {
  Facebook,
  Instagram,
  LinkedIn: Linkedin,
  YouTube: Youtube,
} as const

export function Footer() {
  return (
    <footer className="mt-24 bg-navy-900 text-navy-200">
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.4fr_2.6fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-navy-300">
            {siteConfig.promise} Built by {siteConfig.company} for students preparing to study, work and settle
            abroad.
          </p>

          <ul className="mt-6 space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-brand-300" aria-hidden />
              <span>
                {contactInfo.address.street}, {contactInfo.address.locality}, {contactInfo.address.country}
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 shrink-0 text-brand-300" aria-hidden />
              <a href={`tel:${contactInfo.phoneHref}`} className="hover:text-white">
                {contactInfo.phoneDisplay}
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 shrink-0 text-brand-300" aria-hidden />
              <a href={`mailto:${contactInfo.email}`} className="hover:text-white">
                {contactInfo.email}
              </a>
            </li>
          </ul>

          <ul className="mt-6 flex items-center gap-3">
            {contactInfo.socials.map((social) => {
              const Icon = SOCIAL_ICONS[social.label as keyof typeof SOCIAL_ICONS]
              return (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={social.label}
                    className="grid size-9 place-items-center rounded-lg bg-white/5 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="size-4" aria-hidden />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {footerLinks.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{group.title}</h3>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-navy-300 transition-colors hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-navy-400">
          <p className="max-w-4xl leading-relaxed">{AI_DISCLAIMER}</p>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              © {new Date().getFullYear()} {siteConfig.company}. All rights reserved.
            </p>
            <p>PTE and Pearson are trademarks of their respective owners.</p>
          </div>
        </div>
      </div>
    </footer>
  )
}
