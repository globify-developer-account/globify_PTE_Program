import 'server-only'
import { headers } from 'next/headers'
import type { Prisma, Role } from '@prisma/client'
import { prisma } from './db'
import { clientIp } from './auth/session'

export interface AuditInput {
  actorId?: string | null
  actorRole?: Role | null
  action: string
  entity: string
  entityId?: string | null
  metadata?: Prisma.InputJsonValue
}

/**
 * Appends to the audit trail. Auditing must never break the operation it is
 * recording, so failures are logged and swallowed.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  try {
    let ip: string | null = null
    let userAgent: string | null = null
    try {
      const headerList = await headers()
      ip = clientIp(headerList)
      userAgent = headerList.get('user-agent')?.slice(0, 400) ?? null
    } catch {
      // Outside a request scope (background job, seed) — no headers available.
    }

    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        metadata: input.metadata ?? {},
        ip,
        userAgent,
      },
    })
  } catch (error) {
    console.error('[audit] failed to record event:', error instanceof Error ? error.message : error)
  }
}
