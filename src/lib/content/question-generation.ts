import { z } from 'zod'
import { questionType, type QuestionTypeCode } from '../pte/question-types'
import { tokenizeWords } from '../pte/schemas'
import { normalizeText } from '../pte/scoring'

/**
 * AI-assisted authoring for the PTE question bank.
 *
 * Claude writes the creative part of an item — passage, distractors, sample
 * answer — as JSON constrained by a per-task schema. Everything the scorer
 * depends on is then derived or checked here in code: option IDs, shuffling,
 * blank markers, Highlight Incorrect Words indexes. A model can get an index
 * wrong; a token-by-token diff cannot. Items that fail a check are rejected so
 * the caller can ask for a fresh one.
 *
 * Output always lands as DRAFT. A person reviews and publishes it from
 * /admin/questions, where it receives its type number.
 */

export const GENERATION_SYSTEM_PROMPT = `You write original practice items for Globify PTE Premium, a preparation platform for PTE Academic and PTE Core.

Every item must be newly written by you. Never reproduce or closely paraphrase real PTE test items, questions recalled from live exams, textbook exercises, or content from other preparation websites. Passages are your own prose, not excerpts from articles or books.

Write in clear international academic English. Keep content factually accurate and suitable for a university-level exam: science, history, society, business, environment, arts, technology, education and campus life all work well. Avoid divisive political topics, graphic content, medical advice and anything culturally insensitive.

Match the official task format, length and difficulty closely, so that practising on the item transfers directly to the real exam.`

const DIFFICULTY_GUIDANCE = {
  EASY: 'Common vocabulary, short sentences, and distractors that are clearly wrong on a careful read.',
  MEDIUM: 'Typical exam level: some academic vocabulary, varied sentence structure, plausible distractors.',
  HARD: 'Dense academic vocabulary, complex sentences, and distractors that are only ruled out by close reading.',
} as const

export type GenerationDifficulty = keyof typeof DIFFICULTY_GUIDANCE

export class GenerationError extends Error {}

export interface QuestionDraft {
  title: string
  prompt: string | null
  passage: string | null
  audioTranscript: string | null
  options: unknown[]
  correctAnswer: Record<string, unknown>
  explanation: string | null
  sampleAnswer: string | null
  tags: string[]
  wordLimitMin: number | null
  wordLimitMax: number | null
}

export interface GenerationSpec {
  /** Question code prefix, matching the seed bank: RA-001, RFIB-002 … */
  prefix: string
  brief: string
  jsonSchema: Record<string, unknown>
  /** Validates Claude's JSON and turns it into a storable draft, or throws GenerationError. */
  build(json: unknown, random?: () => number): QuestionDraft
}

// --- helpers ------------------------------------------------------------------

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function requireWords(label: string, text: string, min: number, max: number): void {
  const count = wordCount(text)
  if (count < min || count > max) {
    throw new GenerationError(`${label} has ${count} words; expected ${min}-${max}.`)
  }
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j]!, copy[i]!]
  }
  return copy
}

const OPTION_IDS = ['a', 'b', 'c', 'd', 'e', 'f', 'g']

function draft(fields: Partial<QuestionDraft> & Pick<QuestionDraft, 'title' | 'tags'>): QuestionDraft {
  return {
    prompt: null,
    passage: null,
    audioTranscript: null,
    options: [],
    correctAnswer: {},
    explanation: null,
    sampleAnswer: null,
    wordLimitMin: null,
    wordLimitMax: null,
    ...fields,
    tags: fields.tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 3),
  }
}

const base = z.object({
  title: z.string().min(3).max(80),
  tags: z.array(z.string()).min(1).max(5),
})

const BASE_PROPERTIES = {
  title: { type: 'string', description: 'Short, specific title of 2-6 words naming the subject.' },
  tags: { type: 'array', items: { type: 'string' }, description: '1-3 lowercase topic tags.' },
}

function objectSchema(properties: Record<string, unknown>): Record<string, unknown> {
  const all = { ...BASE_PROPERTIES, ...properties }
  return { type: 'object', properties: all, required: Object.keys(all), additionalProperties: false }
}

const STRING = { type: 'string' }

