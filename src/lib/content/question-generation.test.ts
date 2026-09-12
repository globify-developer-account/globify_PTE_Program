import { describe, expect, it } from 'vitest'
import { parseBlankOptions, parseChoiceOptions, parseCorrectAnswer, tokenizeWords } from '../pte/schemas'
import { scoreByRules } from '../pte/scoring'
import { QUESTION_TYPES } from '../pte/question-types'
import {
  GENERATABLE_TYPES,
  GenerationError,
  generationPrompt,
  generationSpec,
} from './question-generation'

/**
 * Claude's JSON is untrusted. These tests pin down the checks that stand between
 * a plausible-looking response and a question whose answer key is wrong.
 */

/** Deterministic stand-in for Math.random so shuffles are reproducible. */
function seeded(seed = 7): () => number {
  let state = seed
  return () => {
    state = (state * 16807) % 2147483647
    return (state - 1) / 2147483646
  }
}

function build(code: string, json: unknown) {
  return generationSpec(code)!.build(json, seeded())
}

const words = (count: number, word = 'word') => Array.from({ length: count }, () => word).join(' ')

describe('catalogue coverage', () => {
  it('covers every PTE task except Describe Image', () => {
    const missing = QUESTION_TYPES.map((type) => type.code).filter((code) => !GENERATABLE_TYPES.includes(code))
    expect(missing).toEqual(['DESCRIBE_IMAGE'])
  })

  it('builds a prompt that carries the brief, difficulty and titles to avoid', () => {
    const prompt = generationPrompt({
      typeCode: 'ESSAY',
      difficulty: 'HARD',
      topic: 'urban transport',
      avoidTitles: ['Remote work and cities'],
    })
    expect(prompt).toContain('Write Essay')
    expect(prompt).toContain('Difficulty: HARD')
    expect(prompt).toContain('Topic: urban transport')
    expect(prompt).toContain('- Remote work and cities')
  })
})

describe('choice tasks', () => {
  const passage = words(160)

  it('assigns option IDs and an answer key that the rule scorer accepts', () => {
    const question = build('READING_MCQ_SINGLE', {
      title: 'Coral reefs',
      tags: ['Science'],
      passage,
      question: 'What causes bleaching?',
      options: [
        { text: 'Storms', correct: false },
        { text: 'Warm water', correct: true },
        { text: 'Salinity', correct: false },
        { text: 'Seaweed', correct: false },
      ],
      explanation: 'Because.',
    })

    const options = parseChoiceOptions(question.options)
    const key = parseCorrectAnswer(question.correctAnswer)
    expect(options.map((option) => option.id)).toEqual(['a', 'b', 'c', 'd'])
    expect(options.find((option) => option.id === key.optionId)?.text).toBe('Warm water')
    expect(question.tags).toEqual(['science'])

    const score = scoreByRules({ typeCode: 'READING_MCQ_SINGLE', correctAnswer: key, selection: { optionIds: [key.optionId!] } })
    expect(score?.isCorrect).toBe(true)
  })

  it('rejects a single-answer item with two correct options', () => {
    expect(() =>
      build('READING_MCQ_SINGLE', {
        title: 'Coral reefs',
        tags: ['science'],
        passage,
        question: 'Q?',
        options: [
          { text: 'A', correct: true },
          { text: 'B', correct: true },
          { text: 'C', correct: false },
          { text: 'D', correct: false },
        ],
        explanation: 'x',
      }),
    ).toThrow(GenerationError)
  })

  it('rejects duplicate options', () => {
    expect(() =>
      build('LISTENING_MCQ_SINGLE', {
        title: 'Tidal energy',
        tags: ['energy'],
        transcript: words(120),
        question: 'Q?',
        options: [
          { text: 'Same answer', correct: true },
          { text: 'same answer.', correct: false },
          { text: 'C', correct: false },
          { text: 'D', correct: false },
        ],
        explanation: 'x',
      }),
    ).toThrow(/duplicates/)
  })
})

describe('REORDER_PARAGRAPHS', () => {
  it('shuffles the boxes but keeps an order key that restores the original sequence', () => {
    const inOrder = ['First.', 'Second.', 'Third.', 'Fourth.']
    const question = build('REORDER_PARAGRAPHS', {
      title: 'Printing press',
      tags: ['history'],
      paragraphs_in_order: inOrder,
      explanation: 'Chronology.',
    })

    const options = parseChoiceOptions(question.options)
    const order = parseCorrectAnswer(question.correctAnswer).order!
    const byId = new Map(options.map((option) => [option.id, option.text]))
    expect(order.map((id) => byId.get(id))).toEqual(inOrder)
    // IDs are assigned in display order, so they reveal nothing about the answer.
    expect(options.map((option) => option.id)).toEqual(['p1', 'p2', 'p3', 'p4'])
  })
})

