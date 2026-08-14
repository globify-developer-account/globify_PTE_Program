'use client'

import { Toaster as SonnerToaster, toast } from 'sonner'

/**
 * Single toast surface for the whole product. Import `notify` rather than
 * calling sonner directly so styling and copy conventions stay in one place.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: 'rounded-xl border border-hairline bg-white text-navy-900 shadow-lift',
          description: 'text-ink-500',
          actionButton: 'bg-brand-600 text-white rounded-lg',
          cancelButton: 'bg-ink-100 text-ink-700 rounded-lg',
          error: 'border-red-100 bg-red-50 text-red-800',
          success: 'border-green-100 bg-green-50 text-green-800',
          warning: 'border-amber-100 bg-amber-50 text-amber-800',
        },
      }}
    />
  )
}

export const notify = {
  success: (message: string, description?: string) => toast.success(message, { description }),
  error: (message: string, description?: string) => toast.error(message, { description }),
  warning: (message: string, description?: string) => toast.warning(message, { description }),
  info: (message: string, description?: string) => toast(message, { description }),
  promise: toast.promise,
  dismiss: toast.dismiss,
}