function spec<T extends z.infer<typeof base>>(definition: {
  prefix: string
  brief: string
  properties: Record<string, unknown>
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
  assemble: (raw: T, random: () => number) => QuestionDraft
}): GenerationSpec {
  return {
    prefix: definition.prefix,
    brief: definition.brief,
    jsonSchema: objectSchema(definition.properties),
    build(json, random = Math.random) {
      const parsed = definition.schema.safeParse(json)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        throw new GenerationError(`Invalid shape at ${issue?.path.join('.') || 'root'}: ${issue?.message}`)
      }
      return definition.assemble(parsed.data, random)
    },
  }
}

// --- shared task shapes --------------------------------------------------------

const choiceProperties = {
  options: {
    type: 'array',
    items: {
      type: 'object',
      properties: { text: STRING, correct: { type: 'boolean' } },
      required: ['text', 'correct'],
      additionalProperties: false,
    },
  },
  explanation: { type: 'string', description: 'Why each correct option is right and each distractor is wrong.' },
}

const choiceSchema = z.array(z.object({ text: z.string().min(1), correct: z.boolean() }))

/** Shuffles options, assigns display IDs, and returns the answer key for them. */
function assembleChoices(
  options: Array<{ text: string; correct: boolean }>,
  expectCorrect: { min: number; max: number },
  random: () => number,
): { options: Array<{ id: string; text: string }>; correctIds: string[] } {
  if (options.length > OPTION_IDS.length) throw new GenerationError(`Too many options (${options.length}).`)
  const texts = new Set(options.map((option) => normalizeText(option.text)))
  if (texts.size !== options.length) throw new GenerationError('Options contain duplicates.')

  const correctCount = options.filter((option) => option.correct).length
  if (correctCount < expectCorrect.min || correctCount > expectCorrect.max) {
    throw new GenerationError(
      `Expected ${expectCorrect.min}-${expectCorrect.max} correct options, got ${correctCount}.`,
    )
  }

  const shuffled = shuffle(options, random).map((option, index) => ({ ...option, id: OPTION_IDS[index]! }))
  return {
    options: shuffled.map(({ id, text }) => ({ id, text })),
    correctIds: shuffled.filter((option) => option.correct).map((option) => option.id),
  }
}

const blankProperties = {
  passage: {
    type: 'string',
    description: 'The passage with each gap written as {{1}}, {{2}} … in reading order.',
  },
  blanks: {
    type: 'array',
    description: 'One entry per gap, in the same order as the markers.',
    items: {
      type: 'object',
      properties: { answer: STRING, distractors: { type: 'array', items: STRING } },
      required: ['answer', 'distractors'],
      additionalProperties: false,
    },
  },
  explanation: STRING,
}

/** Confirms the passage has exactly the markers {{1}}..{{count}}, each once. */
function requireMarkers(passage: string, count: number): void {
  const found = [...passage.matchAll(/\{\{(\d+)\}\}/g)].map((match) => Number(match[1]))
  const expected = Array.from({ length: count }, (_, i) => i + 1)
  if (found.length !== count || found.some((value, i) => value !== expected[i])) {
    throw new GenerationError(`Passage markers [${found.join(', ')}] do not match ${count} blanks in order.`)
  }
}

function fillPassage(passage: string, answers: string[]): string {
  return passage.replace(/\{\{(\d+)\}\}/g, (_, index: string) => answers[Number(index) - 1] ?? '')
}

const blankSchema = base.extend({
  passage: z.string().min(1),
  blanks: z.array(z.object({ answer: z.string().min(1), distractors: z.array(z.string().min(1)) })).min(3).max(6),
  explanation: z.string().min(1),
})

function assembleDropdownBlanks(raw: z.infer<typeof blankSchema>, random: () => number): QuestionDraft {
  requireMarkers(raw.passage, raw.blanks.length)
  requireWords('Passage', fillPassage(raw.passage, raw.blanks.map((blank) => blank.answer)), 40, 140)

  const options = raw.blanks.map((blank, i) => {
    const distractors = blank.distractors.filter(
      (word) => normalizeText(word) !== normalizeText(blank.answer),
    )
    if (distractors.length < 3) throw new GenerationError(`Blank ${i + 1} needs 3 distractors.`)
    return { index: i + 1, choices: shuffle([blank.answer, ...distractors.slice(0, 3)], random) }
  })

  return draft({
    title: raw.title,
    tags: raw.tags,
    passage: raw.passage,
    options,
    correctAnswer: {
      blanks: Object.fromEntries(raw.blanks.map((blank, i) => [String(i + 1), blank.answer])),
    },
    explanation: raw.explanation,
  })
}

