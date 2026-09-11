import type { IeltsVariant, PteSection } from '@prisma/client'

/**
 * The IELTS task catalogue.
 *
 * This mirrors src/lib/pte/question-types.ts deliberately: question types live
 * in the database so content managers can add them without a migration, and
 * this file is the compile-time contract for the ones the practice engine
 * ships renderers for. `code` is the join key between the two.
 *
 * Codes are prefixed IELTS_ so that QuestionType.code stays a single flat
 * unique lookup across both exams and every log line says which exam it came
 * from without a join.
 *
 * `implemented` marks the types whose renderer exists today. The rest are
 * defined here because the catalogue is the contract the content team works
 * against, but they are deliberately not seeded yet — the practice engine
 * shows an explicit "not supported" notice rather than a broken task.
 */

export const IELTS_QUESTION_TYPE_CODES = [
  // Writing
  'IELTS_WRITING_TASK1_ACADEMIC',
  'IELTS_WRITING_TASK1_GENERAL',
  'IELTS_WRITING_TASK2',
  // Speaking
  'IELTS_SPEAKING_PART1',
  'IELTS_SPEAKING_PART2',
  'IELTS_SPEAKING_PART3',
  // Reading
  'IELTS_READING_TFNG',
  'IELTS_READING_YNNG',
  'IELTS_READING_MATCHING_HEADINGS',
  'IELTS_READING_MATCHING_INFORMATION',
  'IELTS_READING_MATCHING_FEATURES',
  'IELTS_READING_SENTENCE_ENDINGS',
  'IELTS_READING_COMPLETION',
  'IELTS_READING_DIAGRAM_LABEL',
  'IELTS_READING_MCQ',
  'IELTS_READING_SHORT_ANSWER',
  // Listening
  'IELTS_LISTENING_COMPLETION',
  'IELTS_LISTENING_MCQ',
  'IELTS_LISTENING_MATCHING',
  'IELTS_LISTENING_MAP_LABEL',
  'IELTS_LISTENING_SHORT_ANSWER',
] as const

export type IeltsQuestionTypeCode = (typeof IELTS_QUESTION_TYPE_CODES)[number]

/**
 * Renderer keys the IELTS tasks need. Three of them are existing PTE renderers
 * reused as-is; the rest are new. They share one key space with the PTE
 * renderers so the practice engine keeps a single dispatch table.
 */
export type IeltsRendererKey =
  // Reused unchanged from the PTE engine.
  | 'writing-text'
  | 'choice-single'
  | 'choice-multiple'
  // New for IELTS.
  | 'ielts-tfng'
  | 'ielts-matching'
  | 'ielts-completion'
  | 'ielts-labelling'
  | 'ielts-short-answer'
  | 'ielts-cue-card'
  | 'ielts-interview'

export interface IeltsQuestionTypeDefinition {
  code: IeltsQuestionTypeCode
  name: string
  shortName: string
  section: PteSection
  /** Null when the task is identical for Academic and General Training. */
  variant: IeltsVariant | null
  renderer: IeltsRendererKey
  description: string
  /** The assessment criteria or sub-skills this task exercises. */
  skills: string[]
  defaultTimeLimitSeconds: number | null
  defaultPreparationSeconds: number | null
  requiresAudioResponse: boolean
  requiresTextResponse: boolean
  /** Marked by deterministic rules rather than an AI call. */
  autoScorable: boolean
  /** Minimum words the task demands, where IELTS states one. */
  wordLimitMin: number | null
  /**
   * Relative weight inside the section band. Only Writing uses anything other
   * than 1: Task 2 counts double.
   */
  taskWeight: number
  /** Whether a renderer exists for this type today. */
  implemented: boolean
  displayOrder: number
}

