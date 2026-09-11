import type { PteSection } from '@prisma/client'

/**
 * The PTE task catalogue.
 *
 * Question types live in the database so admins can add new ones without a
 * migration; this file is the compile-time contract for the ones the practice
 * engine ships renderers for. `code` is the join key between the two.
 */

export const QUESTION_TYPE_CODES = [
  // Speaking
  'READ_ALOUD',
  'REPEAT_SENTENCE',
  'DESCRIBE_IMAGE',
  'RETELL_LECTURE',
  'ANSWER_SHORT_QUESTION',
  'SUMMARIZE_GROUP_DISCUSSION',
  'RESPOND_TO_SITUATION',
  // Writing
  'SUMMARIZE_WRITTEN_TEXT',
  'ESSAY',
  'WRITE_EMAIL',
  // Reading
  'READING_MCQ_SINGLE',
  'READING_MCQ_MULTIPLE',
  'REORDER_PARAGRAPHS',
  'READING_FILL_BLANKS',
  'READING_WRITING_FILL_BLANKS',
  // Listening
  'SUMMARIZE_SPOKEN_TEXT',
  'LISTENING_MCQ_SINGLE',
  'LISTENING_MCQ_MULTIPLE',
  'LISTENING_FILL_BLANKS',
  'HIGHLIGHT_CORRECT_SUMMARY',
  'SELECT_MISSING_WORD',
  'HIGHLIGHT_INCORRECT_WORDS',
  'WRITE_FROM_DICTATION',
] as const

export type QuestionTypeCode = (typeof QUESTION_TYPE_CODES)[number]

/**
 * Pearson sells two PTE products that share most of their task list.
 * A task is offered in one or both; `variants` on each definition says which,
 * and the practice UI filters by the learner's selected variant.
 */
export const PTE_VARIANTS = ['ACADEMIC_UKVI', 'CORE'] as const
export type PteVariant = (typeof PTE_VARIANTS)[number]

export const PTE_VARIANT_META: Record<PteVariant, { label: string; short: string; blurb: string }> = {
  ACADEMIC_UKVI: {
    label: 'PTE Academic / UKVI',
    short: 'PTE A / UKVI',
    blurb: 'University admission and UK visa routes. Scored 10-90 across four skills.',
  },
  CORE: {
    label: 'PTE Core',
    short: 'PTE Core',
    blurb: 'Canadian economic immigration (IRCC approved). Swaps in Write Email and Respond to a Situation.',
  },
}

/** Renderer keys the practice engine can draw. */
export type RendererKey =
  | 'speaking-read-aloud'
  | 'speaking-audio-prompt'
  | 'speaking-image-prompt'
  | 'writing-text'
  | 'choice-single'
  | 'choice-multiple'
  | 'reorder'
  | 'fill-blanks-dropdown'
  | 'fill-blanks-typed'
  | 'highlight-words'
  | 'dictation'

export interface QuestionTypeDefinition {
  code: QuestionTypeCode
  name: string
  shortName: string
  section: PteSection
  renderer: RendererKey
  description: string
  /** Enabling skills this task contributes to — drives the recommendation engine. */
  skills: string[]
  defaultTimeLimitSeconds: number | null
  defaultPreparationSeconds: number | null
  requiresAudioResponse: boolean
  requiresTextResponse: boolean
  /** Scored by deterministic rules (choice/order/dictation) rather than an AI call. */
  autoScorable: boolean
  /**
   * Share of the total score this task contributes, as a percentage. Pearson
   * does not publish exact figures; these are the community-accepted estimates
   * students plan around. Values below one percent are stored as 0.5 and
   * rendered "<1%" — see `formatScoreWeight`.
   */
  scoreWeight: number
  /** Which PTE products offer this task. */
  variants: PteVariant[]
  /** Recently added by Pearson — surfaced with a "New" badge in the practice menu. */
  isNew: boolean
  displayOrder: number
}

