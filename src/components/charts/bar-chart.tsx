'use client'

import { useState } from 'react'
import {
  CHART_INK,
  ChartTooltip,
  TableView,
  compactNumber,
  niceTicks,
  useMeasuredWidth,
  type Tooltip,
} from './primitives'

export interface BarDatum {
  label: string
  value: number
  color?: string
  /** Optional secondary line for the tooltip, e.g. "12 attempts". */
  meta?: string
}

const PADDING = { top: 12, right: 12, bottom: 26, left: 34 }
const MAX_BAR = 24
const GAP = 2

export function BarChart({
  data,
  height = 200,
  color = 'var(--color-brand-500)',
  valueSuffix = '',
  tableCaption = 'Chart data',
}: {
  data: BarDatum[]
  height?: number
  color?: string
  valueSuffix?: string
  tableCaption?: string
}) {
  const [containerRef, width] = useMeasuredWidth()
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)

  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-ink-500">No activity recorded yet.</p>
  }

  const max = Math.max(...data.map((item) => item.value), 1)
  const ticks = niceTicks(max)
  const scaleMax = ticks[ticks.length - 1] ?? max
  const innerWidth = Math.max(1, width - PADDING.left - PADDING.right)
  const innerHeight = height - PADDING.top - PADDING.bottom
  const band = innerWidth / data.length
  const barWidth = Math.max(4, Math.min(MAX_BAR, band - GAP * 2))

  const yFor = (value: number) => PADDING.top + innerHeight - (value / scaleMax) * innerHeight

  return (
    <div>
      <div ref={containerRef} className="relative">
        <svg width={width} height={height} role="img" aria-label={tableCaption}>
          {ticks.map((tick) => (
            <g key={tick}>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={yFor(tick)}
                y2={yFor(tick)}
                stroke={CHART_INK.grid}
                strokeWidth={1}
              />
              <text x={0} y={yFor(tick) + 4} fill={CHART_INK.muted} fontSize={11} className="tabular">
                {compactNumber(tick)}
              </text>
            </g>
          ))}

          {data.map((item, index) => {
            const x = PADDING.left + band * index + (band - barWidth) / 2
            const y = yFor(item.value)
            const barHeight = Math.max(item.value > 0 ? 2 : 0, PADDING.top + innerHeight - y)
            return (
              <g key={`${item.label}-${index}`}>
                <rect
                  x={PADDING.left + band * index}
                  y={PADDING.top}
                  width={band}
                  height={innerHeight}
                  fill="transparent"
                  onPointerEnter={() =>
                    setTooltip({
                      x: PADDING.left + band * index + band / 2,
                      y: Math.max(0, y - 8),
                      title: item.label,
                      rows: [
                        { label: 'Value', value: `${item.value}${valueSuffix}`, color: item.color ?? color },
                        ...(item.meta ? [{ label: 'Detail', value: item.meta }] : []),
                      ],
                    })
                  }
                  onPointerLeave={() => setTooltip(null)}
                />
                {/* 4px rounded data-end, square at the baseline. */}
                <path
                  d={roundedTopBar(x, y, barWidth, barHeight, 4)}
                  fill={item.color ?? color}
                  className="pointer-events-none"
                />
              </g>
            )
          })}

          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={PADDING.top + innerHeight}
            y2={PADDING.top + innerHeight}
            stroke={CHART_INK.axis}
            strokeWidth={1}
          />

          {data.map((item, index) => {
            const stride = Math.ceil(data.length / Math.max(2, Math.floor(width / 70)))
            if (index % stride !== 0 && index !== data.length - 1) return null
            return (
              <text
                key={`label-${item.label}-${index}`}
                x={PADDING.left + band * index + band / 2}
                y={height - 6}
                fill={CHART_INK.muted}
                fontSize={11}
                textAnchor="middle"
              >
                {item.label}
              </text>
            )
          })}
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </div>
      <TableView
        caption={tableCaption}
        columns={['Label', 'Value']}
        rows={data.map((item) => [item.label, `${item.value}${valueSuffix}`])}
      />
    </div>
  )
}

/** Horizontal bars — the right form when category labels are words, not dates. */
export function HorizontalBarChart({
  data,
  valueSuffix = '',
  max: providedMax,
  tableCaption = 'Chart data',
}: {
  data: BarDatum[]
  valueSuffix?: string
  max?: number
  tableCaption?: string
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-ink-500">Not enough attempts to compare yet.</p>
  }
  const max = providedMax ?? Math.max(...data.map((item) => item.value), 1)

  return (
    <div>
      <ul className="space-y-3">
        {data.map((item) => (
          <li key={item.label}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-ink-700">{item.label}</span>
              <span className="shrink-0 text-sm font-semibold text-navy-900 tabular">
                {item.value}
                {valueSuffix}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-[width] duration-500"
                style={{
                  width: `${Math.max(2, (item.value / max) * 100)}%`,
                  backgroundColor: item.color ?? 'var(--color-brand-500)',
                }}
              />
            </div>
            {item.meta ? <p className="mt-1 text-xs text-ink-500">{item.meta}</p> : null}
          </li>
        ))}
      </ul>
      <TableView
        caption={tableCaption}
        columns={['Label', 'Value']}
        rows={data.map((item) => [item.label, `${item.value}${valueSuffix}`])}
      />
    </div>
  )
}

function roundedTopBar(x: number, y: number, width: number, height: number, radius: number): string {
  if (height <= 0) return ''
  const r = Math.min(radius, width / 2, height)
  return [
    `M${x},${y + height}`,
    `L${x},${y + r}`,
    `Q${x},${y} ${x + r},${y}`,
    `L${x + width - r},${y}`,
    `Q${x + width},${y} ${x + width},${y + r}`,
    `L${x + width},${y + height}`,
    'Z',
  ].join(' ')
}
