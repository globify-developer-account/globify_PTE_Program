'use client'

import { LifeBuoy, Mail, MessageCircle, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Support launcher. Channels are passed in from platform settings so an admin
 * can change the WhatsApp number or turn tickets off without a deploy.
 */
export function SupportWidget({
  whatsapp,
  email,
  ticketsEnabled,
}: {
  whatsapp: string
  email: string
  ticketsEnabled: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-5 right-5 z-40 print:hidden">
      {open ? (
        <div className="mb-3 w-64 overflow-hidden rounded-xl border border-hairline bg-white shadow-pop">
          <div className="border-b border-hairline px-4 py-3">
            <p className="text-sm font-semibold text-navy-900">Need a hand?</p>
            <p className="mt-0.5 text-xs text-ink-500">Our team replies during business hours.</p>
          </div>
          <ul className="p-2">
            {whatsapp ? (
              <li>
                <a
                  href={`https://wa.me/${whatsapp}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <MessageCircle className="size-4 text-green-600" aria-hidden />
                  WhatsApp
                </a>
              </li>
            ) : null}
            <li>
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
              >
                <Mail className="size-4 text-brand-600" aria-hidden />
                Email support
              </a>
            </li>
            {ticketsEnabled ? (
              <li>
                <a
                  href="/contact"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-700 hover:bg-ink-50"
                >
                  <LifeBuoy className="size-4 text-ink-500" aria-hidden />
                  Send a message
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Close support menu' : 'Open support menu'}
        className={cn(
          'grid size-12 place-items-center rounded-full text-white shadow-lift transition-colors',
          open ? 'bg-navy-900' : 'bg-brand-600 hover:bg-brand-700',
        )}
      >
        {open ? <X className="size-5" aria-hidden /> : <LifeBuoy className="size-5" aria-hidden />}
      </button>
    </div>
  )
}