export const QUESTION_TYPES: QuestionTypeDefinition[] = [
  {
    code: 'READ_ALOUD',
    name: 'Read Aloud',
    shortName: 'RA',
    section: 'SPEAKING',
    renderer: 'speaking-read-aloud',
    description: 'Read a short text aloud, clearly and naturally, within the time limit.',
    skills: ['pronunciation', 'oralFluency', 'content'],
    defaultTimeLimitSeconds: 40,
    defaultPreparationSeconds: 35,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 4,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 1,
  },
  {
    code: 'REPEAT_SENTENCE',
    name: 'Repeat Sentence',
    shortName: 'RS',
    section: 'SPEAKING',
    renderer: 'speaking-audio-prompt',
    description: 'Listen to a sentence and repeat it exactly as you heard it.',
    skills: ['pronunciation', 'oralFluency', 'listening', 'content'],
    defaultTimeLimitSeconds: 15,
    defaultPreparationSeconds: 3,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 7,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 2,
  },
  {
    code: 'DESCRIBE_IMAGE',
    name: 'Describe Image',
    shortName: 'DI',
    section: 'SPEAKING',
    renderer: 'speaking-image-prompt',
    description: 'Study the image and describe what it shows in detail.',
    skills: ['oralFluency', 'pronunciation', 'vocabulary', 'content'],
    defaultTimeLimitSeconds: 40,
    defaultPreparationSeconds: 25,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 15,
    variants: ['ACADEMIC_UKVI'],
    isNew: false,
    displayOrder: 3,
  },
  {
    code: 'RETELL_LECTURE',
    name: 'Retell Lecture',
    shortName: 'RL',
    section: 'SPEAKING',
    renderer: 'speaking-audio-prompt',
    description: 'Listen to a lecture and retell it in your own words.',
    skills: ['oralFluency', 'pronunciation', 'content', 'listening'],
    defaultTimeLimitSeconds: 40,
    defaultPreparationSeconds: 10,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 6,
    variants: ['ACADEMIC_UKVI'],
    isNew: false,
    displayOrder: 4,
  },
  {
    code: 'ANSWER_SHORT_QUESTION',
    name: 'Answer Short Question',
    shortName: 'ASQ',
    section: 'SPEAKING',
    renderer: 'speaking-audio-prompt',
    description: 'Answer a short question in one or a few words.',
    skills: ['listening', 'vocabulary', 'content'],
    defaultTimeLimitSeconds: 10,
    defaultPreparationSeconds: 3,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 2,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 5,
  },
  {
    code: 'SUMMARIZE_GROUP_DISCUSSION',
    name: 'Summarize Group Discussion',
    shortName: 'SGD',
    section: 'SPEAKING',
    renderer: 'speaking-audio-prompt',
    description:
      'Listen to three speakers discuss a topic, then summarise the discussion in your own words.',
    skills: ['oralFluency', 'pronunciation', 'content', 'listening', 'vocabulary'],
    defaultTimeLimitSeconds: 120,
    defaultPreparationSeconds: 10,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 9,
    variants: ['ACADEMIC_UKVI'],
    isNew: true,
    displayOrder: 6,
  },
  {
    code: 'RESPOND_TO_SITUATION',
    name: 'Respond to a Situation',
    shortName: 'RTS',
    section: 'SPEAKING',
    renderer: 'speaking-audio-prompt',
    description: 'Listen to an everyday scenario and give an appropriate spoken response.',
    skills: ['oralFluency', 'pronunciation', 'content', 'listening'],
    defaultTimeLimitSeconds: 40,
    defaultPreparationSeconds: 20,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    scoreWeight: 6,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: true,
    displayOrder: 7,
  },
  {
    code: 'SUMMARIZE_WRITTEN_TEXT',
    name: 'Summarize Written Text',
    shortName: 'SWT',
    section: 'WRITING',
    renderer: 'writing-text',
    description: 'Summarise the passage in a single sentence of 5-75 words.',
    skills: ['content', 'form', 'grammar', 'vocabulary'],
    defaultTimeLimitSeconds: 600,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    scoreWeight: 7,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 8,
  },
  {
    code: 'ESSAY',
    name: 'Write Essay',
    shortName: 'WE',
    section: 'WRITING',
    renderer: 'writing-text',
    description: 'Write a 200-300 word argumentative essay on the given topic.',
    skills: ['content', 'form', 'grammar', 'vocabulary', 'writtenDiscourse', 'spelling'],
    defaultTimeLimitSeconds: 1200,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    scoreWeight: 7,
    variants: ['ACADEMIC_UKVI'],
    isNew: false,
    displayOrder: 9,
  },
  {
    code: 'WRITE_EMAIL',
    name: 'Write Email',
    shortName: 'WEM',
    section: 'WRITING',
    renderer: 'writing-text',
    description: 'Write a short email of 50-120 words addressing every point in the prompt.',
    skills: ['content', 'form', 'grammar', 'vocabulary', 'writtenDiscourse', 'spelling'],
    defaultTimeLimitSeconds: 540,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    scoreWeight: 8,
    variants: ['CORE'],
    isNew: false,
    displayOrder: 10,
  },
  {
    code: 'READING_MCQ_SINGLE',
    name: 'Multiple Choice, Single Answer',
    shortName: 'R-MCQ',
    section: 'READING',
    renderer: 'choice-single',
    description: 'Read the passage and choose the single best answer.',
    skills: ['reading', 'content'],
    defaultTimeLimitSeconds: 120,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 0.5,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 11,
  },
  {
    code: 'READING_MCQ_MULTIPLE',
    name: 'Multiple Choice, Multiple Answers',
    shortName: 'R-MCM',
    section: 'READING',
    renderer: 'choice-multiple',
    description: 'Choose every option that correctly answers the question. Wrong choices lose marks.',
    skills: ['reading', 'content'],
    defaultTimeLimitSeconds: 180,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 1,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 12,
  },
  {
    code: 'REORDER_PARAGRAPHS',
    name: 'Re-order Paragraphs',
    shortName: 'RO',
    section: 'READING',
    renderer: 'reorder',
    description: 'Arrange the text boxes into the correct logical order.',
    skills: ['reading', 'writtenDiscourse'],
    defaultTimeLimitSeconds: 180,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 3,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 13,
  },
  {
    code: 'READING_FILL_BLANKS',
    name: 'Fill in the Blanks (Drag and Drop)',
    shortName: 'R-FIB',
    section: 'READING',
    renderer: 'fill-blanks-dropdown',
    description: 'Drag the correct word into each blank in the passage.',
    skills: ['reading', 'vocabulary', 'grammar'],
    defaultTimeLimitSeconds: 180,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 6,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 14,
  },
  {
    code: 'READING_WRITING_FILL_BLANKS',
    name: 'Fill in the Blanks (Dropdown)',
    shortName: 'RW-FIB',
    section: 'READING',
    renderer: 'fill-blanks-dropdown',
    description: 'Choose the word that fits each blank in both meaning and grammar.',
    skills: ['reading', 'vocabulary', 'grammar', 'writtenDiscourse'],
    defaultTimeLimitSeconds: 210,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 7,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 15,
  },
  {
    code: 'SUMMARIZE_SPOKEN_TEXT',
    name: 'Summarize Spoken Text',
    shortName: 'SST',
    section: 'LISTENING',
    renderer: 'writing-text',
    description: 'Listen to a lecture and summarise it in 50-70 words.',
    skills: ['listening', 'content', 'form', 'grammar', 'vocabulary', 'spelling'],
    defaultTimeLimitSeconds: 600,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    scoreWeight: 4,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 16,
  },
  {
    code: 'LISTENING_MCQ_SINGLE',
    name: 'Multiple Choice, Single Answer',
    shortName: 'L-MCQ',
    section: 'LISTENING',
    renderer: 'choice-single',
    description: 'Listen to the recording and choose the single best answer.',
    skills: ['listening', 'content'],
    defaultTimeLimitSeconds: 120,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 0.5,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 17,
  },
  {
    code: 'LISTENING_MCQ_MULTIPLE',
    name: 'Multiple Choice, Multiple Answers',
    shortName: 'L-MCM',
    section: 'LISTENING',
    renderer: 'choice-multiple',
    description: 'Select every correct option. Incorrect selections lose marks.',
    skills: ['listening', 'content'],
    defaultTimeLimitSeconds: 150,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 1,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 18,
  },
  {
    code: 'LISTENING_FILL_BLANKS',
    name: 'Fill in the Blanks',
    shortName: 'L-FIB',
    section: 'LISTENING',
    renderer: 'fill-blanks-typed',
    description: 'Type the missing word you hear into each blank in the transcript.',
    skills: ['listening', 'spelling', 'vocabulary'],
    defaultTimeLimitSeconds: 180,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 3,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 19,
  },
  {
    code: 'HIGHLIGHT_CORRECT_SUMMARY',
    name: 'Highlight Correct Summary',
    shortName: 'HCS',
    section: 'LISTENING',
    renderer: 'choice-single',
    description: 'Listen to the recording and choose the paragraph that best summarises it.',
    skills: ['listening', 'reading', 'content'],
    defaultTimeLimitSeconds: 150,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 0.5,
    variants: ['ACADEMIC_UKVI'],
    isNew: false,
    displayOrder: 20,
  },
  {
    code: 'SELECT_MISSING_WORD',
    name: 'Select Missing Word',
    shortName: 'SMW',
    section: 'LISTENING',
    renderer: 'choice-single',
    description:
      'The last word or phrase is bleeped out — choose the option that completes the recording.',
    skills: ['listening', 'content'],
    defaultTimeLimitSeconds: 120,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 1,
    variants: ['ACADEMIC_UKVI'],
    isNew: false,
    displayOrder: 21,
  },
  {
    code: 'HIGHLIGHT_INCORRECT_WORDS',
    name: 'Highlight Incorrect Words',
    shortName: 'HIW',
    section: 'LISTENING',
    renderer: 'highlight-words',
    description: 'Click the words in the transcript that differ from the recording.',
    skills: ['listening', 'reading'],
    defaultTimeLimitSeconds: 150,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 4,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 22,
  },
  {
    code: 'WRITE_FROM_DICTATION',
    name: 'Write From Dictation',
    shortName: 'WFD',
    section: 'LISTENING',
    renderer: 'dictation',
    description: 'Type the sentence exactly as you hear it.',
    skills: ['listening', 'spelling', 'grammar'],
    defaultTimeLimitSeconds: 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    scoreWeight: 5,
    variants: ['ACADEMIC_UKVI', 'CORE'],
    isNew: false,
    displayOrder: 23,
  },
]

