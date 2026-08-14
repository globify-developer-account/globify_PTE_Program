'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app] unhandled render error:', error)
  }, [error])

  return (
    <main className="grid min-h-dvh place-items-center px-6 py-16">
      <div className="w-full max-w-lg text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-red-50 text-danger">
          <AlertTriangle className="size-6" aria-hidden />
        </div>

        <h1 className="mt-6 text-2xl font-bold tracking-tight text-navy-900">Something went wrong</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          We hit an unexpected problem loading this page. Your practice history is safe — nothing was lost.
        </p>
        {error.digest ? (
          <p className="mt-3 text-xs text-ink-400">
            Reference <span className="font-mono">{error.digest}</span> — quote this if you contact support.
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>
            <RefreshCw aria-hidden />
            Try again
          </Button>
          <ButtonLink href="/dashboard" variant="secondary">
            Back to dashboard
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
