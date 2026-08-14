'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Shared chart chrome.
 *
 * Charts are hand-drawn SVG rather than a charting library: the bundle stays
 * small, the marks follow the house specs exactly (2px lines, ≤24px bars, 4px
 * rounded data-ends, 2px surface gaps) and every chart ships the same tooltip
 * and table-view behaviour.
 */

export const CHART_INK = {
  grid: 'var(--color-chart-grid)',
  axis: 'var(--color-chart-axis)',
  muted: 'var(--color-chart-muted)',
  surface: 'var(--color-chart-surface)',
} as const

/** Measures the container so charts render at real pixel width (no distortion). */
export function useMeasuredWidth(fallback = 640): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width
      if (next && Math.abs(next - width) > 1) setWidth(next)
    })
    observer.observe(element)
    setWidth(element.clientWidth || fallback)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback])

  return [ref, width]
}

export interface Tooltip {
  x: number
  y: number
  title: string
  rows: Array<{ label: string; value: string; color?: string }>
}

export function ChartTooltip({ tooltip, containerWidth }: { tooltip: Tooltip | null; containerWidth: number }) {
  if (!tooltip) return null
  const flip = tooltip.x > containerWidth - 150
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 min-w-36 rounded-lg border border-hairline bg-white/98 px-3 py-2 shadow-lift backdrop-blur"
      style={{
        left: flip ? undefined : tooltip.x + 12,
        right: flip ? containerWidth - tooltip.x + 12 : undefined,
        top: Math.max(0, tooltip.y - 12),
      }}
    >
      <p className="text-xs font-medium text-navy-900">{tooltip.title}</p>
      <ul className="mt-1.5 space-y-1">
        {tooltip.rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-ink-500">
              {row.color ? (
                <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} aria-hidden />
              ) : null}
              {row.label}
            </span>
            <span className="font-medium text-navy-900 tabular">{row.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Legend({
  items,
  className,
}: {
  items: Array<{ label: string; color: string }>
  className?: string
}) {
  if (items.length < 2) return null
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5', className)}>
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-ink-600">
          <span className="h-0.5 w-3.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  )
}

/** Every chart ships a table view so the data is never gated behind colour. */
export function TableView({
  caption,
  columns,
  rows,
}: {
  caption: string
  columns: string[]
  rows: Array<Array<string | number>>
}) {
  return (
    <details className="group mt-3">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-xs font-medium text-ink-500 hover:text-brand-600">
        <span className="transition-transform group-open:rotate-90" aria-hidden>
          ›
        </span>
        View as table
      </summary>
      <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-hairline scrollbar-slim">
        <table className="w-full text-xs">
          <caption className="sr-only">{caption}</caption>
          <thead className="sticky top-0 bg-ink-50">
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 text-left font-semibold text-ink-600">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-hairline">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-3 py-1.5 text-ink-700 tabular">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  )
}

export function ChartFrame({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('surface-card p-5', className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p> : null}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const rough = max / count
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const normalized = rough / magnitude
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude
  const ticks: number[] = []
  for (let value = 0; value <= max + step * 0.001; value += step) ticks.push(Math.round(value * 100) / 100)
  return ticks
}

export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`
  return String(Math.round(value * 10) / 10)
}
