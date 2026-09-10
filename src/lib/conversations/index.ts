import 'server-only'
import type { ChatRole, Conversation, ConversationMessage, ConversationTopic, Difficulty } from '@prisma/client'
import { prisma } from '../db'
import { badRequest, conflict, forbidden, notFound } from '../http'
import { assertPremiumContent, assertQuota, consumeQuota, type Entitlements } from '../access'
import { isSimulated } from '../ai'
import { runConversationAi, type ConversationTurn } from '../ai/conversation'

/**
 * Conversation service.
 *
 * The API routes stay thin: everything that decides what a student is allowed
 * to do, what the model is shown, and what gets written, lives here.
 */

/**
 * How many of the student's turns one conversation may run to.
 *
 * The monthly allowance is counted in conversations, not turns, so without a
 * ceiling a single conversation could run indefinitely on one unit of quota.
 * Thirty turns is far longer than any scenario needs.
 */
export const MAX_USER_TURNS = 30

/**
 * How many prior messages are sent to the model. Long enough that the partner
 * remembers the conversation, short enough that a long session does not grow
 * the prompt — and the bill — without bound.
 */
export const HISTORY_MESSAGES = 16

/** A conversation needs some substance before a report means anything. */
export const MIN_TURNS_FOR_REPORT = 3

export type ConversationWithMessages = Conversation & { messages: ConversationMessage[] }

// --- reading ------------------------------------------------------------------

export async function listTopics(entitlements: Entitlements) {
  const topics = await prisma.conversationTopic.findMany({
    where: { status: 'PUBLISHED' },
    orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }],
  })

  // Premium topics stay visible but locked — a student cannot choose to upgrade
  // for something they were never shown.
  return topics.map((topic) => ({
    ...topic,
    locked: topic.isPremium && !entitlements.isPremium,
  }))
}

export async function listConversations(userId: string, limit = 20) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { lastMessageAt: 'desc' },
    take: limit,
    include: {
      topic: { select: { slug: true, emoji: true, category: true } },
      report: { select: { estimatedScore: true } },
    },
  })
}

/** Loads a conversation the caller owns, or throws. */
export async function getConversation(
  userId: string,
  conversationId: string,
): Promise<ConversationWithMessages> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { index: 'asc' } } },
  })
  if (!conversation) throw notFound('That conversation no longer exists.')
  if (conversation.userId !== userId) throw forbidden('That conversation belongs to someone else.')
  return conversation
}

export async function getConversationWithReport(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { index: 'asc' } }, report: true, topic: true },
  })
  if (!conversation) throw notFound('That conversation no longer exists.')
  if (conversation.userId !== userId) throw forbidden('That conversation belongs to someone else.')
  return conversation
}

// --- starting -----------------------------------------------------------------

interface StartFromTopic {
  kind: 'topic'
  topicId: string
}

interface StartCustom {
  kind: 'custom'
  title: string
  scenario: string
  level: Difficulty
}

export type StartInput = StartFromTopic | StartCustom

/**
 * Opens a conversation and writes the partner's first turn.
 *
 * No AI call happens here. A topic carries its own opening line, and a custom
 * scenario gets a composed one, so the chat is on screen immediately and the
 * student's allowance buys turns rather than a greeting.
 */
export async function startConversation(
  userId: string,
  input: StartInput,
  entitlements: Entitlements,
): Promise<ConversationWithMessages> {
  await assertQuota(userId, 'ai_conversation', entitlements)

  let topic: ConversationTopic | null = null
  let title: string
  let scenario: string
  let personaName: string
  let personaRole: string
  let level: Difficulty
  let goals: string[]
  let openingLine: string

  if (input.kind === 'topic') {
    topic = await prisma.conversationTopic.findUnique({ where: { id: input.topicId } })
    if (!topic || topic.status !== 'PUBLISHED') throw notFound('That conversation topic is not available.')
    if (topic.isPremium) await assertPremiumContent(entitlements, `"${topic.title}"`)

    title = topic.title
    scenario = topic.scenario
    personaName = topic.personaName
    personaRole = topic.personaRole
    level = topic.level
    goals = topic.goals
    openingLine = topic.openingLine
  } else {
    // A custom scenario has no author behind it, so the persona is generic and
    // the goals are left empty rather than invented.
    title = input.title
    scenario = input.scenario
    personaName = 'Alex'
    personaRole = 'a friendly conversation partner'
    level = input.level
    goals = []
    openingLine = `Sure, let's talk about ${input.title.toLowerCase()}. To get us started — what would you like to say about it?`
  }

  const conversation = await prisma.conversation.create({
    data: {
      userId,
      topicId: topic?.id ?? null,
      title,
      scenario,
      personaName,
      personaRole,
      level,
      goals,
      isCustom: input.kind === 'custom',
      messageCount: 1,
      messages: {
        create: {
          role: 'ASSISTANT',
          index: 0,
          content: openingLine,
          suggestions: topic?.starterPhrases.slice(0, 3) ?? [],
        },
      },
    },
    include: { messages: { orderBy: { index: 'asc' } } },
  })

  // Charged on the conversation, not the turn — see MAX_USER_TURNS.
  await consumeQuota(userId, 'ai_conversation')

  return conversation
}

// --- turns --------------------------------------------------------------------

export interface TurnInput {
  text: string
  spoken: boolean
  audioKey?: string | null
}

export interface TurnResult {
  studentMessage: ConversationMessage
  partnerMessage: ConversationMessage
  goalsMet: string[]
  isClosing: boolean
  simulated: boolean
  turnsRemaining: number
}

