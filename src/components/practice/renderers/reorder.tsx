'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, GripVertical } from 'lucide-react'
import type { RendererProps } from '../types'
import { cn } from '@/lib/utils'

/**
 * Re-order Paragraphs.
 *
 * Drag works with a mouse; the up/down buttons exist because HTML5 drag events
 * do not fire on touch devices and are awkward with a keyboard. Both write the
 * same ordered id list, so the scorer never has to care which was used.
 */
export function ReorderRenderer({ question, value, onChange, disabled }: RendererProps) {
  const items = useMemo(() => question.reorderItems ?? [], [question.reorderItems])
  const [order, setOrder] = useState<string[]>(() => value.selection.order ?? items.map((item) => item.id))
  const dragIndex = useRef<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  // A fresh question resets the arrangement to the server-shuffled order.
  useEffect(() => {
    setOrder(value.selection.order ?? items.map((item) => item.id))
    // Intentionally keyed on the question, not on every value change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id])

  function commit(next: string[]) {
    setOrder(next)
    onChange({ ...value, selection: { order: next } })
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= order.length || from === to) return
    const next = [...order]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved!)
    commit(next)
  }

  const byId = new Map(items.map((item) => [item.id, item]))

  return (
    <div className="space-y-5">
      {question.prompt ? <p className="text-sm text-ink-600">{question.prompt}</p> : null}

      <p className="text-xs text-ink-500">
        Arrange the boxes into a logical order. Marks are awarded for each correctly ordered adjacent pair.
      </p>

      <ol className="space-y-2.5">
        {order.map((id, index) => {
          const item = byId.get(id)
          if (!item) return null
          return (
            <li
              key={id}
              draggable={!disabled}
              onDragStart={() => {
                dragIndex.current = index
              }}
              onDragOver={(event) => {
                event.preventDefault()
                setOverIndex(index)
              }}
              onDragLeave={() => setOverIndex(null)}
              onDrop={(event) => {
                event.preventDefault()
                if (dragIndex.current !== null) move(dragIndex.current, index)
                dragIndex.current = null
                setOverIndex(null)
              }}
              onDragEnd={() => {
                dragIndex.current = null
                setOverIndex(null)
              }}
              className={cn(
                'flex items-start gap-3 rounded-xl border bg-white p-4 transition-colors',
                overIndex === index ? 'border-brand-400 bg-brand-50/50' : 'border-hairline',
                disabled ? 'opacity-70' : 'cursor-grab active:cursor-grabbing',
              )}
            >
              <span className="mt-0.5 flex shrink-0 items-center gap-1.5 text-ink-400">
                <GripVertical className="size-4" aria-hidden />
                <span className="grid size-6 place-items-center rounded-md bg-ink-100 text-xs font-semibold text-ink-600 tabular">
                  {index + 1}
                </span>
              </span>

              <p className="min-w-0 flex-1 text-[15px] leading-relaxed text-navy-900">{item.text}</p>

              <span className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  onClick={() => move(index, index - 1)}
                  disabled={disabled || index === 0}
                  className="grid size-7 place-items-center rounded-md border border-hairline text-ink-500 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-40"
                  aria-label={`Move box ${index + 1} up`}
                >
                  <ChevronUp className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, index + 1)}
                  disabled={disabled || index === order.length - 1}
                  className="grid size-7 place-items-center rounded-md border border-hairline text-ink-500 transition-colors hover:border-brand-200 hover:text-brand-600 disabled:opacity-40"
                  aria-label={`Move box ${index + 1} down`}
                >
                  <ChevronDown className="size-4" aria-hidden />
                </button>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
