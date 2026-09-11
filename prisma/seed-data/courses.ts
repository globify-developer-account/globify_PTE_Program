import type { Difficulty, LessonKind, PteSection } from '@prisma/client'

/**
 * Starter courses for the Learn area.
 *
 * A course is the curriculum layer: it sequences work that other parts of the
 * platform already run. A lesson with `questionCodes` opens a practice session
 * over those exact bank questions; a dictation or shadowing lesson points at a
 * seeded drill by `drillSlug`. Nothing here re-implements an exercise.
 *
 * Video lessons ship without a `videoUrl` on purpose — the recordings are
 * uploaded per installation. The transcript, cues and drills are all authored,
 * so a lesson becomes complete the moment its media is attached.
 */

export interface SeedCue {
  start: number
  end: number
  text: string
}

export interface SeedTerm {
  term: string
  definition: string
  example?: string
  phonetic?: string
}

export interface SeedLesson {
  slug: string
  number: number
  title: string
  summary?: string
  kind: LessonKind
  /** Title of the module this belongs to, or omitted to hang off the course. */
  module?: string
  estimatedMinutes: number
  isPremium?: boolean
  body?: string
  keyPoints?: string[]
  cues?: SeedCue[]
  terms?: SeedTerm[]
  /** Slug of a seeded drill, for DICTATION and SHADOWING lessons. */
  drillSlug?: string
  source?: { label: string; href?: string }
  /** Bank question codes to attach as the lesson's practice drill. */
  questionCodes?: string[]
}

export interface SeedCourse {
  slug: string
  title: string
  subtitle: string
  description: string
  section: PteSection | null
  level: Difficulty
  isPremium: boolean
  tags: string[]
  displayOrder: number
  modules: Array<{ title: string; description?: string }>
  lessons: SeedLesson[]
}

