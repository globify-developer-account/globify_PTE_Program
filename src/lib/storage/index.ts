import 'server-only'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from '../env'
import { badRequest } from '../http'
import { encodeKeyPath, presignS3Url, s3AuthHeaders, signPath } from './signing'

/**
 * Object storage abstraction.
 *
 * `local` writes under STORAGE_LOCAL_DIR and serves through a signed route —
 * good enough for development and single-server deployments. `s3` targets any
 * S3-compatible bucket. Neither ever produces a public, guessable URL for a
 * student's recording.
 */

export interface StorageDriver {
  readonly name: string
  put(key: string, body: Uint8Array, contentType: string): Promise<void>
  get(key: string): Promise<Uint8Array>
  remove(key: string): Promise<void>
  signedUrl(key: string, expiresInSeconds: number): Promise<string>
}

const SAFE_KEY = /^[a-zA-Z0-9/_.-]+$/

function assertSafeKey(key: string): void {
  if (!SAFE_KEY.test(key) || key.includes('..')) {
    throw badRequest('Invalid storage key.')
  }
}

// --- local -------------------------------------------------------------------

function localRoot(): string {
  return path.resolve(process.cwd(), env.storage.localDir)
}

const localDriver: StorageDriver = {
  name: 'local',
  async put(key, body) {
    assertSafeKey(key)
    const target = path.join(localRoot(), key)
    await mkdir(path.dirname(target), { recursive: true })
    await writeFile(target, body)
  },
  async get(key) {
    assertSafeKey(key)
    const buffer = await readFile(path.join(localRoot(), key))
    return new Uint8Array(buffer)
  },
  async remove(key) {
    assertSafeKey(key)
    await unlink(path.join(localRoot(), key)).catch(() => undefined)
  },
  async signedUrl(key, expiresInSeconds) {
    assertSafeKey(key)
    const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds
    const signature = signPath(key, expiresAt)
    return `/api/files/${key}?exp=${expiresAt}&sig=${signature}`
  },
}

// --- s3 ----------------------------------------------------------------------

function s3Target(key: string): { host: string; path: string } {
  const bucket = env.storage.bucket
  if (!bucket) throw new Error('STORAGE_BUCKET is required when STORAGE_DRIVER=s3.')
  const encoded = `/${encodeKeyPath(key)}`

  if (env.storage.endpoint) {
    const url = new URL(env.storage.endpoint)
    return { host: url.host, path: `/${bucket}${encoded}` }
  }
  return { host: `${bucket}.s3.${env.storage.region}.amazonaws.com`, path: encoded }
}

const s3Driver: StorageDriver = {
  name: 's3',
  async put(key, body, contentType) {
    assertSafeKey(key)
    const target = s3Target(key)
    const response = await fetch(`https://${target.host}${target.path}`, {
      method: 'PUT',
      body: new Blob([new Uint8Array(body)], { type: contentType }),
      headers: s3AuthHeaders({
        method: 'PUT',
        host: target.host,
        path: target.path,
        region: env.storage.region,
        accessKey: env.storage.accessKey,
        secretKey: env.storage.secretKey,
        payload: body,
        contentType,
      }),
    })
    if (!response.ok) {
      throw new Error(`S3 upload failed (${response.status}): ${await response.text()}`)
    }
  },
  async get(key) {
    const url = await s3Driver.signedUrl(key, 60)
    const response = await fetch(url)
    if (!response.ok) throw new Error(`S3 download failed (${response.status})`)
    return new Uint8Array(await response.arrayBuffer())
  },
  async remove(key) {
    assertSafeKey(key)
    const target = s3Target(key)
    await fetch(`https://${target.host}${target.path}`, {
      method: 'DELETE',
      headers: s3AuthHeaders({
        method: 'DELETE',
        host: target.host,
        path: target.path,
        region: env.storage.region,
        accessKey: env.storage.accessKey,
        secretKey: env.storage.secretKey,
        payload: new Uint8Array(),
        contentType: 'application/octet-stream',
      }),
    }).catch(() => undefined)
  },
  async signedUrl(key, expiresInSeconds) {
    assertSafeKey(key)
    const target = s3Target(key)
    return presignS3Url({
      method: 'GET',
      host: target.host,
      path: target.path,
      region: env.storage.region,
      accessKey: env.storage.accessKey,
      secretKey: env.storage.secretKey,
      expiresIn: expiresInSeconds,
    })
  },
}

export function storage(): StorageDriver {
  return env.storage.driver === 's3' ? s3Driver : localDriver
}

// --- key builders ------------------------------------------------------------

export function audioKey(userId: string, attemptId: string, extension = 'webm'): string {
  return `recordings/${userId}/${attemptId}-${randomUUID()}.${extension}`
}

export function proofKey(userId: string, paymentReference: string, extension: string): string {
  return `payment-proofs/${userId}/${paymentReference}-${randomUUID()}.${extension}`
}

export function mediaKey(kind: 'audio' | 'image', extension: string): string {
  return `question-media/${kind}/${randomUUID()}.${extension}`
}

const AUDIO_TYPES: Record<string, string> = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
}

const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

const DOC_TYPES: Record<string, string> = {
  ...IMAGE_TYPES,
  'application/pdf': 'pdf',
}

export function extensionForAudio(mime: string): string {
  const ext = AUDIO_TYPES[mime.split(';')[0]!.trim().toLowerCase()]
  if (!ext) throw badRequest('That audio format is not supported. Please record again.')
  return ext
}

export function extensionForProof(mime: string): string {
  const ext = DOC_TYPES[mime.split(';')[0]!.trim().toLowerCase()]
  if (!ext) throw badRequest('Upload a PNG, JPG, WEBP or PDF file.')
  return ext
}

export function assertUploadSize(bytes: number): void {
  const max = env.storage.maxUploadMb * 1024 * 1024
  if (bytes > max) {
    throw badRequest(`That file is larger than the ${env.storage.maxUploadMb} MB limit.`)
  }
  if (bytes === 0) throw badRequest('The uploaded file is empty.')
}

/** Turns a stored key into a URL the browser may use for a short window. */
export async function resolveMediaUrl(
  keyOrUrl: string | null | undefined,
  expiresInSeconds = 3600,
): Promise<string | null> {
  if (!keyOrUrl) return null
  if (/^https?:\/\//i.test(keyOrUrl) || keyOrUrl.startsWith('/')) return keyOrUrl
  try {
    return await storage().signedUrl(keyOrUrl, expiresInSeconds)
  } catch {
    return null
  }
}
