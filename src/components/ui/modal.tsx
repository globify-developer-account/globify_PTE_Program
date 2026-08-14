'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Set false for destructive confirmations that must be answered explicitly. */
  dismissible?: boolean
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  dismissible = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && dismissible) onClose()
      if (event.key !== 'Tab' || !panelRef.current) return
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]!
      const last = focusables[focusables.length - 1]!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      previouslyFocused?.focus()
    }
  }, [open, onClose, dismissible])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-navy-950/45 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            className={cn(
              'relative w-full rounded-t-2xl bg-white shadow-pop outline-none sm:rounded-2xl',
              SIZES[size],
            )}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {title ? (
              <div className="flex items-start justify-between gap-4 border-b border-hairline px-6 py-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-navy-900">{title}</h2>
                  {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
                </div>
                {dismissible ? (
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-navy-900"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
            ) : null}
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5 scrollbar-slim">{children}</div>
            {footer ? (
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-hairline bg-ink-50/60 px-6 py-4">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
