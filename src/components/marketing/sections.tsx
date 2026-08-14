import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'center',
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  align?: 'center' | 'left'
  className?: string
}) {
  return (
    <div className={cn(align === 'center' ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl', className)}>
      {eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{eyebrow}</p>
      ) : null}
      <h2 className="text-3xl font-bold tracking-tight text-navy-900 sm:text-[38px] sm:leading-[1.15]">{title}</h2>
      {description ? <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{description}</p> : null}
    </div>
  )
}

export function FeatureCard({
  icon,
  title,
  description,
  points,
  accent = 'var(--color-brand-600)',
  href,
  className,
}: {
  icon: ReactNode
  title: string
  description: string
  points?: string[]
  accent?: string
  href?: string
  className?: string
}) {
  const body = (
    <>
      <span
        className="grid size-11 place-items-center rounded-xl [&_svg]:size-5"
        style={{ backgroundColor: `color-mix(in srgb, ${accent} 12%, white)`, color: accent }}
        aria-hidden
      >
        {icon}
      </span>
      <h3 className="mt-5 text-lg font-semibold text-navy-900">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{description}</p>
      {points?.length ? (
        <ul className="mt-4 space-y-2">
          {points.map((point) => (
            <li key={point} className="flex items-start gap-2 text-sm text-ink-600">
              <Check className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
      ) : null}
      {href ? (
        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600">
          Learn more
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      ) : null}
    </>
  )

  const classes = cn(
    'group surface-card h-full p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift',
    className,
  )

  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  )
}

export function NavyPanel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cn('relative overflow-hidden bg-navy-900 py-20 text-white sm:py-24', className)}>
      <div className="grid-veil pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -right-40 -top-40 size-[32rem] rounded-full bg-brand-600/20 blur-3xl"
        aria-hidden
      />
      <div className="container-page relative">{children}</div>
    </section>
  )
}

export function CtaBand({
  title = 'Start preparing with Globify PTE Premium',
  description = 'Create a free account, take your first AI-scored practice task today, and upgrade when you are ready for unlimited access.',
}: {
  title?: string
  description?: string
}) {
  return (
    <NavyPanel>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[36px]">{title}</h2>
        <p className="mt-4 text-[17px] leading-relaxed text-navy-200">{description}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/register"
            className="inline-flex h-12 items-center rounded-lg bg-white px-6 text-sm font-semibold text-navy-900 transition-colors hover:bg-brand-50"
          >
            Start Practicing
          </Link>
          <Link
            href="/pricing"
            className="inline-flex h-12 items-center rounded-lg border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
          >
            Explore Premium
          </Link>
        </div>
      </div>
    </NavyPanel>
  )
}
