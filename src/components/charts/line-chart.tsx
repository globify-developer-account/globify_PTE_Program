'use client'

import { useMemo, useState } from 'react'
import { formatDate } from '@/lib/utils'
import {
  CHART_INK,
  ChartTooltip,
  Legend,
  TableView,
  niceTicks,
  useMeasuredWidth,
  type Tooltip,
} from './primitives'

export interface LineSeries {
  key: string
  label: string
  color: string
  points: Array<{ x: string | Date; y: number | null }>
}

interface LineChartProps {
  series: LineSeries[]
  height?: number
  /** Fixed y-domain — PTE scores always plot 10-90 so charts stay comparable. */
  domain?: [number, number]
  valueSuffix?: string
  /** Draws a dashed reference line, e.g. the student's target score. */
  reference?: { value: number; label: string }
  tableCaption?: string
}

const PADDING = { top: 12, right: 18, bottom: 26, left: 34 }

export function LineChart({
  series,
  height = 240,
  domain,
  valueSuffix = '',
  reference,
  tableCaption = 'Chart data',
}: LineChartProps) {
  const [containerRef, width] = useMeasuredWidth()
  const [tooltip, setTooltip] = useState<Tooltip | null>(null)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const labels = useMemo(
    () =>
      (series[0]?.points ?? []).map((point) =>
        typeof point.x === 'string' ? point.x : formatDate(point.x),
      ),
    [series],
  )

  const values = series.flatMap((line) => line.points.map((point) => point.y)).filter((value): value is number => value !== null)
  const min = domain ? domain[0] : Math.max(0, Math.min(...values, Infinity) - 6)
  const max = domain ? domain[1] : Math.max(...values, 10) + 4
  const span = Math.max(1, max - min)

  const innerWidth = Math.max(1, width - PADDING.left - PADDING.right)
  const innerHeight = height - PADDING.top - PADDING.bottom
  const count = labels.length

  const xFor = (index: number) => PADDING.left + (count <= 1 ? innerWidth / 2 : (index / (count - 1)) * innerWidth)
  const yFor = (value: number) => PADDING.top + innerHeight - ((value - min) / span) * innerHeight

  const ticks = domain
    ? [domain[0], Math.round((domain[0] + domain[1]) / 2), domain[1]]
    : niceTicks(max).filter((tick) => tick >= min)

  function pathFor(line: LineSeries): string {
    let path = ''
    let penDown = false
    line.points.forEach((point, index) => {
      if (point.y === null) {
        penDown = false
        return
      }
      const command = penDown ? 'L' : 'M'
      path += `${command}${xFor(index).toFixed(1)},${yFor(point.y).toFixed(1)} `
      penDown = true
    })
    return path.trim()
  }

  function handleMove(event: React.PointerEvent<SVGSVGElement>) {
    if (count === 0) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const relativeX = event.clientX - bounds.left
    const ratio = (relativeX - PADDING.left) / innerWidth
    const index = Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))))
    setHoverIndex(index)
    setTooltip({
      x: xFor(index),
      y: PADDING.top + 8,
      title: labels[index] ?? '',
      rows: series
        .map((line) => ({
          label: line.label,
          value: line.points[index]?.y === null || line.points[index]?.y === undefined
            ? '—'
            : `${line.points[index]!.y}${valueSuffix}`,
          color: line.color,
        }))
        .filter((row) => row.value !== '—' || series.length === 1),
    })
  }

  if (count === 0) {
    return <p className="py-10 text-center text-sm text-ink-500">No data recorded yet.</p>
  }

  return (
    <div>
      <Legend items={series.map((line) => ({ label: line.label, color: line.color }))} className="mb-3" />
      <div ref={containerRef} className="relative">
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={`${tableCaption}. ${series.map((line) => line.label).join(', ')}.`}
          onPointerMove={handleMove}
          onPointerLeave={() => {
            setTooltip(null)
            setHoverIndex(null)
          }}
          className="touch-pan-y"
        >
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
                {tick}
              </text>
            </g>
          ))}

          {reference ? (
            <g>
              <line
                x1={PADDING.left}
                x2={width - PADDING.right}
                y1={yFor(reference.value)}
                y2={yFor(reference.value)}
                stroke={CHART_INK.axis}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={width - PADDING.right}
                y={yFor(reference.value) - 6}
                fill={CHART_INK.muted}
                fontSize={11}
                textAnchor="end"
              >
                {reference.label}
              </text>
            </g>
          ) : null}

          {hoverIndex !== null ? (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PADDING.top}
              y2={PADDING.top + innerHeight}
              stroke={CHART_INK.axis}
              strokeWidth={1}
            />
          ) : null}

          {series.map((line) => (
            <path
              key={line.key}
              d={pathFor(line)}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {series.map((line) => {
            const lastIndex = [...line.points].map((point, index) => (point.y === null ? -1 : index)).filter((index) => index >= 0).pop()
            if (lastIndex === undefined) return null
            const value = line.points[lastIndex]!.y!
            return (
              <circle
                key={`${line.key}-end`}
                cx={xFor(lastIndex)}
                cy={yFor(value)}
                r={4}
                fill={line.color}
                stroke={CHART_INK.surface}
                strokeWidth={2}
              />
            )
          })}

          {hoverIndex !== null
            ? series.map((line) => {
                const value = line.points[hoverIndex]?.y
                if (value === null || value === undefined) return null
                return (
                  <circle
                    key={`${line.key}-hover`}
                    cx={xFor(hoverIndex)}
                    cy={yFor(value)}
                    r={4}
                    fill={line.color}
                    stroke={CHART_INK.surface}
                    strokeWidth={2}
                  />
                )
              })
            : null}

          {labels.map((label, index) => {
            const stride = Math.ceil(count / Math.max(2, Math.floor(width / 90)))
            if (index % stride !== 0 && index !== count - 1) return null
            return (
              <text
                key={`${label}-${index}`}
                x={xFor(index)}
                y={height - 6}
                fill={CHART_INK.muted}
                fontSize={11}
                textAnchor={index === 0 ? 'start' : index === count - 1 ? 'end' : 'middle'}
              >
                {label}
              </text>
            )
          })}
        </svg>
        <ChartTooltip tooltip={tooltip} containerWidth={width} />
      </div>
      <TableView
        caption={tableCaption}
        columns={['Date', ...series.map((line) => line.label)]}
        rows={labels.map((label, index) => [label, ...series.map((line) => line.points[index]?.y ?? '—')])}
      />
    </div>
  )
}
