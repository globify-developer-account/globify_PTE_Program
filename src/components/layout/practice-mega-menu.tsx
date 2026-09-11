'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  PTE_VARIANTS,
  PTE_VARIANT_META,
  QUESTION_TYPES,
  SECTIONS,
  SECTION_META,
  formatScoreWeight,
  practiceHref,
  type PteVariant,
  type QuestionTypeDefinition,
} from '@/lib/pte/question-types'
import { practiceMenuExtras } from '@/lib/site'
import { cn } from '@/lib/utils'
import type { PteSection } from '@prisma/client'

/**
 * The task panel behind "PTE Practice" in the masthead.
 *
 * It is the only place a student sees the whole exam at once, so it carries
 * the two facts they plan around: which product offers a task, and how much
 * that task moves the score. Tasks the *other* product offers are listed
 * greyed rather than hidden — a learner switching between Academic and Core
 * should be able to see what changes without switching tabs.
 */
export function PracticeMegaMenu({
  defaultVariant,
  onNavigate,
}: {
  defaultVariant: PteVariant
  /** Lets the topbar close the panel when a link inside it is followed. */
  onNavigate?: () => void
}) {
  const [variant, setVariant] = useState<PteVariant>(defaultVariant)

  return (
    <div className="border-t border-hairline bg-white shadow-lift">
      <div className="container-page py-5">
        <VariantTabs value={variant} onChange={setVariant} />

        <div className="mt-5 grid gap-x-8 gap-y-7 sm:grid-cols-2 lg:grid-cols-4">
          {SECTIONS.map((section, index) => (
            <SectionColumn
              key={section}
              section={section}
              variant={variant}
              /* The weight legend belongs to the grid, not the column — it sits
                 in the first header where it reads as a key for all four. */
              showWeightLegend={index === 0}
              onNavigate={onNavigate}
            />
          ))}
        </div>

        <div className="mt-6 border-t border-hairline pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">More</p>
          <ul className="mt-2.5 flex flex-wrap gap-x-7 gap-y-2">
            {practiceMenuExtras.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className="text-sm text-ink-600 transition-colors hover:text-brand-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * The two products, as interlocking tabs. The skew is decorative, so the
 * label inside is counter-skewed to keep the text upright.
 */
function VariantTabs({
  value,
  onChange,
}: {
  value: PteVariant
  onChange: (next: PteVariant) => void
}) {
  return (
    <div role="tablist" aria-label="PTE product" className="flex">
      {PTE_VARIANTS.map((candidate) => {
        const active = candidate === value
        return (
          <button
            key={candidate}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(candidate)}
            title={PTE_VARIANT_META[candidate].blurb}
            className={cn(
              '-skew-x-12 border border-hairline px-6 py-2 text-sm font-semibold transition-colors first:rounded-l-md last:rounded-r-md',
              active
                ? 'z-10 border-brand-600 bg-brand-600 text-white'
                : 'bg-ink-100 text-ink-500 hover:bg-ink-200 hover:text-ink-700',
            )}
          >
            <span className="block skew-x-12">{PTE_VARIANT_META[candidate].label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SectionColumn({
  section,
  variant,
  showWeightLegend,
  onNavigate,
}: {
  section: PteSection
  variant: PteVariant
  showWeightLegend: boolean
  onNavigate?: () => void
}) {
  const inSection = QUESTION_TYPES.filter((type) => type.section === section)
  const offered = inSection.filter((type) => type.variants.includes(variant))
  // Tasks the other product has and this one does not. Listed greyed at the
  // foot of the column so the difference between the two is visible in place.
  const elsewhere = inSection.filter((type) => !type.variants.includes(variant))
  const meta = SECTION_META[section]

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 border-b border-hairline pb-2">
        <h3 className="text-[15px] font-semibold" style={{ color: meta.color }}>
          {meta.label}
        </h3>
        {showWeightLegend ? (
          <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600">
            Score weight
          </span>
        ) : null}
      </div>

      <ul className="mt-1">
        {offered.map((type) => (
          <li key={type.code}>
            <Link
              href={practiceHref(type)}
              onClick={onNavigate}
              className="group flex items-start justify-between gap-3 rounded-md py-1.5 pl-1 pr-1 transition-colors hover:bg-ink-50"
            >
              <span className="min-w-0 text-[13px] leading-snug text-ink-700 group-hover:text-brand-700">
                {type.isNew ? <NewBadge /> : null}
                {type.name}
                {!type.autoScorable ? <AiScoreTag /> : null}
              </span>
              <span className="mt-0.5 shrink-0 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-rose-600">
                {formatScoreWeight(type.scoreWeight)}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {elsewhere.length > 0 ? (
        <ul className="mt-1 border-t border-dashed border-hairline pt-1.5">
          {elsewhere.map((type) => (
            <OtherVariantRow key={type.code} type={type} variant={variant} />
          ))}
        </ul>
      ) : null}
    </div>
  )
}

/**
 * A task belonging only to the product that is not selected. It is not a link:
 * following it would show a task list the learner's exam does not contain.
 */
function OtherVariantRow({
  type,
  variant,
}: {
  type: QuestionTypeDefinition
  variant: PteVariant
}) {
  const other = type.variants.find((candidate) => candidate !== variant) ?? type.variants[0]
  return (
    <li
      className="py-1.5 pl-1 text-[13px] leading-snug text-ink-400"
      title={`Only in ${PTE_VARIANT_META[other].label}`}
    >
      {type.name}{' '}
      <span className="text-[11px] text-ink-400">({PTE_VARIANT_META[other].short})</span>
    </li>
  )
}

/** Marks a task Pearson added recently, so returning students notice it. */
function NewBadge() {
  return (
    <span className="mr-1.5 inline-block rounded bg-rose-500 px-1 py-px align-[2px] text-[9px] font-bold uppercase leading-tight text-white">
      New
    </span>
  )
}

/** Flags the tasks a human or model grades rather than an answer key. */
function AiScoreTag() {
  return (
    <span className="ml-1.5 whitespace-nowrap text-[10px] font-semibold text-rose-500">
      AI Score
    </span>
  )
}