export const SEED_COURSES: SeedCourse[] = [
  {
    slug: 'listening-foundations',
    title: 'Listening Foundations',
    subtitle: 'Catch what you are currently missing',
    description:
      'Most listening marks are lost to sounds that were never heard, not to words that were never learned. This course works through connected speech, note-taking and the two task types that punish a wandering ear hardest.',
    section: 'LISTENING',
    level: 'EASY',
    isPremium: false,
    tags: ['listening', 'dictation', 'note-taking'],
    displayOrder: 1,
    modules: [
      {
        title: 'Hearing the sentence',
        description: 'Why fluent English does not sound like the words on the page.',
      },
      {
        title: 'Working under exam pressure',
        description: 'Turning what you heard into marks before the timer runs out.',
      },
    ],
    lessons: [
      {
        slug: 'connected-speech',
        number: 1,
        title: 'Why fluent English sounds like one long word',
        summary: 'Linking, elision and weak forms — the three reasons a sentence you know still slips past you.',
        kind: 'VIDEO',
        module: 'Hearing the sentence',
        estimatedMinutes: 8,
        body: `A native speaker does not pause between words. Sounds run together, some disappear entirely, and the small grammar words shrink to almost nothing. "What are you going to do?" leaves the mouth as something closer to "whaddaya gonna do".

This is not sloppiness, and slowing the recording down will not fix it. The sounds you are missing are absent from careful speech too — they are a feature of the language, and the only cure is hearing them often enough to stop noticing.

Work through the transcript below with the audio. Play a line, read it, then play it again with your eyes closed. The gap between what is written and what you hear is exactly what you have been losing marks to.`,
        keyPoints: [
          'Linking: a final consonant joins the next vowel, so "picked it up" becomes one unit.',
          'Elision: /t/ and /d/ vanish between consonants — "next day" loses its t.',
          'Weak forms: to, of, and, for, was and can shrink to an unstressed uh sound.',
          'Never study a listening transcript silently. Read it while the audio plays.',
        ],
        cues: [
          { start: 0, end: 5.5, text: 'When you read a sentence, you see the spaces between the words.' },
          { start: 5.5, end: 11, text: 'When you hear that same sentence, those spaces are simply not there.' },
          { start: 11, end: 18, text: 'A speaker links the end of one word to the start of the next, drops sounds that get in the way, and shrinks the small words almost to nothing.' },
          { start: 18, end: 24, text: 'Take a phrase like: he picked it up and put it away.' },
          { start: 24, end: 30, text: 'In careful speech that is eight separate words, each one clear.' },
          { start: 30, end: 36, text: 'At a normal speed it arrives as two blocks of sound, and the t in put has all but disappeared.' },
          { start: 36, end: 43, text: 'The words did not change. Your ear was listening for something the speaker never produced.' },
          { start: 43, end: 50, text: 'So the exercise is not to listen harder. It is to learn what fluent speech actually sounds like.' },
        ],
        terms: [
          {
            term: 'linking',
            phonetic: '/ˈlɪŋkɪŋ/',
            definition: 'Joining the final sound of one word to the first sound of the next.',
            example: '"turn it off" is produced as "tur-ni-toff".',
          },
          {
            term: 'elision',
            phonetic: '/ɪˈlɪʒən/',
            definition: 'Dropping a sound entirely, usually a /t/ or /d/ caught between consonants.',
            example: '"last night" loses the t of last.',
          },
          {
            term: 'weak form',
            definition: 'The reduced, unstressed pronunciation of a common grammar word.',
            example: '"fish and chips" — the "and" becomes a short "n".',
          },
        ],
      },
      {
        slug: 'dictation-warm-up',
        number: 2,
        title: 'Dictation: hear it, hold it, type it',
        summary: 'A short recording, one sentence at a time, marked word by word.',
        kind: 'DICTATION',
        module: 'Hearing the sentence',
        estimatedMinutes: 10,
        drillSlug: 'morning-routine',
        body: `Dictation is the most honest listening exercise there is. You cannot guess your way through it, and the mistakes tell you precisely which sounds are not yet reliable.

Type what you hear, not what you think should be there. If you write a sentence that is grammatical but not the one that was said, you have corrected the speaker instead of listening to them — and Write From Dictation gives no credit for that.`,
        keyPoints: [
          'Play a line once at full speed before you replay it. Exam conditions come first.',
          'Type immediately. The sentence is in memory for a few seconds, not a few minutes.',
          'Spelling is marked. A word you can hear but cannot spell still costs you.',
        ],
      },
      {
        slug: 'note-taking-that-survives',
        number: 3,
        title: 'Notes you can actually read back',
        summary: 'What to write down during a lecture, and — more importantly — what not to.',
        kind: 'ARTICLE',
        module: 'Working under exam pressure',
        estimatedMinutes: 6,
        body: `The instinct in Summarize Spoken Text and Retell Lecture is to write as much as possible. It is the wrong instinct. Writing competes with listening for the same attention, and a full page of half-heard fragments summarises nothing.

Aim for around eight to twelve items for a ninety-second lecture. Capture the shape of the argument — the claim, the two or three supports, the conclusion — plus any number, name or date, because those are the details you will not reconstruct from memory.

Use a fixed shorthand and never invent one mid-lecture. Arrows for cause and consequence, a plus for supporting evidence, a minus for a counter-argument. The system matters less than using the same one every time.`,
        keyPoints: [
          'Write the structure, not the sentences.',
          'Always capture numbers, names and dates verbatim — they will not come back.',
          'One consistent shorthand, used every time, beats a clever one invented on the spot.',
          'If you are still writing when the audio stops, you wrote too much.',
        ],
        questionCodes: ['SST-001', 'RL-001'],
      },
      {
        slug: 'highlight-and-fill',
        number: 4,
        title: 'Reading and listening at the same time',
        summary: 'Highlight Incorrect Words and Listening: Fill in the Blanks reward one specific habit.',
        kind: 'QUIZ',
        module: 'Working under exam pressure',
        estimatedMinutes: 12,
        body: `Both of these tasks put a transcript in front of you while the audio plays. The trap is the same in each: your eyes move faster than the speaker, you get ahead, and by the time you notice you have lost your place entirely.

Track the audio with your cursor. Keep it under the word currently being spoken, and let it drag your eyes at the speaker's pace rather than your own. It feels slow. It is the only way to be in the right place when the difference arrives.`,
        keyPoints: [
          'Follow the audio with your cursor, one word behind the voice.',
          'In Highlight Incorrect Words, a wrong click cancels out a right one — do not guess.',
          'In Listening: Fill in the Blanks, type as you hear it and fix the spelling afterwards.',
        ],
        questionCodes: ['HIW-001', 'LFIB-001', 'LMCQ-001'],
      },
    ],
  },
  {
    slug: 'speaking-fluency-lab',
    title: 'Speaking Fluency Lab',
    subtitle: 'Fluency is a rhythm, not a speed',
    description:
      'Oral fluency is scored on evenness, not pace. This course fixes the three habits that cost the most — restarting sentences, filling gaps with noise, and stressing every word equally — then puts them under exam timing.',
    section: 'SPEAKING',
    level: 'MEDIUM',
    isPremium: true,
    tags: ['speaking', 'fluency', 'pronunciation', 'shadowing'],
    displayOrder: 2,
    modules: [
      { title: 'The habits that cost marks' },
      { title: 'Building the rhythm' },
    ],
    lessons: [
      {
        slug: 'what-fluency-is-scored-on',
        number: 1,
        title: 'What the fluency score is actually measuring',
        summary: 'Even pace, no repairs, no hesitation. Speed is not on the list.',
        kind: 'ARTICLE',
        module: 'The habits that cost marks',
        estimatedMinutes: 5,
        body: `Oral fluency measures rhythm: whether your speech runs at an even pace with natural phrasing and no repairs. Speaking quickly does not raise it. Speaking evenly does.

Three habits pull the score down more than anything else. Restarting a sentence you have already begun is scored as a repair. Filling a pause with "um" is scored as hesitation, where a short silence would not be. And stressing every word equally — a flat, machine-gun delivery — reads as unnatural phrasing even when every word is correct.

The fix for all three is the same: commit to a slower starting pace. Almost everyone who scores badly on fluency began the sentence faster than they could finish it.`,
        keyPoints: [
          'A repair costs more than the awkward phrase you were trying to fix. Finish the sentence.',
          'Silence is cheaper than "um". A brief pause is not penalised; a filler is.',
          'Start slower than feels natural. You cannot decelerate mid-sentence without a repair.',
        ],
      },
      {
        slug: 'shadowing-the-model',
        number: 2,
        title: 'Shadowing: borrow someone else’s rhythm',
        summary: 'Repeat a line immediately after the model and compare the two recordings.',
        kind: 'SHADOWING',
        module: 'Building the rhythm',
        estimatedMinutes: 15,
        drillSlug: 'the-value-of-sleep',
        body: `Shadowing is the fastest route to a natural rhythm, because it removes the hardest part of speaking — deciding what to say. The words are given. All that is left is how they sound.

Repeat each line immediately after the model, while the sound is still in your ear. Then play both back to back. You are listening for two things: where you flattened the stress, and where you sped up to catch the end of the phrase.`,
        keyPoints: [
          'Repeat immediately. A pause to think turns shadowing back into reading aloud.',
          'Match the pauses as carefully as the words — phrasing is most of the score.',
          'Compare the two recordings. What you notice is worth more than what you were told.',
        ],
      },
      {
        slug: 'read-aloud-under-timing',
        number: 3,
        title: 'Read Aloud with the clock running',
        summary: 'Thirty-five seconds to prepare, forty to deliver. Here is how to spend them.',
        kind: 'VIDEO',
        module: 'Building the rhythm',
        estimatedMinutes: 12,
        body: `The preparation time is not for reading the text once. It is for marking it up.

Find the phrase boundaries first — the natural breathing points, usually at commas and between clauses. Then find the one or two content words in each phrase that carry the meaning, and plan to lean on them. Everything else can stay light.

When the recording starts, deliver what you rehearsed. Do not read ahead; you have already read it.`,
        keyPoints: [
          'Mark phrase boundaries during preparation, not sentence boundaries.',
          'Lean on the content words. Grammar words stay unstressed.',
          'Never restart. A mispronounced word costs one word; a restart costs the fluency score.',
        ],
        cues: [
          { start: 0, end: 6, text: 'You get thirty-five seconds with the text before the microphone opens.' },
          { start: 6, end: 12, text: 'Most people spend it reading the passage through, silently, twice.' },
          { start: 12, end: 18, text: 'That tells you what the text says. It does not tell you how to say it.' },
          { start: 18, end: 26, text: 'Instead, find the phrase boundaries — the places you would naturally take a breath.' },
          { start: 26, end: 33, text: 'Then pick the one or two words in each phrase that actually carry the meaning.' },
          { start: 33, end: 40, text: 'Those are the words you lean on. Everything else stays light and quick.' },
          { start: 40, end: 47, text: 'When the tone sounds, deliver the version you rehearsed, at the pace you rehearsed it.' },
        ],
        questionCodes: ['RA-001', 'RA-002', 'RA-003'],
      },
      {
        slug: 'describe-image-template',
        number: 4,
        title: 'Describe Image without running dry',
        summary: 'A four-part frame that fills forty seconds on any chart, map or process.',
        kind: 'ARTICLE',
        module: 'Building the rhythm',
        estimatedMinutes: 8,
        body: `Twenty-five seconds of preparation is not enough to invent a structure, so bring one with you.

Open by naming the image type and its subject. Give the most obvious extreme — the highest bar, the largest share, the first step. Add one comparison or trend. Close with a one-sentence summary of what the image is showing overall.

Four moves, roughly ten seconds each. It does not matter that it is formulaic. It matters that you are still speaking at second thirty-eight.`,
        keyPoints: [
          'Name the image type and subject in the first sentence. Never open with "this image shows".',
          'One extreme, one comparison, one summary. That is the whole frame.',
          'Speaking to the end of the time matters more than covering every detail.',
        ],
        questionCodes: ['DI-001', 'DI-002'],
      },
    ],
  },
  {
    slug: 'academic-word-power',
    title: 'Academic Word Power',
    subtitle: 'The vocabulary that lifts every section at once',
    description:
      'The same few hundred academic words carry the reading passages, the lecture audio and the essays you are expected to write. This course builds them in the order they pay off, with flashcards and drills across all four sections.',
    section: null,
    level: 'MEDIUM',
    isPremium: false,
    tags: ['vocabulary', 'reading', 'writing'],
    displayOrder: 3,
    modules: [{ title: 'Core academic verbs' }, { title: 'Putting them to work' }],
    lessons: [
      {
        slug: 'reporting-verbs',
        number: 1,
        title: 'Reporting verbs that carry an argument',
        summary: 'Fourteen verbs that let you describe what a source claims without repeating "says".',
        kind: 'VOCABULARY',
        module: 'Core academic verbs',
        estimatedMinutes: 10,
        body: `Reading passages and lectures are built out of claims, and the verb doing the reporting tells you how strongly the claim is being made. "Suggests" and "demonstrates" are not interchangeable, and multiple-choice questions are written on exactly that difference.

These are also the verbs that make a summary read as academic rather than conversational, which is why they earn marks in Summarize Written Text as well as points in Reading.`,
        terms: [
          { term: 'assert', phonetic: '/əˈsɜːt/', definition: 'To state firmly, with confidence and without hedging.', example: 'The author asserts that the policy failed.' },
          { term: 'contend', definition: 'To argue a position, usually against an opposing one.', example: 'Critics contend that the data was selectively reported.' },
          { term: 'demonstrate', definition: 'To show something is true using evidence.', example: 'The study demonstrates a clear link between the two.' },
          { term: 'imply', definition: 'To suggest something without stating it outright.', example: 'The findings imply a longer recovery than expected.' },
          { term: 'refute', phonetic: '/rɪˈfjuːt/', definition: 'To prove a claim wrong, not merely to disagree with it.', example: 'The follow-up study refuted the original conclusion.' },
          { term: 'concede', definition: 'To admit a point that weakens your own argument.', example: 'The author concedes that the sample was small.' },
          { term: 'attribute', definition: 'To name something as the cause or source.', example: 'They attribute the decline to rising costs.' },
          { term: 'undermine', definition: 'To weaken something gradually.', example: 'The inconsistency undermines the whole argument.' },
        ],
        questionCodes: ['RMCQ-001', 'RWFIB-001'],
      },
      {
        slug: 'trend-language',
        number: 2,
        title: 'Describing change without repeating yourself',
        summary: 'Flashcards for the rise-and-fall language that Describe Image and Write Essay both need.',
        kind: 'FLASHCARD',
        module: 'Core academic verbs',
        estimatedMinutes: 8,
        terms: [
          { term: 'surge', definition: 'A sudden, large increase.', example: 'Applications surged after the fee was dropped.' },
          { term: 'plateau', phonetic: '/ˈplætəʊ/', definition: 'To stop rising and stay level.', example: 'Growth plateaued in the third quarter.' },
          { term: 'taper off', definition: 'To decrease gradually.', example: 'Demand tapered off through the winter.' },
          { term: 'fluctuate', definition: 'To rise and fall repeatedly, without a clear direction.', example: 'Prices fluctuated all year.' },
          { term: 'peak', definition: 'To reach the highest point before declining.', example: 'Sales peaked in June.' },
          { term: 'stagnate', definition: 'To stay flat when growth was expected.', example: 'Wages stagnated for a decade.' },
          { term: 'plummet', definition: 'To fall suddenly and steeply.', example: 'Attendance plummeted after the change.' },
          { term: 'level off', definition: 'To become steady after a period of change.', example: 'The figures levelled off in 2019.' },
        ],
      },
      {
        slug: 'collocation-not-synonyms',
        number: 3,
        title: 'Why a thesaurus loses you marks',
        summary: 'Fill in the Blanks tests which words go together, not which words mean the same.',
        kind: 'ARTICLE',
        module: 'Putting them to work',
        estimatedMinutes: 7,
        body: `Both Fill in the Blanks tasks give you options that are close in meaning. Only one of them collocates — that is, only one is the word English speakers actually put next to that noun.

You can conduct research, carry out research or do research. You cannot make research, even though "make" and "do" are near neighbours in every dictionary. No rule predicts this. It is learned by meeting words in company.

So record vocabulary in phrases, never as single words. "Research" on a flashcard teaches you nothing you did not know. "Conduct extensive research into" teaches you three things at once.`,
        keyPoints: [
          'Learn the phrase, not the word. Include the verb and the preposition.',
          'A synonym that does not collocate is still wrong.',
          'When two options both fit the meaning, choose the one you have actually seen before.',
        ],
        questionCodes: ['RFIB-001', 'RFIB-002', 'RWFIB-002'],
      },
    ],
  },
]
