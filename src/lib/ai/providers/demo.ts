import { countWords } from '../../utils'
import { contentOverlap, normalizeText } from '../../pte/scoring'
import type {
  AIProvider,
  AiResult,
  ProgressAnalysis,
  ProgressAnalysisInput,
  RecommendationInput,
  RecommendationPayload,
  SpeakingScore,
  SpeakingScoreInput,
  Transcription,
  TranscriptionInput,
  TranscriptionProvider,
  WritingScore,
  WritingScoreInput,
} from '../types'

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
