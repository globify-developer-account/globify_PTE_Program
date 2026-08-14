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
  // Writing
  'SUMMARIZE_WRITTEN_TEXT',
  'ESSAY',
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
  'HIGHLIGHT_INCORRECT_WORDS',
  'WRITE_FROM_DICTATION',
] as const

export type QuestionTypeCode = (typeof QUESTION_TYPE_CODES)[number]

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
    displayOrder: 5,
  },
  {
    code: 'SUMMARIZE_WRITTEN_TEXT',
    name: 'Summarize Written Text',
    shortName: 'SWT',
    section: 'WRITING',
    renderer: 'writing-text',
    description: 'Summarise the passage in a single sentence of 5–75 words.',
    skills: ['content', 'form', 'grammar', 'vocabulary'],
    defaultTimeLimitSeconds: 600,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    displayOrder: 6,
  },
  {
    code: 'ESSAY',
    name: 'Write Essay',
    shortName: 'WE',
    section: 'WRITING',
    renderer: 'writing-text',
    description: 'Write a 200–300 word argumentative essay on the given topic.',
    skills: ['content', 'form', 'grammar', 'vocabulary', 'writtenDiscourse', 'spelling'],
    defaultTimeLimitSeconds: 1200,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    displayOrder: 7,
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
    displayOrder: 8,
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
    displayOrder: 9,
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
    displayOrder: 10,
  },
  {
    code: 'READING_FILL_BLANKS',
    name: 'Reading: Fill in the Blanks',
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
    displayOrder: 11,
  },
  {
    code: 'READING_WRITING_FILL_BLANKS',
    name: 'Reading & Writing: Fill in the Blanks',
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
    displayOrder: 12,
  },
  {
    code: 'SUMMARIZE_SPOKEN_TEXT',
    name: 'Summarize Spoken Text',
    shortName: 'SST',
    section: 'LISTENING',
    renderer: 'writing-text',
    description: 'Listen to a lecture and summarise it in 50–70 words.',
    skills: ['listening', 'content', 'form', 'grammar', 'vocabulary', 'spelling'],
    defaultTimeLimitSeconds: 600,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    displayOrder: 13,
  },
  {
    code: 'LISTENING_MCQ_SINGLE',
    name: 'Listening: Multiple Choice, Single Answer',
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
    displayOrder: 14,
  },
  {
    code: 'LISTENING_MCQ_MULTIPLE',
    name: 'Listening: Multiple Choice, Multiple Answers',
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
    displayOrder: 15,
  },
  {
    code: 'LISTENING_FILL_BLANKS',
    name: 'Listening: Fill in the Blanks',
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
    displayOrder: 16,
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
    displayOrder: 17,
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
    displayOrder: 18,
  },
]

const BY_CODE = new Map(QUESTION_TYPES.map((type) => [type.code, type]))

export function questionType(code: string): QuestionTypeDefinition | undefined {
  return BY_CODE.get(code as QuestionTypeCode)
}

export function questionTypesBySection(section: PteSection): QuestionTypeDefinition[] {
  return QUESTION_TYPES.filter((type) => type.section === section)
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
