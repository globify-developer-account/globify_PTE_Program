/**
 * Starter content for the dictation & shadowing library.
 *
 * Transcripts only — the seed cannot produce audio, and a drill is nothing
 * without its recording. These are created as DRAFT with an empty `audioUrl`,
 * so they stay out of the student library until an administrator opens
 * /admin/drills, uploads a recording and marks where each line falls. That is
 * also why no segment timings are given here: they belong to a specific take.
 *
 * The passages are original, written for this product, and graded from short
 * everyday sentences up to academic register.
 */

export interface SeedDrillCategory {
  slug: string
  name: string
  description: string
  displayOrder: number
}

export interface SeedDrill {
  slug: string
  categorySlug: string
  title: string
  description: string
  accent: string
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  isPremium: boolean
  tags: string[]
  displayOrder: number
  /** Split into lines by the seed using the same rule the editor applies. */
  transcript: string
}

export const SEED_DRILL_CATEGORIES: SeedDrillCategory[] = [
  {
    slug: 'daily-life',
    name: 'Daily Life',
    description: 'Everyday situations at a natural speaking pace. Start here.',
    displayOrder: 1,
  },
  {
    slug: 'academic',
    name: 'Academic Extracts',
    description: 'Lecture and textbook register, closer to what the exam uses.',
    displayOrder: 2,
  },
  {
    slug: 'exam-sentences',
    name: 'Exam Sentences',
    description: 'Single sentences in the style of Write From Dictation and Repeat Sentence.',
    displayOrder: 3,
  },
]

export const SEED_DRILLS: SeedDrill[] = [
  {
    slug: 'morning-routine',
    categorySlug: 'daily-life',
    title: 'A Morning Routine',
    description: 'Short, simple sentences about an ordinary weekday morning.',
    accent: 'British',
    difficulty: 'EASY',
    isPremium: false,
    tags: ['beginner', 'everyday'],
    displayOrder: 1,
    transcript:
      'The alarm goes off at half past six. I make a cup of tea before anyone else is awake. ' +
      'The kitchen is cold, so I open the blinds and let the sun in. ' +
      'By seven the house is noisy again. I leave for the bus at ten past eight.',
  },
  {
    slug: 'the-lost-umbrella',
    categorySlug: 'daily-life',
    title: 'The Lost Umbrella',
    description: 'A short story with past tenses and a few longer clauses.',
    accent: 'British',
    difficulty: 'EASY',
    isPremium: false,
    tags: ['story', 'past tense'],
    displayOrder: 2,
    transcript:
      'I left my umbrella on the train last Thursday. It was the black one my sister gave me. ' +
      'When I called the station, the man said that nobody had handed anything in. ' +
      'Two days later it turned up in the lost property office, slightly bent but still working.',
  },
  {
    slug: 'a-new-city',
    categorySlug: 'daily-life',
    title: 'Moving to a New City',
    description: 'Conversational narration with linking words and contrast.',
    accent: 'American',
    difficulty: 'MEDIUM',
    isPremium: false,
    tags: ['narrative'],
    displayOrder: 3,
    transcript:
      'Everyone told me the first month would be the hardest, and they were right. ' +
      'I knew almost nobody, and the streets all looked the same to me. ' +
      'What changed things was joining a running club near the river. ' +
      'Within a few weeks I had people to talk to, and the city started to feel like somewhere I lived rather than somewhere I was staying.',
  },
  {
    slug: 'how-glass-is-made',
    categorySlug: 'academic',
    title: 'How Glass Is Made',
    description: 'A process description with technical vocabulary and passive forms.',
    accent: 'British',
    difficulty: 'MEDIUM',
    isPremium: false,
    tags: ['process', 'science'],
    displayOrder: 4,
    transcript:
      'Glass is produced by heating sand, soda ash and limestone to roughly sixteen hundred degrees Celsius. ' +
      'At that temperature the mixture becomes a thick liquid that can be floated across a bath of molten tin. ' +
      'Because tin is denser than glass, the glass spreads out and cools into a perfectly flat sheet. ' +
      'The process was patented in the nineteen fifties and is still responsible for most of the window glass made today.',
  },
  {
    slug: 'urban-heat-islands',
    categorySlug: 'academic',
    title: 'Urban Heat Islands',
    description: 'Lecture register with data, comparison and cause-and-effect.',
    accent: 'American',
    difficulty: 'HARD',
    isPremium: true,
    tags: ['lecture', 'geography'],
    displayOrder: 5,
    transcript:
      'Cities are consistently warmer than the countryside around them, an effect known as the urban heat island. ' +
      'The difference is usually between one and three degrees, though on still summer nights it can exceed seven. ' +
      'Concrete and asphalt absorb heat through the day and release it slowly after sunset, while the loss of vegetation removes the cooling that evaporation would otherwise provide. ' +
      'Planting trees along streets is among the cheapest interventions available, and its effect is measurable within a single season.',
  },
  {
    slug: 'the-value-of-sleep',
    categorySlug: 'academic',
    title: 'The Value of Sleep',
    description: 'Research summary with hedging language and reported findings.',
    accent: 'British',
    difficulty: 'HARD',
    isPremium: true,
    tags: ['lecture', 'health'],
    displayOrder: 6,
    transcript:
      'Researchers have long suspected that sleep does more than simply rest the body. ' +
      'Recent work suggests that during deep sleep the brain clears waste proteins that accumulate while we are awake. ' +
      'Participants who slept fewer than six hours performed measurably worse on tasks requiring sustained attention, even when they reported feeling alert. ' +
      'The findings do not prove causation, but they do make the case for treating sleep as a component of health rather than a luxury.',
  },
  {
    slug: 'exam-sentences-one',
    categorySlug: 'exam-sentences',
    title: 'Exam Sentences: Set 1',
    description: 'Ten unrelated sentences, the length used in Write From Dictation.',
    accent: 'British',
    difficulty: 'MEDIUM',
    isPremium: false,
    tags: ['write from dictation', 'exam'],
    displayOrder: 7,
    transcript:
      'The seminar has been moved to the lecture theatre on the second floor. ' +
      'Students must submit their assignments before the end of the semester. ' +
      'The library will remain open during the examination period. ' +
      'Additional funding has been allocated to the research department. ' +
      'All laboratory equipment should be returned after use.',
  },
  {
    slug: 'exam-sentences-two',
    categorySlug: 'exam-sentences',
    title: 'Exam Sentences: Set 2',
    description: 'Longer sentences with the academic vocabulary the exam favours.',
    accent: 'American',
    difficulty: 'HARD',
    isPremium: true,
    tags: ['write from dictation', 'exam'],
    displayOrder: 8,
    transcript:
      'The committee concluded that the proposal required substantial revision before approval. ' +
      'Undergraduate enrolment has increased steadily over the past three academic years. ' +
      'Participants were asked to complete the questionnaire anonymously. ' +
      'The department will announce the successful applicants at the end of the month. ' +
      'Preliminary results indicate a significant improvement in overall performance.',
  },
]
