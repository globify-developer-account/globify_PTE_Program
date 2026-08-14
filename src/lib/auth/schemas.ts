import { z } from 'zod'
import { passwordSchema } from './password'

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  password: passwordSchema,
  phone: z.string().trim().max(40).optional().or(z.literal('')),
  targetScore: z.coerce.number().int().min(30).max(90).optional(),
  country: z.string().trim().max(80).optional().or(z.literal('')),
  studyDestination: z.string().trim().max(80).optional().or(z.literal('')),
  referralCode: z.string().trim().max(40).optional().or(z.literal('')),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You need to accept the terms to create an account.' }),
  }),
})
export type RegisterInputSchema = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
  password: z.string().min(1, 'Enter your password.').max(200),
  next: z.string().max(300).optional(),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(200),
})

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.').max(200),
  newPassword: passwordSchema,
})

/**
 * Only same-origin relative paths may be used as a post-login redirect —
 * anything else would be an open redirect.
 */
export function safeNextPath(value: string | null | undefined, fallback = '/dashboard'): string {
  if (!value) return fallback
  if (!value.startsWith('/') || value.startsWith('//')) return fallback
  if (value.startsWith('/api/')) return fallback
  return value
}
