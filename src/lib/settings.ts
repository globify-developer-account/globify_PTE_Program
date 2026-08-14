import 'server-only'
import { cache } from 'react'
import { prisma } from './db'
import { env } from './env'
import { contactInfo, siteConfig } from './site'

/**
 * Runtime platform settings. Values live in the PlatformSetting table so a
 * Super Admin can change them without a deploy; the defaults below are what a
 * fresh install (or an unreachable database) falls back to.
 */

export interface PlatformSettings {
  platformName: string
  logoUrl: string | null
  contactEmail: string
  supportWhatsapp: string
  supportEmail: string
  currency: string
  timezone: string
  defaultTargetScore: number
  taxPercent: number
  aiProvider: string
  aiMonthlyBudgetUsd: number
  paymentProviders: string[]
  maintenanceMode: boolean
  registrationEnabled: boolean
  supportTicketsEnabled: boolean
  bankTransferInstructions: string
}

export const DEFAULT_SETTINGS: PlatformSettings = {
  platformName: siteConfig.product,
  logoUrl: null,
  contactEmail: contactInfo.email,
  supportWhatsapp: contactInfo.whatsapp,
  supportEmail: contactInfo.supportEmail,
  currency: env.payments.currency,
  timezone: 'Asia/Karachi',
  defaultTargetScore: 79,
  taxPercent: env.payments.taxPercent,
  aiProvider: env.ai.provider,
  aiMonthlyBudgetUsd: env.ai.monthlyBudgetUsd,
  paymentProviders: env.demoMode ? ['demo', 'manual'] : [env.payments.provider, 'manual'],
  maintenanceMode: env.features.maintenanceMode,
  registrationEnabled: env.features.registrationEnabled,
  supportTicketsEnabled: true,
  bankTransferInstructions:
    'Transfer the exact amount to the account below and upload your receipt. Your subscription is activated as soon as our team verifies the payment — usually within a few business hours.',
}

const SETTINGS_KEY = 'platform'

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  if (!env.databaseUrl) return DEFAULT_SETTINGS
  try {
    const row = await prisma.platformSetting.findUnique({ where: { key: SETTINGS_KEY } })
    if (!row) return DEFAULT_SETTINGS
    const stored = (row.value ?? {}) as Partial<PlatformSettings>
    return { ...DEFAULT_SETTINGS, ...stored }
  } catch {
    return DEFAULT_SETTINGS
  }
})

export async function updateSettings(patch: Partial<PlatformSettings>): Promise<PlatformSettings> {
  const current = await getSettings()
  const next = { ...current, ...patch }
  await prisma.platformSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: next },
    update: { value: next },
  })
  return next
}
