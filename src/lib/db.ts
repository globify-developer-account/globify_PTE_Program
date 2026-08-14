import { PrismaClient } from '@prisma/client'
import { env } from './env'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  })

if (!env.isProduction) globalForPrisma.prisma = prisma

/**
 * Runs a database read that pages are allowed to render without.
 *
 * Marketing pages read plans and resources from the database; a build machine
 * or a cold preview deploy may have no DATABASE_URL at all. Rather than crash
 * the render, fall back and let the page show its empty state.
 */
export async function safeQuery<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  if (!env.databaseUrl) return fallback
  try {
    return await run()
  } catch (error) {
    console.error('[db] query failed, using fallback:', error instanceof Error ? error.message : error)
    return fallback
  }
}

export async function isDatabaseReachable(): Promise<boolean> {
  if (!env.databaseUrl) return false
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
