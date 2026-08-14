import { notFound } from 'next/navigation'
import { Clock, Mic, Type } from 'lucide-react'
import { CtaBand, SectionHeading } from '@/components/marketing/sections'
import { JsonLd } from '@/components/seo/json-ld'
import { courseJsonLd, pageMetadata } from '@/lib/metadata'
import { SECTIONS, SECTION_META, questionTypesBySection, sectionFromSlug } from '@/lib/pte/question-types'
import { formatDuration } from '@/lib/utils'

export function generateStaticParams() {
  return SECTIONS.map((section) => ({ section: SECTION_META[section].slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params
  const section = sectionFromSlug(slug)
  if (!section) return pageMetadata({ title: 'PTE', description: 'PTE preparation', path: '/pte' })

  const meta = SECTION_META[section]
  return pageMetadata({
    title: `PTE ${meta.label}`,
    description: `PTE ${meta.label} preparation: every task type, timing, scoring criteria and how to practise it with AI-assisted feedback from Globify PTE Premium.`,
    path: `/pte/${meta.slug}`,
    keywords: [
      `PTE ${meta.label}`,
      `PTE ${meta.label} practice`,
      `PTE ${meta.label} tips`,
      `PTE ${meta.label} scoring`,
    ],
  })
}

const SECTION_ADVICE: Record<string, string[]> = {
  SPEAKING: [
    'Begin speaking within the first second of the recording — silence at the start is counted against fluency.',
    'A steady 140–170 words per minute reads as natural. Rushing costs pronunciation marks; drifting costs content.',
    'Never stop and restart. A self-correction mid-sentence damages fluency more than the original slip.',
  ],
  WRITING: [
    'Form is the cheapest mark on the paper. A Summarize Written Text answer outside 5–75 words, or not a single sentence, scores zero for form.',
    'Use explicit linking words. Coherence is scored on visible structure, not on the elegance of your ideas.',
    'Leave two minutes to re-read. Most lost grammar marks are typing slips, not knowledge gaps.',
  ],
  READING: [
    'Re-order Paragraphs is scored on adjacent pairs, so locking the first two boxes correctly already banks marks.',
    'In Multiple Choice with multiple answers, a wrong selection subtracts. Only select what you can justify from the text.',
    'Fill in the Blanks rewards collocation knowledge more than grammar — read widely, note word partnerships.',
  ],
  LISTENING: [
    'Write From Dictation is scored word by word, so an imperfect sentence still earns most of its marks. Always write something.',
    'In Highlight Incorrect Words, an incorrect click subtracts. Click only what you clearly heard differ.',
    'Summarize Spoken Text is 50–70 words. Note the speaker’s structure, not every detail.',
  ],
}

export default async function PteSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: slug } = await params
  const section = sectionFromSlug(slug)
  if (!section) notFound()

  const meta = SECTION_META[section]
  const types = questionTypesBySection(section)
  const advice = SECTION_ADVICE[section] ?? []

  return (
    <>
      <JsonLd data={courseJsonLd(`PTE ${meta.label} Preparation`, meta.blurb)} />

      <section className="container-page py-16 sm:py-20">
        <span className="block h-1 w-12 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
        <SectionHeading
          align="left"
          title={`PTE ${meta.label}`}
          description={meta.blurb}
          className="mt-6"
        />
      </section>

      <section className="container-page pb-16">
        <h2 className="text-xl font-semibold text-navy-900">Task types in this section</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {types.map((type) => (
            <article key={type.code} className="surface-card p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-base font-semibold text-navy-900">{type.name}</h3>
                <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-medium text-ink-600">
                  {type.shortName}
                </span>
              </div>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{type.description}</p>

              <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
                {type.defaultTimeLimitSeconds ? (
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-3.5" aria-hidden />
                    <dt className="sr-only">Response time</dt>
                    <dd className="tabular">{formatDuration(type.defaultTimeLimitSeconds)}</dd>
                  </div>
                ) : null}
                {type.defaultPreparationSeconds ? (
                  <div className="flex items-center gap-1.5">
                    <dt>Preparation</dt>
                    <dd className="tabular">{formatDuration(type.defaultPreparationSeconds)}</dd>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  {type.requiresAudioResponse ? (
                    <>
                      <Mic className="size-3.5" aria-hidden />
                      <dd>Spoken response</dd>
                    </>
                  ) : type.requiresTextResponse ? (
                    <>
                      <Type className="size-3.5" aria-hidden />
                      <dd>Written response</dd>
                    </>
                  ) : (
                    <dd>Auto-scored</dd>
                  )}
                </div>
              </dl>

              <p className="mt-4 text-xs text-ink-500">Contributes to: {type.skills.join(', ')}</p>
            </article>
          ))}
        </div>
      </section>

      {advice.length ? (
        <section className="container-page pb-20">
          <div className="surface-card p-7">
            <h2 className="text-xl font-semibold text-navy-900">How to practise {meta.label.toLowerCase()}</h2>
            <ul className="mt-5 space-y-4">
              {advice.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: meta.color }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <p className="text-[15px] leading-relaxed text-ink-700">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <CtaBand
        title={`Practise PTE ${meta.label} with AI feedback`}
        description="Create a free account and get scored feedback on your first responses today."
      />
    </>
  )
}
