import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import { PrismaClient, type Difficulty, type Prisma, type PteSection } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { SEED_QUESTIONS } from './seed-data/questions'
import { SEED_DRILLS, SEED_DRILL_CATEGORIES } from './seed-data/drills'
import { splitIntoSegments, tokenize } from '../src/lib/drills/diff'
import { SEED_WRITING_EXERCISES } from './seed-data/writing-exercises'

/**
 * Seeds a complete, demonstrable installation: the task catalogue, a question
 * bank, three plans, three mock tests, an admin and ten students with realistic
 * practice history.
 *
 * The script is idempotent — every write is an upsert keyed on a natural key —
 * so it can be re-run against an existing database without duplicating data.
 */

const prisma = new PrismaClient()

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL?.trim() || 'admin@globifyconsultants.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD?.trim() || 'GlobifyAdmin!2026'
const STUDENT_PASSWORD = process.env.SEED_STUDENT_PASSWORD?.trim() || 'GlobifyStudent!2026'

// --- task catalogue -----------------------------------------------------------

const QUESTION_TYPES = [
  { code: 'READ_ALOUD', name: 'Read Aloud', shortName: 'RA', section: 'SPEAKING', renderer: 'speaking-read-aloud', description: 'Read a short text aloud, clearly and naturally, within the time limit.', skills: ['pronunciation', 'oralFluency', 'content'], time: 40, prep: 35, audio: true, text: false, order: 1 },
  { code: 'REPEAT_SENTENCE', name: 'Repeat Sentence', shortName: 'RS', section: 'SPEAKING', renderer: 'speaking-audio-prompt', description: 'Listen to a sentence and repeat it exactly as you heard it.', skills: ['pronunciation', 'oralFluency', 'listening', 'content'], time: 15, prep: 3, audio: true, text: false, order: 2 },
  { code: 'DESCRIBE_IMAGE', name: 'Describe Image', shortName: 'DI', section: 'SPEAKING', renderer: 'speaking-image-prompt', description: 'Study the image and describe what it shows in detail.', skills: ['oralFluency', 'pronunciation', 'vocabulary', 'content'], time: 40, prep: 25, audio: true, text: false, order: 3 },
  { code: 'RETELL_LECTURE', name: 'Retell Lecture', shortName: 'RL', section: 'SPEAKING', renderer: 'speaking-audio-prompt', description: 'Listen to a lecture and retell it in your own words.', skills: ['oralFluency', 'pronunciation', 'content', 'listening'], time: 40, prep: 10, audio: true, text: false, order: 4 },
  { code: 'ANSWER_SHORT_QUESTION', name: 'Answer Short Question', shortName: 'ASQ', section: 'SPEAKING', renderer: 'speaking-audio-prompt', description: 'Answer a short question in one or a few words.', skills: ['listening', 'vocabulary', 'content'], time: 10, prep: 3, audio: true, text: false, order: 5 },
  { code: 'SUMMARIZE_WRITTEN_TEXT', name: 'Summarize Written Text', shortName: 'SWT', section: 'WRITING', renderer: 'writing-text', description: 'Summarise the passage in a single sentence of 5–75 words.', skills: ['content', 'form', 'grammar', 'vocabulary'], time: 600, prep: null, audio: false, text: true, order: 6 },
  { code: 'ESSAY', name: 'Write Essay', shortName: 'WE', section: 'WRITING', renderer: 'writing-text', description: 'Write a 200–300 word argumentative essay on the given topic.', skills: ['content', 'form', 'grammar', 'vocabulary', 'writtenDiscourse', 'spelling'], time: 1200, prep: null, audio: false, text: true, order: 7 },
  { code: 'READING_MCQ_SINGLE', name: 'Multiple Choice, Single Answer', shortName: 'R-MCQ', section: 'READING', renderer: 'choice-single', description: 'Read the passage and choose the single best answer.', skills: ['reading', 'content'], time: 120, prep: null, audio: false, text: false, order: 8 },
  { code: 'READING_MCQ_MULTIPLE', name: 'Multiple Choice, Multiple Answers', shortName: 'R-MCM', section: 'READING', renderer: 'choice-multiple', description: 'Choose every option that correctly answers the question. Wrong choices lose marks.', skills: ['reading', 'content'], time: 180, prep: null, audio: false, text: false, order: 9 },
  { code: 'REORDER_PARAGRAPHS', name: 'Re-order Paragraphs', shortName: 'RO', section: 'READING', renderer: 'reorder', description: 'Arrange the text boxes into the correct logical order.', skills: ['reading', 'writtenDiscourse'], time: 180, prep: null, audio: false, text: false, order: 10 },
  { code: 'READING_FILL_BLANKS', name: 'Reading: Fill in the Blanks', shortName: 'R-FIB', section: 'READING', renderer: 'fill-blanks-dropdown', description: 'Choose the correct word for each blank in the passage.', skills: ['reading', 'vocabulary', 'grammar'], time: 180, prep: null, audio: false, text: false, order: 11 },
  { code: 'READING_WRITING_FILL_BLANKS', name: 'Reading & Writing: Fill in the Blanks', shortName: 'RW-FIB', section: 'READING', renderer: 'fill-blanks-dropdown', description: 'Choose the word that fits each blank in both meaning and grammar.', skills: ['reading', 'vocabulary', 'grammar', 'writtenDiscourse'], time: 210, prep: null, audio: false, text: false, order: 12 },
  { code: 'SUMMARIZE_SPOKEN_TEXT', name: 'Summarize Spoken Text', shortName: 'SST', section: 'LISTENING', renderer: 'writing-text', description: 'Listen to a lecture and summarise it in 50–70 words.', skills: ['listening', 'content', 'form', 'grammar', 'vocabulary', 'spelling'], time: 600, prep: null, audio: false, text: true, order: 13 },
  { code: 'LISTENING_MCQ_SINGLE', name: 'Listening: Multiple Choice, Single Answer', shortName: 'L-MCQ', section: 'LISTENING', renderer: 'choice-single', description: 'Listen to the recording and choose the single best answer.', skills: ['listening', 'content'], time: 120, prep: null, audio: false, text: false, order: 14 },
  { code: 'LISTENING_MCQ_MULTIPLE', name: 'Listening: Multiple Choice, Multiple Answers', shortName: 'L-MCM', section: 'LISTENING', renderer: 'choice-multiple', description: 'Select every correct option. Incorrect selections lose marks.', skills: ['listening', 'content'], time: 150, prep: null, audio: false, text: false, order: 15 },
  { code: 'LISTENING_FILL_BLANKS', name: 'Listening: Fill in the Blanks', shortName: 'L-FIB', section: 'LISTENING', renderer: 'fill-blanks-typed', description: 'Type the missing word you hear into each blank in the transcript.', skills: ['listening', 'spelling', 'vocabulary'], time: 180, prep: null, audio: false, text: false, order: 16 },
  { code: 'HIGHLIGHT_INCORRECT_WORDS', name: 'Highlight Incorrect Words', shortName: 'HIW', section: 'LISTENING', renderer: 'highlight-words', description: 'Click the words in the transcript that differ from the recording.', skills: ['listening', 'reading'], time: 150, prep: null, audio: false, text: false, order: 17 },
  { code: 'WRITE_FROM_DICTATION', name: 'Write From Dictation', shortName: 'WFD', section: 'LISTENING', renderer: 'dictation', description: 'Type the sentence exactly as you hear it.', skills: ['listening', 'spelling', 'grammar'], time: 60, prep: null, audio: false, text: false, order: 18 },
] as const

