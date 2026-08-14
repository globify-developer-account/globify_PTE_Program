import { SectionHeading } from '@/components/marketing/sections'
import { JsonLd } from '@/components/seo/json-ld'
import { faqJsonLd, pageMetadata } from '@/lib/metadata'
import { contactInfo } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'FAQ',
  description: 'Answers to common questions about Globify PTE Premium — scoring, plans, mock tests, payments and account management.',
  path: '/faq',
})

const GROUPS = [
  {
    title: 'Getting started',
    items: [
      {
        question: 'Do I need to pay to try the platform?',
        answer:
          'No. A free account includes 5 AI speaking evaluations, 3 AI writing evaluations, 1 full mock test and 10 practice questions per day. That is enough to see exactly how scoring and analytics work before you decide.',
      },
      {
        question: 'What equipment do I need for speaking tasks?',
        answer:
          'A device with a microphone and a modern browser. Recording happens in the browser — nothing to install. Your browser will ask for microphone permission the first time.',
      },
      {
        question: 'Does it work on a phone?',
        answer:
          'Yes. The practice interface, including browser recording for speaking tasks, is built mobile-first. For full mock tests we recommend a laptop, because that matches test-day conditions.',
      },
    ],
  },
  {
    title: 'Scoring',
    items: [
      {
        question: 'How accurate are the AI scores?',
        answer:
          'They are calibrated to be realistic rather than generous, and they are most useful as a trend line. They are estimates for practice purposes and are not official Pearson PTE scores.',
      },
      {
        question: 'Why did two similar answers get different scores?',
        answer:
          'Objective tasks are marked by fixed rules and are perfectly repeatable. Speaking and Writing go through a language model, which is probabilistic — small variation between runs is expected. Judge progress on the trend, not a single attempt.',
      },
      {
        question: 'Can a teacher review my answer?',
        answer:
          'Yes, on plans that include teacher review. Request it from any scored attempt. A Globify teacher adds their own score, corrections and comments, and the response is marked Teacher Reviewed.',
      },
    ],
  },
  {
    title: 'Plans and payment',
    items: [
      {
        question: 'Which payment methods do you accept?',
        answer:
          'Card payments, direct bank transfer, Easypaisa and JazzCash. For manual methods, you upload your receipt at checkout and our team verifies it — usually within a few business hours.',
      },
      {
        question: 'Does my subscription renew automatically?',
        answer:
          'Not unless you explicitly opt in. Plans run for a fixed number of days and then stop. We send an in-app reminder before expiry.',
      },
      {
        question: 'What happens to my history when my plan expires?',
        answer:
          'Nothing is deleted. Your attempts, scores and analytics stay in your account. Premium features lock and free-tier limits apply again until you renew.',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        question: 'Can I use one account on two devices?',
        answer:
          'Yes — your own devices are fine. Sharing an account with another person is not, and repeated sharing leads to suspension without refund.',
      },
      {
        question: 'How do I delete my account?',
        answer:
          'From Profile → Security → Delete account. This removes your personal details and practice data. We retain the minimum payment records required for accounting.',
      },
    ],
  },
]

export default function FaqPage() {
  const all = GROUPS.flatMap((group) => group.items)

  return (
    <>
      <JsonLd data={faqJsonLd(all)} />

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="FAQ"
          title="Questions students actually ask"
          description={`If your question is not here, message our team and we will answer it — and probably add it to this page.`}
        />
      </section>

      <section className="container-page max-w-3xl pb-20">
        {GROUPS.map((group) => (
          <div key={group.title} className="mb-10">
            <h2 className="text-lg font-semibold text-navy-900">{group.title}</h2>
            <div className="mt-4 divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-white">
              {group.items.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium text-navy-900 hover:bg-ink-50">
                    {item.question}
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full border border-hairline text-ink-400 transition-transform group-open:rotate-45"
                      aria-hidden
                    >
                      +
                    </span>
                  </summary>
                  <div className="px-5 pb-5 text-[15px] leading-relaxed text-ink-600">{item.answer}</div>
                </details>
              ))}
            </div>
          </div>
        ))}

        <p className="text-center text-sm text-ink-500">
          Still stuck? Email us at{' '}
          <a href={`mailto:${contactInfo.supportEmail}`} className="text-brand-600 underline">
            {contactInfo.supportEmail}
          </a>
          .
        </p>
      </section>
    </>
  )
}
