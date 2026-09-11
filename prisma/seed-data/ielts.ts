/**
 * IELTS seed content.
 *
 * Every prompt, figure and sample here was written for Globify. IELTS past
 * papers are copyrighted and must never be copied into this bank — see the
 * content note in docs/ if you are commissioning more.
 *
 * Only the Writing tasks are seeded. The Reading, Listening and Speaking task
 * types exist in src/lib/exams/ielts/question-types.ts so content can be
 * planned against them, but they have no renderer yet, so seeding them would
 * put tasks in front of students that the practice engine cannot draw.
 */

export interface IeltsSeedQuestionType {
  code: string
  name: string
  shortName: string
  section: 'SPEAKING' | 'WRITING' | 'READING' | 'LISTENING'
  renderer: string
  description: string
  skills: string[]
  time: number | null
  prep: number | null
  audio: boolean
  text: boolean
  order: number
}

export const IELTS_SEED_QUESTION_TYPES: IeltsSeedQuestionType[] = [
  {
    code: 'IELTS_WRITING_TASK1_ACADEMIC',
    name: 'Writing Task 1 — Academic',
    shortName: 'W1A',
    section: 'WRITING',
    renderer: 'writing-text',
    description:
      'Describe and compare the information in a graph, table, chart, process or map in at least 150 words.',
    skills: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    time: 20 * 60,
    prep: null,
    audio: false,
    text: true,
    order: 101,
  },
  {
    code: 'IELTS_WRITING_TASK1_GENERAL',
    name: 'Writing Task 1 — General Training',
    shortName: 'W1G',
    section: 'WRITING',
    renderer: 'writing-text',
    description:
      'Write a letter of at least 150 words in the register the prompt calls for.',
    skills: ['taskAchievement', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    time: 20 * 60,
    prep: null,
    audio: false,
    text: true,
    order: 102,
  },
  {
    code: 'IELTS_WRITING_TASK2',
    name: 'Writing Task 2 — Essay',
    shortName: 'W2',
    section: 'WRITING',
    renderer: 'writing-text',
    description:
      'Write a discursive essay of at least 250 words responding to a point of view, argument or problem.',
    skills: ['taskResponse', 'coherenceCohesion', 'lexicalResource', 'grammaticalRangeAccuracy'],
    time: 40 * 60,
    prep: null,
    audio: false,
    text: true,
    order: 103,
  },
]

export interface IeltsSeedQuestion {
  code: string
  typeCode: string
  variant: 'ACADEMIC' | 'GENERAL_TRAINING' | null
  title: string
  prompt: string
  /**
   * For Academic Task 1 this describes the figure in words. It reaches the
   * assessor as `figureDescription`, so a student can practise the task before
   * the chart artwork exists; add `imageUrl` once it does.
   */
  passage?: string
  sampleAnswer?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  tags?: string[]
  wordLimitMin: number
  isPremium?: boolean
}

export const IELTS_SEED_QUESTIONS: IeltsSeedQuestion[] = [
  // --- Academic Task 1 --------------------------------------------------------
  {
    code: 'IELTS-W1A-001',
    typeCode: 'IELTS_WRITING_TASK1_ACADEMIC',
    variant: 'ACADEMIC',
    title: 'Household water use in three cities',
    prompt:
      'The chart below shows how households in three cities used water in 2010 and 2022. Summarise the information by selecting and reporting the main features, and make comparisons where relevant. Write at least 150 words.',
    passage:
      'A grouped bar chart with three city groups — Almeria, Brindale and Corvet — each showing four categories for 2010 and again for 2022, measured in litres per household per day. ' +
      'Almeria: gardens 180 then 74; bathrooms 120 then 118; kitchen 60 then 58; laundry 55 then 40. ' +
      'Brindale: gardens 40 then 44; bathrooms 135 then 150; kitchen 70 then 78; laundry 60 then 62. ' +
      'Corvet: gardens 210 then 205; bathrooms 130 then 140; kitchen 65 then 70; laundry 58 then 60.',
    sampleAnswer:
      'The chart compares daily household water consumption across four categories in Almeria, Brindale and Corvet in 2010 and 2022.\n\n' +
      'The clearest change is in Almeria, where garden watering fell dramatically from 180 to 74 litres per household per day — a reduction of nearly 60 per cent. No other category in any city changed by more than a modest margin, and Almeria was alone in reducing its total consumption.\n\n' +
      'Brindale and Corvet moved in the opposite direction, though gently. Bathroom use rose in both, from 135 to 150 litres in Brindale and from 130 to 140 in Corvet, and kitchen and laundry figures crept up by a few litres in each case. Corvet remained by far the heaviest garden user throughout, at around 210 litres in both years, while Brindale used the least on gardens of the three cities.\n\n' +
      'Overall, only Almeria achieved a substantial saving, and it did so almost entirely outdoors.',
    difficulty: 'MEDIUM',
    tags: ['ielts', 'academic', 'task1', 'bar chart'],
    wordLimitMin: 150,
  },
  {
    code: 'IELTS-W1A-002',
    typeCode: 'IELTS_WRITING_TASK1_ACADEMIC',
    variant: 'ACADEMIC',
    title: 'How recycled glass is processed',
    prompt:
      'The diagram below shows the process by which household glass is recycled into new containers. Summarise the information by selecting and reporting the main features. Write at least 150 words.',
    passage:
      'A linear process diagram with seven stages: (1) households place glass in kerbside bins; (2) a collection lorry takes it to a sorting depot; (3) the glass is separated by colour into clear, green and brown streams; (4) a magnet and an air blower remove metal lids and paper labels; (5) the clean glass is crushed into cullet; (6) the cullet is mixed with sand, soda ash and limestone and melted in a furnace at 1,500°C; (7) the molten mixture is blown into moulds to form new containers, which return to shops. A dotted arrow runs from stage 7 back to stage 1.',
    difficulty: 'MEDIUM',
    tags: ['ielts', 'academic', 'task1', 'process'],
    wordLimitMin: 150,
    isPremium: true,
  },

  // --- General Training Task 1 ------------------------------------------------
  {
    code: 'IELTS-W1G-001',
    typeCode: 'IELTS_WRITING_TASK1_GENERAL',
    variant: 'GENERAL_TRAINING',
    title: 'Letter about a delayed delivery',
    prompt:
      'You ordered a piece of furniture from a shop six weeks ago and it has still not arrived.\n\n' +
      'Write a letter to the shop manager. In your letter:\n' +
      '• explain what you ordered and when\n' +
      '• describe the problems the delay has caused you\n' +
      '• say what you would like the manager to do\n\n' +
      'Write at least 150 words. You do NOT need to write any addresses. Begin your letter: Dear Sir or Madam,',
    sampleAnswer:
      'Dear Sir or Madam,\n\n' +
      'I am writing about an order I placed at your Bridge Street branch on 3 March: a two-metre oak dining table, order number 48812, for which I paid in full on the day.\n\n' +
      'At the time of purchase your sales assistant assured me that delivery would take no longer than two weeks. Six weeks have now passed and the table has not arrived. I have telephoned the branch three times and been promised a call back on each occasion, but no one has contacted me.\n\n' +
      'The delay has caused real inconvenience. I sold my previous table before the delivery window your assistant quoted, so my family has been eating from a garden table since the middle of March. I had also arranged a family gathering for 12 April, which I have now had to cancel.\n\n' +
      'I would like the table delivered within the next seven days, together with a refund of the £45 delivery charge. If that is not possible, I would prefer a full refund so that I can buy elsewhere.\n\n' +
      'I look forward to your reply.\n\n' +
      'Yours faithfully,\n' +
      'J. Iqbal',
    difficulty: 'MEDIUM',
    tags: ['ielts', 'general-training', 'task1', 'complaint'],
    wordLimitMin: 150,
  },
  {
    code: 'IELTS-W1G-002',
    typeCode: 'IELTS_WRITING_TASK1_GENERAL',
    variant: 'GENERAL_TRAINING',
    title: 'Letter to a former colleague',
    prompt:
      'A colleague you used to work with has moved to another country and has asked how things are at your old workplace.\n\n' +
      'Write a letter to your former colleague. In your letter:\n' +
      '• tell them what has changed at work since they left\n' +
      '• explain how you have been affected by the changes\n' +
      '• invite them to visit\n\n' +
      'Write at least 150 words. You do NOT need to write any addresses. Begin your letter: Dear ...,',
    difficulty: 'EASY',
    tags: ['ielts', 'general-training', 'task1', 'informal'],
    wordLimitMin: 150,
  },

  // --- Task 2 -----------------------------------------------------------------
  {
    code: 'IELTS-W2-001',
    typeCode: 'IELTS_WRITING_TASK2',
    variant: null,
    title: 'Remote work and city centres',
    prompt:
      'Since many employees now work from home for part of the week, some people believe city centres will decline and should be redeveloped as housing. Others argue that city centres should be preserved as commercial districts.\n\n' +
      'Discuss both views and give your own opinion.\n\n' +
      'Write at least 250 words.',
    difficulty: 'MEDIUM',
    tags: ['ielts', 'task2', 'discuss both views', 'work'],
    wordLimitMin: 250,
  },
  {
    code: 'IELTS-W2-002',
    typeCode: 'IELTS_WRITING_TASK2',
    variant: null,
    title: 'Museums: entertainment or education',
    prompt:
      'Some people think that the main purpose of museums is to entertain visitors, while others believe their primary role is education and research.\n\n' +
      'To what extent do you agree or disagree?\n\n' +
      'Write at least 250 words.',
    difficulty: 'HARD',
    tags: ['ielts', 'task2', 'opinion', 'culture'],
    wordLimitMin: 250,
    isPremium: true,
  },
]
