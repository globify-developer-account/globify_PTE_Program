import { countWords } from '../../../utils'
import { normalizeText } from '../../../pte/scoring'
import type { AiResult } from '../../types'
import type {
  ConversationProvider,
  ConversationReply,
  ConversationReplyInput,
  ConversationReport,
  ConversationReportInput,
} from '../types'

/**
 * Simulated conversation partner used in demo mode and in tests.
 *
 * It is deterministic and rule-driven, not a model. It will not hold a deep
 * conversation, but it does the things that make the feature testable without
 * credentials: it reacts to whether the student asked a question, it steers
 * towards the goals that are still outstanding, it catches the handful of
 * errors a rule can actually catch, and it never claims to be more than it is.
 *
 * Every surface that renders these results labels them as simulated.
 */

const FILLERS = /\b(um+|uh+|er+|ah+|like|you know|i mean|actually|basically)\b/gi

function noResult<T>(data: T, latencyMs = 60): AiResult<T> {
  return {
    data,
    usage: { promptTokens: 0, completionTokens: 0, costMicros: 0 },
    provider: 'demo',
    model: 'globify-simulated-v1',
    latencyMs,
  }
}

function clampScore(value: number): number {
  return Math.max(10, Math.min(90, Math.round(value)))
}

function lexicalVariety(text: string): number {
  const words = normalizeText(text).split(' ').filter(Boolean)
  if (words.length === 0) return 0
  return new Set(words).size / words.length
}

/** Stable index into a list, so the same conversation state gives the same reply. */
function pick<T>(items: readonly T[], seed: number): T {
  return items[Math.abs(seed) % items.length]!
}

// --- rule-based correction ----------------------------------------------------

interface CorrectionRule {
  pattern: RegExp
  replace: string
  note: string
}

/**
 * Deliberately small. Each rule fires only on a pattern that is wrong in every
 * context, because a false correction in a confidence-building exercise costs
 * far more than a missed one.
 */
const CORRECTION_RULES: CorrectionRule[] = [
  {
    pattern: /\bi am agree\b/gi,
    replace: 'I agree',
    note: '"Agree" is already a verb, so it does not take "am".',
  },
  {
    pattern: /\bi didn't went\b/gi,
    replace: "I didn't go",
    note: 'After "did" or "didn\'t", the verb stays in its base form.',
  },
  {
    pattern: /\bdid you went\b/gi,
    replace: 'did you go',
    note: 'After "did", the verb stays in its base form.',
  },
  {
    pattern: /\bi have went\b/gi,
    replace: 'I have gone',
    note: 'The past participle of "go" is "gone", not "went".',
  },
  {
    pattern: /\bhe don't\b/gi,
    replace: "he doesn't",
    note: '"He", "she" and "it" take "doesn\'t".',
  },
  {
    pattern: /\bshe don't\b/gi,
    replace: "she doesn't",
    note: '"He", "she" and "it" take "doesn\'t".',
  },
  {
    pattern: /\bi am living here since\b/gi,
    replace: 'I have been living here since',
    note: 'With "since", English uses the present perfect, not the present continuous.',
  },
  {
    pattern: /\bmany informations\b/gi,
    replace: 'a lot of information',
    note: '"Information" is uncountable, so it has no plural.',
  },
  {
    pattern: /\badvices\b/gi,
    replace: 'advice',
    note: '"Advice" is uncountable, so it has no plural.',
  },
  {
    pattern: /\bpeoples\b/gi,
    replace: 'people',
    note: '"People" is already plural.',
  },
  {
    pattern: /\bmore better\b/gi,
    replace: 'better',
    note: '"Better" is already comparative, so it does not take "more".',
  },
  {
    pattern: /\bdiscuss about\b/gi,
    replace: 'discuss',
    note: '"Discuss" takes a direct object, with no "about".',
  },
  {
    pattern: /\bexplain me\b/gi,
    replace: 'explain to me',
    note: '"Explain" needs "to" before the person.',
  },
]

function correct(message: string): { correction: string | null; note: string | null } {
  let corrected = message
  const notes: string[] = []

  for (const rule of CORRECTION_RULES) {
    if (rule.pattern.test(corrected)) {
      corrected = corrected.replace(rule.pattern, rule.replace)
      notes.push(rule.note)
    }
    rule.pattern.lastIndex = 0
  }

  if (corrected === message) return { correction: null, note: null }
  return { correction: corrected, note: notes.join(' ') }
}

