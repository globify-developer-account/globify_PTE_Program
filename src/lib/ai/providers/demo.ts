import { countWords } from '../../utils'
import { contentOverlap, normalizeText } from '../../pte/scoring'
import type {
  AIProvider,
  AiResult,
  EditCategory,
  IeltsSpeakingScore,
  IeltsSpeakingScoreInput,
  IeltsWritingScore,
  IeltsWritingScoreInput,
  ProgressAnalysis,
  ProgressAnalysisInput,
  RecommendationInput,
  RecommendationPayload,
  SpeakingScore,
  SpeakingScoreInput,
  Transcription,
  TranscriptionInput,
  TranscriptionProvider,
  WritingImprovement,
  WritingImprovementInput,
  WritingScore,
  WritingScoreInput,
} from '../types'
import { criteriaBand, roundToHalfBand } from '../../exams/ielts/bands'

/**
 * Simulated provider used in demo mode and in tests.
 *
 * It is deterministic and heuristic — not a model. The numbers move with the
 * shape of the response (length, overlap with the source, hesitation markers,
 * sentence variety) so the product is genuinely usable without credentials,
 * and every surface that renders these results labels them as simulated.
 */

const FILLERS = /\b(um+|uh+|er+|ah+|like|you know|i mean)\b/gi

function clampScore(value: number): number {
  return Math.max(10, Math.min(90, Math.round(value)))
}

function noResult<T>(data: T, latencyMs = 40): AiResult<T> {
  return {
    data,
    usage: { promptTokens: 0, completionTokens: 0, costMicros: 0 },
    provider: 'demo',
    model: 'globify-simulated-v1',
    latencyMs,
  }
}

function lexicalVariety(text: string): number {
  const words = normalizeText(text).split(' ').filter(Boolean)
  if (words.length === 0) return 0
  return new Set(words).size / words.length
}

/**
 * Deterministic rule-based rewriter behind the improvement tool in demo mode.
 *
 * It is a copy-editor, not a model: every rule below is a mechanical fix that
 * is right or wrong independently of context, so it never "improves" correct
 * English into something else. Anything needing judgement — developing an
 * argument, restructuring a paragraph — is left to a real provider, and every
 * surface that renders these results labels them as simulated.
 */

interface Rule {
  pattern: RegExp
  replace: string
  category: EditCategory
  explanation: string
}

const SPELLINGS: Array<[string, string]> = [
  ['alot', 'a lot'],
  ['recieve', 'receive'],
  ['beacuse', 'because'],
  ['definately', 'definitely'],
  ['occured', 'occurred'],
  ['seperate', 'separate'],
  ['thier', 'their'],
  ['wich', 'which'],
  ['goverment', 'government'],
  ['enviroment', 'environment'],
  ['sucess', 'success'],
  ['benifit', 'benefit'],
  ['oppurtunity', 'opportunity'],
  ['arguement', 'argument'],
  ['existance', 'existence'],
  ['neccessary', 'necessary'],
  ['knowlege', 'knowledge'],
  ['acheive', 'achieve'],
  ['begining', 'beginning'],
]

const CONTRACTIONS: Array<[string, string]> = [
  ['don.t', 'do not'],
  ['doesn.t', 'does not'],
  ['can.t', 'cannot'],
  ['won.t', 'will not'],
  ['isn.t', 'is not'],
  ['aren.t', 'are not'],
  ['wasn.t', 'was not'],
  ['shouldn.t', 'should not'],
  ['it.s', 'it is'],
  ['they.re', 'they are'],
  ['there.s', 'there is'],
]

const INFORMAL: Array<[string, string]> = [
  ['a lot of', 'many'],
  ['lots of', 'many'],
  ['kids', 'children'],
  ['stuff', 'material'],
  ['nowadays', 'in recent years'],
  ['big problem', 'significant problem'],
  ['really important', 'crucial'],
  ['very good', 'highly beneficial'],
  ['very bad', 'severely detrimental'],
]

const WORDY: Array<[string, string]> = [
  ['due to the fact that', 'because'],
  ['in spite of the fact that', 'although'],
  ['at this point in time', 'now'],
  ['in order to', 'to'],
  ['the majority of', 'most'],
  ['a large number of', 'many'],
]

