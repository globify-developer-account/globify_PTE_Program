/**
 * Live class schedule.
 *
 * Times are relative to the seed run rather than fixed dates, so a freshly
 * seeded install always has one class in progress and several ahead of it —
 * otherwise the dashboard's schedule looks broken the day after seeding.
 */

export interface SeedLiveClass {
  slug: string
  title: string
  description: string
  kind: 'LIVE_CLASS' | 'LECTURE' | 'PRACTICE_SESSION' | 'WORKSHOP'
  section: 'SPEAKING' | 'WRITING' | 'READING' | 'LISTENING' | null
  instructorName: string
  /** Hours from the moment the seed runs. Negative means already started. */
  startsInHours: number
  durationMinutes: number
  capacity: number | null
  isPremium: boolean
}

export const SEED_LIVE_CLASSES: SeedLiveClass[] = [
  {
    slug: 'respond-to-a-situation-clinic',
    title: 'Respond to a Situation: what the scorer is listening for',
    description:
      'The newest speaking task, broken down. We cover the three-part answer shape that reliably scores, and where candidates lose marks for being too brief.',
    kind: 'LIVE_CLASS',
    section: 'SPEAKING',
    instructorName: 'Ayesha Raza',
    startsInHours: -0.5,
    durationMinutes: 90,
    capacity: 60,
    isPremium: true,
  },
  {
    slug: 'reading-fib-lecture',
    title: 'Reading Fill in the Blanks: collocation over meaning',
    description:
      'Most FIB blanks are decided by the word beside them, not the sentence around them. This lecture drills the collocations that decide the majority of items.',
    kind: 'LECTURE',
    section: 'READING',
    instructorName: 'Bilal Ahmed',
    startsInHours: 30,
    durationMinutes: 90,
    capacity: 120,
    isPremium: true,
  },
  {
    slug: 'speaking-practice-session',
    title: 'Speaking practice session with live feedback',
    description:
      'Bring your microphone. You read aloud, describe an image and retell a lecture, and get corrected on the spot.',
    kind: 'PRACTICE_SESSION',
    section: 'SPEAKING',
    instructorName: 'Ayesha Raza',
    startsInHours: 34,
    durationMinutes: 60,
    capacity: 20,
    isPremium: true,
  },
  {
    slug: 'wfd-memory-workshop',
    title: 'Write From Dictation: holding a sentence in memory',
    description:
      'WFD is worth more than its length suggests. A workshop on the note-taking and chunking techniques that hold a 12-word sentence long enough to type it.',
    kind: 'WORKSHOP',
    section: 'LISTENING',
    instructorName: 'Sana Malik',
    startsInHours: 54,
    durationMinutes: 75,
    capacity: 40,
    isPremium: false,
  },
  {
    slug: 'essay-structure-lecture',
    title: 'Write Essay: a structure that scores on form every time',
    description:
      'Form is the easiest essay trait to secure and the one most often thrown away. We build a paragraph template that satisfies it without sounding mechanical.',
    kind: 'LECTURE',
    section: 'WRITING',
    instructorName: 'Bilal Ahmed',
    startsInHours: 78,
    durationMinutes: 90,
    capacity: null,
    isPremium: true,
  },
  {
    slug: 'exam-day-briefing',
    title: 'Exam day briefing: the test centre, start to finish',
    description:
      'What actually happens on the day — check-in, the microphone test, timing between sections, and what you may and may not take in. Free for everyone.',
    kind: 'WORKSHOP',
    section: null,
    instructorName: 'Sana Malik',
    startsInHours: 102,
    durationMinutes: 45,
    capacity: null,
    isPremium: false,
  },
]