// --- reply generation ---------------------------------------------------------

const ACKNOWLEDGEMENTS = [
  'That makes sense.',
  'I see what you mean.',
  'Oh, interesting.',
  'That sounds good.',
  'Fair enough.',
] as const

const QUESTION_ANSWERS = [
  'Good question. For me it depends on the day, honestly.',
  'I would say yes, most of the time.',
  'Not really, but I have thought about it.',
  'It varies quite a lot, actually.',
] as const

const NUDGES = [
  'Could you tell me a bit more about that?',
  'What made you choose that?',
  'How long has that been the case?',
  'What do you enjoy most about it?',
  'And how do you feel about that now?',
] as const

const SHORT_ANSWER_NUDGES = [
  'Can you say a little more? I would like to hear the details.',
  'That is a start — what else can you tell me?',
  'Go on, give me the whole story.',
] as const

function goalQuestion(goal: string): string {
  const trimmed = goal.replace(/\.$/, '')
  return `By the way, I would like to hear about this: ${trimmed.charAt(0).toLowerCase()}${trimmed.slice(1)}?`
}

export const demoConversationProvider: ConversationProvider = {
  name: 'demo',
  available: true,

  async reply(input: ConversationReplyInput): Promise<AiResult<ConversationReply>> {
    const message = input.studentMessage.trim()
    const words = countWords(message)
    const turnNumber = input.history.filter((turn) => turn.role === 'USER').length

    if (words === 0) {
      return noResult<ConversationReply>({
        reply: 'Sorry, I did not catch that. Could you say it again?',
        correction: null,
        correction_note: null,
        suggestions: input.targetLanguage.slice(0, 3),
        goals_met: [],
        is_closing: false,
      })
    }

    // Which goals has the student plausibly covered? A goal counts as covered
    // when its content words have shown up in anything they have said.
    const said = normalizeText([...input.history.filter((t) => t.role === 'USER').map((t) => t.content), message].join(' '))
    const saidWords = new Set(said.split(' ').filter((word) => word.length > 3))
    const goalsMet = input.goals.filter((goal) => {
      const keywords = normalizeText(goal)
        .split(' ')
        .filter((word) => word.length > 3)
      if (keywords.length === 0) return false
      const hits = keywords.filter((word) => saidWords.has(word)).length
      return hits / keywords.length >= 0.5
    })

    const outstanding = input.goals.filter((goal) => !goalsMet.includes(goal))
    const askedQuestion = /\?\s*$/.test(message) || /^(what|why|how|when|where|who|do|does|did|are|is|can|could|would|will)\b/i.test(message)

    const segments: string[] = []
    if (askedQuestion) {
      segments.push(pick(QUESTION_ANSWERS, turnNumber))
    } else {
      segments.push(pick(ACKNOWLEDGEMENTS, turnNumber + words))
    }

    if (words < 6) {
      segments.push(pick(SHORT_ANSWER_NUDGES, turnNumber))
    } else if (outstanding.length > 0 && turnNumber >= 1 && turnNumber % 2 === 1) {
      segments.push(goalQuestion(outstanding[0]!))
    } else {
      segments.push(pick(NUDGES, turnNumber + message.length))
    }

    const { correction, note } = correct(message)

    // Close once every goal is covered and the conversation has had room to run.
    const isClosing = outstanding.length === 0 && turnNumber >= 4

    return noResult<ConversationReply>({
      reply: isClosing
        ? `${segments[0]} I think we have covered everything — it was good talking to you.`
        : segments.join(' '),
      correction,
      correction_note: note,
      suggestions: outstanding.length
        ? [`I would say ${outstanding[0]!.replace(/\.$/, '').toLowerCase()}.`, ...input.targetLanguage.slice(0, 2)]
        : input.targetLanguage.slice(0, 3),
      goals_met: goalsMet,
      is_closing: isClosing,
    })
  },

  async report(input: ConversationReportInput): Promise<AiResult<ConversationReport>> {
    const studentTurns = input.transcript.filter((turn) => turn.role === 'USER')
    const text = studentTurns.map((turn) => turn.content).join(' ')
    const words = countWords(text)

    if (studentTurns.length === 0 || words === 0) {
      return noResult<ConversationReport>({
        estimated_score: 10,
        fluency: 10,
        vocabulary: 10,
        grammar: 10,
        interaction: 10,
        summary: 'You did not say anything in this conversation, so there is nothing to report on yet.',
        strengths: [],
        improvements: ['Take at least a few turns so there is something to give you feedback on.'],
        next_steps: ['Start the conversation again and reply to the opening question.'],
        corrections: [],
        goals_met: [],
      })
    }

    const wordsPerTurn = words / studentTurns.length
    const variety = lexicalVariety(text)
    const fillerRate = (text.match(FILLERS) ?? []).length / Math.max(words, 1)
    const questionsAsked = studentTurns.filter((turn) => turn.content.includes('?')).length

    // Length per turn is the strongest signal available without a model: a
    // student who answers in three words is not sustaining a conversation.
    const lengthFit = Math.min(1, wordsPerTurn / 18)
    const turnFit = Math.min(1, studentTurns.length / 8)
    const questionFit = Math.min(1, questionsAsked / Math.max(2, studentTurns.length / 3))

    const fluency = clampScore(34 + lengthFit * 38 - fillerRate * 90)
    const vocabulary = clampScore(32 + variety * 52 + lengthFit * 10)
    const grammarPenalty = studentTurns.reduce(
      (total, turn) => total + (correct(turn.content).correction ? 1 : 0),
      0,
    )
    const grammar = clampScore(64 - (grammarPenalty / studentTurns.length) * 45)
    const interaction = clampScore(30 + turnFit * 34 + questionFit * 22)
    const estimated = clampScore((fluency + vocabulary + grammar + interaction) / 4)

    const corrections = studentTurns
      .map((turn) => {
        const { correction, note } = correct(turn.content)
        return correction ? { said: turn.content.slice(0, 400), better: correction.slice(0, 400), why: note ?? '' } : null
      })
      .filter((entry): entry is { said: string; better: string; why: string } => entry !== null)
      .slice(0, 5)

    const goalsMet = input.goals.filter((goal) => {
      const keywords = normalizeText(goal)
        .split(' ')
        .filter((word) => word.length > 3)
      if (keywords.length === 0) return false
      const saidWords = new Set(normalizeText(text).split(' '))
      return keywords.filter((word) => saidWords.has(word)).length / keywords.length >= 0.5
    })

    const strengths: string[] = []
    if (studentTurns.length >= 6) strengths.push(`You kept the conversation going for ${studentTurns.length} turns without dropping out.`)
    if (wordsPerTurn >= 15) strengths.push(`Your turns averaged ${Math.round(wordsPerTurn)} words, which is enough to actually develop an idea.`)
    if (questionsAsked > 0) strengths.push(`You asked ${questionsAsked} question${questionsAsked === 1 ? '' : 's'} back, which is what keeps a real conversation alive.`)
    if (variety > 0.6) strengths.push('You avoided repeating the same words, which reads as a wider active vocabulary.')

    const improvements: string[] = []
    if (wordsPerTurn < 12) improvements.push(`Your turns averaged only ${Math.round(wordsPerTurn)} words — add a reason or an example to each answer.`)
    if (questionsAsked === 0) improvements.push('You never asked a question back, so your partner carried the whole conversation.')
    if (fillerRate > 0.04) improvements.push('Fillers such as "like" and "you know" are frequent enough to be noticeable.')
    if (grammarPenalty > 0) improvements.push(`${grammarPenalty} of your turns had a grammar slip worth reviewing below.`)
    if (improvements.length === 0) improvements.push('Push into longer, more complex sentences — this conversation stayed comfortable for you.')

    return noResult<ConversationReport>({
      estimated_score: estimated,
      fluency,
      vocabulary,
      grammar,
      interaction,
      summary: `You took ${studentTurns.length} turn${studentTurns.length === 1 ? '' : 's'} in "${input.topicTitle}", averaging ${Math.round(wordsPerTurn)} words each, with ${input.spokenTurns} spoken aloud. ${
        goalsMet.length === input.goals.length && input.goals.length > 0
          ? 'You covered every goal set for this scenario.'
          : `You covered ${goalsMet.length} of ${input.goals.length} goals for this scenario.`
      } These numbers come from the built-in simulated scorer, which measures length, variety and turn-taking rather than meaning.`,
      strengths,
      improvements,
      next_steps: [
        'Run this scenario again and aim for one more sentence in every answer.',
        studentTurns.length < 8
          ? 'Stay in the conversation for at least eight turns next time.'
          : 'Try the same topic at a harder level.',
      ],
      corrections,
      goals_met: goalsMet,
    })
  },
}