function phraseRules(
  pairs: Array<[string, string]>,
  category: EditCategory,
  explanation: string,
): Rule[] {
  // The left-hand sides are authored as regex-safe literals, so they can be
  // embedded directly. `.` in the contraction list matches either a straight
  // or a curly apostrophe, which is what a student's editor actually produces.
  return pairs.map(([from, to]) => ({
    pattern: new RegExp('\\b' + from + '\\b', 'gi'),
    replace: to,
    category,
    explanation,
  }))
}

const RULES: Rule[] = [
  ...phraseRules(
    SPELLINGS,
    'SPELLING',
    'This is a high-frequency misspelling, and spelling is scored directly on this task.',
  ),
  ...phraseRules(
    CONTRACTIONS,
    'VOCABULARY',
    'Academic writing uses the full form rather than a contraction, which reads as informal speech.',
  ),
  ...phraseRules(
    INFORMAL,
    'VOCABULARY',
    'A precise academic word scores higher than a vague or conversational one.',
  ),
  ...phraseRules(
    WORDY,
    'CONCISENESS',
    'A shorter phrase carries the same meaning and leaves room for your argument.',
  ),
]

const CONNECTIVES =
  /\b(however|therefore|moreover|furthermore|although|whereas|consequently|in addition|for example|as a result)\b/i

/** Applies one rule, returning the new text and a sample of what it changed. */
function applyRule(text: string, rule: Rule): { text: string; edit: WritingImprovement['edits'][number] | null } {
  rule.pattern.lastIndex = 0
  const match = rule.pattern.exec(text)
  if (!match) return { text, edit: null }

  rule.pattern.lastIndex = 0
  const next = text.replace(rule.pattern, (found) =>
    // Keep the student's capitalisation when the phrase opened a sentence.
    found[0] === found[0]?.toUpperCase() && found[0] !== found[0]?.toLowerCase()
      ? rule.replace.charAt(0).toUpperCase() + rule.replace.slice(1)
      : rule.replace,
  )

  return {
    text: next,
    edit: {
      original: match[0],
      replacement: rule.replace,
      category: rule.category,
      explanation: rule.explanation,
    },
  }
}

/** "teachers" -> "Teachers", for reporting a sentence-start fix as a word. */
function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1)
}

function mechanicalFixes(text: string): { text: string; edits: WritingImprovement['edits'] } {
  const edits: WritingImprovement['edits'] = []
  let working = text

  const doubleSpace = working.match(/\S+ {2,}\S+/)
  if (doubleSpace) {
    working = working.replace(/ {2,}/g, ' ')
    edits.push({
      original: doubleSpace[0],
      replacement: doubleSpace[0].replace(/ {2,}/g, ' '),
      category: 'PUNCTUATION',
      explanation: 'Use a single space between words so your response is not flagged as poorly formatted.',
    })
  }

  const spaceBefore = working.match(/\w+\s+[,.;:!?]/)
  if (spaceBefore) {
    working = working.replace(/\s+([,.;:!?])/g, '$1')
    edits.push({
      original: spaceBefore[0],
      replacement: spaceBefore[0].replace(/\s+/, ''),
      category: 'PUNCTUATION',
      explanation: 'Punctuation attaches to the word before it, with no space in between.',
    })
  }

  const missingSpace = working.match(/\w+[,;:.!?][A-Za-z]\w*/)
  if (missingSpace) {
    working = working.replace(/([,;:])(?=[A-Za-z])/g, '$1 ').replace(/([.!?])(?=[A-Za-z])/g, '$1 ')
    edits.push({
      original: missingSpace[0],
      replacement: missingSpace[0].replace(/([,;:.!?])/, '$1 '),
      category: 'PUNCTUATION',
      explanation: 'Leave a space after punctuation so the next word is readable.',
    })
  }

  const repeated = working.match(/\b(\w+)\s+\1\b/i)
  if (repeated) {
    working = working.replace(/\b(\w+)(\s+)\1\b/gi, '$1')
    edits.push({
      original: repeated[0],
      replacement: repeated[1] ?? repeated[0],
      category: 'GRAMMAR',
      explanation: 'You repeated a word here; the duplicate adds nothing and reads as a typing slip.',
    })
  }

  const lowerI = working.match(/\bi\b/)
  if (lowerI) {
    working = working.replace(/\bi\b/g, 'I')
    edits.push({
      original: 'i',
      replacement: 'I',
      category: 'GRAMMAR',
      explanation: 'The first-person pronoun "I" is always capitalised, wherever it falls in the sentence.',
    })
  }

  const lowerStart = working.match(/(?:^|[.!?]\s+)([a-z]\w*)/)
  if (lowerStart) {
    working = working.replace(/(^|[.!?]\s+)([a-z])/g, (_all, lead: string, letter: string) => lead + letter.toUpperCase())
    edits.push({
      original: lowerStart[1] ?? lowerStart[0].trim(),
      replacement: capitalise(lowerStart[1] ?? lowerStart[0].trim()),
      category: 'PUNCTUATION',
      explanation: 'Every sentence starts with a capital letter.',
    })
  }

  return { text: working, edits }
}

