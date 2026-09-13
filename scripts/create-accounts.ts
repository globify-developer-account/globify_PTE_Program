import { randomInt } from 'node:crypto'
import { parseArgs } from 'node:util'
import { config } from 'dotenv'
import { PrismaClient, type Role } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

/**
 * Creates, or resets, the Globify staff logins and a demo student on a domain.
 *
 *   npm run accounts:create                                   local database (.env)
 *   npm run accounts:create -- --env .env.production --yes    live database
 *   npm run accounts:create -- --domain example.com           a different domain
 *
 * Every run generates new random passwords and prints them once. They are only
 * stored hashed, so save them in a password manager straight away. Re-running
 * resets the passwords, which doubles as account recovery.
 *
 * The admin panel has no screen for creating staff accounts, which is why this
 * writes to the database directly. A database that is not on this machine is
 * treated as live: its host is printed and --yes is required, so a live reset
 * is never accidental.
 */

const { values } = parseArgs({
  options: {
    env: { type: 'string', default: '.env' },
    domain: { type: 'string', default: 'pte.globifytech.com' },
    yes: { type: 'boolean', default: false },
  },
})

config({ path: values.env, override: true })

const ACCOUNTS: Array<{ local: string; name: string; role: Role; title: string | null; target: number }> = [
  { local: 'admin', name: 'Globify Administrator', role: 'SUPER_ADMIN', title: 'Platform Owner', target: 90 },
  { local: 'content', name: 'Globify Content Manager', role: 'CONTENT_MANAGER', title: 'Content Manager', target: 90 },
  { local: 'teacher', name: 'Globify Teacher', role: 'TEACHER', title: 'PTE Trainer', target: 90 },
  { local: 'student', name: 'Demo Student', role: 'STUDENT', title: null, target: 79 },
]

// No look-alike characters (0/O, 1/l/I), so passwords are easy to type from a screen.
const CHARACTER_SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?']

function generatePassword(length = 16): string {
  const all = CHARACTER_SETS.join('')
  const chars = CHARACTER_SETS.map((set) => set[randomInt(set.length)]!)
  while (chars.length < length) chars.push(all[randomInt(all.length)]!)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[chars[i], chars[j]] = [chars[j]!, chars[i]!]
  }
  return chars.join('')
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) throw new Error(`DATABASE_URL is not set in ${values.env}.`)

  const target = new URL(databaseUrl)
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(target.hostname)
  console.log(`Database: ${target.hostname}/${target.pathname.slice(1)} (${isLocal ? 'local' : 'LIVE'})`)
  console.log(`Domain:   ${values.domain}\n`)

  if (!isLocal && !values.yes) {
    console.error('This is not a local database. Re-run with --yes to create or reset these accounts on it.')
    process.exitCode = 1
    return
  }

  const prisma = new PrismaClient()
  try {
    const created: Array<{ role: Role; email: string; password: string }> = []
    for (const account of ACCOUNTS) {
      const email = `${account.local}@${values.domain}`
      const password = generatePassword()
      const passwordHash = await hashPassword(password)

      await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name: account.name,
          passwordHash,
          role: account.role,
          emailVerified: new Date(),
          ...(account.title
            ? { adminProfile: { create: { title: account.title, permissions: [], isActive: true } } }
            : {}),
          profile: { create: { referralCode: `GTECH-${account.local.toUpperCase()}`, targetScore: account.target } },
        },
        update: { passwordHash, role: account.role, status: 'ACTIVE' },
      })
      created.push({ role: account.role, email, password })
    }

    console.table(created)
    console.log('\nSave these passwords now; they are not stored anywhere in plain text.')
    console.log('Staff log in at /admin/login, the student at /login.')
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Account setup failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
