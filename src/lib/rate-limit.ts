import { tooManyRequests } from './http'

/**
 * Fixed-window rate limiter held in process memory.
 *
 * This is correct for a single server or a single serverless instance. For a
 * multi-instance deployment, swap `buckets` for Redis/Upstash — the call sites
 * do not change. See docs/DEPLOYMENT.md.
 */

interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
let lastSweep = Date.now()

function sweep(now: number): void {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 1, resetAt: now + windowMs }
    buckets.set(key, bucket)
    return { allowed: true, remaining: limit - 1, resetAt: bucket.resetAt }
  }

  existing.count += 1
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  }
}

export function enforceRateLimit(key: string, limit: number, windowMs: number): void {
  const result = rateLimit(key, limit, windowMs)
  if (!result.allowed) {
    const seconds = Math.ceil((result.resetAt - Date.now()) / 1000)
    throw tooManyRequests(`Too many attempts. Please try again in ${seconds} second${seconds === 1 ? '' : 's'}.`)
  }
}

/** Named presets so limits stay consistent across routes. */
export const LIMITS = {
  login: { limit: 8, windowMs: 10 * 60_000 },
  register: { limit: 5, windowMs: 60 * 60_000 },
  passwordReset: { limit: 5, windowMs: 60 * 60_000 },
  aiScoring: { limit: 30, windowMs: 60 * 60_000 },
  upload: { limit: 60, windowMs: 60 * 60_000 },
  checkout: { limit: 20, windowMs: 60 * 60_000 },
  general: { limit: 240, windowMs: 60_000 },
} as const

export function clientKey(request: Request, scope: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
  return `${scope}:${ip}`
}