const BY_CODE = new Map(QUESTION_TYPES.map((type) => [type.code, type]))

export function questionType(code: string): QuestionTypeDefinition | undefined {
  return BY_CODE.get(code as QuestionTypeCode)
}

export function questionTypesBySection(section: PteSection): QuestionTypeDefinition[] {
  return QUESTION_TYPES.filter((type) => type.section === section)
}

/** Tasks offered in one PTE product, in menu order. */
export function questionTypesForVariant(
  variant: PteVariant,
  section?: PteSection,
): QuestionTypeDefinition[] {
  return QUESTION_TYPES.filter(
    (type) => type.variants.includes(variant) && (section === undefined || type.section === section),
  )
}

/** Below one percent reads "<1%"; everything else is a whole percentage. */
export function formatScoreWeight(weight: number): string {
  return weight < 1 ? '<1%' : `${weight}%`
}

/** URL segment for a task code: READ_ALOUD -> read-aloud. */
export function typeSlug(code: string): string {
  return code.toLowerCase().replace(/_/g, '-')
}

/** Inverse of `typeSlug`. */
export function codeFromTypeSlug(slug: string): string {
  return slug.toUpperCase().replace(/-/g, '_')
}

/** Canonical practice URL for one task type. */
export function practiceHref(type: QuestionTypeDefinition): string {
  return `/practice/${SECTION_META[type.section].slug}/${typeSlug(type.code)}`
}

