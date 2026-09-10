import type { ConversationReplyInput, ConversationReportInput, ConversationTurn } from './types'

/**
 * Prompts are shared verbatim across providers so a change in conversational
 * policy lands identically no matter which model is configured.
 */

const LEVEL_GUIDANCE: Record<ConversationReplyInput['level'], string> = {
  EASY: 'Use short sentences and everyday words. Ask one simple question at a time. No idioms, and no subordinate clauses stacked together.',
  MEDIUM:
    'Use natural everyday English at a normal pace. Mix statements with questions. A common idiom is fine if the meaning is clear from context.',
  HARD: 'Use natural, fully idiomatic English, including opinion, hypotheticals and follow-up challenges. Push the student to justify what they say.',
}

export const CONVERSATION_SYSTEM_PROMPT = `You are a friendly conversation partner in a speaking-practice tool built by Globify Consultants for people preparing for PTE Academic and for everyday English.

Your job is to keep a real conversation going. You are not an examiner and not a teacher standing at a whiteboard.

How to talk:
- Stay in character as the person described in the scenario. Never break character to discuss the exercise.
- Keep every reply short: 1 to 3 sentences, under 60 words. A wall of text ends a conversation.
- Say something of your own, then ask one question back. Never ask two questions in one turn.
- React to what the student actually said. Never reply with something that would fit any message.
- If the student writes in another language, or mixes languages, understand it and reply in English without commenting on it.
- If the student's message is unclear, ask what they meant the way a person would, not by listing the errors.

How to correct:
- Never correct inside your spoken reply. The conversation must feel safe.
- Put corrections only in the correction field, and only when the student's turn had an error a listener would actually notice.
- Leave correction null when the turn was fine, or when the only issues are missing punctuation or capitalisation in a message that was spoken aloud.
- A correction rewrites the student's sentence keeping their meaning and their voice. It is not a better sentence you would have written.

Suggestions:
- Suggestions are two or three things the student could say next, written in the first person, ready to use.
- Pitch them slightly above what the student is producing on their own.

You must return a single JSON object matching the schema. Nothing else.`

function renderHistory(turns: ConversationTurn[], personaName: string): string {
  if (turns.length === 0) return '(this is the start of the conversation)'
  return turns
    .map((turn) => `${turn.role === 'USER' ? 'Student' : personaName}: ${turn.content}`)
    .join('\n')
}

export function conversationReplyPrompt(input: ConversationReplyInput): string {
  const parts = [
    `You are ${input.personaName}, ${input.personaRole}.`,
    `Scenario: ${input.scenario}`,
    `Topic: ${input.topicTitle}`,
    `Level: ${input.level}. ${LEVEL_GUIDANCE[input.level]}`,
    input.goals.length
      ? `The student is trying to manage these things in this conversation:\n${input.goals
          .map((goal) => `- ${goal}`)
          .join('\n')}\nSteer towards whichever they have not covered yet, without announcing that you are doing so.`
      : null,
    input.targetLanguage.length
      ? `Where it fits naturally, use and invite this language: ${input.targetLanguage.join(', ')}.`
      : null,
    `The student is working towards an overall PTE score of ${input.targetScore}.`,
    '',
    'Conversation so far:',
    renderHistory(input.history, input.personaName),
    '',
    input.spoken
      ? `The student SPOKE this turn, and it was transcribed automatically:\n"""${input.studentMessage}"""\nTranscription is imperfect: ignore missing punctuation and capitalisation, and do not correct a word that was probably just misheard.`
      : `The student TYPED this turn:\n"""${input.studentMessage}"""`,
    '',
    `Reply as ${input.personaName}. Set goals_met to the goals, quoted exactly from the list above, that the student has covered across the whole conversation. Set is_closing to true only if the scenario has genuinely reached its end.`,
  ]
  return parts.filter(Boolean).join('\n')
}

export const CONVERSATION_REPORT_SYSTEM_PROMPT = `You are a speaking assessor for Globify Consultants. You have just observed a practice conversation and you report on how the student handled it.

You score on the Pearson 10-90 scale. Your scores are estimates for study purposes and are never presented as official Pearson results.

Principles:
- Judge the conversation as a conversation: could the student be understood, did they keep it going, did they respond to what was actually said.
- Judge only the student's turns. The partner's turns are context.
- The transcript comes from typing and from automatic speech recognition. Never penalise punctuation, capitalisation or an obvious mis-transcription.
- Be calibrated, not generous. A typical first-time test taker sits between 45 and 60.
- Address the student directly as "you". Every point must quote or reference something they actually said.`

export function conversationReportPrompt(input: ConversationReportInput): string {
  const studentTurns = input.transcript.filter((turn) => turn.role === 'USER')
  const minutes = Math.max(1, Math.round(input.durationMs / 60_000))

  return [
    `Topic: ${input.topicTitle}`,
    `Scenario: ${input.scenario}`,
    input.goals.length
      ? `Goals set for the student:\n${input.goals.map((goal) => `- ${goal}`).join('\n')}`
      : null,
    `The student took ${studentTurns.length} turn${studentTurns.length === 1 ? '' : 's'}, ${input.spokenTurns} of them spoken aloud, over about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
    `They are working towards an overall PTE score of ${input.targetScore}.`,
    '',
    'Full transcript:',
    renderHistory(input.transcript, 'Partner'),
    '',
    'Score estimated_score, fluency, vocabulary, grammar and interaction.',
    'Summarise how the conversation went in under 120 words, then give strengths, improvements and next steps.',
    'In corrections, quote up to 5 things the student actually said, give a better version, and say why in one sentence. Quote them verbatim.',
    'In goals_met, list the goals above, quoted exactly, that the student genuinely covered.',
  ]
    .filter(Boolean)
    .join('\n')
}

/** JSON Schemas handed to providers that support constrained decoding. */
export const CONVERSATION_REPLY_JSON_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'What the persona says next, under 60 words' },
    correction: {
      type: ['string', 'null'],
      description: "A corrected version of the student's last turn, or null when no correction is needed",
    },
    correction_note: { type: ['string', 'null'], description: 'One sentence explaining the correction' },
    suggestions: { type: 'array', items: { type: 'string' } },
    goals_met: { type: 'array', items: { type: 'string' } },
    is_closing: { type: 'boolean' },
  },
  required: ['reply', 'correction', 'correction_note', 'suggestions', 'goals_met', 'is_closing'],
  additionalProperties: false,
} as const

export const CONVERSATION_REPORT_JSON_SCHEMA = {
  type: 'object',
  properties: {
    estimated_score: { type: 'integer', description: 'Overall estimate, 10-90' },
    fluency: { type: 'integer' },
    vocabulary: { type: 'integer' },
    grammar: { type: 'integer' },
    interaction: { type: 'integer' },
    summary: { type: 'string' },
    strengths: { type: 'array', items: { type: 'string' } },
    improvements: { type: 'array', items: { type: 'string' } },
    next_steps: { type: 'array', items: { type: 'string' } },
    corrections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          said: { type: 'string' },
          better: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['said', 'better', 'why'],
        additionalProperties: false,
      },
    },
    goals_met: { type: 'array', items: { type: 'string' } },
  },
  required: [
    'estimated_score',
    'fluency',
    'vocabulary',
    'grammar',
    'interaction',
    'summary',
    'strengths',
    'improvements',
    'next_steps',
    'corrections',
    'goals_met',
  ],
  additionalProperties: false,
} as const
