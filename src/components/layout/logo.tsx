import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Globify PTE Premium wordmark. Drawn rather than an image file so it stays
 * crisp at any size and inherits the surrounding colour.
 */
export function Logo({
  href = '/',
  tone = 'dark',
  className,
  showProduct = true,
}: {
  href?: string
  tone?: 'dark' | 'light'
  className?: string
  showProduct?: boolean
}) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-[10px] shadow-[0_2px_8px_-2px_rgb(46_91_255/0.55)]',
          tone === 'dark' ? 'bg-brand-600' : 'bg-white',
        )}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="size-5" fill="none">
          <path
            d="M12 3.2 4.4 7v5.1c0 4.4 3.1 8.2 7.6 9.7 4.5-1.5 7.6-5.3 7.6-9.7V7L12 3.2Z"
            stroke={tone === 'dark' ? '#fff' : '#2e5bff'}
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.6 12.1 11 14.5l4.6-4.7"
            stroke={tone === 'dark' ? '#fff' : '#2e5bff'}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="leading-tight">
        <span
          className={cn(
            'block font-display text-[15px] font-extrabold tracking-tight',
            tone === 'dark' ? 'text-navy-900' : 'text-white',
          )}
        >
          GLOBIFY
        </span>
        {showProduct ? (
          <span
            className={cn(
              'block text-[10px] font-semibold uppercase tracking-[0.16em]',
              tone === 'dark' ? 'text-brand-600' : 'text-brand-200',
            )}
          >
            PTE Premium
          </span>
        ) : null}
      </span>
    </span>
  )

  if (!href) return content
  return (
    <Link href={href} className="rounded-lg focus-visible:outline-2" aria-label="Globify PTE Premium home">
      {content}
    </Link>
  )
}
