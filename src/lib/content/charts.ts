import { z } from 'zod'

/**
 * Describe Image figures, drawn from data.
 *
 * A Describe Image item is only as good as its figure, and a text model cannot
 * draw one. So each item carries a small chart description — the numbers and
 * labels — and this module renders it to a self-contained SVG. The sample
 * answer is written against the same numbers, which keeps the two in step.
 */

const label = z.string().min(1).max(60)

const seriesSchema = z.object({ name: label, values: z.array(z.number()) })

export const chartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('bar'),
    title: z.string().min(1),
    unit: z.string().max(20).optional(),
    yLabel: z.string().max(60).optional(),
    categories: z.array(label).min(2).max(12),
    series: z.array(seriesSchema).min(1).max(4),
  }),
  z.object({
    type: z.literal('line'),
    title: z.string().min(1),
    unit: z.string().max(20).optional(),
    yLabel: z.string().max(60).optional(),
    categories: z.array(label).min(3).max(14),
    series: z.array(seriesSchema).min(1).max(4),
  }),
  z.object({
    type: z.literal('pie'),
    title: z.string().min(1),
    unit: z.string().max(20).optional(),
    slices: z.array(z.object({ label, value: z.number().positive() })).min(2).max(8),
  }),
  z.object({
    type: z.literal('table'),
    title: z.string().min(1),
    columns: z.array(label).min(2).max(6),
    rows: z.array(z.array(z.union([z.string(), z.number()]))).min(2).max(10),
  }),
  z.object({
    type: z.literal('process'),
    title: z.string().min(1),
    /** A cycle joins the last step back to the first. */
    cycle: z.boolean().optional(),
    steps: z.array(z.string().min(1).max(70)).min(3).max(8),
  }),
])

export type Chart = z.infer<typeof chartSchema>

/** Throws with a readable message when a chart's data does not fit its shape. */
export function validateChart(chart: Chart): void {
  if (chart.type === 'bar' || chart.type === 'line') {
    for (const series of chart.series) {
      if (series.values.length !== chart.categories.length) {
        throw new Error(
          `Series "${series.name}" has ${series.values.length} values for ${chart.categories.length} categories.`,
        )
      }
    }
  }
  if (chart.type === 'table') {
    chart.rows.forEach((row, index) => {
      if (row.length !== chart.columns.length) {
        throw new Error(`Table row ${index + 1} has ${row.length} cells for ${chart.columns.length} columns.`)
      }
    })
  }
}

// --- drawing ---------------------------------------------------------------------

const WIDTH = 800
const HEIGHT = 500
const PALETTE = ['#2e5bff', '#e8590c', '#0d9488', '#c026d3', '#ca8a04', '#64748b', '#dc2626', '#16a34a']
const INK = '#0f172a'
const MUTED = '#475569'
const GRID = '#e2e8f0'
const FONT = "font-family=\"'Segoe UI', Arial, Helvetica, sans-serif\""

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function text(x: number, y: number, content: string, attrs = ''): string {
  return `<text x="${round(x)}" y="${round(y)}" ${attrs}>${escape(content)}</text>`
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toLocaleString('en-US') : value.toLocaleString('en-US', { maximumFractionDigits: 1 })
}

/** Rounds an axis maximum up to a tidy value so gridlines land on round numbers. */
function niceMax(value: number): { max: number; step: number } {
  if (value <= 0) return { max: 1, step: 0.25 }
  const rough = value / 5
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= rough)!
  return { max: Math.ceil(value / step) * step, step }
}

/** Splits a label into lines of at most `width` characters. */
function wrap(content: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of content.split(/\s+/)) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

