/**
 * Environment configuration.
 *
 * Nothing here throws at import time — a missing DATABASE_URL must not break
 * `next build`, only the request that actually needs the database. Use
 * `assertRuntimeEnv()` from an entrypoint when you want a hard failure.
 */

function str(key: string, fallback = ''): string {
  return process.env[key]?.trim() || fallback
}

function bool(key: string, fallback = false): boolean {
  const raw = process.env[key]?.trim().toLowerCase()
  if (!raw) return fallback
  return raw === 'true' || raw === '1' || raw === 'yes'
}

function int(key: string, fallback: number): number {
  const raw = Number.parseInt(process.env[key] ?? '', 10)
  return Number.isFinite(raw) ? raw : fallback
}

const nodeEnv = str('NODE_ENV', 'development')

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',

  appUrl: str('NEXT_PUBLIC_APP_URL', 'http://localhost:3000').replace(/\/$/, ''),
  databaseUrl: str('DATABASE_URL'),

  /**
   * Demo mode lets the whole product run without payment or AI credentials.
   * It is forced off in production unless explicitly opted into.
   */
  demoMode: (() => {
    const explicit = process.env.DEMO_MODE?.trim().toLowerCase()
    if (explicit === 'true' || explicit === '1') return true
    if (explicit === 'false' || explicit === '0') return false
    return nodeEnv !== 'production'
  })(),

  auth: {
    secret: str('AUTH_SECRET') || str('NEXTAUTH_SECRET'),
    sessionDays: int('AUTH_SESSION_DAYS', 30),
    google: {
      clientId: str('GOOGLE_CLIENT_ID'),
      clientSecret: str('GOOGLE_CLIENT_SECRET'),
    },
  },

  ai: {
    provider: str('AI_PROVIDER', 'demo').toLowerCase(),
    apiKey: str('AI_API_KEY'),
    model: str('AI_MODEL'),
    fallbackProvider: str('AI_FALLBACK_PROVIDER').toLowerCase(),
    transcriptionProvider: str('AI_TRANSCRIPTION_PROVIDER', 'demo').toLowerCase(),
    transcriptionApiKey: str('AI_TRANSCRIPTION_API_KEY'),
    monthlyBudgetUsd: int('AI_MONTHLY_BUDGET_USD', 0),
    maxRetries: int('AI_MAX_RETRIES', 2),
    timeoutMs: int('AI_TIMEOUT_MS', 45_000),
  },

  payments: {
    provider: str('PAYMENT_PROVIDER', 'demo').toLowerCase(),
    apiKey: str('PAYMENT_API_KEY'),
    webhookSecret: str('PAYMENT_WEBHOOK_SECRET'),
    currency: str('PAYMENT_CURRENCY', 'PKR'),
    taxPercent: int('PAYMENT_TAX_PERCENT', 0),
    bank: {
      accountTitle: str('BANK_ACCOUNT_TITLE', 'Globify Consultants'),
      accountNumber: str('BANK_ACCOUNT_NUMBER', ''),
      iban: str('BANK_IBAN', ''),
      bankName: str('BANK_NAME', ''),
      easypaisa: str('EASYPAISA_NUMBER', ''),
      jazzcash: str('JAZZCASH_NUMBER', ''),
    },
  },

  storage: {
    driver: str('STORAGE_DRIVER', 'local').toLowerCase(),
    bucket: str('STORAGE_BUCKET'),
    region: str('STORAGE_REGION', 'auto'),
    endpoint: str('STORAGE_ENDPOINT'),
    accessKey: str('STORAGE_ACCESS_KEY'),
    secretKey: str('STORAGE_SECRET_KEY'),
    publicBaseUrl: str('STORAGE_PUBLIC_BASE_URL'),
    localDir: str('STORAGE_LOCAL_DIR', 'storage'),
    maxUploadMb: int('STORAGE_MAX_UPLOAD_MB', 15),
  },

  email: {
    /** console | resend — console logs the message instead of sending it. */
    provider: str('EMAIL_PROVIDER', 'console').toLowerCase(),
    apiKey: str('EMAIL_API_KEY'),
    from: str('EMAIL_FROM', 'Globify PTE Premium <no-reply@globifyconsultants.com>'),
  },

  analytics: {
    ga: str('NEXT_PUBLIC_GA_MEASUREMENT_ID'),
    gtm: str('NEXT_PUBLIC_GTM_ID'),
    metaPixel: str('NEXT_PUBLIC_META_PIXEL_ID'),
  },

  features: {
    registrationEnabled: bool('REGISTRATION_ENABLED', true),
    maintenanceMode: bool('MAINTENANCE_MODE', false),
  },
} as const

/** Secret used to sign storage URLs and reset tokens. */
export function signingSecret(): string {
  if (env.auth.secret) return env.auth.secret
  if (env.isProduction) {
    throw new Error('AUTH_SECRET is required in production.')
  }
  // Deterministic dev-only fallback so local sessions survive a restart.
  return 'globify-pte-development-secret-do-not-use-in-production'
}

/** Call from an entrypoint when a hard, early failure is preferable. */
export function assertRuntimeEnv(): void {
  const missing: string[] = []
  if (!env.databaseUrl) missing.push('DATABASE_URL')
  if (env.isProduction && !env.auth.secret) missing.push('AUTH_SECRET')
  if (env.isProduction && env.demoMode) {
    throw new Error('DEMO_MODE must not be enabled in production without explicit intent.')
  }
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}
