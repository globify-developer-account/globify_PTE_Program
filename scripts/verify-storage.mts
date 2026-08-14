import 'dotenv/config'
import { randomUUID } from 'node:crypto'

/**
 * Verifies object storage end to end before you trust it with student data.
 *
 * Run with:  npx tsx scripts/verify-storage.mts
 *
 * It writes a small object, reads it back, checks the bytes match, produces a
 * signed URL and fetches it, then deletes the object. If any step fails you
 * will lose speaking recordings and payment receipts in production — so this
 * exits non-zero rather than warning.
 */

const { storage } = await import('../src/lib/storage/index.js')
const { env } = await import('../src/lib/env.js')

const RESET = '[0m'
const RED = '[31m'
const GREEN = '[32m'
const DIM = '[2m'

let failed = false

function pass(message: string) {
  console.log(`${GREEN}  ok${RESET}  ${message}`)
}

function fail(message: string, error?: unknown) {
  failed = true
  console.log(`${RED} fail${RESET}  ${message}`)
  if (error) console.log(`${DIM}       ${error instanceof Error ? error.message : String(error)}${RESET}`)
}

console.log(`\nStorage driver: ${env.storage.driver}`)
if (env.storage.driver === 's3') {
  console.log(`Bucket:         ${env.storage.bucket || '(not set)'}`)
  console.log(`Endpoint:       ${env.storage.endpoint || 'AWS default'}`)
  console.log(`Region:         ${env.storage.region}`)
} else {
  console.log(`Local directory: ${env.storage.localDir}`)
  console.log(
    `${DIM}Note: local storage only survives if this machine's disk persists across deploys.${RESET}`,
  )
}
console.log('')

const key = `diagnostics/verify-${randomUUID()}.txt`
const payload = new TextEncoder().encode(`globify storage check ${new Date().toISOString()}`)
const driver = storage()

// 1. write
try {
  await driver.put(key, payload, 'text/plain')
  pass(`wrote ${payload.byteLength} bytes to ${key}`)
} catch (error) {
  fail('could not write an object — check the credentials and bucket name', error)
  process.exit(1)
}

// 2. read back
try {
  const roundTripped = await driver.get(key)
  const same =
    roundTripped.byteLength === payload.byteLength &&
    roundTripped.every((byte, index) => byte === payload[index])
  if (same) pass('read the object back and the bytes match')
  else fail(`read back ${roundTripped.byteLength} bytes but they differ from what was written`)
} catch (error) {
  fail('could not read the object back', error)
}

// 3. signed URL — this is how the browser actually reaches a recording
try {
  const url = await driver.signedUrl(key, 120)
  pass(`signed URL generated${DIM} (${url.slice(0, 60)}…)${RESET}`)

  if (url.startsWith('http')) {
    const response = await fetch(url)
    if (response.ok) {
      pass(`signed URL fetched successfully (${response.status})`)
    } else {
      fail(`signed URL returned ${response.status} — signing or bucket policy is wrong`)
    }
  } else {
    console.log(
      `${DIM}       relative URL (local driver) — served by /api/files, not fetched here${RESET}`,
    )
  }
} catch (error) {
  fail('could not produce or fetch a signed URL', error)
}

// 4. the bucket must NOT be publicly readable
if (env.storage.driver === 's3' && env.storage.endpoint) {
  try {
    const publicUrl = `${env.storage.endpoint.replace(/\/$/, '')}/${env.storage.bucket}/${key}`
    const response = await fetch(publicUrl)
    if (response.ok) {
      fail(
        'the object is readable WITHOUT a signature — make the bucket private, or every student recording is public',
      )
    } else {
      pass(`unsigned access correctly refused (${response.status})`)
    }
  } catch {
    pass('unsigned access refused')
  }
}

// 5. clean up
try {
  await driver.remove(key)
  pass('deleted the test object')
} catch (error) {
  fail(`could not delete ${key} — remove it manually`, error)
}

console.log('')
if (failed) {
  console.log(`${RED}Storage is not ready.${RESET} Fix the failures above before going live.\n`)
  process.exit(1)
}
console.log(`${GREEN}Storage is ready.${RESET}\n`)
