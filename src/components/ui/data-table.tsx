import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { EmptyState } from './states'

export interface Column<T> {
  key: string
  header: ReactNode
  render: (row: T) => ReactNode
  className?: string
  /** Hidden below `md` — use for secondary columns so mobile stays readable. */
  secondary?: boolean
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: Array<Column<T>>
  rows: T[]
  rowKey: (row: T) => string
  empty?: { title: string; description?: string; action?: { label: string; href: string } }
  rowHref?: (row: T) => string
  className?: string
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

export function DataTable<T>({ columns, rows, rowKey, empty, rowHref, className }: DataTableProps<T>) {
  if (rows.length === 0) {
    return (
      <EmptyState
        title={empty?.title ?? 'Nothing here yet'}
        description={empty?.description}
        action={empty?.action}
      />
    )
  }

  return (
    <div className={cn('overflow-x-auto scrollbar-slim', className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500',
                  ALIGN[column.align ?? 'left'],
                  column.secondary && 'hidden md:table-cell',
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row)
            return (
              <tr key={rowKey(row)} className="border-b border-hairline last:border-0 hover:bg-ink-50/70">
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3.5 align-middle text-ink-700',
                      ALIGN[column.align ?? 'left'],
                      column.secondary && 'hidden md:table-cell',
                    )}
                  >
                    {href && index === 0 ? (
                      <Link href={href} className="font-medium text-navy-900 hover:text-brand-600">
                        {column.render(row)}
                      </Link>
                    ) : (
                      column.render(row)
                    )}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  buildHref,
}: {
  page: number
  pageSize: number
  total: number
  buildHref: (page: number) => string
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const windowStart = Math.max(1, Math.min(page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => windowStart + index)

  return (
    <nav className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3" aria-label="Pagination">
      <p className="text-sm text-ink-500 tabular">
        Showing {from}–{to} of {total}
      </p>
      <div className="flex items-center gap-1">
        <PageLink href={buildHref(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden />
        </PageLink>
        {pages.map((value) => (
          <PageLink key={value} href={buildHref(value)} active={value === page}>
            {value}
          </PageLink>
        ))}
        <PageLink href={buildHref(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden />
        </PageLink>
      </div>
    </nav>
  )
}

function PageLink({
  href,
  children,
  active,
  disabled,
  ...props
}: {
  href: string
  children: ReactNode
  active?: boolean
  disabled?: boolean
  'aria-label'?: string
}) {
  const className = cn(
    'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-medium tabular transition-colors',
    active ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100 hover:text-navy-900',
    disabled && 'pointer-events-none opacity-40',
  )
  if (disabled) {
    return (
      <span className={className} aria-disabled {...props}>
        {children}
      </span>
    )
  }
  return (
    <Link href={href} className={className} {...props}>
      {children}
    </Link>
  )
}
