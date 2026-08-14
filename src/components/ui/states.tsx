import { AlertTriangle, Inbox, Lock, RefreshCw, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ButtonLink } from './button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} aria-hidden />
}

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)} aria-hidden>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className={cn('h-3.5', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('surface-card p-5', className)}>
      <Skeleton className="h-4 w-28" />
      <Skeleton className="mt-4 h-9 w-20" />
      <SkeletonText lines={2} className="mt-5" />
    </div>
  )
}

interface EmptyStateProps {
  title: string
  description?: string
  icon?: ReactNode
  action?: { label: string; href: string }
  secondaryAction?: { label: string; href: string }
  className?: string
}

export function EmptyState({ title, description, icon, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">
        {icon ?? <Inbox aria-hidden />}
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      {description ? <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p> : null}
      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action ? <ButtonLink href={action.href}>{action.label}</ButtonLink> : null}
          {secondaryAction ? (
            <ButtonLink href={secondaryAction.href} variant="secondary">
              {secondaryAction.label}
            </ButtonLink>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  description = 'We could not load this section. Please check your connection and try again.',
  onRetry,
  className,
}: {
  title?: string
  description?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-12 text-center', className)}>
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-red-50 text-danger [&_svg]:size-5">
        <AlertTriangle aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-5 inline-flex items-center gap-2 rounded-lg border border-hairline bg-white px-4 py-2 text-sm font-medium text-navy-900 hover:border-brand-200"
        >
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </button>
      ) : null}
    </div>
  )
}

/** Shown wherever a free or expired account hits a premium boundary. */
export function UpgradePrompt({
  title = 'Unlock unlimited PTE practice',
  description = 'Globify PTE Premium gives you unlimited practice, full mock tests, AI scoring on every response and detailed performance analytics.',
  ctaLabel = 'Upgrade Now',
  className,
}: {
  title?: string
  description?: string
  ctaLabel?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white p-6',
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          <Sparkles className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-navy-900">{title}</h3>
          <p className="mt-1.5 text-sm text-ink-600">{description}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <ButtonLink href="/pricing" size="sm">
              {ctaLabel}
            </ButtonLink>
            <ButtonLink href="/features" size="sm" variant="ghost">
              See what is included
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LockedState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-4 grid size-12 place-items-center rounded-xl bg-ink-100 text-ink-500 [&_svg]:size-5">
        <Lock aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-navy-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm text-ink-500">{description}</p>
      <ButtonLink href="/pricing" className="mt-5" size="sm">
        View plans
      </ButtonLink>
    </div>
  )
}