export const SECTIONS: PteSection[] = ['SPEAKING', 'WRITING', 'READING', 'LISTENING']

export const SECTION_META: Record<
  PteSection,
  { label: string; slug: string; blurb: string; color: string; tint: string; text: string }
> = {
  SPEAKING: {
    label: 'Speaking',
    slug: 'speaking',
    blurb: 'Read Aloud, Repeat Sentence, Describe Image, Retell Lecture and Answer Short Question.',
    color: '#2e5bff',
    tint: 'bg-[#2e5bff]/10',
    text: 'text-[#2e5bff]',
  },
  WRITING: {
    label: 'Writing',
    slug: 'writing',
    blurb: 'Summarize Written Text and Write Essay, evaluated across six scoring traits.',
    color: '#e8590c',
    tint: 'bg-[#e8590c]/10',
    text: 'text-[#c2410c]',
  },
  READING: {
    label: 'Reading',
    slug: 'reading',
    blurb: 'Multiple choice, re-order paragraphs and both fill-in-the-blanks task types.',
    color: '#0d9488',
    tint: 'bg-[#0d9488]/10',
    text: 'text-[#0f766e]',
  },
  LISTENING: {
    label: 'Listening',
    slug: 'listening',
    blurb: 'Summarize Spoken Text, dictation, highlight incorrect words and more.',
    color: '#c026d3',
    tint: 'bg-[#c026d3]/10',
    text: 'text-[#a21caf]',
  },
}

export function sectionFromSlug(slug: string): PteSection | null {
  const match = SECTIONS.find((section) => SECTION_META[section].slug === slug.toLowerCase())
  return match ?? null
}