export const IELTS_QUESTION_TYPES: IeltsQuestionTypeDefinition[] = [
  // ---------------------------------------------------------------- Writing
  {
    code: 'IELTS_WRITING_TASK1_ACADEMIC',
    name: 'Writing Task 1 — Academic',
    shortName: 'W1A',
    section: 'WRITING',
    variant: 'ACADEMIC',
    renderer: 'writing-text',
    description:
      'Describe and compare the information in a graph, table, chart, process or map in at least 150 words.',
    skills: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    defaultTimeLimitSeconds: 20 * 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    wordLimitMin: 150,
    taskWeight: 1,
    implemented: true,
    displayOrder: 1,
  },
  {
    code: 'IELTS_WRITING_TASK1_GENERAL',
    name: 'Writing Task 1 — General Training',
    shortName: 'W1G',
    section: 'WRITING',
    variant: 'GENERAL_TRAINING',
    renderer: 'writing-text',
    description:
      'Write a letter of at least 150 words requesting information or explaining a situation, in the register the prompt calls for.',
    skills: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    defaultTimeLimitSeconds: 20 * 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    wordLimitMin: 150,
    taskWeight: 1,
    implemented: true,
    displayOrder: 2,
  },
  {
    code: 'IELTS_WRITING_TASK2',
    name: 'Writing Task 2 — Essay',
    shortName: 'W2',
    section: 'WRITING',
    variant: null,
    renderer: 'writing-text',
    description:
      'Write a discursive essay of at least 250 words responding to a point of view, argument or problem.',
    skills: ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    defaultTimeLimitSeconds: 40 * 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: true,
    autoScorable: false,
    wordLimitMin: 250,
    // Task 2 is twice the length and carries twice the marks.
    taskWeight: 2,
    implemented: true,
    displayOrder: 3,
  },

  // --------------------------------------------------------------- Speaking
  {
    code: 'IELTS_SPEAKING_PART1',
    name: 'Speaking Part 1 — Introduction and interview',
    shortName: 'S1',
    section: 'SPEAKING',
    variant: null,
    renderer: 'ielts-interview',
    description: 'Answer familiar questions about yourself, your home, work and interests.',
    skills: ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'],
    defaultTimeLimitSeconds: 5 * 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 4,
  },
  {
    code: 'IELTS_SPEAKING_PART2',
    name: 'Speaking Part 2 — Cue card',
    shortName: 'S2',
    section: 'SPEAKING',
    variant: null,
    renderer: 'ielts-cue-card',
    description: 'Prepare for one minute, then speak for one to two minutes on the topic on the card.',
    skills: ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'],
    defaultTimeLimitSeconds: 120,
    defaultPreparationSeconds: 60,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 5,
  },
  {
    code: 'IELTS_SPEAKING_PART3',
    name: 'Speaking Part 3 — Discussion',
    shortName: 'S3',
    section: 'SPEAKING',
    variant: null,
    renderer: 'ielts-interview',
    description: 'Discuss the abstract issues behind the Part 2 topic in more depth.',
    skills: ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'],
    defaultTimeLimitSeconds: 5 * 60,
    defaultPreparationSeconds: null,
    requiresAudioResponse: true,
    requiresTextResponse: false,
    autoScorable: false,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 6,
  },

  // ---------------------------------------------------------------- Reading
  {
    code: 'IELTS_READING_TFNG',
    name: 'True / False / Not Given',
    shortName: 'TFNG',
    section: 'READING',
    variant: null,
    renderer: 'ielts-tfng',
    description: 'Decide whether each statement agrees with the information in the passage.',
    skills: ['detailReading', 'inference'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 7,
  },
  {
    code: 'IELTS_READING_YNNG',
    name: 'Yes / No / Not Given',
    shortName: 'YNNG',
    section: 'READING',
    variant: null,
    renderer: 'ielts-tfng',
    description: "Decide whether each statement agrees with the writer's views or claims.",
    skills: ['inference', 'writerView'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 8,
  },
  {
    code: 'IELTS_READING_MATCHING_HEADINGS',
    name: 'Matching headings',
    shortName: 'MH',
    section: 'READING',
    variant: null,
    renderer: 'ielts-matching',
    description: 'Choose the heading that best summarises each paragraph from a shared list.',
    skills: ['skimming', 'mainIdea'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 9,
  },
  {
    code: 'IELTS_READING_MATCHING_INFORMATION',
    name: 'Matching information',
    shortName: 'MI',
    section: 'READING',
    variant: null,
    renderer: 'ielts-matching',
    description: 'Find the paragraph that contains each piece of information.',
    skills: ['scanning', 'detailReading'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 10,
  },
  {
    code: 'IELTS_READING_MATCHING_FEATURES',
    name: 'Matching features',
    shortName: 'MF',
    section: 'READING',
    variant: null,
    renderer: 'ielts-matching',
    description: 'Match each statement to the person, place, study or category it belongs to.',
    skills: ['scanning', 'detailReading'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 11,
  },
  {
    code: 'IELTS_READING_SENTENCE_ENDINGS',
    name: 'Matching sentence endings',
    shortName: 'MSE',
    section: 'READING',
    variant: null,
    renderer: 'ielts-matching',
    description: 'Complete each sentence with the correct ending from a shared list.',
    skills: ['detailReading', 'grammaticalRangeAccuracy'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 12,
  },
  {
    code: 'IELTS_READING_COMPLETION',
    name: 'Sentence, summary, note and table completion',
    shortName: 'RC',
    section: 'READING',
    variant: null,
    renderer: 'ielts-completion',
    description:
      'Fill each gap using words from the passage, within the stated word limit.',
    skills: ['scanning', 'spelling', 'grammaticalRangeAccuracy'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 13,
  },
  {
    code: 'IELTS_READING_DIAGRAM_LABEL',
    name: 'Diagram label completion',
    shortName: 'RDL',
    section: 'READING',
    variant: null,
    renderer: 'ielts-labelling',
    description: 'Label the parts of a diagram using words from the passage.',
    skills: ['detailReading', 'spelling'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 14,
  },
  {
    code: 'IELTS_READING_MCQ',
    name: 'Reading multiple choice',
    shortName: 'RMC',
    section: 'READING',
    variant: null,
    renderer: 'choice-single',
    description: 'Choose the best answer from the options given.',
    skills: ['detailReading', 'inference'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 15,
  },
  {
    code: 'IELTS_READING_SHORT_ANSWER',
    name: 'Reading short answer',
    shortName: 'RSA',
    section: 'READING',
    variant: null,
    renderer: 'ielts-short-answer',
    description: 'Answer each question using words from the passage, within the stated word limit.',
    skills: ['scanning', 'spelling'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 16,
  },

  // -------------------------------------------------------------- Listening
  {
    code: 'IELTS_LISTENING_COMPLETION',
    name: 'Form, note, table and flow-chart completion',
    shortName: 'LC',
    section: 'LISTENING',
    variant: null,
    renderer: 'ielts-completion',
    description: 'Fill each gap as you listen, within the stated word limit.',
    skills: ['listeningDetail', 'spelling'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 17,
  },
  {
    code: 'IELTS_LISTENING_MCQ',
    name: 'Listening multiple choice',
    shortName: 'LMC',
    section: 'LISTENING',
    variant: null,
    renderer: 'choice-single',
    description: 'Choose the best answer from the options given as you listen.',
    skills: ['listeningDetail', 'inference'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 18,
  },
  {
    code: 'IELTS_LISTENING_MATCHING',
    name: 'Listening matching',
    shortName: 'LM',
    section: 'LISTENING',
    variant: null,
    renderer: 'ielts-matching',
    description: 'Match each item to the option it belongs to from a shared list.',
    skills: ['listeningDetail'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 19,
  },
  {
    code: 'IELTS_LISTENING_MAP_LABEL',
    name: 'Plan, map and diagram labelling',
    shortName: 'LML',
    section: 'LISTENING',
    variant: null,
    renderer: 'ielts-labelling',
    description: 'Label a plan, map or diagram as you listen.',
    skills: ['listeningDetail', 'spatialLanguage'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 20,
  },
  {
    code: 'IELTS_LISTENING_SHORT_ANSWER',
    name: 'Listening short answer',
    shortName: 'LSA',
    section: 'LISTENING',
    variant: null,
    renderer: 'ielts-short-answer',
    description: 'Answer each question as you listen, within the stated word limit.',
    skills: ['listeningDetail', 'spelling'],
    defaultTimeLimitSeconds: null,
    defaultPreparationSeconds: null,
    requiresAudioResponse: false,
    requiresTextResponse: false,
    autoScorable: true,
    wordLimitMin: null,
    taskWeight: 1,
    implemented: false,
    displayOrder: 21,
  },
]

const BY_CODE = new Map(IELTS_QUESTION_TYPES.map((type) => [type.code, type]))

export function ieltsQuestionType(code: string): IeltsQuestionTypeDefinition | undefined {
  return BY_CODE.get(code as IeltsQuestionTypeCode)
}

export function isIeltsQuestionType(code: string): boolean {
  return BY_CODE.has(code as IeltsQuestionTypeCode)
}

/**
 * The types a student sitting `variant` should see in a section. A type with a
 * null variant belongs to both exams; one with a variant belongs only to that
 * exam, which is what keeps General Training letters out of an Academic
 * student's practice list.
 */
export function ieltsTypesBySection(
  section: PteSection,
  variant: IeltsVariant | null = null,
): IeltsQuestionTypeDefinition[] {
  return IELTS_QUESTION_TYPES.filter(
    (type) => type.section === section && (type.variant === null || variant === null || type.variant === variant),
  )
}

/** The types that have a working renderer today. */
export function implementedIeltsTypes(): IeltsQuestionTypeDefinition[] {
  return IELTS_QUESTION_TYPES.filter((type) => type.implemented)
}

/** The four IELTS assessment criteria, per section, in the order IELTS lists them. */
export const IELTS_CRITERIA = {
  WRITING_TASK1: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
  WRITING_TASK2: ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
  SPEAKING: ['fluencyCoherence', 'lexicalResource', 'grammaticalRangeAccuracy', 'pronunciation'],
} as const

export const CRITERION_LABEL: Record<string, string> = {
  taskAchievement: 'Task Achievement',
  taskResponse: 'Task Response',
  coherenceCohesion: 'Coherence and Cohesion',
  lexicalResource: 'Lexical Resource',
  grammaticalRangeAccuracy: 'Grammatical Range and Accuracy',
  fluencyCoherence: 'Fluency and Coherence',
  pronunciation: 'Pronunciation',
}

export const IELTS_SECTION_META: Record<
  PteSection,
  { label: string; slug: string; blurb: string; items: number | null; minutes: number }
> = {
  LISTENING: {
    label: 'Listening',
    slug: 'listening',
    blurb: 'Four recorded parts, forty questions, played once.',
    items: 40,
    minutes: 30,
  },
  READING: {
    label: 'Reading',
    slug: 'reading',
    blurb: 'Three passages, forty questions, no extra transfer time.',
    items: 40,
    minutes: 60,
  },
  WRITING: {
    label: 'Writing',
    slug: 'writing',
    blurb: 'Task 1 in 20 minutes, Task 2 in 40 — and Task 2 counts double.',
    items: 2,
    minutes: 60,
  },
  SPEAKING: {
    label: 'Speaking',
    slug: 'speaking',
    blurb: 'A three-part interview with an examiner, 11 to 14 minutes.',
    items: 3,
    minutes: 14,
  },
}

export const IELTS_VARIANT_META: Record<IeltsVariant, { label: string; slug: string; blurb: string }> = {
  ACADEMIC: {
    label: 'Academic',
    slug: 'academic',
    blurb: 'For university admission and professional registration.',
  },
  GENERAL_TRAINING: {
    label: 'General Training',
    slug: 'general-training',
    blurb: 'For migration, work experience and secondary education.',
  },
}
