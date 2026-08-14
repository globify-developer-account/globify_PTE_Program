import bcrypt from 'bcryptjs'
import { z } from 'zod'

const BCRYPT_ROUNDS = 12

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

export async function verifyPassword(plain: string, hash: string | null | undefined): Promise<boolean> {
  if (!hash) {
    // Constant-ish work for accounts with no password (OAuth-only) so the
    // response time does not reveal whether the account exists.
    await bcrypt.hash(plain, BCRYPT_ROUNDS)
    return false
  }
  return bcrypt.compare(plain, hash)
}

export const passwordSchema = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(128, 'Password is too long.')
  .refine((value) => /[a-z]/i.test(value), 'Include at least one letter.')
  .refine((value) => /\d/.test(value), 'Include at least one number.')

export function passwordStrength(password: string): { score: 0 | 1 | 2 | 3 | 4; label: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) && /[^\w\s]/.test(password)) score++
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'] as const
  const clamped = Math.min(4, score) as 0 | 1 | 2 | 3 | 4
  return { score: clamped, label: labels[clamped] }
}
