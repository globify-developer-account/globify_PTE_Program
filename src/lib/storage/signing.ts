import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { signingSecret } from '../env'

/** HMAC token used by the local storage driver to keep private files private. */
export function signPath(key: string, expiresAt: number): string {
  return createHmac('sha256', signingSecret()).update(`${key}:${expiresAt}`).digest('base64url')
}

export function verifyPathSignature(key: string, expiresAt: number, signature: string): boolean {
  if (!Number.isFinite(expiresAt) || expiresAt * 1000 < Date.now()) return false
  const expected = Buffer.from(signPath(key, expiresAt))
  const provided = Buffer.from(signature)
  if (expected.length !== provided.length) return false
  return timingSafeEqual(expected, provided)
}

// -----------------------------------------------------------------------------
// AWS Signature Version 4 — query-string ("presigned URL") flavour.
// Implemented directly so the project carries no AWS SDK; it works against any
// S3-compatible endpoint (AWS S3, Cloudflare R2, Backblaze B2, MinIO).
// -----------------------------------------------------------------------------

const sha256Hex = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex')
const hmac = (key: Buffer | string, value: string) => createHmac('sha256', key).update(value).digest()

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)
}

function encodeKeyPath(key: string): string {
  return key.split('/').map(encodeRfc3986).join('/')
}

function amzDates(now = new Date()) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  return { amzDate, dateStamp: amzDate.slice(0, 8) }
}

function signingKey(secret: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmac(`AWS4${secret}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  return hmac(kService, 'aws4_request')
}

export interface S3SignOptions {
  method: 'GET' | 'PUT' | 'DELETE'
  host: string
  path: string
  region: string
  accessKey: string
  secretKey: string
  expiresIn: number
}

/** Builds a presigned S3 URL valid for `expiresIn` seconds. */
export function presignS3Url(options: S3SignOptions): string {
  const { amzDate, dateStamp } = amzDates()
  const service = 's3'
  const credentialScope = `${dateStamp}/${options.region}/${service}/aws4_request`

  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${options.accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(Math.min(options.expiresIn, 604_800)),
    'X-Amz-SignedHeaders': 'host',
  })
  // S3 requires the canonical query string to be sorted by key.
  const canonicalQuery = [...query.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${encodeRfc3986(k)}=${encodeRfc3986(v)}`)
    .join('&')

  const canonicalRequest = [
    options.method,
    options.path,
    canonicalQuery,
    `host:${options.host}\n`,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n')

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
  const signature = hmac(signingKey(options.secretKey, dateStamp, options.region, service), stringToSign).toString('hex')

  return `https://${options.host}${options.path}?${canonicalQuery}&X-Amz-Signature=${signature}`
}

/** Authorization header for a direct (non-presigned) S3 request. */
export function s3AuthHeaders(options: {
  method: 'PUT' | 'DELETE'
  host: string
  path: string
  region: string
  accessKey: string
  secretKey: string
  payload: Uint8Array
  contentType: string
}): Record<string, string> {
  const { amzDate, dateStamp } = amzDates()
  const service = 's3'
  const payloadHash = sha256Hex(options.payload)
  const credentialScope = `${dateStamp}/${options.region}/${service}/aws4_request`

  const canonicalHeaders =
    `content-type:${options.contentType}\n` +
    `host:${options.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`
  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date'

  const canonicalRequest = [
    options.method,
    options.path,
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n')
  const signature = hmac(signingKey(options.secretKey, dateStamp, options.region, service), stringToSign).toString('hex')

  return {
    'Content-Type': options.contentType,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${options.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
  }
}

export { encodeKeyPath }