// --- specs -----------------------------------------------------------------------

const SPECS: Partial<Record<QuestionTypeCode, GenerationSpec>> = {
  READ_ALOUD: spec({
    prefix: 'RA',
    brief: 'Write one academic passage of 45-65 words for the student to read aloud. Vary sentence length and include a few multi-syllable words that test pronunciation.',
    properties: { passage: STRING },
    schema: base.extend({ passage: z.string() }),
    assemble(raw) {
      requireWords('Passage', raw.passage, 40, 70)
      return draft({ title: raw.title, tags: raw.tags, passage: raw.passage })
    },
  }),

  REPEAT_SENTENCE: spec({
    prefix: 'RS',
    brief: 'Write one sentence of 8-16 words that a lecturer or student might say on a university campus.',
    properties: { sentence: STRING },
    schema: base.extend({ sentence: z.string() }),
    assemble(raw) {
      requireWords('Sentence', raw.sentence, 6, 18)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Listen to the sentence and repeat it exactly as you hear it.',
        audioTranscript: raw.sentence,
      })
    },
  }),

  RETELL_LECTURE: spec({
    prefix: 'RL',
    brief: 'Write the transcript of a short lecture of 90-140 words with one clear main idea and two or three supporting points. Then write a model retelling of 60-90 words.',
    properties: { lecture: STRING, sample_answer: STRING },
    schema: base.extend({ lecture: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Lecture', raw.lecture, 80, 160)
      requireWords('Sample answer', raw.sample_answer, 45, 100)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'You will hear a short lecture. Retell it in your own words.',
        audioTranscript: raw.lecture,
        sampleAnswer: raw.sample_answer,
      })
    },
  }),

  ANSWER_SHORT_QUESTION: spec({
    prefix: 'ASQ',
    brief: 'Write one general-knowledge question that has a single unambiguous answer of one to three words.',
    properties: { question: STRING, answer: STRING },
    schema: base.extend({ question: z.string(), answer: z.string() }),
    assemble(raw) {
      requireWords('Question', raw.question, 5, 25)
      requireWords('Answer', raw.answer, 1, 3)
      return draft({
        title: raw.title,
        tags: raw.tags,
        audioTranscript: raw.question,
        correctAnswer: { text: raw.answer },
      })
    },
  }),

  SUMMARIZE_GROUP_DISCUSSION: spec({
    prefix: 'SGD',
    brief: 'Write the transcript of three people discussing one topic, 160-240 words, each line starting "Speaker A:", "Speaker B:" or "Speaker C:". Each speaker holds a distinct view. Then write a model spoken summary of 80-120 words covering every view.',
    properties: { discussion: STRING, sample_answer: STRING },
    schema: base.extend({ discussion: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Discussion', raw.discussion, 140, 260)
      for (const speaker of ['Speaker A:', 'Speaker B:', 'Speaker C:']) {
        if (!raw.discussion.includes(speaker)) throw new GenerationError(`Discussion is missing ${speaker}`)
      }
      requireWords('Sample answer', raw.sample_answer, 60, 130)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'You will hear three people discuss a topic. Summarise the discussion, including each speaker’s view, in your own words.',
        audioTranscript: raw.discussion,
        sampleAnswer: raw.sample_answer,
      })
    },
  }),

  RESPOND_TO_SITUATION: spec({
    prefix: 'RTS',
    brief: 'Write an everyday situation of 40-70 words, addressed to the student as "you", that ends by asking them to say something to a specific person (for example a manager, neighbour or tutor). Then write a model spoken response of 60-100 words.',
    properties: { situation: STRING, sample_answer: STRING },
    schema: base.extend({ situation: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Situation', raw.situation, 30, 80)
      requireWords('Sample answer', raw.sample_answer, 45, 110)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Listen to the situation and respond as you would in real life.',
        audioTranscript: raw.situation,
        sampleAnswer: raw.sample_answer,
      })
    },
  }),

  SUMMARIZE_WRITTEN_TEXT: spec({
    prefix: 'SWT',
    brief: 'Write an academic passage of 200-280 words that develops one argument across several points. Then write a model answer: a single sentence of 40-75 words that captures the main idea and key supporting points.',
    properties: { passage: STRING, sample_answer: STRING },
    schema: base.extend({ passage: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Passage', raw.passage, 180, 300)
      requireWords('Sample answer', raw.sample_answer, 5, 75)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Read the passage below and summarise it using one sentence of between 5 and 75 words. You have 10 minutes.',
        passage: raw.passage,
        sampleAnswer: raw.sample_answer,
        wordLimitMin: 5,
        wordLimitMax: 75,
      })
    },
  }),

  ESSAY: spec({
    prefix: 'WE',
    brief: 'Write an essay topic of one or two sentences on a debatable issue, followed by the instruction the student must follow (for example "Discuss both views and give your own opinion." or "To what extent do you agree or disagree?"). Do not include the word count or time. Then write a model essay of 220-290 words.',
    properties: { topic: STRING, sample_answer: STRING },
    schema: base.extend({ topic: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Topic', raw.topic, 12, 70)
      requireWords('Sample essay', raw.sample_answer, 200, 300)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: `${raw.topic.trim()} Write 200–300 words in 20 minutes.`,
        sampleAnswer: raw.sample_answer,
        wordLimitMin: 200,
        wordLimitMax: 300,
      })
    },
  }),

  WRITE_EMAIL: spec({
    prefix: 'WEM',
    brief: 'Write an email task: a situation of 30-60 words saying who the student is writing to and why, followed by exactly three bullet points (each on its own line starting "- ") they must address. Then write a model email of 80-115 words with a greeting and sign-off.',
    properties: { task: STRING, sample_answer: STRING },
    schema: base.extend({ task: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      const bullets = raw.task.split('\n').filter((line) => line.trim().startsWith('- '))
      if (bullets.length !== 3) throw new GenerationError(`Email task has ${bullets.length} bullet points; expected 3.`)
      requireWords('Sample email', raw.sample_answer, 50, 120)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: `${raw.task.trim()}\n\nWrite an email of 50–120 words. You have 9 minutes.`,
        sampleAnswer: raw.sample_answer,
        wordLimitMin: 50,
        wordLimitMax: 120,
      })
    },
  }),

  READING_MCQ_SINGLE: spec({
    prefix: 'RMCQ',
    brief: 'Write an academic passage of 150-250 words, a question about it, and exactly 4 options of which exactly one is correct. Distractors should be plausible but contradicted by, or absent from, the passage.',
    properties: { passage: STRING, question: STRING, ...choiceProperties },
    schema: base.extend({ passage: z.string(), question: z.string().min(1), options: choiceSchema, explanation: z.string().min(1) }),
    assemble(raw, random) {
      requireWords('Passage', raw.passage, 130, 280)
      if (raw.options.length !== 4) throw new GenerationError('Expected exactly 4 options.')
      const choices = assembleChoices(raw.options, { min: 1, max: 1 }, random)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: raw.question,
        passage: raw.passage,
        options: choices.options,
        correctAnswer: { optionId: choices.correctIds[0] },
        explanation: raw.explanation,
      })
    },
  }),

  READING_MCQ_MULTIPLE: spec({
    prefix: 'RMCM',
    brief: 'Write an academic passage of 180-280 words, a question ending "Choose all that apply.", and 5 options of which 2 or 3 are correct.',
    properties: { passage: STRING, question: STRING, ...choiceProperties },
    schema: base.extend({ passage: z.string(), question: z.string().min(1), options: choiceSchema, explanation: z.string().min(1) }),
    assemble(raw, random) {
      requireWords('Passage', raw.passage, 150, 300)
      if (raw.options.length < 5 || raw.options.length > 6) throw new GenerationError('Expected 5 or 6 options.')
      const choices = assembleChoices(raw.options, { min: 2, max: 3 }, random)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: raw.question,
        passage: raw.passage,
        options: choices.options,
        correctAnswer: { optionIds: choices.correctIds },
        explanation: raw.explanation,
      })
    },
  }),

  REORDER_PARAGRAPHS: spec({
    prefix: 'RO',
    brief: 'Write 4 or 5 short text boxes (one or two sentences each) that form a coherent passage only in one order. Use connectives, pronoun references and chronology so the order can be deduced. List them in the correct order.',
    properties: {
      paragraphs_in_order: { type: 'array', items: STRING },
      explanation: STRING,
    },
    schema: base.extend({ paragraphs_in_order: z.array(z.string().min(1)).min(4).max(5), explanation: z.string().min(1) }),
    assemble(raw, random) {
      // IDs follow display order, so the answer key cannot be read off the IDs.
      const displayed = shuffle(raw.paragraphs_in_order.map((text, position) => ({ text, position })), random)
        .map((item, index) => ({ ...item, id: `p${index + 1}` }))
      const order = [...displayed].sort((a, b) => a.position - b.position).map((item) => item.id)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'The text boxes below are in random order. Restore the original order.',
        options: displayed.map(({ id, text }) => ({ id, text })),
        correctAnswer: { order },
        explanation: raw.explanation,
      })
    },
  }),

  READING_FILL_BLANKS: spec({
    prefix: 'RFIB',
    brief: 'Write an academic passage of 60-110 words with 3-5 gaps. For each gap give the correct word and 3 distractors of the same part of speech that do not fit the meaning.',
    properties: blankProperties,
    schema: blankSchema,
    assemble(raw, random) {
      return { ...assembleDropdownBlanks(raw, random), prompt: 'Select the appropriate word for each blank.' }
    },
  }),

  READING_WRITING_FILL_BLANKS: spec({
    prefix: 'RWFIB',
    brief: 'Write an academic passage of 70-120 words with 4-5 gaps. For each gap give the correct word and 3 distractors that test grammar or collocation: other forms of the same word family, or near-synonyms that do not collocate.',
    properties: blankProperties,
    schema: blankSchema,
    assemble(raw, random) {
      return { ...assembleDropdownBlanks(raw, random), prompt: 'Choose the word that fits each blank in both meaning and grammar.' }
    },
  }),

  SUMMARIZE_SPOKEN_TEXT: spec({
    prefix: 'SST',
    brief: 'Write the transcript of a lecture of 180-260 words with a main argument and supporting points. Then write a model written summary of 50-70 words.',
    properties: { lecture: STRING, sample_answer: STRING },
    schema: base.extend({ lecture: z.string(), sample_answer: z.string() }),
    assemble(raw) {
      requireWords('Lecture', raw.lecture, 160, 280)
      requireWords('Sample answer', raw.sample_answer, 50, 70)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'You will hear a short lecture. Write a summary of 50–70 words. You have 10 minutes.',
        audioTranscript: raw.lecture,
        sampleAnswer: raw.sample_answer,
        wordLimitMin: 50,
        wordLimitMax: 70,
      })
    },
  }),

  LISTENING_MCQ_SINGLE: spec({
    prefix: 'LMCQ',
    brief: 'Write the transcript of a talk of 120-200 words, a question about it, and exactly 4 options of which exactly one is correct.',
    properties: { transcript: STRING, question: STRING, ...choiceProperties },
    schema: base.extend({ transcript: z.string(), question: z.string().min(1), options: choiceSchema, explanation: z.string().min(1) }),
    assemble(raw, random) {
      requireWords('Transcript', raw.transcript, 100, 220)
      if (raw.options.length !== 4) throw new GenerationError('Expected exactly 4 options.')
      const choices = assembleChoices(raw.options, { min: 1, max: 1 }, random)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: `Listen to the recording and answer the question. ${raw.question.trim()}`,
        audioTranscript: raw.transcript,
        options: choices.options,
        correctAnswer: { optionId: choices.correctIds[0] },
        explanation: raw.explanation,
      })
    },
  }),

  LISTENING_MCQ_MULTIPLE: spec({
    prefix: 'LMCM',
    brief: 'Write the transcript of a talk of 150-230 words, a question ending "Choose all that apply.", and 5 options of which 2 or 3 are correct.',
    properties: { transcript: STRING, question: STRING, ...choiceProperties },
    schema: base.extend({ transcript: z.string(), question: z.string().min(1), options: choiceSchema, explanation: z.string().min(1) }),
    assemble(raw, random) {
      requireWords('Transcript', raw.transcript, 130, 250)
      if (raw.options.length < 5 || raw.options.length > 6) throw new GenerationError('Expected 5 or 6 options.')
      const choices = assembleChoices(raw.options, { min: 2, max: 3 }, random)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: `Listen to the recording. ${raw.question.trim()}`,
        audioTranscript: raw.transcript,
        options: choices.options,
        correctAnswer: { optionIds: choices.correctIds },
        explanation: raw.explanation,
      })
    },
  }),

  LISTENING_FILL_BLANKS: spec({
    prefix: 'LFIB',
    brief: 'Write the transcript of a talk of 60-110 words with 3-5 gaps, each replacing one content word the student must type after hearing it. Give the missing words in order.',
    properties: {
      passage: { type: 'string', description: 'The transcript with each gap written as {{1}}, {{2}} … in order.' },
      answers: { type: 'array', items: STRING },
    },
    schema: base.extend({ passage: z.string().min(1), answers: z.array(z.string().min(1)).min(3).max(5) }),
    assemble(raw) {
      requireMarkers(raw.passage, raw.answers.length)
      if (raw.answers.some((answer) => wordCount(answer) !== 1)) {
        throw new GenerationError('Each listening blank must be a single word.')
      }
      const transcript = fillPassage(raw.passage, raw.answers)
      requireWords('Transcript', transcript, 50, 120)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Type the missing word you hear into each blank.',
        passage: raw.passage,
        audioTranscript: transcript,
        correctAnswer: { blanks: Object.fromEntries(raw.answers.map((answer, i) => [String(i + 1), answer])) },
      })
    },
  }),

  HIGHLIGHT_CORRECT_SUMMARY: spec({
    prefix: 'HCS',
    brief: 'Write the transcript of a talk of 120-200 words and 4 summary paragraphs of 35-60 words each. Exactly one summary is accurate; each of the others misstates the main point or includes a detail the speaker did not say.',
    properties: { transcript: STRING, ...choiceProperties },
    schema: base.extend({ transcript: z.string(), options: choiceSchema, explanation: z.string().min(1) }),
    assemble(raw, random) {
      requireWords('Transcript', raw.transcript, 100, 220)
      if (raw.options.length !== 4) throw new GenerationError('Expected exactly 4 summaries.')
      const choices = assembleChoices(raw.options, { min: 1, max: 1 }, random)
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Listen to the recording and select the paragraph that best summarises it.',
        audioTranscript: raw.transcript,
        options: choices.options,
        correctAnswer: { optionId: choices.correctIds[0] },
        explanation: raw.explanation,
      })
    },
  }),

  SELECT_MISSING_WORD: spec({
    prefix: 'SMW',
    brief: 'Write the transcript of a talk of 60-120 words whose final one to four words can be predicted from the context. Give that ending separately, plus 3 plausible but wrong alternative endings.',
    properties: {
      transcript: { type: 'string', description: 'The complete transcript, including the ending.' },
      missing_ending: STRING,
      distractors: { type: 'array', items: STRING },
      explanation: STRING,
    },
    schema: base.extend({
      transcript: z.string(),
      missing_ending: z.string().min(1),
      distractors: z.array(z.string().min(1)).length(3),
      explanation: z.string().min(1),
    }),
    assemble(raw, random) {
      const words = tokenizeWords(raw.transcript)
      const endingLength = tokenizeWords(raw.missing_ending).length
      if (endingLength < 1 || endingLength > 4) throw new GenerationError('The missing ending must be 1-4 words.')
      const tail = words.slice(-endingLength).join(' ')
      if (normalizeText(tail) !== normalizeText(raw.missing_ending)) {
        throw new GenerationError('The transcript does not end with the missing ending.')
      }
      requireWords('Transcript', raw.transcript, 50, 130)
      const choices = assembleChoices(
        [
          { text: raw.missing_ending.replace(/[.!?]+$/, ''), correct: true },
          ...raw.distractors.map((text) => ({ text, correct: false })),
        ],
        { min: 1, max: 1 },
        random,
      )
      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Listen to the recording. The last word or group of words has been replaced by a beep. Select the option that best completes the recording.',
        // The bleep is part of the recording; the marker tells whoever records it where it goes.
        audioTranscript: `${words.slice(0, -endingLength).join(' ')} [beep]`,
        options: choices.options,
        correctAnswer: { optionId: choices.correctIds[0] },
        explanation: raw.explanation,
      })
    },
  }),

  HIGHLIGHT_INCORRECT_WORDS: spec({
    prefix: 'HIW',
    brief: 'Write the transcript of a talk of 60-100 words. Then write the displayed text: the same transcript with 3-5 single words replaced by different but plausible words. Keep every other word, and all punctuation, identical so the two texts have the same number of words.',
    properties: { transcript: STRING, displayed_text: STRING },
    schema: base.extend({ transcript: z.string(), displayed_text: z.string() }),
    assemble(raw) {
      const heard = tokenizeWords(raw.transcript)
      const shown = tokenizeWords(raw.displayed_text)
      if (heard.length !== shown.length) {
        throw new GenerationError(`Displayed text has ${shown.length} words but the transcript has ${heard.length}.`)
      }
      requireWords('Transcript', raw.transcript, 50, 110)

      const differences = shown
        .map((word, index) => ({ index, shown: normalizeText(word), heard: normalizeText(heard[index]!) }))
        .filter((pair) => pair.shown !== pair.heard)
      if (differences.length < 3 || differences.length > 5) {
        throw new GenerationError(`Expected 3-5 substituted words, found ${differences.length}.`)
      }

      return draft({
        title: raw.title,
        tags: raw.tags,
        prompt: 'Click the words in the transcript that differ from what you hear.',
        passage: raw.displayed_text,
        audioTranscript: raw.transcript,
        correctAnswer: { wordIndexes: differences.map((pair) => pair.index) },
        explanation: `The recording says ${differences
          .map((pair) => `"${pair.heard}" not "${pair.shown}"`)
          .join(', ')}.`,
      })
    },
  }),

  WRITE_FROM_DICTATION: spec({
    prefix: 'WFD',
    brief: 'Write one sentence of 8-14 words on an academic or campus topic, with no names, numbers or abbreviations.',
    properties: { sentence: STRING },
    schema: base.extend({ sentence: z.string() }),
    assemble(raw) {
      requireWords('Sentence', raw.sentence, 7, 15)
      return draft({
        title: raw.title,
        tags: raw.tags,
        audioTranscript: raw.sentence,
        correctAnswer: { text: raw.sentence },
      })
    },
  }),
}

