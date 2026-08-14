import { BarChart3, ClipboardList, Mic, PenLine, Sparkles, Target, UserCheck } from 'lucide-react'
import { CtaBand, FeatureCard, SectionHeading } from '@/components/marketing/sections'
import { pageMetadata } from '@/lib/metadata'
import { AI_DISCLAIMER } from '@/lib/site'

export const metadata = pageMetadata({
  title: 'Features',
  description:
    'AI speaking scoring, AI writing evaluation, realistic mock tests, smart progress tracking and personalised practice — everything inside Globify PTE Premium.',
  path: '/features',
})

const GROUPS = [
  {
    id: 'ai-scoring',
    eyebrow: 'AI Speaking Scoring',
    title: 'Know exactly why your speaking score is what it is',
    description:
      'Record straight from the browser. Your response is transcribed, aligned against the task, and scored across five traits with feedback that quotes what you actually said.',
    metrics: ['Pronunciation', 'Fluency', 'Content', 'Vocabulary', 'Grammar'],
    icon: <Mic />,
  },
  {
    id: 'writing',
    eyebrow: 'AI Writing Evaluation',
    title: 'Six-trait writing assessment with a suggested rewrite',
    description:
      'Summarize Written Text and Essay responses are checked against the real marking criteria, including the form rules that catch most students out.',
    metrics: ['Content', 'Form', 'Grammar', 'Vocabulary', 'Coherence', 'Development'],
    icon: <PenLine />,
  },
  {
    id: 'mock-tests',
    eyebrow: 'Realistic Mock Tests',
    title: 'Full-length mocks that behave like the real thing',
    description:
      'Section instructions, per-section timers, automatic progression and a locked question order. When it ends you get an overall estimate plus a section-by-section report.',
    metrics: ['Speaking', 'Writing', 'Reading', 'Listening'],
    icon: <ClipboardList />,
  },
  {
    id: 'practice',
    eyebrow: 'Smart Progress Tracking',
    title: 'One number that matters, and the map to reach it',
    description:
      'Score over time, practice volume, accuracy by question type, your strongest and weakest skills, and the precise point gap between where you are and your target.',
    metrics: ['Score trend', 'Accuracy', 'Weak skills', 'Target gap'],
    icon: <BarChart3 />,
  },
]

export default function FeaturesPage() {
  return (
    <>
      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="Platform"
          title="Everything you need to move your score"
          description="Globify PTE Premium is a preparation system, not a question dump. Each part exists to answer one question: what should you do next?"
        />
      </section>

      <div className="container-page space-y-20 pb-20">
        {GROUPS.map((group, index) => (
          <section
            key={group.id}
            id={group.id}
            className="scroll-mt-24 grid items-center gap-10 lg:grid-cols-2 lg:gap-16"
          >
            <div className={index % 2 === 1 ? 'lg:order-2' : undefined}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">{group.eyebrow}</p>
              <h2 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-navy-900 sm:text-[32px]">
                {group.title}
              </h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{group.description}</p>
              <ul className="mt-6 flex flex-wrap gap-2">
                {group.metrics.map((metric) => (
                  <li
                    key={metric}
                    className="rounded-full border border-hairline bg-white px-3 py-1.5 text-sm text-ink-600"
                  >
                    {metric}
                  </li>
                ))}
              </ul>
            </div>

            <div className={index % 2 === 1 ? 'lg:order-1' : undefined}>
              <div className="surface-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-hairline px-5 py-3.5">
                  <span className="grid size-9 place-items-center rounded-lg bg-brand-50 text-brand-600 [&_svg]:size-4" aria-hidden>
                    {group.icon}
                  </span>
                  <p className="text-sm font-semibold text-navy-900">{group.eyebrow}</p>
                  <span className="ml-auto rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700">
                    AI Estimated
                  </span>
                </div>
                <div className="space-y-3 p-5">
                  {group.metrics.map((metric, metricIndex) => {
                    const value = 62 + ((metricIndex * 7) % 24)
                    return (
                      <div key={metric}>
                        <div className="mb-1.5 flex items-baseline justify-between text-sm">
                          <span className="text-ink-600">{metric}</span>
                          <span className="font-semibold text-navy-900 tabular">{value}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                          <div
                            className="h-full rounded-full bg-brand-500"
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="container-page pb-20">
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard
            icon={<Target />}
            title="Personalised recommendations"
            description="Rules-based to start, AI-assisted as your history grows. If your dictation accuracy drops, Write From Dictation appears at the top of your queue."
          />
          <FeatureCard
            icon={<UserCheck />}
            title="Teacher review"
            description="Request a human second opinion on any response. A Globify teacher adds corrections, comments and a reviewed badge next to the AI estimate."
          />
          <FeatureCard
            icon={<Sparkles />}
            title="Works on your phone"
            description="The full practice interface — including browser recording for speaking tasks — is built mobile-first, so you can practise between classes."
          />
        </div>

        <p className="mt-10 rounded-xl border border-hairline bg-white p-5 text-sm leading-relaxed text-ink-600">
          {AI_DISCLAIMER}
        </p>
      </section>

      <CtaBand />
    </>
  )
}
