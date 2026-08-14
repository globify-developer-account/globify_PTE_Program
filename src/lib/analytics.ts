/**
 * Central analytics utility.
 *
 * Every tracked event goes through `track()` — no gtag/fbq calls are scattered
 * through components. When no provider is configured the calls are inert, so
 * feature code never has to check.
 */

export const ANALYTICS_EVENTS = {
  registration: 'sign_up',
  login: 'login',
  pricingViewed: 'view_pricing',
  checkoutStarted: 'begin_checkout',
  paymentCompleted: 'purchase',
  paymentFailed: 'payment_failed',
  practiceStarted: 'practice_started',
  practiceCompleted: 'practice_completed',
  mockStarted: 'mock_started',
  mockCompleted: 'mock_completed',
  aiScoreGenerated: 'ai_score_generated',
  upgradePromptShown: 'upgrade_prompt_shown',
  upgradeClicked: 'upgrade_clicked',
} as const

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type Props = Record<string, string | number | boolean | undefined>

interface AnalyticsWindow extends Window {
  dataLayer?: unknown[]
  gtag?: (...args: unknown[]) => void
  fbq?: (...args: unknown[]) => void
}

const META_EVENTS: Partial<Record<AnalyticsEvent, string>> = {
  sign_up: 'CompleteRegistration',
  begin_checkout: 'InitiateCheckout',
  purchase: 'Purchase',
  view_pricing: 'ViewContent',
}

export function track(event: AnalyticsEvent, props: Props = {}): void {
  if (typeof window === 'undefined') return
  const scope = window as AnalyticsWindow

  const payload = Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined))

  try {
    scope.dataLayer?.push({ event, ...payload })
    scope.gtag?.('event', event, payload)
    const metaEvent = META_EVENTS[event]
    if (metaEvent) scope.fbq?.('track', metaEvent, payload)
  } catch (error) {
    // Analytics must never break the product.
    if (process.env.NODE_ENV === 'development') console.warn('[analytics]', error)
  }
}

export function trackPageView(path: string): void {
  if (typeof window === 'undefined') return
  const scope = window as AnalyticsWindow
  scope.gtag?.('event', 'page_view', { page_path: path })
  scope.dataLayer?.push({ event: 'page_view', page_path: path })
}
