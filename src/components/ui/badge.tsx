import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      tone: {
        neutral: 'bg-ink-100 text-ink-700',
        brand: 'bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-100',
        navy: 'bg-navy-900 text-white',
        success: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-100',
        warning: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-100',
        danger: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-100',
        info: 'bg-sky-50 text-sky-700 ring-1 ring-inset ring-sky-100',
        outline: 'border border-hairline text-ink-600',
      },
      size: {
        sm: 'px-2 py-0.5 text-[11px]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
)

export interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: ReactNode
  className?: string
}

export function Badge({ tone, size, className, children }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, size }), className)}>{children}</span>
}

/** Maps a workflow status to a consistent tone across the whole product. */
export function statusTone(status: string): NonNullable<BadgeProps['tone']> {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
    case 'PAID':
    case 'PUBLISHED':
    case 'COMPLETED':
    case 'SCORED':
      return 'success'
    case 'PENDING':
    case 'PROCESSING':
    case 'MANUAL_REVIEW':
    case 'DRAFT':
    case 'REQUESTED':
    case 'IN_PROGRESS':
    case 'SCORING':
      return 'warning'
    case 'FAILED':
    case 'CANCELLED':
    case 'EXPIRED':
    case 'SUSPENDED':
    case 'REJECTED':
      return 'danger'
    case 'REFUNDED':
    case 'ARCHIVED':
      return 'neutral'
    default:
      return 'neutral'
  }
}

export function humanizeStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
