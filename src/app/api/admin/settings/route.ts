import { z } from 'zod'
import { requireApiStaff } from '@/lib/auth/guards'
import { ok, parseJson, route } from '@/lib/http'
import { updateSettings } from '@/lib/settings'
import { writeAudit } from '@/lib/audit'

export const runtime = 'nodejs'

const settingsSchema = z.object({
  platformName: z.string().trim().min(2).max(80),
  contactEmail: z.string().trim().email().max(200),
  supportEmail: z.string().trim().email().max(200),
  supportWhatsapp: z.string().trim().max(30),
  currency: z.string().trim().length(3),
  timezone: z.string().trim().min(3).max(60),
  defaultTargetScore: z.coerce.number().int().min(10).max(90),
  taxPercent: z.coerce.number().min(0).max(100),
  aiMonthlyBudgetUsd: z.coerce.number().min(0).max(1_000_000),
  maintenanceMode: z.boolean(),
  registrationEnabled: z.boolean(),
  supportTicketsEnabled: z.boolean(),
  bankTransferInstructions: z.string().trim().max(1000),
})

/**
 * Runtime platform settings.
 *
 * Note what is *not* here: API keys and secrets. Those stay in environment
 * variables so they are never readable through the application, even by a
 * Super Admin with a compromised session.
 */
export const PATCH = route(async (request) => {
  const staff = await requireApiStaff('settings.manage')
  const input = await parseJson(request, settingsSchema)

  const next = await updateSettings({
    ...input,
    currency: input.currency.toUpperCase(),
  })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'settings.updated',
    entity: 'PlatformSetting',
    entityId: 'platform',
    metadata: {
      maintenanceMode: input.maintenanceMode,
      registrationEnabled: input.registrationEnabled,
      taxPercent: input.taxPercent,
      aiMonthlyBudgetUsd: input.aiMonthlyBudgetUsd,
    },
  })

  return ok(next)
})