function frame(title: string, body: string): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="${escape(title)}">`,
    `<rect width="${WIDTH}" height="${HEIGHT}" fill="#ffffff"/>`,
    text(WIDTH / 2, 38, title, `${FONT} font-size="21" font-weight="600" fill="${INK}" text-anchor="middle"`),
    body,
    '</svg>',
  ].join('\n')
}

function legend(names: string[], y: number): string {
  if (names.length < 2) return ''
  const itemWidth = 170
  const startX = WIDTH / 2 - (names.length * itemWidth) / 2
  return names
    .map((name, index) => {
      const x = startX + index * itemWidth
      return [
        `<rect x="${round(x)}" y="${y - 11}" width="14" height="14" rx="3" fill="${PALETTE[index % PALETTE.length]}"/>`,
        text(x + 22, y, name, `${FONT} font-size="14" fill="${MUTED}"`),
      ].join('')
    })
    .join('\n')
}

function axes(
  chart: { unit?: string; yLabel?: string; categories: string[]; series: { name: string; values: number[] }[] },
  plot: { left: number; right: number; top: number; bottom: number },
): { body: string; scale: (value: number) => number } {
  const { max, step } = niceMax(Math.max(...chart.series.flatMap((series) => series.values)))
  const scale = (value: number) => plot.bottom - (value / max) * (plot.bottom - plot.top)
  const parts: string[] = []

  for (let value = 0; value <= max + step / 2; value += step) {
    const y = scale(value)
    parts.push(`<line x1="${plot.left}" x2="${plot.right}" y1="${round(y)}" y2="${round(y)}" stroke="${GRID}"/>`)
    parts.push(text(plot.left - 10, y + 5, formatNumber(value), `${FONT} font-size="13" fill="${MUTED}" text-anchor="end"`))
  }
  parts.push(`<line x1="${plot.left}" x2="${plot.right}" y1="${plot.bottom}" y2="${plot.bottom}" stroke="${MUTED}"/>`)

  const axisTitle = chart.yLabel ?? chart.unit
  if (axisTitle) {
    const cy = (plot.top + plot.bottom) / 2
    parts.push(
      `<text x="22" y="${round(cy)}" transform="rotate(-90 22 ${round(cy)})" ${FONT} font-size="14" fill="${MUTED}" text-anchor="middle">${escape(axisTitle)}</text>`,
    )
  }
  return { body: parts.join('\n'), scale }
}

function categoryLabels(categories: string[], centre: (index: number) => number, y: number): string {
  const slot = (WIDTH - 160) / categories.length
  const width = Math.max(6, Math.floor(slot / 8))
  return categories
    .map((category, index) =>
      wrap(category, width)
        .slice(0, 2)
        .map((line, lineIndex) =>
          text(centre(index), y + lineIndex * 16, line, `${FONT} font-size="13" fill="${MUTED}" text-anchor="middle"`),
        )
        .join(''),
    )
    .join('\n')
}

function renderBar(chart: Extract<Chart, { type: 'bar' }>): string {
  const plot = { left: 90, right: WIDTH - 40, top: 70, bottom: HEIGHT - 95 }
  const { body, scale } = axes(chart, plot)
  const slot = (plot.right - plot.left) / chart.categories.length
  const groupWidth = slot * 0.72
  const barWidth = groupWidth / chart.series.length
  const bars: string[] = []

  chart.categories.forEach((_, categoryIndex) => {
    chart.series.forEach((series, seriesIndex) => {
      const value = series.values[categoryIndex]!
      const x = plot.left + slot * categoryIndex + (slot - groupWidth) / 2 + barWidth * seriesIndex
      const y = scale(value)
      bars.push(
        `<rect x="${round(x + 1)}" y="${round(y)}" width="${round(barWidth - 2)}" height="${round(plot.bottom - y)}" rx="2" fill="${PALETTE[seriesIndex % PALETTE.length]}"/>`,
      )
      if (chart.series.length * chart.categories.length <= 16) {
        bars.push(
          text(x + barWidth / 2, y - 6, formatNumber(value), `${FONT} font-size="12" fill="${INK}" text-anchor="middle"`),
        )
      }
    })
  })

  return frame(
    chart.title,
    [
      body,
      bars.join('\n'),
      categoryLabels(chart.categories, (i) => plot.left + slot * i + slot / 2, plot.bottom + 22),
      legend(chart.series.map((series) => series.name), HEIGHT - 22),
    ].join('\n'),
  )
}

function renderLine(chart: Extract<Chart, { type: 'line' }>): string {
  const plot = { left: 90, right: WIDTH - 50, top: 70, bottom: HEIGHT - 95 }
  const { body, scale } = axes(chart, plot)
  const stepX = (plot.right - plot.left) / (chart.categories.length - 1)
  const x = (index: number) => plot.left + stepX * index

  const lines = chart.series.map((series, seriesIndex) => {
    const colour = PALETTE[seriesIndex % PALETTE.length]
    const points = series.values.map((value, index) => `${round(x(index))},${round(scale(value))}`).join(' ')
    const dots = series.values
      .map((value, index) => `<circle cx="${round(x(index))}" cy="${round(scale(value))}" r="4" fill="${colour}"/>`)
      .join('')
    return `<polyline points="${points}" fill="none" stroke="${colour}" stroke-width="3" stroke-linejoin="round"/>${dots}`
  })

  return frame(
    chart.title,
    [
      body,
      lines.join('\n'),
      categoryLabels(chart.categories, x, plot.bottom + 22),
      legend(chart.series.map((series) => series.name), HEIGHT - 22),
    ].join('\n'),
  )
}

function renderPie(chart: Extract<Chart, { type: 'pie' }>): string {
  const total = chart.slices.reduce((sum, slice) => sum + slice.value, 0)
  const cx = 280
  const cy = 275
  const r = 170
  let angle = -Math.PI / 2
  const parts: string[] = []

  chart.slices.forEach((slice, index) => {
    const sweep = (slice.value / total) * Math.PI * 2
    const end = angle + sweep
    const large = sweep > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(angle)
    const y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)
    parts.push(
      `<path d="M${cx},${cy} L${round(x1)},${round(y1)} A${r},${r} 0 ${large} 1 ${round(x2)},${round(y2)} Z" fill="${PALETTE[index % PALETTE.length]}" stroke="#ffffff" stroke-width="2"/>`,
    )
    angle = end
  })

  const legendTop = cy - (chart.slices.length * 34) / 2 + 10
  chart.slices.forEach((slice, index) => {
    const y = legendTop + index * 34
    const share = (slice.value / total) * 100
    const valueLabel = chart.unit === '%' ? `${formatNumber(slice.value)}%` : `${formatNumber(Math.round(share * 10) / 10)}%`
    parts.push(`<rect x="500" y="${round(y - 13)}" width="16" height="16" rx="3" fill="${PALETTE[index % PALETTE.length]}"/>`)
    parts.push(text(526, y, slice.label, `${FONT} font-size="15" fill="${INK}"`))
    parts.push(text(WIDTH - 40, y, valueLabel, `${FONT} font-size="15" font-weight="600" fill="${INK}" text-anchor="end"`))
  })

  return frame(chart.title, parts.join('\n'))
}

function renderTable(chart: Extract<Chart, { type: 'table' }>): string {
  const left = 50
  const width = WIDTH - 100
  const rowHeight = Math.min(46, (HEIGHT - 100) / (chart.rows.length + 1))
  // Centre the table in the space below the title.
  const top = Math.max(70, 60 + (HEIGHT - 60 - rowHeight * (chart.rows.length + 1)) / 2)
  const columnWidth = width / chart.columns.length
  const parts: string[] = []

  parts.push(`<rect x="${left}" y="${top}" width="${width}" height="${round(rowHeight)}" fill="#1e3a8a"/>`)
  chart.columns.forEach((column, index) => {
    parts.push(
      text(left + columnWidth * index + columnWidth / 2, top + rowHeight / 2 + 5, column, `${FONT} font-size="15" font-weight="600" fill="#ffffff" text-anchor="middle"`),
    )
  })

  chart.rows.forEach((row, rowIndex) => {
    const y = top + rowHeight * (rowIndex + 1)
    parts.push(
      `<rect x="${left}" y="${round(y)}" width="${width}" height="${round(rowHeight)}" fill="${rowIndex % 2 === 0 ? '#f8fafc' : '#ffffff'}" stroke="${GRID}"/>`,
    )
    row.forEach((cell, index) => {
      parts.push(
        text(
          left + columnWidth * index + columnWidth / 2,
          y + rowHeight / 2 + 5,
          typeof cell === 'number' ? formatNumber(cell) : cell,
          `${FONT} font-size="15" ${index === 0 ? 'font-weight="600"' : ''} fill="${INK}" text-anchor="middle"`,
        ),
      )
    })
  })

  return frame(chart.title, parts.join('\n'))
}

function renderProcess(chart: Extract<Chart, { type: 'process' }>): string {
  const parts: string[] = [
    '<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#475569"/></marker></defs>',
  ]
  const count = chart.steps.length
  const perRow = Math.ceil(count / 2)
  const gap = (WIDTH - 60) / perRow
  // A straight flow leaves room between boxes for the arrows; a cycle has room to spare.
  const boxWidth = chart.cycle ? 190 : Math.min(190, gap - 44)
  const boxHeight = 78

  // Steps sit on an ellipse for a cycle, and snake across two rows otherwise.
  const centres = chart.cycle
    ? chart.steps.map((_, index) => {
        const angle = -Math.PI / 2 + (index / count) * Math.PI * 2
        return { x: WIDTH / 2 + 280 * Math.cos(angle), y: 280 + 165 * Math.sin(angle) }
      })
    : chart.steps.map((_, index) => {
        const row = Math.floor(index / perRow)
        const column = row === 0 ? index : perRow - 1 - (index - perRow)
        return { x: 30 + gap * column + gap / 2, y: row === 0 ? 170 : 370 }
      })

  chart.steps.forEach((_, index) => {
    const next = index + 1 < count ? index + 1 : chart.cycle ? 0 : null
    if (next === null) return
    const from = centres[index]!
    const to = centres[next]!
    const dx = to.x - from.x
    const dy = to.y - from.y
    const length = Math.hypot(dx, dy)
    // Trim each arrow to the edge of its boxes.
    const trim = (ux: number, uy: number) => Math.min(Math.abs((boxWidth / 2 + 6) / (ux || 1e-9)), Math.abs((boxHeight / 2 + 6) / (uy || 1e-9)))
    const ux = dx / length
    const uy = dy / length
    const t = trim(ux, uy)
    parts.push(
      `<line x1="${round(from.x + ux * t)}" y1="${round(from.y + uy * t)}" x2="${round(to.x - ux * t)}" y2="${round(to.y - uy * t)}" stroke="#475569" stroke-width="2.5" marker-end="url(#arrow)"/>`,
    )
  })

  chart.steps.forEach((step, index) => {
    const { x, y } = centres[index]!
    const colour = PALETTE[index % PALETTE.length]
    parts.push(
      `<rect x="${round(x - boxWidth / 2)}" y="${round(y - boxHeight / 2)}" width="${boxWidth}" height="${boxHeight}" rx="12" fill="#ffffff" stroke="${colour}" stroke-width="2.5"/>`,
    )
    parts.push(`<circle cx="${round(x - boxWidth / 2 + 4)}" cy="${round(y - boxHeight / 2 + 4)}" r="14" fill="${colour}"/>`)
    parts.push(text(x - boxWidth / 2 + 4, y - boxHeight / 2 + 9, String(index + 1), `${FONT} font-size="14" font-weight="700" fill="#ffffff" text-anchor="middle"`))
    const lines = wrap(step, Math.floor((boxWidth - 16) / 7.5)).slice(0, 4)
    lines.forEach((line, lineIndex) => {
      parts.push(
        text(x, y + 5 + (lineIndex - (lines.length - 1) / 2) * 18, line, `${FONT} font-size="14" fill="${INK}" text-anchor="middle"`),
      )
    })
  })

  return frame(chart.title, parts.join('\n'))
}

export function renderChartSvg(chart: Chart): string {
  validateChart(chart)
  switch (chart.type) {
    case 'bar':
      return renderBar(chart)
    case 'line':
      return renderLine(chart)
    case 'pie':
      return renderPie(chart)
    case 'table':
      return renderTable(chart)
    case 'process':
      return renderProcess(chart)
  }
}

/** The instruction shown above the figure, worded for the kind of figure it is. */
export function describeImagePrompt(chart: Chart): string {
  const noun = { bar: 'bar chart', line: 'line graph', pie: 'pie chart', table: 'table', process: 'diagram' }[chart.type]
  return `Look at the ${noun} below. In 25 seconds, please prepare to describe in detail what the ${noun} is showing. You will have 40 seconds to give your response.`
}
