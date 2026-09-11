import Link from 'next/link'
import {
  BarChart3,
  BookOpenCheck,
  ClipboardList,
  Headphones,
  Mic,
  PenLine,
  Sparkles,
  Target,
} from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { DashboardPreview } from '@/components/marketing/dashboard-preview'
import { CtaBand, FeatureCard, NavyPanel, SectionHeading } from '@/components/marketing/sections'
import { SECTIONS, SECTION_META, questionTypesBySection } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { siteConfig } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Home',
  description: siteConfig.description,
  path: '/',
})

const SECTION_ICONS = {
  SPEAKING: Mic,
  WRITING: PenLine,
  READING: BookOpenCheck,
  LISTENING: Headphones,
} as const

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(46,91,255,0.10),transparent_70%)]"
          aria-hidden
        />
        <div className="container-page relative grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-700">
              <Sparkles className="size-3.5" aria-hidden />
              AI-assisted scoring across all four sections
            </span>

            <h1 className="mt-6 text-[42px] font-bold leading-[1.08] tracking-tight text-navy-900 sm:text-[56px]">
              Prepare Smarter.
              <br />
              <span className="text-gradient-brand">Score Higher.</span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-600">
              AI-powered PTE preparation with realistic practice, intelligent scoring and detailed performance
              insights — so you always know exactly what to work on next.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/register" size="lg">
                Start Practicing
              </ButtonLink>
              <ButtonLink href="/pricing" size="lg" variant="secondary">
                Explore Premium
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-6 border-t border-hairline pt-8">
              {[
                { label: 'PTE task types', value: '18' },
                { label: 'Scored sections', value: '4' },
                { label: 'Free AI evaluations', value: '5' },
              ].map((item) => (
                <div key={item.label}>
                  <dt className="text-sm text-ink-500">{item.label}</dt>
                  <dd className="mt-1 text-2xl font-semibold text-navy-900 tabular">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <DashboardPreview />
        </div>
      </section>

      {/* Sections */}
      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Complete coverage"
          title="Every PTE Academic task, in one place"
          description="Practise every task type with the same timing, structure and constraints you will meet on test day."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((section) => {
            const meta = SECTION_META[section]
            const Icon = SECTION_ICONS[section]
            const types = questionTypesBySection(section)
            return (
              <FeatureCard
                key={section}
                icon={<Icon />}
                accent={meta.color}
                title={meta.label}
                description={meta.blurb}
                points={types.slice(0, 3).map((type) => type.name)}
                href={`/pte/${meta.slug}`}
              />
            )
          })}
        </div>
      </section>

      {/* Capability grid */}
      <NavyPanel>
        <div className="mx-auto max-w-2xl text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">What you get</p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-[38px] sm:leading-[1.15]">
            Preparation built around your actual performance
          </h2>
          <p className="mt-4 text-[17px] leading-relaxed text-navy-200">
            Every response is scored, stored and turned into a specific next action — no guesswork about what to
            practise tomorrow.
          </p>
        </div>

        <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: <Mic />,
              title: 'AI Speaking Scoring',
              description:
                'Record a response and receive a breakdown across content, pronunciation, fluency, grammar and vocabulary, with feedback tied to what you actually said.',
              id: 'ai-scoring',
            },
            {
              icon: <PenLine />,
              title: 'AI Writing Evaluation',
              description:
                'Summarize Written Text and Essay responses are assessed on content, form, grammar, vocabulary, coherence and development — with a suggested rewrite.',
            },
            {
              icon: <ClipboardList />,
              title: 'Realistic Mock Tests',
              description:
                'Full-length and sectional mocks that follow the real timing and question order, then produce a section-by-section score report.',
              id: 'mock-tests',
            },
            {
              icon: <BarChart3 />,
              title: 'Smart Progress Tracking',
              description:
                'Score trends over time, accuracy by question type, your strongest and weakest skills, and the exact gap to your target score.',
            },
            {
              icon: <Target />,
              title: 'Personalised Practice',
              description:
                'Recommendations generated from your own attempt history — if fluency is lagging, you get the tasks that fix fluency.',
              id: 'practice',
            },
            {
              icon: <Sparkles />,
              title: 'Teacher Review',
              description:
                'On higher plans, request a human review of any response. A Globify teacher adds corrections and a second opinion alongside the AI estimate.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              id={feature.id}
              className="scroll-mt-24 rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.07]"
            >
              <span className="grid size-11 place-items-center rounded-xl bg-brand-500/15 text-brand-200 [&_svg]:size-5" aria-hidden>
                {feature.icon}
              </span>
              <h3 className="mt-5 text-lg font-semibold text-white">{feature.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-navy-200">{feature.description}</p>
            </div>
          ))}
        </div>
      </NavyPanel>

      {/* How it works */}
      <section className="container-page py-16 sm:py-24">
        <SectionHeading
          eyebrow="How it works"
          title="Four steps from first attempt to target score"
          description="The loop is deliberately simple, because consistency beats intensity in PTE preparation."
        />

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              step: '01',
              title: 'Set your target',
              body: 'Tell us the score you need and when you plan to sit the test. Everything else calibrates to that.',
            },
            {
              step: '02',
              title: 'Practise daily',
              body: 'Work through real task types with exam timing. Speaking tasks record straight from your browser.',
            },
            {
              step: '03',
              title: 'Get scored',
              body: 'Objective tasks are marked instantly by rule. Speaking and Writing go to AI evaluation with a full trait breakdown.',
            },
            {
              step: '04',
              title: 'Fix the gap',
              body: 'Your dashboard names the weakest skill and the exact tasks that improve it. Re-test with a full mock.',
            },
          ].map((item) => (
            <li key={item.step} className="relative rounded-2xl border border-hairline bg-white p-6">
              <span className="text-xs font-semibold tracking-[0.16em] text-brand-500">{item.step}</span>
              <h3 className="mt-3 text-base font-semibold text-navy-900">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{item.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Free vs premium */}
      <section className="container-page pb-16 sm:pb-24">
        <div className="overflow-hidden rounded-2xl border border-hairline bg-white">
          <div className="grid md:grid-cols-2">
            <div className="p-8 sm:p-10">
              <h3 className="text-xl font-semibold text-navy-900">Start free</h3>
              <p className="mt-2 text-[15px] text-ink-600">
                A free account is enough to understand exactly how the platform scores you.
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink-600">
                {[
                  '5 AI speaking evaluations',
                  '3 AI writing evaluations',
                  '1 full mock test',
                  '10 practice questions a day',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/register" variant="secondary" className="mt-7">
                Create free account
              </ButtonLink>
            </div>

            <div className="border-t border-hairline bg-gradient-to-br from-brand-50 via-white to-white p-8 sm:p-10 md:border-l md:border-t-0">
              <h3 className="text-xl font-semibold text-navy-900">Go Premium</h3>
              <p className="mt-2 text-[15px] text-ink-600">
                Unlimited practice, every mock test, full analytics and priority support.
              </p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink-600">
                {[
                  'Unlimited practice and AI scoring',
                  'All full-length and sectional mock tests',
                  'Detailed analytics and weak-area tracking',
                  'Teacher review on Ultimate',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <ButtonLink href="/pricing">See plans and pricing</ButtonLink>
                <Link
                  href="/features"
                  className="inline-flex h-11 items-center text-sm font-medium text-brand-700 hover:underline"
                >
                  Compare features
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
