'use client'

import { cn } from '@/lib/utils'

/**
 * 12-point trend line for stat tiles. Deliberately axis-free and unlabelled —
 * it shows direction; the tile's value and delta carry the numbers.
 */
export function Sparkline({
  points,
  color = 'var(--color-brand-500)',
  width = 96,
  height = 28,
  className,
}: {
  points: number[]
  color?: string
  width?: number
  height?: number
  className?: string
}) {
  if (points.length < 2) {
    return <div className={cn('h-7', className)} aria-hidden />
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = Math.max(1, max - min)
  const step = width / (points.length - 1)

  const path = points
    .map((point, index) => {
      const x = index * step
      const y = height - 3 - ((point - min) / span) * (height - 6)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const lastX = width
  const lastY = height - 3 - ((points[points.length - 1]! - min) / span) * (height - 6)

  return (
    <svg width={width} height={height} className={className} aria-hidden focusable="false">
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.55} />
      <circle cx={lastX - 1} cy={lastY} r={3} fill={color} stroke="var(--color-chart-surface)" strokeWidth={2} />
    </svg>
  )
}