/**
 * Describe Image is the one task left out: it needs a chart or picture, and a
 * text model cannot produce the image the student looks at.
 */
export const GENERATABLE_TYPES = Object.keys(SPECS) as QuestionTypeCode[]

export function generationSpec(code: string): GenerationSpec | undefined {
  return SPECS[code as QuestionTypeCode]
}

export interface GenerationRequest {
  typeCode: QuestionTypeCode
  difficulty: GenerationDifficulty
  topic?: string
  /** Titles already in the bank, so Claude picks a different subject. */
  avoidTitles: string[]
}

export function generationPrompt(request: GenerationRequest): string {
  const type = questionType(request.typeCode)
  const definition = generationSpec(request.typeCode)
  if (!type || !definition) throw new GenerationError(`No generator for ${request.typeCode}.`)

  const avoid = request.avoidTitles.slice(-80)
  return [
    `Task type: ${type.name} (${type.shortName}). ${type.description}`,
    `Difficulty: ${request.difficulty}. ${DIFFICULTY_GUIDANCE[request.difficulty]}`,
    request.topic ? `Topic: ${request.topic}` : 'Choose a subject area yourself.',
    avoid.length > 0
      ? `These subjects already exist in the bank. Choose a clearly different one:\n${avoid.map((title) => `- ${title}`).join('\n')}`
      : '',
    `What to write: ${definition.brief}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}
