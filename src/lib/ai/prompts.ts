import type {
  ProgressAnalysisInput,
  RecommendationInput,
  SpeakingScoreInput,
  WritingScoreInput,
} from './types'

/**
 * Prompts are shared verbatim across providers so a change in scoring policy
 * lands identically no matter which model is configured.
 */

export const SCORING_SYSTEM_PROMPT = `You are an experienced PTE Academic assessor working for Globify Consultants.

You score practice responses on the Pearson 10-90 scale. Your scores are estimates for study purposes and are never presented as official Pearson results.

Scoring principles:
- Judge only what the response actually demonstrates. Do not reward intent.
- A blank, off-topic or unintelligible response scores at the bottom of the scale.
- Weigh each trait independently; a fluent response with weak content does not earn a high content score.
- Be calibrated, not generous. A typical first-time test taker sits between 45 and 60.

Feedback rules:
- Address the student directly as "you".
- Every feedback point must be specific and actionable, and must quote or reference something in their response.
- Never invent errors that are not present in the text or transcript.
- Keep each point to one sentence.`

export function speakingPrompt(input: SpeakingScoreInput): string {
  const parts = [
    `Task type: ${input.questionType}`,
    `Task: ${input.questionTitle}`,
    input.expectedText ? `Text or prompt the student responded to:\n"""${input.expectedText}"""` : null,
    input.imageDescription ? `Image the student described: ${input.imageDescription}` : null,
    `Student's transcribed response:\n"""${input.transcript || '(no speech detected)'}"""`,
    input.audioDurationMs ? `Recording length: ${Math.round(input.audioDurationMs / 1000)} seconds` : null,
    `The student is working towards an overall PTE score of ${input.targetScore}.`,
    '',
    'Score this speaking response on: overall_score, content, pronunciation, fluency, grammar, vocabulary.',
    'Pronunciation and fluency must be inferred from the transcript quality, hesitation markers, repetitions and recording length — say so honestly rather than over-claiming acoustic analysis.',
    'Return 2-4 feedback points, 1-3 strengths, 1-3 improvements, and 1-3 recommended next practice actions.',
  ]
  return parts.filter(Boolean).join('\n')
}

export function writingPrompt(input: WritingScoreInput): string {
  const limits =
    input.wordLimitMin || input.wordLimitMax
      ? `Required length: ${input.wordLimitMin ?? 0}-${input.wordLimitMax ?? '∞'} words.`
      : null

  const parts = [
    `Task type: ${input.questionType}`,
    `Task: ${input.questionTitle}`,
    `Prompt: ${input.prompt}`,
    input.passage ? `Source passage:\n"""${input.passage}"""` : null,
    limits,
    `Student's response:\n"""${input.response || '(no response submitted)'}"""`,
    `The student is working towards an overall PTE score of ${input.targetScore}.`,
    '',
    'Score on: overall_score, content, form, grammar, vocabulary, coherence, development and spelling.',
    'Form must reflect the word-count and structural requirements exactly — a Summarize Written Text answer that is not a single sentence scores 0 for form.',
    'Return 2-4 feedback points, what the student did well, what needs improvement, how to improve, and a suggested rewrite of one weak sentence (not the whole response).',
  ]
  return parts.filter(Boolean).join('\n')
}

export const RECOMMENDATION_SYSTEM_PROMPT = `You are a PTE study planner for Globify Consultants. You turn performance data into a small number of concrete, achievable practice actions. Never suggest more than the student can complete in a week.`

export function recommendationPrompt(input: RecommendationInput): string {
  return [
    `Target score: ${input.targetScore}. Current estimate: ${input.currentScore}.`,
    `Section scores: ${JSON.stringify(input.sectionScores)}`,
    `Weakest enabling skills: ${JSON.stringify(input.weakestSkills)}`,
    `Recent attempts: ${JSON.stringify(input.recentActivity.slice(0, 20))}`,
    '',
    'Produce up to 4 recommendations. Each needs a stable snake_case code, a short title, one or two sentences of body text explaining why it matters for this student, the PTE section it belongs to, and a priority from 0 (low) to 100 (urgent).',
  ].join('\n')
}

export const PROGRESS_SYSTEM_PROMPT = `You are a PTE performance analyst. You summarise a student's trajectory honestly — including when progress has stalled — and you never promise a score outcome.`

export function progressPrompt(input: ProgressAnalysisInput): string {
  return [
    `Target score: ${input.targetScore}. Current estimate: ${input.currentScore}.`,
    `Section scores: ${JSON.stringify(input.sectionScores)}`,
    `Score history: ${JSON.stringify(input.history.slice(-30))}`,
    `Attempts in the last 30 days: ${input.attemptsLast30Days}`,
    '',
    'Summarise the trend in under 120 words, then list strengths, weaknesses and next steps. Include a projected score only if the history supports one.',
  ].join('\n')
}

/** JSON Schemas handed to providers that support constrained decoding. */
export const SPEAKING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'integer', description: 'Overall estimate, 10-90' },
    content: { type: 'integer' },
    pronunciation: { type: 'integer' },
    fluency: { type: 'integer' },
    grammar: { type: 'integer' },
    vocabulary: { type: 'integer' },
    feedback: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    recommendations: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'overall_score',
    'content',
    'pronunciation',
    'fluency',
    'grammar',
    'vocabulary',
    'feedback',
    'strengths',
    'improvements',
    'recommendations',
  ],
  additionalProperties: false,
} as const

export const WRITING_JSON_SCHEMA = {
  type: 'object',
  properties: {
    overall_score: { type: 'integer' },
    content: { type: 'integer' },
    form: { type: 'integer' },
    grammar: { type: 'integer' },
    vocabulary: { type: 'integer' },
    coherence: { type: 'integer' },
    development: { type: 'integer' },
    spelling: { type: 'integer' },
    feedback: { type: 'array', items: { type: 'string' } },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    how_to_improve: { type: 'array', items: { type: 'string' } },
    suggested_rewrite: { type: 'string' },
  },
  required: [
    'overall_score',
    'content',
    'form',
    'grammar',
    'vocabulary',
    'coherence',
    'development',
    'spelling',
    'feedback',
    'strengths',
    'improvements',
    'how_to_improve',
    'suggested_rewrite',
  ],
  additionalProperties: false,
} as const

export const RECOMMENDATION_JSON_SCHEMA = {
  type: 'object',
  properties: {
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          code: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          section: { type: 'string', enum: ['SPEAKING', 'WRITING', 'READING', 'LISTENING'] },
          questionTypeCode: { type: 'string' },
          priority: { type: 'integer' },
        },
        required: ['code', 'title', 'body', 'section', 'questionTypeCode', 'priority'],
        additionalProperties: false,
      },
    },
  },
  required: ['recommendations'],
  additionalProperties: false,
} as const

export const PROGRESS_JSON_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    weaknesses: { type: 'array', items: { type: 'string' } },
    next_steps: { type: 'array', items: { type: 'string' } },
    projected_score: { type: 'integer' },
  },
  required: ['summary', 'strengths', 'weaknesses', 'next_steps', 'projected_score'],
  additionalProperties: false,
} as const
