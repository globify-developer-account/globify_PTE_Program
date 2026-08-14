import { forbidden, notFound, route } from '@/lib/http'
import { storage } from '@/lib/storage'
import { verifyPathSignature } from '@/lib/storage/signing'

export const runtime = 'nodejs'

const CONTENT_TYPES: Record<string, string> = {
  webm: 'audio/webm',
  ogg: 'audio/ogg',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  wav: 'audio/wav',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  pdf: 'application/pdf',
}

/**
 * Serves objects held by the local storage driver.
 *
 * Access is by HMAC signature with an expiry, not by session — the same model
 * S3 presigning uses. That keeps `<audio src>` working (a media element cannot
 * send an Authorization header) without making any recording publicly readable.
 */
export const GET = route(async (request, context: { params: Promise<{ path: string[] }> }) => {
  const { path } = await context.params
  const key = path.join('/')

  const url = new URL(request.url)
  const expiresAt = Number.parseInt(url.searchParams.get('exp') ?? '0', 10)
  const signature = url.searchParams.get('sig') ?? ''

  if (!verifyPathSignature(key, expiresAt, signature)) {
    throw forbidden('This link has expired. Reload the page to get a fresh one.')
  }

  let body: Uint8Array
  try {
    body = await storage().get(key)
  } catch {
    throw notFound('That file is no longer available.')
  }

  const extension = key.split('.').pop()?.toLowerCase() ?? ''
  return new Response(new Blob([new Uint8Array(body)]), {
    headers: {
      'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
      'Content-Length': String(body.byteLength),
      // Signed and user-specific: never store this in a shared cache.
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
})
