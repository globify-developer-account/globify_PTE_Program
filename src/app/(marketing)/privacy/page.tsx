import { LegalPage, LegalSection } from '@/components/marketing/prose'
import { pageMetadata } from '@/lib/metadata'
import { contactInfo, siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Privacy Policy',
  description: `How ${siteConfig.company} collects, uses, stores and protects your data on Globify PTE Premium.`,
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updatedAt="2026-08-13"
      intro={`This policy explains what ${siteConfig.company} collects when you use ${siteConfig.product}, why we collect it, and the choices you have.`}
    >
      <LegalSection heading="What we collect">
        <ul>
          <li>
            <strong>Account details</strong> — name, email address, and an irreversible hash of your password. We
            never store your password itself.
          </li>
          <li>
            <strong>Profile details you choose to give</strong> — phone number, country, city, study destination,
            target score and planned test date.
          </li>
          <li>
            <strong>Practice data</strong> — your answers, audio recordings, transcripts, scores, AI feedback and
            timestamps for every attempt.
          </li>
          <li>
            <strong>Payment records</strong> — plan, amount, currency, payment method, provider reference and
            status. Card details are handled by the payment provider and never touch our servers.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser user agent and session activity, used for
            security and abuse prevention.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use it">
        <ul>
          <li>To provide practice, scoring, analytics and recommendations.</li>
          <li>To process payments and manage your subscription.</li>
          <li>To send service messages such as payment confirmations and expiry reminders.</li>
          <li>To detect abuse, enforce fair-use limits and secure accounts.</li>
          <li>To improve the platform in aggregate. We do not sell your data to anyone.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Sharing with third parties">
        <p>We share the minimum necessary with:</p>
        <ul>
          <li>
            <strong>AI providers</strong> — the task, your response or transcript and your target score, so a score
            can be generated. No identifying details are sent. See our{' '}
            <a href="/ai-disclaimer">AI Disclaimer</a>.
          </li>
          <li>
            <strong>Payment providers</strong> — the amount, currency and a reference, so your payment can be
            processed and verified.
          </li>
          <li>
            <strong>Cloud storage</strong> — your audio recordings and uploaded payment proofs, stored privately.
          </li>
          <li>
            <strong>Analytics providers</strong> — only if enabled by the operator, and only aggregate usage events.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Security">
        <ul>
          <li>Passwords are hashed with bcrypt at a high work factor.</li>
          <li>Sessions are stored server-side; only a hashed token is kept in the database.</li>
          <li>Audio and payment proofs are private objects served through short-lived signed URLs.</li>
          <li>Administrative actions are recorded in an audit log.</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Your rights">
        <p>
          You can view and correct your profile at any time, export or request a copy of your practice history,
          sign out of every device from your profile, and delete your account. Deleting your account removes your
          personal details and practice data; we retain the minimum payment records required for accounting and
          tax purposes.
        </p>
        <p>
          To exercise any of these rights, write to{' '}
          <a href={`mailto:${contactInfo.supportEmail}`}>{contactInfo.supportEmail}</a>.
        </p>
      </LegalSection>

      <LegalSection heading="Children">
        <p>
          {siteConfig.product} is intended for test candidates aged 16 and above. We do not knowingly collect data
          from children under 16.
        </p>
      </LegalSection>

      <LegalSection heading="Contact">
        <p>
          {siteConfig.company}, {contactInfo.address.street}, {contactInfo.address.locality},{' '}
          {contactInfo.address.country}. Email{' '}
          <a href={`mailto:${contactInfo.email}`}>{contactInfo.email}</a>.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
