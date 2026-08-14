'use client'

import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Circular progress toward the target score.
 *
 * The track is a lighter step of the fill's own ramp so the state reads across
 * the whole ring, and the figure inside is the view's hero number.
 */
export function ScoreRing({
  value,
  target,
  size = 176,
  strokeWidth = 12,
  label = 'Current estimate',
  className,
}: {
  value: number
  target: number
  size?: number
  strokeWidth?: number
  label?: string
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const ratio = Math.max(0, Math.min(1, target > 0 ? value / target : 0))

  const [offset, setOffset] = useState(circumference)
  useEffect(() => {
    const timer = window.setTimeout(() => setOffset(circumference * (1 - ratio)), 60)
    return () => window.clearTimeout(timer)
  }, [circumference, ratio])

  const reached = value >= target

  return (
    <div className={cn('relative inline-grid place-items-center', className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" role="img" aria-label={`${label}: ${value} out of a target of ${target}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-brand-100)" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={reached ? 'var(--color-success)' : 'var(--color-brand-600)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <CountUp value={value} className="block text-[44px] font-semibold leading-none text-navy-900" />
          <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">of {target} target</p>
        </div>
      </div>
    </div>
  )
}

/** Animated score counter — one of the few places motion earns its place. */
export function CountUp({
  value,
  className,
  durationMs = 900,
}: {
  value: number
  className?: string
  durationMs?: number
}) {
  const motionValue = useMotionValue(0)
  const rounded = useTransform(motionValue, (latest) => Math.round(latest).toString())

  useEffect(() => {
    const controls = animate(motionValue, value, {
      duration: durationMs / 1000,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [motionValue, value, durationMs])

  return (
    <motion.span className={cn('tabular', className)}>
      {rounded}
    </motion.span>
  )
}

/** Linear meter used inside score cards and the daily-goal tile. */
export function Meter({
  value,
  max,
  color = 'var(--color-brand-600)',
  trackColor = 'var(--color-brand-100)',
  className,
  height = 8,
}: {
  value: number
  max: number
  color?: string
  trackColor?: string
  className?: string
  height?: number
}) {
  const percent = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0
  return (
    <div
      className={cn('w-full overflow-hidden rounded-full', className)}
      style={{ height, backgroundColor: trackColor }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-out"
        style={{ width: `${percent}%`, backgroundColor: color }}
      />
    </div>
  )
}
