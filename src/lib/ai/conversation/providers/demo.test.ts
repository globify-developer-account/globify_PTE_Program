import { describe, expect, it } from 'vitest'
import { demoConversationProvider } from './demo'
import type { ConversationReplyInput, ConversationReportInput, ConversationTurn } from '../types'

/**
 * The simulated partner is what runs in demo mode and in CI, so its behaviour
 * is part of the product rather than a stub. These tests pin the properties
 * the UI depends on: it always replies, it only corrects what it is sure of,
 * and its scores move with the shape of the conversation.
 */

const baseReply: ConversationReplyInput = {
  personaName: 'Sara',
  personaRole: 'a neighbour you have just met',
  scenario: 'You are both waiting for a lift in your building.',
  topicTitle: 'Introducing yourself',
  level: 'EASY',
  goals: ['Give your name and where you are from', 'Ask Sara at least one question about herself'],
  targetLanguage: ['nice to meet you', 'I work as'],
  history: [],
  studentMessage: '',
  spoken: false,
  targetScore: 79,
}

const turn = (role: ConversationTurn['role'], content: string): ConversationTurn => ({ role, content })

describe('demo conversation partner — reply', () => {
  it('asks the student to repeat when nothing was said', async () => {
    const result = await demoConversationProvider.reply({ ...baseReply, studentMessage: '   ' })
    expect(result.data.reply).toMatch(/did not catch that/i)
    expect(result.data.correction).toBeNull()
  })

  it('always returns a non-empty reply', async () => {
    const result = await demoConversationProvider.reply({
      ...baseReply,
      studentMessage: 'My name is Adnan and I am from Lahore.',
    })
    expect(result.data.reply.trim().length).toBeGreaterThan(0)
  })

  it('nudges for more when the turn is very short', async () => {
    const result = await demoConversationProvider.reply({ ...baseReply, studentMessage: 'Yes.' })
    expect(result.data.reply).toMatch(/say a little more|start|whole story/i)
  })

  it('corrects an error it is certain about', async () => {
    const result = await demoConversationProvider.reply({
      ...baseReply,
      studentMessage: 'I am agree with you about the weather.',
    })
    expect(result.data.correction).toBe('I agree with you about the weather.')
    expect(result.data.correction_note).toMatch(/agree/i)
  })

  it('leaves a clean turn uncorrected', async () => {
    const result = await demoConversationProvider.reply({
      ...baseReply,
      studentMessage: 'I moved here last year and I work as a pharmacist.',
    })
    expect(result.data.correction).toBeNull()
  })

  it('is deterministic for the same conversation state', async () => {
    const input = { ...baseReply, studentMessage: 'I grew up in Karachi and studied engineering there.' }
    const first = await demoConversationProvider.reply(input)
    const second = await demoConversationProvider.reply(input)
    expect(first.data.reply).toBe(second.data.reply)
  })

  it('reports a goal as met once the student has covered it', async () => {
    const result = await demoConversationProvider.reply({
      ...baseReply,
      studentMessage: 'Sara, where are you from originally?',
      history: [turn('ASSISTANT', 'Hello!'), turn('USER', 'My name is Adnan and I am from Lahore.')],
    })
    expect(result.data.goals_met.length).toBeGreaterThan(0)
  })

  it('never charges for a simulated turn', async () => {
    const result = await demoConversationProvider.reply({ ...baseReply, studentMessage: 'Hello there.' })
    expect(result.usage.costMicros).toBe(0)
    expect(result.provider).toBe('demo')
  })
})

const baseReport: ConversationReportInput = {
  topicTitle: 'Introducing yourself',
  scenario: 'You are both waiting for a lift in your building.',
  goals: ['Give your name and where you are from'],
  transcript: [],
  targetScore: 79,
  spokenTurns: 0,
  durationMs: 5 * 60_000,
}

describe('demo conversation partner — report', () => {
  it('scores an empty conversation at the floor without inventing feedback', async () => {
    const result = await demoConversationProvider.report(baseReport)
    expect(result.data.estimated_score).toBe(10)
    expect(result.data.strengths).toEqual([])
    expect(result.data.corrections).toEqual([])
  })

  it('scores a developed conversation above a monosyllabic one', async () => {
    const short = await demoConversationProvider.report({
      ...baseReport,
      transcript: [
        turn('ASSISTANT', 'Where are you from?'),
        turn('USER', 'Lahore.'),
        turn('ASSISTANT', 'And what do you do?'),
        turn('USER', 'Student.'),
        turn('ASSISTANT', 'Do you enjoy it?'),
        turn('USER', 'Yes.'),
      ],
    })

    const developed = await demoConversationProvider.report({
      ...baseReport,
      transcript: [
        turn('ASSISTANT', 'Where are you from?'),
        turn(
          'USER',
          'I grew up in Lahore, though my family moved there from a smaller town when I was about six years old.',
        ),
        turn('ASSISTANT', 'And what do you do?'),
        turn(
          'USER',
          'I am studying pharmacy at the moment, mainly because I enjoyed chemistry at school. What about you?',
        ),
        turn('ASSISTANT', 'Do you enjoy it?'),
        turn(
          'USER',
          'Most of it, yes. The laboratory work is genuinely interesting, although the reading load is heavier than I expected.',
        ),
      ],
    })

    expect(developed.data.estimated_score).toBeGreaterThan(short.data.estimated_score)
    expect(developed.data.interaction).toBeGreaterThan(short.data.interaction)
  })

  it('keeps every band inside the 10-90 scale', async () => {
    const result = await demoConversationProvider.report({
      ...baseReport,
      transcript: [turn('USER', 'um uh like you know um basically like uh')],
    })
    for (const band of [
      result.data.estimated_score,
      result.data.fluency,
      result.data.vocabulary,
      result.data.grammar,
      result.data.interaction,
    ]) {
      expect(band).toBeGreaterThanOrEqual(10)
      expect(band).toBeLessThanOrEqual(90)
    }
  })

  it('quotes the student verbatim in corrections', async () => {
    const said = 'I am agree with that, and he don’t mind.'
    const result = await demoConversationProvider.report({
      ...baseReport,
      transcript: [turn('USER', said), turn('USER', 'It was fine.'), turn('USER', 'I enjoyed it.')],
    })
    expect(result.data.corrections[0]?.said).toBe(said)
    expect(result.data.corrections[0]?.better).toContain('I agree')
  })

  it('says plainly that the numbers are simulated', async () => {
    const result = await demoConversationProvider.report({
      ...baseReport,
      transcript: [turn('USER', 'I think it went reasonably well overall, thank you for asking.')],
    })
    expect(result.data.summary).toMatch(/simulated/i)
  })
})