describe('fill in the blanks', () => {
  const blankJson = {
    title: 'Arctic tern',
    tags: ['biology'],
    passage: `${words(20)} {{1}} ${words(15)} {{2}} ${words(15)} {{3}} end.`,
    blanks: [
      { answer: 'migration', distractors: ['hibernation', 'digestion', 'formation'] },
      { answer: 'revealed', distractors: ['concealed', 'reversed', 'delayed'] },
      { answer: 'reduces', distractors: ['increases', 'ignores', 'doubles'] },
    ],
    explanation: 'Meaning.',
  }

  it('produces one option set per marker, each containing its answer', () => {
    const question = build('READING_FILL_BLANKS', blankJson)
    const options = parseBlankOptions(question.options)
    const key = parseCorrectAnswer(question.correctAnswer).blanks!

    expect(options.map((option) => option.index)).toEqual([1, 2, 3])
    for (const option of options) {
      expect(option.choices).toHaveLength(4)
      expect(option.choices).toContain(key[String(option.index)])
    }
  })

  it('rejects markers that do not match the number of blanks', () => {
    expect(() => build('READING_FILL_BLANKS', { ...blankJson, passage: `${words(50)} {{1}} {{3}}` })).toThrow(
      /markers/,
    )
  })

  it('rejects a distractor list that repeats the answer', () => {
    const blanks = [...blankJson.blanks]
    blanks[0] = { answer: 'migration', distractors: ['Migration', 'digestion', 'formation'] }
    expect(() => build('READING_FILL_BLANKS', { ...blankJson, blanks })).toThrow(/distractors/)
  })

  it('derives the listening transcript by filling the gaps', () => {
    const question = build('LISTENING_FILL_BLANKS', {
      title: 'Volcanic ash',
      tags: ['geology'],
      passage: `Ash {{1}} inside engines ${words(40)} and the engine {{2}} while models {{3}} it.`,
      answers: ['melts', 'stalls', 'track'],
    })
    expect(question.audioTranscript).toContain('Ash melts inside engines')
    expect(question.audioTranscript).not.toContain('{{')
    expect(parseCorrectAnswer(question.correctAnswer).blanks).toEqual({ '1': 'melts', '2': 'stalls', '3': 'track' })
  })
})

describe('HIGHLIGHT_INCORRECT_WORDS', () => {
  const transcript =
    'Less than three percent of the water on Earth is fresh, and most of that is locked in glaciers or buried too deep to reach. The portion accessible in rivers and shallow aquifers is tiny, and demand for it is climbing faster than population, because rising incomes shift diets towards food that takes more water.'
  const displayed = transcript
    .replace('locked', 'frozen')
    .replace('accessible', 'available')
    .replace('climbing', 'rising')
    .replace('shift', 'change')

  it('computes word indexes from the diff rather than trusting the model', () => {
    const question = build('HIGHLIGHT_INCORRECT_WORDS', {
      title: 'Freshwater scarcity',
      tags: ['environment'],
      transcript,
      displayed_text: displayed,
    })

    const indexes = parseCorrectAnswer(question.correctAnswer).wordIndexes!
    const tokens = tokenizeWords(question.passage!)
    expect(indexes.map((index) => tokens[index])).toEqual(['frozen', 'available', 'rising', 'change'])
    expect(question.explanation).toBe(
      'The recording says "locked" not "frozen", "accessible" not "available", "climbing" not "rising", "shift" not "change".',
    )
  })

  it('rejects texts whose word counts differ, since every index after the change would shift', () => {
    expect(() =>
      build('HIGHLIGHT_INCORRECT_WORDS', {
        title: 'Freshwater scarcity',
        tags: ['environment'],
        transcript,
        displayed_text: displayed.replace('frozen', 'frozen solid'),
      }),
    ).toThrow(/same|words but/)
  })
})

describe('SELECT_MISSING_WORD', () => {
  it('replaces the ending with a beep and makes it the correct option', () => {
    const question = build('SELECT_MISSING_WORD', {
      title: 'Rivers and cities',
      tags: ['history'],
      transcript: `${words(60)} which is why so many cities grew beside rivers.`,
      missing_ending: 'beside rivers.',
      distractors: ['on hilltops', 'near forests', 'in deserts'],
      explanation: 'Context.',
    })

    expect(question.audioTranscript).toMatch(/cities grew \[beep\]$/)
    const options = parseChoiceOptions(question.options)
    const key = parseCorrectAnswer(question.correctAnswer)
    expect(options.find((option) => option.id === key.optionId)?.text).toBe('beside rivers')
  })

  it('rejects an ending the transcript does not actually finish with', () => {
    expect(() =>
      build('SELECT_MISSING_WORD', {
        title: 'Rivers and cities',
        tags: ['history'],
        transcript: `${words(60)} which is why cities grew beside rivers.`,
        missing_ending: 'on hilltops',
        distractors: ['a', 'b', 'c'],
        explanation: 'x',
      }),
    ).toThrow(/does not end/)
  })
})

describe('word limits', () => {
  it('rejects a Summarize Written Text model answer over 75 words', () => {
    expect(() =>
      build('SUMMARIZE_WRITTEN_TEXT', {
        title: 'Antibiotics',
        tags: ['health'],
        passage: words(220),
        sample_answer: words(80),
      }),
    ).toThrow(/Sample answer has 80 words/)
  })

  it('sets the task word limits on writing items', () => {
    const question = build('WRITE_EMAIL', {
      title: 'Late library book',
      tags: ['campus'],
      task: 'You borrowed a book and lost it.\n- apologise\n- explain what happened\n- offer a solution',
      sample_answer: words(90),
    })
    expect([question.wordLimitMin, question.wordLimitMax]).toEqual([50, 120])
    expect(question.prompt).toContain('Write an email of 50–120 words.')
  })
})
