import { LegalPage, LegalSection } from '@/components/marketing/prose'
import { pageMetadata } from '@/lib/metadata'
import { contactInfo, siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Refund Policy',
  description: `When ${siteConfig.company} issues refunds for Globify PTE Premium subscriptions, and how to request one.`,
  path: '/refund-policy',
})

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund Policy"
      updatedAt="2026-08-13"
      intro="We want you to be confident before you pay, and treated fairly if something goes wrong after you do."
    >
      <LegalSection heading="Try before you pay">
        <p>
          Every feature category is available on a free account — five AI speaking evaluations, three AI writing
          evaluations, one full mock test and daily practice. We strongly recommend using the free tier first so
          you know exactly what you are buying.
        </p>
      </LegalSection>

      <LegalSection heading="When we refund in full">
        <ul>
          <li>You were charged twice for the same subscription period.</li>
          <li>You were charged but your subscription was never activated, and we cannot activate it.</li>
          <li>A technical fault on our side prevented you from using the platform for more than seven consecutive days and we could not resolve it.</li>
          <li>You request a refund within 48 hours of purchase and have used fewer than five AI evaluations and no mock test in that period.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="When we do not refund">
        <ul>
          <li>You changed your mind after substantial use of the subscription.</li>
          <li>Your official PTE result was lower than your Globify estimate. Estimates are study guides, not predictions — see the <a href="/ai-disclaimer">AI Disclaimer</a>.</li>
          <li>Your account was suspended for sharing credentials, scraping content or abuse.</li>
          <li>You did not use the subscription during its term.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Extensions instead of refunds">
        <p>
          Where a problem interrupted your preparation but did not make the subscription useless, we will usually
          offer an extension of equivalent days rather than a refund. In most cases this leaves you better off.
        </p>
      </LegalSection>

      <LegalSection heading="How to request a refund">
        <p>
          Email <a href={`mailto:${contactInfo.supportEmail}`}>{contactInfo.supportEmail}</a> from your registered
          address with your payment reference and a short description of the issue. We respond within two business
          days. Approved refunds are returned by the original payment method within seven to fourteen business
          days, depending on your bank or wallet provider.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