const PLANS = [
  {
    code: 'starter',
    name: 'Starter',
    tagline: 'Try the full platform for a month',
    description: 'Everything you need to build a consistent practice habit, with AI scoring on every response.',
    priceCents: 249_900,
    compareAtCents: null,
    durationDays: 30,
    isPopular: false,
    badge: null,
    displayOrder: 1,
    features: [
      'Unlimited practice across all 18 task types',
      '60 AI speaking evaluations per month',
      '40 AI writing evaluations per month',
      '4 full mock tests per month',
      'Detailed score breakdowns and feedback',
      'Progress analytics and recommendations',
    ],
    limits: { aiSpeakingPerMonth: 60, aiWritingPerMonth: 40, mockTestsPerMonth: 4, practicePerDay: -1, teacherReviews: 0, advancedAnalytics: true },
  },
  {
    code: 'premium',
    name: 'Premium',
    tagline: 'The complete preparation programme',
    description: 'Unlimited AI evaluation, every mock test, and teacher review on the responses that matter most.',
    priceCents: 599_900,
    compareAtCents: 749_900,
    durationDays: 90,
    isPopular: true,
    badge: 'Most popular',
    displayOrder: 2,
    features: [
      'Everything in Starter',
      'Unlimited AI speaking and writing evaluations',
      'Unlimited full mock tests',
      '5 teacher reviews per month',
      'Priority WhatsApp support',
      'Premium question bank and templates',
    ],
    limits: { aiSpeakingPerMonth: -1, aiWritingPerMonth: -1, mockTestsPerMonth: -1, practicePerDay: -1, teacherReviews: 5, advancedAnalytics: true },
  },
  {
    code: 'intensive',
    name: 'Intensive',
    tagline: 'For a test date that is close',
    description: 'Six months of unlimited access with weekly teacher review and a personalised study plan.',
    priceCents: 999_900,
    compareAtCents: 1_349_900,
    durationDays: 180,
    isPopular: false,
    badge: 'Best value',
    displayOrder: 3,
    features: [
      'Everything in Premium',
      '20 teacher reviews per month',
      'Personalised study plan reviewed monthly',
      'Score guarantee guidance from our consultants',
      'Priority access to new mock tests',
    ],
    limits: { aiSpeakingPerMonth: -1, aiWritingPerMonth: -1, mockTestsPerMonth: -1, practicePerDay: -1, teacherReviews: 20, advancedAnalytics: true },
  },
] as const