function toTurns(messages: ConversationMessage[]): ConversationTurn[] {
  return messages.map((message) => ({
    role: message.role as 'USER' | 'ASSISTANT',
    content: message.content,
  }))
}

/**
 * Records the student's turn, asks the partner for a reply, and records that.
 *
 * The student's message is written before the AI call, so a provider failure
 * never loses what they said — they can retry the turn and keep the history.
 */
export async function addTurn(
  userId: string,
  conversationId: string,
  input: TurnInput,
  targetScore: number,
): Promise<TurnResult> {
  const text = input.text.trim()
  if (!text) throw badRequest('There is nothing to send.')

  const conversation = await getConversation(userId, conversationId)
  if (conversation.status !== 'ACTIVE') {
    throw conflict('This conversation has already been finished.')
  }
  if (conversation.userTurns >= MAX_USER_TURNS) {
    throw conflict(
      `This conversation has reached its ${MAX_USER_TURNS}-turn limit. Finish it to get your report, then start a new one.`,
    )
  }

  const nextIndex = conversation.messages.length
  const studentMessage = await prisma.conversationMessage.create({
    data: {
      conversationId,
      role: 'USER' as ChatRole,
      index: nextIndex,
      content: text,
      audioKey: input.audioKey ?? null,
      transcribed: input.spoken,
    },
  })

  const topic = conversation.topicId
    ? await prisma.conversationTopic.findUnique({ where: { id: conversation.topicId } })
    : null

  const result = await runConversationAi('CONVERSATION', userId, (provider) =>
    provider.reply({
      personaName: conversation.personaName,
      personaRole: conversation.personaRole,
      scenario: conversation.scenario,
      topicTitle: conversation.title,
      level: conversation.level,
      goals: conversation.goals,
      targetLanguage: topic?.targetLanguage ?? [],
      history: toTurns(conversation.messages).slice(-HISTORY_MESSAGES),
      studentMessage: text,
      spoken: input.spoken,
      targetScore,
    }),
  )

  const reply = result.data
  // A correction is only worth storing when it actually differs from the turn.
  const correction =
    reply.correction && reply.correction.trim() && reply.correction.trim() !== text ? reply.correction.trim() : null

  const [, partnerMessage] = await prisma.$transaction([
    prisma.conversationMessage.update({
      where: { id: studentMessage.id },
      data: { correction, correctionNote: correction ? (reply.correction_note ?? null) : null },
    }),
    prisma.conversationMessage.create({
      data: {
        conversationId,
        role: 'ASSISTANT' as ChatRole,
        index: nextIndex + 1,
        content: reply.reply,
        suggestions: reply.suggestions ?? [],
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: {
        messageCount: nextIndex + 2,
        userTurns: { increment: 1 },
        spokenTurns: input.spoken ? { increment: 1 } : undefined,
        lastMessageAt: new Date(),
      },
    }),
  ])

  return {
    studentMessage: { ...studentMessage, correction, correctionNote: correction ? (reply.correction_note ?? null) : null },
    partnerMessage,
    goalsMet: reply.goals_met ?? [],
    isClosing: reply.is_closing ?? false,
    simulated: isSimulated(result.provider),
    turnsRemaining: MAX_USER_TURNS - (conversation.userTurns + 1),
  }
}

// --- finishing ----------------------------------------------------------------

/**
 * Ends the conversation and produces the feedback report.
 *
 * The report is written once and then read back on every later visit — it is a
 * record of a conversation that happened, so re-running it against a different
 * model later would silently change history the student has already read.
 */
export async function finishConversation(userId: string, conversationId: string, targetScore: number) {
  const conversation = await getConversation(userId, conversationId)

  const existing = await prisma.conversationReport.findUnique({ where: { conversationId } })
  if (existing) return existing

  if (conversation.userTurns < MIN_TURNS_FOR_REPORT) {
    throw badRequest(
      `Take at least ${MIN_TURNS_FOR_REPORT} turns before finishing — there is not enough of a conversation to report on yet.`,
    )
  }

  const result = await runConversationAi('CONVERSATION_REPORT', userId, (provider) =>
    provider.report({
      topicTitle: conversation.title,
      scenario: conversation.scenario,
      goals: conversation.goals,
      transcript: toTurns(conversation.messages),
      targetScore,
      spokenTurns: conversation.spokenTurns,
      durationMs: conversation.lastMessageAt.getTime() - conversation.startedAt.getTime(),
    }),
  )

  const data = result.data
  const [report] = await prisma.$transaction([
    prisma.conversationReport.create({
      data: {
        conversationId,
        estimatedScore: Math.round(data.estimated_score),
        fluency: Math.round(data.fluency),
        vocabulary: Math.round(data.vocabulary),
        grammar: Math.round(data.grammar),
        interaction: Math.round(data.interaction),
        summary: data.summary,
        strengths: data.strengths,
        improvements: data.improvements,
        nextSteps: data.next_steps,
        corrections: data.corrections ?? [],
        goalsMet: data.goals_met ?? [],
        provider: result.provider,
        simulated: isSimulated(result.provider),
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    }),
  ])

  return report
}

/** Leaves a conversation without producing a report. */
export async function abandonConversation(userId: string, conversationId: string): Promise<void> {
  const conversation = await getConversation(userId, conversationId)
  if (conversation.status !== 'ACTIVE') return
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { status: 'ABANDONED', completedAt: new Date() },
  })
}
