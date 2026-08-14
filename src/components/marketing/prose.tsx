import type { ReactNode } from 'react'
import { formatDate } from '@/lib/utils'

/**
 * Shared shell for legal and long-form pages. Typography is set here rather
 * than with a plugin so the reading measure and rhythm match the rest of the
 * product.
 */
export function LegalPage({
  title,
  updatedAt,
  intro,
  children,
}: {
  title: string
  updatedAt: string
  intro?: string
  children: ReactNode
}) {
  return (
    <article className="container-page max-w-3xl py-16 sm:py-20">
      <h1 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-4xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-500">Last updated {formatDate(updatedAt, 'long')}</p>
      {intro ? <p className="mt-6 text-[17px] leading-relaxed text-ink-600">{intro}</p> : null}
      <div className="mt-10 space-y-8">{children}</div>
    </article>
  )
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold text-navy-900">{heading}</h2>
      <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-ink-600 [&_a]:text-brand-600 [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-2">
        {children}
      </div>
    </section>
  )
}