const STUDENTS = [
  { name: 'Adnan Rafiq', email: 'adnan@example.com', city: 'Faisalabad', target: 79, premium: true, skill: 0.86 },
  { name: 'Hira Shahzad', email: 'hira@example.com', city: 'Lahore', target: 79, premium: true, skill: 0.78 },
  { name: 'Bilal Ahmed', email: 'bilal@example.com', city: 'Karachi', target: 65, premium: false, skill: 0.62 },
  { name: 'Ayesha Noor', email: 'ayesha@example.com', city: 'Islamabad', target: 79, premium: true, skill: 0.81 },
  { name: 'Usman Tariq', email: 'usman@example.com', city: 'Multan', target: 65, premium: false, skill: 0.55 },
  { name: 'Fatima Zahra', email: 'fatima@example.com', city: 'Faisalabad', target: 90, premium: true, skill: 0.9 },
  { name: 'Hamza Iqbal', email: 'hamza@example.com', city: 'Rawalpindi', target: 65, premium: false, skill: 0.48 },
  { name: 'Zainab Malik', email: 'zainab@example.com', city: 'Sialkot', target: 79, premium: false, skill: 0.7 },
  { name: 'Danish Javed', email: 'danish@example.com', city: 'Peshawar', target: 79, premium: true, skill: 0.74 },
  { name: 'Maryam Aslam', email: 'maryam@example.com', city: 'Gujranwala', target: 65, premium: false, skill: 0.6 },
] as const

const RESOURCES = [
  {
    slug: 'read-aloud-fluency-checklist',
    title: 'The Read Aloud fluency checklist',
    category: 'Speaking',
    excerpt: 'Six things to fix before you record another Read Aloud, in the order they cost you the most marks.',
    readMinutes: 6,
    tags: ['read aloud', 'fluency', 'pronunciation'],
    contentMd: `## Why fluency outranks accent\n\nPTE scores Oral Fluency and Pronunciation separately, and fluency carries more weight than most students expect. A perfectly pronounced sentence delivered in halting fragments scores worse than a lightly accented one delivered smoothly.\n\n### The checklist\n\n1. **Read the whole text before you speak.** The preparation time exists for exactly this. A sentence you have already seen is a sentence you will not stumble over.\n2. **Do not restart.** Restarting a sentence costs more than the error you were fixing. Keep going.\n3. **Chunk on punctuation, not on breath.** Group words into meaning units and pause at commas — not wherever you run out of air.\n4. **Keep one pace throughout.** Speeding up on easy words and slowing on hard ones is the single clearest fluency signal to the scoring engine.\n5. **Finish the last word.** Trailing off before the microphone stops is a common and entirely avoidable loss.\n6. **Record at conversational volume.** Whispering degrades the transcript, and a poor transcript degrades every trait score.\n\n### How to practise this\n\nRecord the same passage three times. Do not try to improve pronunciation between takes — try only to remove pauses. Most students gain more in a week from this exercise than from months of accent work.`,
  },
  {
    slug: 'essay-structure-that-scores',
    title: 'An essay structure that scores',
    category: 'Writing',
    excerpt: 'A repeatable 250-word template for the PTE essay, and why the word count matters more than the argument.',
    readMinutes: 7,
    tags: ['essay', 'writing', 'template'],
    contentMd: `## Form first\n\nThe PTE essay awards a Form mark that is binary: between 200 and 300 words you get it, outside that range you get zero and the whole response is capped. Before you think about argument quality, guarantee the count.\n\n### The template\n\n**Introduction (45–55 words)** — Paraphrase the prompt in one sentence. State your position in one sentence. Preview two supporting reasons in one sentence.\n\n**Body paragraph one (70–85 words)** — Topic sentence naming the first reason. Two sentences of explanation. One concrete example. One sentence linking back to your position.\n\n**Body paragraph two (70–85 words)** — Same shape, second reason.\n\n**Conclusion (35–45 words)** — Restate the position in different words. Name both reasons. One forward-looking sentence.\n\nThat is 220–270 words without padding.\n\n### What actually loses marks\n\nNot weak arguments — vague ones. "Technology has many advantages" scores nothing. "Automated dispatch reduced delivery times in our city by roughly a third" scores across Content, Vocabulary and Development at once.`,
  },
  {
    slug: 'write-from-dictation-memory',
    title: 'Write From Dictation: a memory method',
    category: 'Listening',
    excerpt: 'WFD is worth marks in two sections and is fully rule-scored. Here is how to stop losing words.',
    readMinutes: 5,
    tags: ['dictation', 'listening', 'memory'],
    contentMd: `## Why this task deserves disproportionate attention\n\nWrite From Dictation contributes to both Listening and Writing, it is scored by an exact word-matching rule rather than a judgement, and the sentences are short. Point for point it is the most improvable task in the exam.\n\n### The method\n\n1. **Do not write during the audio.** Splitting attention costs you the second half of the sentence. Listen to all of it.\n2. **Hold the sentence as a shape, not as words.** Most WFD sentences are one of about six grammatical patterns. Recognising the pattern lets you reconstruct words you half-heard.\n3. **Write the content words first.** Nouns and verbs carry the marks. Fill in articles and prepositions afterwards.\n4. **Write something for every word you think you heard.** There is no penalty for a wrong word, only a reward for a right one.\n\n### Practise with your own recordings\n\nRecord ten academic sentences in your own voice, leave them a day, then transcribe them. Self-recorded practice removes the excuse that the speaker was unclear.`,
  },
  {
    slug: 'planning-your-final-two-weeks',
    title: 'Planning your final two weeks',
    category: 'Strategy',
    excerpt: 'What to practise, what to stop practising, and what to do the day before your test.',
    readMinutes: 8,
    tags: ['strategy', 'test day'],
    isPremium: true,
    contentMd: `## The last fortnight is for consolidation, not discovery\n\nTwo weeks out, your score is largely set by habits you already have. The work now is removing avoidable losses.\n\n### Days 14–8\n\nTake one full mock test at the start of this window, at the same time of day as your real test. Use the section breakdown to pick exactly two task types to drill — the two where your score is furthest below your section average, not the two you dislike most.\n\n### Days 7–3\n\nDrill those two task types daily, twenty minutes each. Take a second full mock on day 4. Compare the two mock results; if a section dropped, it is almost always stamina rather than skill.\n\n### Days 2–1\n\nStop drilling. Re-read your own best essay and your own best summary. Check your test centre route and your identification. Sleep is worth more than any further practice — memory consolidation happens during it, and a tired candidate loses fluency marks first.\n\n### Test day\n\nArrive early enough to be bored. Speak your first Read Aloud at conversational volume from the first word — many candidates lose several marks warming up during a scored task.`,
  },
]

