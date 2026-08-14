import { LegalPage, LegalSection } from '@/components/marketing/prose'
import { pageMetadata } from '@/lib/metadata'
import { contactInfo, siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Terms of Service',
  description: `The terms that govern your use of ${siteConfig.product} by ${siteConfig.company}.`,
  path: '/terms',
})

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updatedAt="2026-08-13"
      intro={`By creating an account on ${siteConfig.product} you agree to these terms. Please read them before subscribing.`}
    >
      <LegalSection heading="1. The service">
        <p>
          {siteConfig.product} is an online preparation platform operated by {siteConfig.company}. It provides
          practice questions, mock tests, AI-assisted scoring and performance analytics for PTE Academic
          preparation.
        </p>
        <p>
          We are an independent preparation provider. We are not affiliated with, endorsed by or connected to
          Pearson Education Ltd, and we do not administer, influence or guarantee any official test result.
        </p>
      </LegalSection>

      <LegalSection heading="2. Accounts">
        <ul>
          <li>You must provide accurate details and keep your password confidential.</li>
          <li>One account is for one person. Sharing credentials is grounds for suspension without refund.</li>
          <li>You are responsible for all activity that occurs under your account.</li>
          <li>We may suspend an account that abuses fair-use limits, attempts to scrape content, or attacks the platform.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Subscriptions and payment">
        <ul>
          <li>Plans are sold for a fixed number of days, stated at checkout. Access begins when payment is confirmed.</li>
          <li>Manual bank, Easypaisa and JazzCash payments activate once our team has verified the proof you upload.</li>
          <li>Prices, features and limits may change. Changes never reduce what you have already paid for.</li>
          <li>Subscriptions do not auto-renew unless you explicitly opt in.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="4. Scores and results">
        <p>
          All scores shown are AI estimated scores for practice purposes. They are not official results and carry
          no guarantee about your performance on the real test. See our{' '}
          <a href="/ai-disclaimer">AI Disclaimer</a> for detail on how scores are produced and their limitations.
        </p>
        <p>
          No outcome is promised. Your result depends on your own preparation, and we make no representation that
          any particular score will be achieved.
        </p>
      </LegalSection>

      <LegalSection heading="5. Content and intellectual property">
        <ul>
          <li>All questions, explanations, templates and platform content are owned by {siteConfig.company}.</li>
          <li>
            You may use them for your personal preparation only. Copying, redistributing, reselling or publishing
            our content — including automated scraping — is prohibited.
          </li>
          <li>You retain ownership of the responses and recordings you submit; you grant us a licence to process and score them.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="6. Availability">
        <p>
          We aim for continuous availability but do not guarantee uninterrupted service. Maintenance, provider
          outages and factors outside our control may cause downtime. Where a paid subscription is materially
          affected by an extended outage, contact support and we will extend your subscription accordingly.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, {siteConfig.company} is not liable for indirect or consequential
          loss, including loss of opportunity arising from a test result. Our total liability is limited to the
          amount you paid for your current subscription period.
        </p>
      </LegalSection>

      <LegalSection heading="8. Governing law">
        <p>
          These terms are governed by the laws of the Islamic Republic of Pakistan, and the courts of Faisalabad,
          Punjab have exclusive jurisdiction.
        </p>
      </LegalSection>

      <LegalSection heading="9. Contact">
        <p>
          Questions about these terms: <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
