import Link from 'next/link'
import { ArrowRight, Clock } from 'lucide-react'
import { CtaBand, SectionHeading } from '@/components/marketing/sections'
import { JsonLd } from '@/components/seo/json-ld'
import { courseJsonLd, pageMetadata } from '@/lib/metadata'
import { QUESTION_TYPES, SECTIONS, SECTION_META } from '@/lib/pte/question-types'
import { formatDuration } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'PTE Preparation',
  description:
    'A complete guide to PTE Academic preparation: all four sections, every task type, timing, scoring and how to practise each one effectively.',
  path: '/pte',
  keywords: ['PTE preparation', 'PTE Academic', 'PTE question types', 'PTE sections', 'PTE scoring'],
})

export default function PtePage() {
  return (
    <>
      <JsonLd
        data={courseJsonLd(
          'PTE Academic Preparation',
          'Structured PTE Academic preparation covering Speaking, Writing, Reading and Listening with AI-assisted scoring.',
        )}
      />

      <section className="container-page py-16 sm:py-20">
        <SectionHeading
          eyebrow="PTE Preparation"
          title="Understand the test before you practise for it"
          description="PTE Academic is a single computer-based test scored from 10 to 90. Most tasks contribute to more than one section, which is why weak pronunciation can quietly cost you reading marks too."
        />
      </section>

      <section className="container-page pb-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((section) => {
            const meta = SECTION_META[section]
            const types = QUESTION_TYPES.filter((type) => type.section === section)
            return (
              <Link
                key={section}
                href={`/pte/${meta.slug}`}
                className="group surface-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className="block h-1 w-10 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                <h2 className="mt-4 text-lg font-semibold text-navy-900">{meta.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">{meta.blurb}</p>
                <p className="mt-4 text-sm text-ink-500">
                  {types.length} task type{types.length === 1 ? '' : 's'}
                </p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600">
                  Explore {meta.label}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="container-page pb-20">
        <h2 className="text-2xl font-bold tracking-tight text-navy-900">Every task type</h2>
        <p className="mt-2 max-w-2xl text-[15px] text-ink-600">
          Timings below are the defaults used in Globify practice. Admins can adjust them per question, and mock
          tests use their own section timing.
        </p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-hairline bg-white">
          <div className="overflow-x-auto scrollbar-slim">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-ink-50">
                <tr>
                  {['Task', 'Section', 'What it tests', 'Response time'].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-500"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {QUESTION_TYPES.map((type) => {
                  const meta = SECTION_META[type.section]
                  return (
                    <tr key={type.code} className="border-t border-hairline">
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-navy-900">{type.name}</span>
                        <span className="ml-2 text-xs text-ink-400">{type.shortName}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 text-ink-600">
                          <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-ink-600">{type.skills.join(', ')}</td>
                      <td className="px-5 py-3.5 text-ink-600 tabular">
                        {type.defaultTimeLimitSeconds ? (
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="size-3.5 text-ink-400" aria-hidden />
                            {formatDuration(type.defaultTimeLimitSeconds)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  )
}