// --- helpers ------------------------------------------------------------------

/** Deterministic pseudo-random so re-seeding produces the same history. */
function makeRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0
    return state / 0x1_0000_0000
  }
}

function referralCode(name: string, index: number): string {
  const base = name.split(/\s+/)[0]!.toUpperCase().replace(/[^A-Z]/g, '')
  return `GLOBIFY-${base}${index > 0 ? index : ''}`
}

function daysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function startOfDay(date: Date): Date {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function scaled(skill: number, jitter: number): number {
  return Math.max(10, Math.min(90, Math.round(10 + skill * 80 + jitter)))
}

// --- seed ---------------------------------------------------------------------

async function main() {
  console.log('Seeding Globify PTE Premium…')

  // 1. Platform settings
  await prisma.platformSetting.upsert({
    where: { key: 'platform' },
    create: {
      key: 'platform',
      value: {
        platformName: 'Globify PTE Premium',
        defaultTargetScore: 79,
        currency: 'PKR',
        timezone: 'Asia/Karachi',
        registrationEnabled: true,
        maintenanceMode: false,
        supportTicketsEnabled: true,
      },
    },
    update: {},
  })

  // 2. Question types
  for (const type of QUESTION_TYPES) {
    const data = {
      name: type.name,
      shortName: type.shortName,
      section: type.section as PteSection,
      renderer: type.renderer,
      description: type.description,
      skills: [...type.skills],
      defaultTimeLimitSeconds: type.time,
      defaultPreparationSeconds: type.prep,
      requiresAudioResponse: type.audio,
      requiresTextResponse: type.text,
      isActive: true,
      displayOrder: type.order,
    }
    await prisma.questionType.upsert({
      where: { code: type.code },
      create: { code: type.code, ...data },
      update: data,
    })
  }
  console.log(`  ${QUESTION_TYPES.length} question types`)

  // 3. Categories
  const categories = [
    { slug: 'academic', name: 'Academic', order: 1 },
    { slug: 'science-technology', name: 'Science & Technology', order: 2 },
    { slug: 'environment', name: 'Environment', order: 3 },
    { slug: 'society-culture', name: 'Society & Culture', order: 4 },
  ]
  for (const category of categories) {
    await prisma.questionCategory.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, name: category.name, displayOrder: category.order },
      update: { name: category.name },
    })
  }

  // 4. Admin + teacher
  const adminHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    create: {
      email: ADMIN_EMAIL,
      name: 'Globify Administrator',
      passwordHash: adminHash,
      role: 'SUPER_ADMIN',
      emailVerified: new Date(),
      adminProfile: { create: { title: 'Platform Owner', permissions: [], isActive: true } },
      profile: { create: { referralCode: 'GLOBIFY-ADMIN', targetScore: 90 } },
    },
    update: { passwordHash: adminHash, role: 'SUPER_ADMIN' },
  })

  const teacherHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  await prisma.user.upsert({
    where: { email: 'teacher@globifyconsultants.com' },
    create: {
      email: 'teacher@globifyconsultants.com',
      name: 'Sana Kamran',
      passwordHash: teacherHash,
      role: 'TEACHER',
      emailVerified: new Date(),
      adminProfile: { create: { title: 'Senior PTE Trainer', permissions: ['reviews.manage', 'students.view'], isActive: true } },
      profile: { create: { referralCode: 'GLOBIFY-SANA', targetScore: 90 } },
    },
    update: { role: 'TEACHER' },
  })
  console.log('  admin + teacher accounts')

  // 5. Plans
  const planRecords = []
  for (const plan of PLANS) {
    const data = {
      name: plan.name,
      tagline: plan.tagline,
      description: plan.description,
      priceCents: plan.priceCents,
      compareAtCents: plan.compareAtCents,
      currency: 'PKR',
      durationDays: plan.durationDays,
      features: [...plan.features],
      limits: plan.limits,
      isActive: true,
      isPopular: plan.isPopular,
      badge: plan.badge,
      displayOrder: plan.displayOrder,
    }
    planRecords.push(
      await prisma.subscriptionPlan.upsert({
        where: { code: plan.code },
        create: { code: plan.code, ...data },
        update: data,
      }),
    )
  }
  console.log(`  ${planRecords.length} subscription plans`)

  // 6. Coupons
  const coupons = [
    { code: 'WELCOME15', description: '15% off your first subscription', discountType: 'PERCENTAGE' as const, discountValue: 15, usageLimit: 500, perUserLimit: 1 },
    { code: 'GLOBIFY1000', description: 'PKR 1,000 off any plan', discountType: 'FIXED' as const, discountValue: 100_000, usageLimit: 200, perUserLimit: 1 },
    { code: 'INTENSIVE25', description: '25% off the Intensive plan', discountType: 'PERCENTAGE' as const, discountValue: 25, usageLimit: 100, perUserLimit: 1 },
  ]
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      create: {
        ...coupon,
        expiresAt: new Date(Date.now() + 180 * 86_400_000),
        isActive: true,
      },
      update: { description: coupon.description, isActive: true },
    })
  }

  // 7. Questions
  const typeIds = new Map(
    (await prisma.questionType.findMany({ select: { id: true, code: true } })).map((type) => [type.code, type.id]),
  )
  const categoryId = (await prisma.questionCategory.findUnique({ where: { slug: 'academic' } }))?.id ?? null

  for (const question of SEED_QUESTIONS) {
    const questionTypeId = typeIds.get(question.typeCode)
    if (!questionTypeId) continue

    const data = {
      questionTypeId,
      categoryId,
      title: question.title,
      prompt: question.prompt ?? null,
      passage: question.passage ?? null,
      audioTranscript: question.audioTranscript ?? null,
      imageUrl: question.imageUrl ?? null,
      audioUrl: question.audioUrl ?? null,
      options: (question.options ?? []) as object,
      correctAnswer: (question.correctAnswer ?? {}) as object,
      explanation: question.explanation ?? null,
      sampleAnswer: question.sampleAnswer ?? null,
      difficulty: (question.difficulty ?? 'MEDIUM') as Difficulty,
      status: 'PUBLISHED' as const,
      tags: question.tags ?? [],
      wordLimitMin: question.wordLimitMin ?? null,
      wordLimitMax: question.wordLimitMax ?? null,
      isPremium: question.isPremium ?? false,
      createdById: admin.id,
    }

    await prisma.question.upsert({
      where: { code: question.code },
      create: { code: question.code, ...data },
      update: data,
    })
  }
  console.log(`  ${SEED_QUESTIONS.length} questions`)

  // 7b. Dictation & shadowing drills
  //
  // Text only. A drill needs a recording, and the seed has no way to produce
  // one, so these are left as DRAFT with an empty audioUrl — invisible to
  // students until an administrator attaches audio and marks the line timings
  // in /admin/drills. Re-running the seed will not overwrite work done there:
  // only the transcript-derived fields are updated, and status is left alone.
  for (const category of SEED_DRILL_CATEGORIES) {
    await prisma.drillCategory.upsert({
      where: { slug: category.slug },
      create: category,
      update: { name: category.name, description: category.description, displayOrder: category.displayOrder },
    })
  }

  const drillCategoryIds = new Map(
    (await prisma.drillCategory.findMany({ select: { id: true, slug: true } })).map((row) => [
      row.slug,
      row.id,
    ]),
  )

  for (const drill of SEED_DRILLS) {
    const drillCategoryId = drillCategoryIds.get(drill.categorySlug)
    if (!drillCategoryId) continue

    const shared = {
      categoryId: drillCategoryId,
      title: drill.title,
      description: drill.description,
      transcript: drill.transcript,
      wordCount: tokenize(drill.transcript).length,
      accent: drill.accent,
      difficulty: drill.difficulty as Difficulty,
      isPremium: drill.isPremium,
      tags: drill.tags,
      displayOrder: drill.displayOrder,
    }

    const record = await prisma.drill.upsert({
      where: { slug: drill.slug },
      create: { ...shared, slug: drill.slug, audioUrl: '', status: 'DRAFT', createdById: admin.id },
      update: shared,
      select: { id: true },
    })

    // Timings stay at zero: they belong to a particular recording, which this
    // script does not have.
    const lines = splitIntoSegments(drill.transcript)
    await prisma.drillSegment.deleteMany({ where: { drillId: record.id, order: { gte: lines.length } } })
    for (const [order, text] of lines.entries()) {
      await prisma.drillSegment.upsert({
        where: { drillId_order: { drillId: record.id, order } },
        create: { drillId: record.id, order, text },
        update: { text },
      })
    }
  }
  console.log(
    `  ${SEED_DRILLS.length} dictation & shadowing exercises (draft — add audio in /admin/drills)`,
  )

  // 8. Mock tests
  const allQuestions = await prisma.question.findMany({
    select: { id: true, questionType: { select: { section: true, displayOrder: true } } },
    orderBy: { code: 'asc' },
  })

  const mockTests = [
    { slug: 'globify-mock-1', title: 'Globify Full Mock Test 1', difficulty: 'MEDIUM' as const, premium: false, order: 1, description: 'A complete two-hour mock covering all four sections, scored the same way as your practice.' },
    { slug: 'globify-mock-2', title: 'Globify Full Mock Test 2', difficulty: 'MEDIUM' as const, premium: true, order: 2, description: 'A second full-length paper with a different question mix, for tracking improvement.' },
    { slug: 'globify-mock-3', title: 'Globify Full Mock Test 3 — Advanced', difficulty: 'HARD' as const, premium: true, order: 3, description: 'Harder passages and faster audio, for candidates targeting 79 and above.' },
  ]

  const SECTION_ORDER: PteSection[] = ['SPEAKING', 'WRITING', 'READING', 'LISTENING']
  const SECTION_DURATION: Record<PteSection, number> = {
    SPEAKING: 2100,
    WRITING: 1800,
    READING: 1980,
    LISTENING: 2700,
  }

  for (const [mockIndex, mock] of mockTests.entries()) {
    const record = await prisma.mockTest.upsert({
      where: { slug: mock.slug },
      create: {
        slug: mock.slug,
        title: mock.title,
        description: mock.description,
        kind: 'FULL',
        difficulty: mock.difficulty,
        durationMinutes: 120,
        isPremium: mock.premium,
        status: 'PUBLISHED',
        displayOrder: mock.order,
      },
      update: { title: mock.title, description: mock.description, status: 'PUBLISHED' },
    })

    for (const [order, section] of SECTION_ORDER.entries()) {
      const sectionRecord = await prisma.mockTestSection.upsert({
        where: { mockTestId_order: { mockTestId: record.id, order } },
        create: {
          mockTestId: record.id,
          section,
          title: `${section.charAt(0)}${section.slice(1).toLowerCase()}`,
          order,
          durationSeconds: SECTION_DURATION[section],
          weight: 1,
        },
        update: { section, durationSeconds: SECTION_DURATION[section] },
      })

      // Rotate the pool per mock so the three papers are not identical.
      const pool = allQuestions.filter((question) => question.questionType.section === section)
      const picked = pool.filter((_, index) => index % mockTests.length === mockIndex % mockTests.length)
      const questions = (picked.length > 0 ? picked : pool).slice(0, 6)

      for (const [order, question] of questions.entries()) {
        await prisma.mockTestQuestion.upsert({
          where: { sectionId_questionId: { sectionId: sectionRecord.id, questionId: question.id } },
          create: { sectionId: sectionRecord.id, questionId: question.id, order },
          update: { order },
        })
      }
    }
  }
  console.log(`  ${mockTests.length} mock tests`)

  // 9. Resources
  for (const [index, resource] of RESOURCES.entries()) {
    const data = {
      title: resource.title,
      excerpt: resource.excerpt,
      category: resource.category,
      tags: resource.tags,
      contentMd: resource.contentMd,
      readMinutes: resource.readMinutes,
      isPremium: 'isPremium' in resource ? Boolean(resource.isPremium) : false,
      status: 'PUBLISHED' as const,
      displayOrder: index + 1,
      publishedAt: daysAgo(30 - index * 5),
    }
    await prisma.resource.upsert({
      where: { slug: resource.slug },
      create: { slug: resource.slug, ...data },
      update: data,
    })
  }

  // 10. Writing improvement library
  for (const [index, exercise] of SEED_WRITING_EXERCISES.entries()) {
    const data = {
      title: exercise.title,
      category: exercise.category,
      taskKind: exercise.taskKind,
      prompt: exercise.prompt,
      passage: exercise.passage ?? null,
      guidance: exercise.guidance ?? null,
      tags: exercise.tags,
      difficulty: exercise.difficulty,
      wordMin: exercise.wordMin,
      wordMax: exercise.wordMax,
      minutes: exercise.minutes,
      isPremium: exercise.isPremium,
      status: 'PUBLISHED' as const,
      displayOrder: index + 1,
    }
    await prisma.writingExercise.upsert({
      where: { slug: exercise.slug },
      create: { slug: exercise.slug, ...data },
      update: data,
    })
  }
  console.log(`  ${SEED_WRITING_EXERCISES.length} writing improvement exercises`)

  // 11. Announcement
  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { title: 'Three new full mock tests are live' },
  })
  if (!existingAnnouncement) {
    await prisma.announcement.create({
      data: {
        title: 'Three new full mock tests are live',
        body: 'Every plan now includes access to Globify Full Mock Test 1. Premium and Intensive members can take all three, including the advanced paper.',
        audience: 'ALL',
        status: 'PUBLISHED',
        isPinned: true,
        publishedAt: daysAgo(3),
      },
    })
  }

  // 12. Students with practice history
  const studentHash = await bcrypt.hash(STUDENT_PASSWORD, 12)
  const scorableQuestions = await prisma.question.findMany({
    select: { id: true, questionType: { select: { code: true, section: true } } },
  })

  for (const [studentIndex, student] of STUDENTS.entries()) {
    const random = makeRandom(studentIndex * 7919 + 13)

    const user = await prisma.user.upsert({
      where: { email: student.email },
      create: {
        email: student.email,
        name: student.name,
        passwordHash: studentHash,
        role: 'STUDENT',
        emailVerified: new Date(),
        createdAt: daysAgo(60 - studentIndex * 3),
        profile: {
          create: {
            city: student.city,
            country: 'Pakistan',
            targetScore: student.target,
            dailyGoalMinutes: 45,
            referralCode: referralCode(student.name, studentIndex),
            preferredTestDate: new Date(Date.now() + (30 + studentIndex * 5) * 86_400_000),
            onboardedAt: daysAgo(59 - studentIndex * 3),
          },
        },
      },
      update: { passwordHash: studentHash },
    })

    // Subscription for premium students
    if (student.premium) {
      const plan = planRecords[studentIndex % planRecords.length]!
      const existing = await prisma.subscription.findFirst({ where: { userId: user.id, status: 'ACTIVE' } })
      if (!existing) {
        const startedAt = daysAgo(20)
        const subscription = await prisma.subscription.create({
          data: {
            userId: user.id,
            planId: plan.id,
            status: 'ACTIVE',
            startedAt,
            expiresAt: new Date(startedAt.getTime() + plan.durationDays * 86_400_000),
            source: 'seed',
          },
        })
        await prisma.payment.create({
          data: {
            userId: user.id,
            planId: plan.id,
            subscriptionId: subscription.id,
            reference: `GLB-SEED-${studentIndex}-${plan.code.toUpperCase()}`,
            provider: 'manual',
            method: 'BANK_TRANSFER',
            status: 'PAID',
            subtotalCents: plan.priceCents,
            discountCents: 0,
            taxCents: 0,
            totalCents: plan.priceCents,
            currency: 'PKR',
            paidAt: startedAt,
            reviewedById: admin.id,
            reviewedAt: startedAt,
          },
        })
      }
    }

    // Practice history — one session per active day
    const alreadyPractised = await prisma.attempt.count({ where: { userId: user.id } })
    if (alreadyPractised > 0) continue

    const activeDays = 8 + Math.floor(random() * 8)
    const sectionTotals = new Map<PteSection, { total: number; count: number }>()

    /*
     * Rows are built in memory with explicit ids and written with createMany.
     * Creating them one at a time meant several thousand sequential round trips
     * per student, which a hosted Postgres will eventually drop mid-run.
     */
    const sessionRows: Prisma.PracticeSessionCreateManyInput[] = []
    const attemptRows: Prisma.AttemptCreateManyInput[] = []
    const answerRows: Prisma.AnswerCreateManyInput[] = []
    const scoreRows: Prisma.ScoreCreateManyInput[] = []

    for (let day = activeDays; day >= 1; day--) {
      const when = daysAgo(day * 2)
      const perSession = 3 + Math.floor(random() * 3)
      const sessionId = randomUUID()

      sessionRows.push({
        id: sessionId,
        userId: user.id,
        kind: 'PRACTICE',
        status: 'COMPLETED',
        totalQuestions: perSession,
        completedQuestions: perSession,
        durationSeconds: perSession * 90,
        startedAt: when,
        completedAt: new Date(when.getTime() + perSession * 90_000),
      })

      for (let i = 0; i < perSession; i++) {
        const question = scorableQuestions[Math.floor(random() * scorableQuestions.length)]
        if (!question) continue

        // Improve gradually over time, with per-attempt noise.
        const improvement = ((activeDays - day) / activeDays) * 8
        const overall = scaled(student.skill, improvement + (random() * 12 - 6))
        const section = question.questionType.section
        const attemptId = randomUUID()
        const ruleScored = section === 'READING' || section === 'LISTENING'

        attemptRows.push({
          id: attemptId,
          userId: user.id,
          questionId: question.id,
          sessionId,
          status: 'SCORED',
          timeSpentSeconds: 45 + Math.floor(random() * 90),
          startedAt: when,
          submittedAt: new Date(when.getTime() + 90_000),
          createdAt: when,
        })

        answerRows.push({
          attemptId,
          text: 'Seeded practice response.',
          selection: {},
          wordCount: 24,
        })

        scoreRows.push({
          attemptId,
          source: ruleScored ? 'RULE' : 'AI',
          overall,
          isCorrect: ruleScored ? overall >= 60 : null,
          breakdown: {
            content: scaled(student.skill, random() * 10 - 5),
            grammar: scaled(student.skill, random() * 10 - 5),
            vocabulary: scaled(student.skill, random() * 10 - 5),
          },
          createdAt: when,
        })

        const current = sectionTotals.get(section) ?? { total: 0, count: 0 }
        sectionTotals.set(section, { total: current.total + overall, count: current.count + 1 })
      }
    }

    await prisma.practiceSession.createMany({ data: sessionRows })
    await prisma.attempt.createMany({ data: attemptRows })
    await prisma.answer.createMany({ data: answerRows })
    await prisma.score.createMany({ data: scoreRows })

    // Progress rows
    for (const [section, stats] of sectionTotals) {
      const average = Math.round(stats.total / stats.count)
      await prisma.progress.upsert({
        where: { userId_section: { userId: user.id, section } },
        create: {
          userId: user.id,
          section,
          estimatedScore: average,
          previousScore: Math.max(10, average - 3 - Math.floor(random() * 4)),
          accuracy: Math.round(50 + student.skill * 45),
          attemptsCount: stats.count,
          minutesPracticed: stats.count * 2,
        },
        update: { estimatedScore: average, attemptsCount: stats.count },
      })
    }

    // Daily snapshots for the trend chart
    const sectionAverage = (section: PteSection) => {
      const stats = sectionTotals.get(section)
      return stats ? Math.round(stats.total / stats.count) : null
    }
    const overallNow = Math.round(
      [...sectionTotals.values()].reduce((sum, stats) => sum + stats.total / stats.count, 0) /
        Math.max(1, sectionTotals.size),
    )

    const snapshotRows: Prisma.ProgressSnapshotCreateManyInput[] = []
    for (let day = 29; day >= 0; day--) {
      const drift = Math.round(((29 - day) / 29) * 6) - 3
      snapshotRows.push({
        userId: user.id,
        date: startOfDay(daysAgo(day)),
        overallScore: Math.max(10, Math.min(90, overallNow + drift)),
        speakingScore: sectionAverage('SPEAKING'),
        writingScore: sectionAverage('WRITING'),
        readingScore: sectionAverage('READING'),
        listeningScore: sectionAverage('LISTENING'),
        attempts: Math.floor(random() * 6),
        minutes: Math.floor(random() * 50),
      })
    }
    // A re-run keeps whatever is already there rather than failing on the
    // (userId, date) unique key.
    await prisma.progressSnapshot.createMany({ data: snapshotRows, skipDuplicates: true })

    await prisma.profile.update({
      where: { userId: user.id },
      data: {
        currentEstimateScore: overallNow,
        streakDays: 2 + Math.floor(random() * 9),
        longestStreak: 6 + Math.floor(random() * 14),
        lastPracticeDate: startOfDay(new Date()),
      },
    })

    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'welcome',
        title: 'Welcome to Globify PTE Premium',
        body: 'Your account is ready. Start with a five-question practice session to get your first estimate.',
        href: '/practice',
        channel: 'IN_APP',
        sentAt: daysAgo(30),
      },
    })
  }

  console.log(`  ${STUDENTS.length} students with practice history`)
  console.log('\nSeed complete.')
  console.log(`  Admin:   ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log(`  Student: ${STUDENTS[0]!.email} / ${STUDENT_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Seed failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
