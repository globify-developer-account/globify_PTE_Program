import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Role, User } from '@prisma/client'
import { prisma } from '../db'
import { conflict } from '../http'
import { NOTIFICATION_TYPES, notifyUser } from '../notifications'
import { getSettings } from '../settings'
import { slugify } from '../utils'
import { hashPassword } from './password'

export interface RegisterInput {
  name: string
  email: string
  password: string
  phone?: string | null
  targetScore?: number
  country?: string | null
  studyDestination?: string | null
  referralCode?: string | null
  role?: Role
}

/**
 * Builds a memorable, unique referral code such as GLOBIFY-ADNAN or
 * GLOBIFY-ADNAN-4K2. The suffix is only added when the base is taken.
 */
async function generateReferralCode(name: string): Promise<string> {
  const base = slugify(name).split('-')[0]?.toUpperCase().slice(0, 12) || 'STUDENT'
  const candidate = `GLOBIFY-${base}`

  const existing = await prisma.profile.findUnique({ where: { referralCode: candidate } })
  if (!existing) return candidate

  for (let attempt = 0; attempt < 6; attempt++) {
    const suffix = randomBytes(2).toString('hex').toUpperCase()
    const next = `${candidate}-${suffix}`
    const taken = await prisma.profile.findUnique({ where: { referralCode: next } })
    if (!taken) return next
  }
  return `GLOBIFY-${randomBytes(4).toString('hex').toUpperCase()}`
}

export async function registerUser(input: RegisterInput): Promise<User> {
  const email = input.email.trim().toLowerCase()

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    throw conflict('An account with this email already exists. Try signing in instead.')
  }

  const settings = await getSettings()
  const [passwordHash, referralCode] = await Promise.all([
    hashPassword(input.password),
    generateReferralCode(input.name),
  ])

  const user = await prisma.user.create({
    data: {
      email,
      name: input.name.trim(),
      passwordHash,
      role: input.role ?? 'STUDENT',
      profile: {
        create: {
          phone: input.phone?.trim() || null,
          country: input.country?.trim() || 'Pakistan',
          studyDestination: input.studyDestination?.trim() || null,
          targetScore: input.targetScore ?? settings.defaultTargetScore,
          referralCode,
          timezone: settings.timezone,
        },
      },
    },
  })

  await linkReferral(input.referralCode, user.id)

  await notifyUser({
    userId: user.id,
    type: NOTIFICATION_TYPES.welcome,
    title: 'Welcome to Globify PTE Premium',
    body: 'Set your target score, then take your first practice task. Your free account includes 5 AI speaking evaluations and 1 full mock test.',
    href: '/dashboard',
  })

  return user
}

/** Attributes a signup to a referrer when a valid code was used. */
export async function linkReferral(code: string | null | undefined, referredUserId: string): Promise<void> {
  const trimmed = code?.trim().toUpperCase()
  if (!trimmed) return

  const profile = await prisma.profile.findUnique({
    where: { referralCode: trimmed },
    select: { userId: true },
  })
  if (!profile || profile.userId === referredUserId) return

  await prisma.referral
    .create({
      data: {
        code: trimmed,
        referrerId: profile.userId,
        referredUserId,
        status: 'REGISTERED',
      },
    })
    .catch(() => undefined)
}