function improveText(text: string): { improved: string; edits: WritingImprovement['edits'] } {
  const edits: WritingImprovement['edits'] = []
  let working = text.trim()

  for (const rule of RULES) {
    const result = applyRule(working, rule)
    working = result.text
    if (result.edit) edits.push(result.edit)
  }

  const mechanical = mechanicalFixes(working)
  working = mechanical.text
  edits.push(...mechanical.edits)

  if (working.length > 0 && !/[.!?]$/.test(working)) {
    const tail = working.slice(-30)
    working += '.'
    edits.push({
      original: tail,
      replacement: `${tail}.`,
      category: 'PUNCTUATION',
      explanation: 'Your final sentence has no full stop, which reads as an unfinished answer.',
    })
  }

  if (!CONNECTIVES.test(working)) {
    const sentences = working.split(/(?<=[.!?])\s+/)
    const second = sentences[1]
    if (second && second.length > 1) {
      const linked = `Furthermore, ${second.charAt(0).toLowerCase()}${second.slice(1)}`
      sentences[1] = linked
      working = sentences.join(' ')
      edits.push({
        original: second.slice(0, 60),
        replacement: linked.slice(0, 60),
        category: 'COHERENCE',
        explanation:
          'Your sentences ran on without linking words, so the relationship between your ideas was left implicit.',
      })
    }
  }

  return { improved: working, edits: edits.slice(0, 40) }
}

