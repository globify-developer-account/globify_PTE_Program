'use client'

import { useEffect } from 'react'

/**
 * Last-resort boundary.
 *
 * `src/app/error.tsx` cannot catch a failure in the root layout — only this
 * file can, and without it such a failure renders as a blank white page with
 * no indication of what went wrong. That is the least diagnosable outcome
 * possible in production, which is the whole reason this exists.
 *
 * It replaces the root layout when it renders, so it must supply its own
 * <html> and <body>, and it styles itself inline rather than relying on
 * globals.css or the font variables — whatever broke the layout may well have
 * been the stylesheet or the font loader.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[app] root layout render error:', error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          padding: '24px',
          background: '#f6f7f9',
          color: '#0b1533',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <main style={{ width: '100%', maxWidth: '32rem', textAlign: 'center' }}>
          <div
            aria-hidden
            style={{
              margin: '0 auto',
              width: '56px',
              height: '56px',
              display: 'grid',
              placeItems: 'center',
              borderRadius: '16px',
              background: '#fef2f2',
              color: '#dc2626',
              fontSize: '28px',
              lineHeight: 1,
            }}
          >
            !
          </div>

          <h1 style={{ margin: '24px 0 0', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '12px 0 0', fontSize: '15px', lineHeight: 1.6, color: '#4b5563' }}>
            We hit an unexpected problem loading the page. Your practice history is safe — nothing was
            lost.
          </p>
          {error.digest ? (
            <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#9ca3af' }}>
              Reference <span style={{ fontFamily: 'ui-monospace, monospace' }}>{error.digest}</span> —
              quote this if you contact support.
            </p>
          ) : null}

          <div
            style={{
              marginTop: '32px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                cursor: 'pointer',
                borderRadius: '10px',
                border: '1px solid transparent',
                background: '#0b1533',
                color: '#fff',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                borderRadius: '10px',
                border: '1px solid #d1d5db',
                background: '#fff',
                color: '#0b1533',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Back to dashboard
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
