import type { IeltsSpeakingScoreInput, IeltsWritingScoreInput } from './types'

/**
 * IELTS scoring prompts.
 *
 * These live beside prompts.ts rather than inside it because the IELTS
 * assessment policy is genuinely a different policy, not a parameterised
 * version of the PTE one: the PTE system prompt states the Pearson 10-90 scale
 * in its second line and calibrates against a typical Pearson candidate.
 * Sharing it would quietly drag IELTS bands toward a scale that does not exist.
 *
 * As with prompts.ts, these strings are shared verbatim across providers so a
 * change in assessment policy lands identically whichever model is configured.
 */

export const IELTS_SCORING_SYSTEM_PROMPT = `You are an experienced IELTS examiner working for Globify Consultants.

You assess responses against the public IELTS band descriptors and report whole or half bands from 0 to 9. Your bands are estimates for study purposes and are never presented as official IELTS results.

Assessment principles:
- Apply the band descriptors as written. Award a band only when the response meets that band's descriptor for that criterion.
- Assess each criterion independently. A fluent answer with thin content does not earn a high Task Response or Lexical Resource band.
- Judge only what the response demonstrates. Do not reward intent, and do not assume knowledge the student did not show.
- A blank, off-topic, memorised or unintelligible response sits at the bottom of the scale.
- Be calibrated, not generous. Most test takers preparing for university entry sit between band 5.5 and 7.

Feedback rules:
- Address the student directly as "you".
- Every point must be specific and actionable, and must quote or reference something they actually wrote or said.
- Name the criterion a point belongs to, so the student can connect the feedback to the band.
- Never invent errors that are not present in the text or transcript.
- Keep each point to one sentence.`

export function ieltsWritingPrompt(input: IeltsWritingScoreInput): string {
  const taskCriterion = input.taskNumber === 2 ? 'Task Response' : 'Task Achievement'
  const variantLabel =
    input.variant === 'GENERAL_TRAINING'
      ? 'General Training'
      : input.variant === 'ACADEMIC'
        ? 'Academic'
        : null

  const parts = [
    `Exam: IELTS${variantLabel ? ` ${variantLabel}` : ''}, Writing Task ${input.taskNumber}`,
    `Task: ${input.questionTitle}`,
    `Prompt shown to the student:\n"""${input.prompt}"""`,
    input.figureDescription ? `The figure the student was asked to describe: ${input.figureDescription}` : null,
    input.wordLimitMin ? `The task requires at least ${input.wordLimitMin} words.` : null,
    `Student's response:\n"""${input.response || '(no response submitted)'}"""`,
    `The student is working towards an overall band of ${input.targetBand}.`,
    '',
    `Assess this response on the four IELTS Writing criteria: ${taskCriterion} (report it as "task"), Coherence and Cohesion, Lexical Resource, and Grammatical Range and Accuracy.`,
    'Report each criterion as a whole or half band from 0 to 9, and report overall_band as the average of the four criteria rounded to the nearest half band.',
    input.wordLimitMin
      ? `Count the words and set meets_word_count. An under-length response cannot score above band 5 for ${taskCriterion}, and the shortfall must be named in the feedback.`
      : null,
    input.taskNumber === 1 && input.variant === 'GENERAL_TRAINING'
      ? 'Judge the register against what the prompt asks for — a letter written in the wrong register is a Task Achievement failure, not a Lexical Resource one.'
      : null,
    input.taskNumber === 1 && input.variant === 'ACADEMIC'
      ? 'An Academic Task 1 answer must select and compare the significant features rather than listing every data point, and must not explain causes the figure does not show.'
      : null,
    input.taskNumber === 2
      ? 'A Task 2 answer must address every part of the question and hold a clear position throughout; a partially addressed question caps Task Response at band 5.'
      : null,
    'Return 2-4 feedback points, 1-3 strengths, 1-3 improvements, 1-3 concrete things to practise, and a suggested rewrite of one weak sentence (not the whole response).',
  ]
  return parts.filter(Boolean).join('\n')
}

export function ieltsSpeakingPrompt(input: IeltsSpeakingScoreInput): string {
  const partLabel =
    input.partNumber === 2
      ? 'Part 2 (the cue card long turn)'
      : input.partNumber === 1
        ? 'Part 1 (introduction and interview)'
        : 'Part 3 (two-way discussion)'

  const parts = [
    `Exam: IELTS Speaking, ${partLabel}`,
    `Task: ${input.questionTitle}`,
    `What the student was asked:\n"""${input.prompt}"""`,
    `Transcript of the student's response:\n"""${input.transcript || '(no speech detected)'}"""`,
    input.audioDurationMs ? `Recording length: ${Math.round(input.audioDurationMs / 1000)} seconds` : null,
    `The student is working towards an overall band of ${input.targetBand}.`,
    '',
    'Assess this response on the four IELTS Speaking criteria: Fluency and Coherence, Lexical Resource, Grammatical Range and Accuracy, and Pronunciation.',
    'Report each criterion as a whole or half band from 0 to 9, and report overall_band as the average of the four criteria rounded to the nearest half band.',
    'Pronunciation must be inferred from the transcript — hesitation markers, repetitions, false starts and recording length. Say plainly that this is an inference rather than claiming acoustic analysis you cannot perform.',
    input.partNumber === 2
      ? 'A Part 2 answer should run for one to two minutes and cover every bullet on the card. A turn that stops well short of a minute limits Fluency and Coherence.'
      : null,
    input.partNumber === 3
      ? 'Part 3 rewards extended, speculative and abstract answers. Short factual replies limit both Fluency and Coherence and Lexical Resource.'
      : null,
    'Return 2-4 feedback points, 1-3 strengths, 1-3 improvements, and 1-3 recommended next practice actions.',
  ]
  return parts.filter(Boolean).join('\n')
}

export const IELTS_WRITING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_band: { type: 'number', description: 'Whole or half band, 0-9' },
    task: { type: 'number', description: 'Task Achievement (Task 1) or Task Response (Task 2)' },
    coherence_cohesion: { type: 'number' },
    lexical_resource: { type: 'number' },
    grammatical_range_accuracy: { type: 'number' },
    meets_word_count: { type: 'boolean' },
    word_count: { type: 'integer' },
    feedback: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    how_to_improve: { type: 'array', items: { type: 'string' } },
    suggested_rewrite: { type: 'string' },
  },
  required: [
    'overall_band',
    'task',
    'coherence_cohesion',
    'lexical_resource',
    'grammatical_range_accuracy',
    'meets_word_count',
    'word_count',
    'feedback',
    'strengths',
    'improvements',
    'how_to_improve',
    'suggested_rewrite',
  ],
  additionalProperties: false,
} as const

export const IELTS_SPEAKING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_band: { type: 'number', description: 'Whole or half band, 0-9' },
    fluency_coherence: { type: 'number' },
    lexical_resource: { type: 'number' },
    grammatical_range_accuracy: { type: 'number' },
    pronunciation: { type: 'number' },
    feedback: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'overall_band',
    'fluency_coherence',
    'lexical_resource',
    'grammatical_range_accuracy',
    'pronunciation',
    'feedback',
    'strengths',
    'improvements',
    'recommendations',
  ],
  additionalProperties: false,
} as const
