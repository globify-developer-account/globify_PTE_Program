import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sparkline } from './sparkline'

export interface StatTileProps {
  label: string
  value: string | number
  /** Signed change against a named period. */
  delta?: { value: number; period: string; suffix?: string }
  /** false when a rise is bad — e.g. failed payments. */
  upIsGood?: boolean
  trend?: number[]
  trendColor?: string
  icon?: ReactNode
  hint?: string
  className?: string
}

export function StatTile({
  label,
  value,
  delta,
  upIsGood = true,
  trend,
  trendColor,
  icon,
  hint,
  className,
}: StatTileProps) {
  const direction = delta ? Math.sign(delta.value) : 0
  const good = direction === 0 ? null : (direction > 0) === upIsGood
  const DeltaIcon = direction === 0 ? ArrowRight : direction > 0 ? ArrowUpRight : ArrowDownRight

  return (
    <div className={cn('surface-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-ink-500">{label}</p>
        {icon ? <span className="text-ink-300 [&_svg]:size-4">{icon}</span> : null}
      </div>

      <div className="mt-2.5 flex items-end justify-between gap-3">
        <p className="text-[28px] font-semibold leading-none text-navy-900">{value}</p>
        {trend && trend.length > 1 ? <Sparkline points={trend} color={trendColor} /> : null}
      </div>

      {delta ? (
        <p
          className={cn(
            'mt-3 inline-flex items-center gap-1 text-sm',
            good === null ? 'text-ink-500' : good ? 'text-green-700' : 'text-danger',
          )}
        >
          <DeltaIcon className="size-3.5" aria-hidden />
          <span className="font-medium tabular">
            {delta.value > 0 ? '+' : ''}
            {delta.value}
            {delta.suffix ?? ''}
          </span>
          <span className="text-ink-500">vs {delta.period}</span>
        </p>
      ) : hint ? (
        <p className="mt-3 text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}
