import { Building2, GraduationCap, Target } from 'lucide-react'
import { CtaBand, SectionHeading } from '@/components/marketing/sections'
import { pageMetadata } from '@/lib/metadata'
import { contactInfo, siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'About',
  description: `About ${siteConfig.company} — an education consultancy in Faisalabad, Pakistan, building AI-assisted preparation tools for students going abroad.`,
  path: '/about',
})

export default function AboutPage() {
  return (
    <>
      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="About us"
          title="Built by consultants who sit with students every week"
          description={`${siteConfig.company} advises students on studying, working and settling abroad. ${siteConfig.product} exists because the single biggest blocker we see is not ambition — it is an English score that will not move.`}
        />
      </section>

      <section className="container-page pb-16">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: <Target />,
              title: 'The problem we kept seeing',
              body: 'Students practise for months without knowing which of the four sections is actually holding their score down, so effort goes to the wrong place.',
            },
            {
              icon: <GraduationCap />,
              title: 'What we built',
              body: 'A platform that scores every response, tracks the trend, and names the specific task type that will move the number fastest.',
            },
            {
              icon: <Building2 />,
              title: 'Where we are',
              body: `Our office is in ${contactInfo.address.locality}, ${contactInfo.address.country}. Students anywhere can use the platform; local students can also come in and sit with our team.`,
            },
          ].map((item) => (
            <div key={item.title} className="surface-card p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5" aria-hidden>
                {item.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-navy-900">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="surface-card p-8 sm:p-10">
          <h2 className="text-2xl font-bold tracking-tight text-navy-900">What we will and will not claim</h2>
          <div className="mt-6 grid gap-8 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-brand-600">We will say</h3>
              <ul className="mt-3 space-y-2.5 text-[15px] text-ink-600">
                <li>Our scores are estimates designed to be realistic and directionally useful.</li>
                <li>Consistent daily practice is the strongest predictor of improvement we observe.</li>
                <li>Our question bank follows the published PTE task structure and timing.</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-400">We will not say</h3>
              <ul className="mt-3 space-y-2.5 text-[15px] text-ink-600">
                <li>That we can guarantee any score on the real test.</li>
                <li>That our estimates are official Pearson results, or that we are connected to Pearson.</li>
                <li>That AI replaces a teacher. It shortens the feedback loop between them.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Talk to our team"
        description="If you are not sure where to start, tell us your target score and test date and we will point you at the right plan."
      />
    </>
  )
}