export const demoProvider: AIProvider = {
  name: 'demo',
  available: true,

  async scoreSpeaking(input: SpeakingScoreInput): Promise<AiResult<SpeakingScore>> {
    const transcript = input.transcript.trim()
    const words = countWords(transcript)

    if (words === 0) {
      return noResult<SpeakingScore>({
        overall_score: 10,
        content: 10,
        pronunciation: 10,
        fluency: 10,
        grammar: 10,
        vocabulary: 10,
        feedback: ['No speech was detected in your recording.'],
        strengths: [],
        improvements: ['Check your microphone and make sure you begin speaking as soon as the recorder starts.'],
        recommendations: ['Re-attempt this task and speak for the full time available.'],
      })
    }

    const fillerCount = (transcript.match(FILLERS) ?? []).length
    const fillerRate = fillerCount / Math.max(words, 1)
    const seconds = (input.audioDurationMs ?? words * 400) / 1000
    const wordsPerMinute = seconds > 0 ? (words / seconds) * 60 : 140
    const paceFit = 1 - Math.min(1, Math.abs(wordsPerMinute - 150) / 110)
    const variety = lexicalVariety(transcript)

    const overlap = input.expectedText ? contentOverlap(input.expectedText, transcript) : Math.min(1, words / 55)

    const content = clampScore(28 + overlap * 58)
    const fluency = clampScore(34 + paceFit * 42 - fillerRate * 140)
    const pronunciation = clampScore(38 + overlap * 34 + paceFit * 14 - fillerRate * 70)
    const vocabulary = clampScore(32 + variety * 55)
    const grammar = clampScore(40 + variety * 30 - fillerRate * 60)
    const overall = clampScore(content * 0.3 + fluency * 0.25 + pronunciation * 0.25 + grammar * 0.1 + vocabulary * 0.1)

    const feedback: string[] = []
    if (overlap < 0.7 && input.expectedText) {
      feedback.push('Several words from the prompt were missing or unclear in your recording.')
    }
    if (fillerRate > 0.04) {
      feedback.push(`You used ${fillerCount} filler sound${fillerCount === 1 ? '' : 's'}, which interrupts your fluency score.`)
    }
    if (wordsPerMinute < 110) {
      feedback.push('Your pace was slower than the natural range of 140–170 words per minute.')
    } else if (wordsPerMinute > 195) {
      feedback.push('You spoke faster than the natural range, which can cost clarity marks.')
    }
    if (feedback.length === 0) {
      feedback.push('Your delivery was steady and covered the task requirements.')
    }

    return noResult<SpeakingScore>({
      overall_score: overall,
      content,
      pronunciation,
      fluency,
      grammar,
      vocabulary,
      feedback,
      strengths: overall >= 60 ? ['You maintained a consistent pace throughout the recording.'] : [],
      improvements:
        overall < input.targetScore
          ? [`You are ${Math.max(0, input.targetScore - overall)} points below your target on this task type.`]
          : [],
      recommendations: [
        fluency < pronunciation
          ? 'Practise Repeat Sentence daily to build rhythm and reduce hesitation.'
          : 'Practise Read Aloud with a recording of your own voice to check word stress.',
      ],
    })
  },

  async scoreWriting(input: WritingScoreInput): Promise<AiResult<WritingScore>> {
    const response = input.response.trim()
    const words = countWords(response)

    if (words === 0) {
      return noResult<WritingScore>({
        overall_score: 10,
        content: 10,
        form: 10,
        grammar: 10,
        vocabulary: 10,
        coherence: 10,
        development: 10,
        spelling: 10,
        feedback: ['No response was submitted.'],
        strengths: [],
        improvements: ['Write at least a first draft — an empty answer always scores the minimum.'],
        how_to_improve: ['Plan for two minutes, then write continuously until the word count is met.'],
        suggested_rewrite: '',
      })
    }

    const min = input.wordLimitMin ?? 0
    const max = input.wordLimitMax ?? Number.POSITIVE_INFINITY
    const withinLimit = words >= min && words <= max
    const sentences = response.split(/[.!?]+/).filter((part) => part.trim().length > 0)
    const avgSentenceLength = words / Math.max(sentences.length, 1)
    const variety = lexicalVariety(response)
    const connectives = (response.match(/\b(however|therefore|moreover|furthermore|although|whereas|consequently|in addition)\b/gi) ?? []).length
    const overlap = input.passage ? contentOverlap(input.passage.slice(0, 1200), response) : Math.min(1, words / (min || 200))

    const form = withinLimit ? 88 : words < min ? clampScore(20 + (words / Math.max(min, 1)) * 40) : 35
    const content = clampScore(30 + overlap * 55)
    const vocabulary = clampScore(30 + variety * 60)
    const grammar = clampScore(46 + Math.min(14, avgSentenceLength) * 1.6 - (avgSentenceLength > 34 ? 18 : 0))
    const coherence = clampScore(40 + Math.min(connectives, 6) * 6)
    const development = clampScore(30 + Math.min(1, words / Math.max(min || 200, 1)) * 52)
    const spelling = clampScore(62 + variety * 24)
    const overall = clampScore(
      content * 0.25 + form * 0.15 + grammar * 0.15 + vocabulary * 0.15 + coherence * 0.15 + development * 0.15,
    )

    const feedback: string[] = []
    if (!withinLimit) {
      feedback.push(
        words < min
          ? `Your answer is ${min - words} words short of the required minimum of ${min}.`
          : `Your answer exceeds the ${max}-word limit, which caps your form score.`,
      )
    }
    if (connectives === 0) {
      feedback.push('No linking words were used, so the relationship between your ideas is left implicit.')
    }
    if (avgSentenceLength > 34) {
      feedback.push('Your average sentence runs long; splitting the longest ones will lift your grammar score.')
    }
    if (feedback.length === 0) {
      feedback.push('Your response met the structural requirements of the task.')
    }

    return noResult<WritingScore>({
      overall_score: overall,
      content,
      form,
      grammar,
      vocabulary,
      coherence,
      development,
      spelling,
      feedback,
      strengths: withinLimit ? ['You stayed inside the required word count.'] : [],
      improvements: overall < input.targetScore ? ['Focus on developing each paragraph with a supporting example.'] : [],
      how_to_improve: ['Write one practice response a day and re-read it for linking words before submitting.'],
      suggested_rewrite: sentences[0] ? `${sentences[0].trim()}, which directly supports the position taken above.` : '',
    })
  },

  async scoreIeltsWriting(input: IeltsWritingScoreInput): Promise<AiResult<IeltsWritingScore>> {
    const response = input.response.trim()
    const words = countWords(response)
    const min = input.wordLimitMin ?? (input.taskNumber === 2 ? 250 : 150)
    const taskCriterion = input.taskNumber === 2 ? 'Task Response' : 'Task Achievement'

    if (words === 0) {
      return noResult<IeltsWritingScore>({
        overall_band: 0,
        task: 0,
        coherence_cohesion: 0,
        lexical_resource: 0,
        grammatical_range_accuracy: 0,
        meets_word_count: false,
        word_count: 0,
        feedback: ['No response was submitted, so no band can be awarded.'],
        strengths: [],
        improvements: ['Write a first draft — an unattempted task always scores band 0.'],
        how_to_improve: ['Plan for five minutes, then write continuously until you pass the word count.'],
        suggested_rewrite: '',
      })
    }

    const meetsWordCount = words >= min
    const sentences = response.split(/[.!?]+/).filter((part) => part.trim().length > 0)
    const avgSentenceLength = words / Math.max(sentences.length, 1)
    const variety = lexicalVariety(response)
    const connectives = (response.match(CONNECTIVES) ?? []).length
    const lengthRatio = Math.min(1, words / Math.max(min, 1))

    // An under-length response cannot pass band 5 on the task criterion — the
    // same rule the real prompt states, applied here so demo mode teaches the
    // student the same lesson a live provider would.
    const rawTask = 4 + lengthRatio * 2.5
    const task = roundToHalfBand(meetsWordCount ? rawTask : Math.min(5, rawTask))
    const coherence = roundToHalfBand(4 + Math.min(connectives, 6) * 0.5)
    const lexical = roundToHalfBand(3.5 + variety * 5)
    const grammar = roundToHalfBand(
      5 + (avgSentenceLength >= 12 && avgSentenceLength <= 24 ? 1 : 0) - (avgSentenceLength > 34 ? 1.5 : 0),
    )

    const feedback: string[] = []
    if (!meetsWordCount) {
      feedback.push(
        `${taskCriterion}: your answer is ${min - words} words short of the ${min}-word minimum, which caps this criterion at band 5.`,
      )
    }
    if (connectives === 0) {
      feedback.push('Coherence and Cohesion: you used no linking words, so the relationship between your ideas is left implicit.')
    }
    if (avgSentenceLength > 34) {
      feedback.push('Grammatical Range and Accuracy: your average sentence runs long, which makes errors harder to avoid.')
    }
    if (feedback.length === 0) {
      feedback.push(`${taskCriterion}: you met the length requirement and addressed the prompt directly.`)
    }

    return noResult<IeltsWritingScore>({
      overall_band: criteriaBand([task, coherence, lexical, grammar]),
      task,
      coherence_cohesion: coherence,
      lexical_resource: lexical,
      grammatical_range_accuracy: grammar,
      meets_word_count: meetsWordCount,
      word_count: words,
      feedback,
      strengths: meetsWordCount ? ['You wrote a full-length response within the task requirements.'] : [],
      improvements:
        criteriaBand([task, coherence, lexical, grammar]) < input.targetBand
          ? ['Develop each paragraph with one specific example rather than a second general statement.']
          : [],
      how_to_improve: ['Write one timed response a day and check it for linking words before you submit.'],
      suggested_rewrite: sentences[0] ? `${sentences[0].trim()}, which is the point this paragraph goes on to support.` : '',
    })
  },

  async scoreIeltsSpeaking(input: IeltsSpeakingScoreInput): Promise<AiResult<IeltsSpeakingScore>> {
    const transcript = input.transcript.trim()
    const words = countWords(transcript)

    if (words === 0) {
      return noResult<IeltsSpeakingScore>({
        overall_band: 0,
        fluency_coherence: 0,
        lexical_resource: 0,
        grammatical_range_accuracy: 0,
        pronunciation: 0,
        feedback: ['No speech was detected, so no band can be awarded.'],
        strengths: [],
        improvements: ['Check your microphone, then record again and speak until the timer stops.'],
        recommendations: ['Practise speaking for the full time even when you run out of ideas.'],
      })
    }

    const seconds = Math.max(1, Math.round((input.audioDurationMs ?? 0) / 1000))
    const wordsPerMinute = (words / seconds) * 60
    const fillers = (transcript.match(FILLERS) ?? []).length
    const fillerRatio = fillers / Math.max(words, 1)
    const variety = lexicalVariety(transcript)
    const sentences = transcript.split(/[.!?]+/).filter((part) => part.trim().length > 0)
    const avgSentenceLength = words / Math.max(sentences.length, 1)

    // Part 2 is a long turn: a talk well under a minute is a fluency problem
    // regardless of how well the words themselves are chosen.
    const expectedSeconds = input.partNumber === 2 ? 90 : 40
    const durationRatio = Math.min(1, seconds / expectedSeconds)

    const fluency = roundToHalfBand(
      4 + durationRatio * 2.5 + (wordsPerMinute >= 110 && wordsPerMinute <= 170 ? 0.5 : 0) - fillerRatio * 12,
    )
    const lexical = roundToHalfBand(3.5 + variety * 5)
    const grammar = roundToHalfBand(5 + (avgSentenceLength >= 10 ? 1 : 0) - (avgSentenceLength > 34 ? 1.5 : 0))
    // Inferred from the transcript only — the simulated provider has no audio.
    const pronunciation = roundToHalfBand(5.5 - fillerRatio * 8)

    const feedback: string[] = [
      'Pronunciation here is inferred from your transcript — hesitations, repetitions and pace — not from acoustic analysis.',
    ]
    if (input.partNumber === 2 && seconds < 60) {
      feedback.push(`Fluency and Coherence: your long turn ran ${seconds} seconds, short of the one to two minutes Part 2 expects.`)
    }
    if (fillerRatio > 0.04) {
      feedback.push(`Fluency and Coherence: ${fillers} filler words interrupted your delivery.`)
    }
    if (variety < 0.4) {
      feedback.push('Lexical Resource: you repeated a small set of words rather than reaching for less common alternatives.')
    }

    return noResult<IeltsSpeakingScore>({
      overall_band: criteriaBand([fluency, lexical, grammar, pronunciation]),
      fluency_coherence: fluency,
      lexical_resource: lexical,
      grammatical_range_accuracy: grammar,
      pronunciation,
      feedback,
      strengths: durationRatio >= 1 ? ['You spoke for the full time the task allows.'] : [],
      improvements: fillerRatio > 0.04 ? ['Pause silently instead of filling the gap with "um" or "you know".'] : [],
      recommendations: ['Record the same cue card twice and keep the version with fewer hesitations.'],
    })
  },

  async improveWriting(input: WritingImprovementInput): Promise<AiResult<WritingImprovement>> {
    const draft = input.text.trim()
    if (draft.length === 0) {
      return noResult<WritingImprovement>({
        improved_text: '',
        summary: 'There was nothing to improve — the draft was empty.',
        edits: [],
        strengths: [],
        focus_next: ['Write a first draft, however rough. The tool repairs English; it cannot supply ideas.'],
      })
    }

    const { improved, edits } = improveText(draft)
    const byCategory = new Map<EditCategory, number>()
    for (const edit of edits) byCategory.set(edit.category, (byCategory.get(edit.category) ?? 0) + 1)

    const worst = [...byCategory.entries()].sort(([, a], [, b]) => b - a)[0]
    const words = countWords(draft)
    const variety = lexicalVariety(draft)

    const strengths: string[] = []
    if (variety > 0.55) strengths.push('Your vocabulary is varied — you rarely repeat the same word.')
    if (!byCategory.has('SPELLING')) strengths.push('No common misspellings were found in your draft.')
    if (input.wordLimitMin && words >= input.wordLimitMin) {
      strengths.push(`You reached ${words} words, which meets the ${input.wordLimitMin}-word minimum.`)
    }

    const focus: string[] = []
    if (worst) {
      focus.push(
        `${worst[0].toLowerCase()} accounted for ${worst[1]} of the ${edits.length} change${edits.length === 1 ? '' : 's'} below — that is the habit to break first.`,
      )
    }
    if (input.wordLimitMin && words < input.wordLimitMin) {
      focus.push(`You are ${input.wordLimitMin - words} words short of the required minimum of ${input.wordLimitMin}.`)
    }
    if (focus.length === 0) {
      focus.push('Re-read your next draft once for punctuation before you submit it.')
    }

    return noResult<WritingImprovement>({
      improved_text: improved,
      summary:
        edits.length === 0
          ? 'The simulated editor found no mechanical errors to fix. A live AI provider would also assess your argument, development and structure, which this rule-based editor deliberately leaves alone.'
          : `The simulated editor made ${edits.length} mechanical correction${edits.length === 1 ? '' : 's'} to spelling, punctuation, register and cohesion. It does not judge your argument or restructure your paragraphs — configure a live AI provider for that.`,
      edits,
      strengths,
      focus_next: focus,
    })
  },

  async generateRecommendation(input: RecommendationInput): Promise<AiResult<RecommendationPayload>> {
    const gap = input.targetScore - input.currentScore
    const weakest = input.weakestSkills[0]
    return noResult<RecommendationPayload>({
      recommendations: [
        {
          code: 'close_the_gap',
          title: `Close a ${Math.max(gap, 0)}-point gap`,
          body: `You are currently estimated at ${input.currentScore} against a target of ${input.targetScore}. Steady daily practice in your weakest section closes this fastest.`,
          priority: gap > 10 ? 90 : 60,
        },
        ...(weakest
          ? [
              {
                code: `improve_${weakest.skill}`,
                title: `Strengthen ${weakest.skill}`,
                body: `${weakest.skill} is your lowest enabling skill at ${weakest.score}. Target it with focused drills before attempting another full mock test.`,
                priority: 80,
              },
            ]
          : []),
      ],
    })
  },

  async analyzeProgress(input: ProgressAnalysisInput): Promise<AiResult<ProgressAnalysis>> {
    const first = input.history[0]?.score ?? input.currentScore
    const delta = input.currentScore - first
    return noResult<ProgressAnalysis>({
      summary:
        delta > 0
          ? `You have gained ${delta} points since you started, with ${input.attemptsLast30Days} attempts in the last 30 days. Keeping that cadence is the single strongest predictor of reaching ${input.targetScore}.`
          : `Your estimate has held steady over the recorded period across ${input.attemptsLast30Days} attempts in the last 30 days. Changing what you practise, not just how much, is the next step.`,
      strengths: Object.entries(input.sectionScores)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 1)
        .map(([section, value]) => `${section} is your strongest section at ${value}.`),
      weaknesses: Object.entries(input.sectionScores)
        .sort(([, a], [, b]) => a - b)
        .slice(0, 1)
        .map(([section, value]) => `${section} is holding your overall estimate down at ${value}.`),
      next_steps: ['Complete a full mock test this week to re-baseline every section.'],
      projected_score: Math.min(90, input.currentScore + Math.max(0, Math.round(delta / 2))),
    })
  },
}

export const demoTranscriptionProvider: TranscriptionProvider = {
  name: 'demo',
  available: true,
  async transcribe(input: TranscriptionInput): Promise<AiResult<Transcription>> {
    // Without a speech service there is nothing to transcribe. Returning the
    // expected text would fake a perfect score, so demo mode degrades the hint
    // deterministically instead — and the UI states that it is simulated.
    const hint = input.hint?.trim()
    if (!hint) {
      return noResult<Transcription>({ text: '', confidence: 0 })
    }
    const words = hint.split(/\s+/)
    const kept = words.filter((_, index) => index % 7 !== 6)
    return noResult<Transcription>({
      text: kept.join(' '),
      confidence: kept.length / Math.max(words.length, 1),
    })
  },
}
