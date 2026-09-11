/**
 * Vocabulary books.
 *
 * The word lists here are a representative sample, not the full books — enough
 * for every card in the grid to be studiable end to end in a fresh install.
 * Production word lists are loaded by the content team through the admin.
 */

export interface SeedVocabWord {
  headword: string
  phonetic?: string
  partOfSpeech?: string
  definition: string
  example?: string
  acceptedForms?: string[]
}

export interface SeedVocabBook {
  slug: string
  title: string
  description: string
  badge: string
  color: string
  modes: Array<'READING' | 'LISTENING'>
  questionTypeCode?: string
  isPremium: boolean
  displayOrder: number
  words: SeedVocabWord[]
}

export const SEED_VOCAB_BOOKS: SeedVocabBook[] = [
  {
    slug: 'wfd-vocab',
    title: 'Write From Dictation vocabulary',
    description:
      'Words that recur in Write From Dictation. Spelling matters more than meaning here, so this book is best studied in listening mode.',
    badge: 'WFD',
    color: '#9f1239',
    modes: ['READING', 'LISTENING'],
    questionTypeCode: 'WRITE_FROM_DICTATION',
    isPremium: false,
    displayOrder: 1,
    words: [
      {
        headword: 'curriculum',
        phonetic: '/kəˈrɪkjʊləm/',
        partOfSpeech: 'noun',
        definition: 'The subjects that make up a course of study.',
        example: 'The department reviewed the curriculum at the end of the year.',
        acceptedForms: ['curricula', 'curriculums'],
      },
      {
        headword: 'bibliography',
        phonetic: '/ˌbɪblɪˈɒɡrəfi/',
        partOfSpeech: 'noun',
        definition: 'A list of the sources cited in a piece of writing.',
        example: 'Every essay must include a full bibliography.',
      },
      {
        headword: 'accommodation',
        phonetic: '/əˌkɒməˈdeɪʃn/',
        partOfSpeech: 'noun',
        definition: 'A place to live or stay.',
        example: 'University accommodation is allocated in August.',
      },
      {
        headword: 'assessment',
        phonetic: '/əˈsesmənt/',
        partOfSpeech: 'noun',
        definition: 'The process of judging the quality or value of something.',
        example: 'Continuous assessment replaced the final examination.',
      },
      {
        headword: 'prerequisite',
        phonetic: '/ˌpriːˈrekwɪzɪt/',
        partOfSpeech: 'noun',
        definition: 'Something required before something else can happen.',
        example: 'Statistics is a prerequisite for the research module.',
      },
      {
        headword: 'undergraduate',
        phonetic: '/ˌʌndəˈɡrædʒuət/',
        partOfSpeech: 'noun',
        definition: 'A student studying for a first degree.',
        example: 'The lecture is open to undergraduates only.',
      },
    ],
  },
  {
    slug: 'listening-fib-vocab',
    title: 'Listening Fill in the Blanks vocabulary',
    description:
      'The words most often blanked out in Listening FIB. You have to hear them and spell them under time pressure.',
    badge: 'L-FIB',
    color: '#7c3aed',
    modes: ['READING', 'LISTENING'],
    questionTypeCode: 'LISTENING_FILL_BLANKS',
    isPremium: false,
    displayOrder: 2,
    words: [
      {
        headword: 'hypothesis',
        phonetic: '/haɪˈpɒθəsɪs/',
        partOfSpeech: 'noun',
        definition: 'A proposed explanation, made as a starting point for investigation.',
        example: 'The data did not support the original hypothesis.',
        acceptedForms: ['hypotheses'],
      },
      {
        headword: 'phenomenon',
        phonetic: '/fəˈnɒmɪnən/',
        partOfSpeech: 'noun',
        definition: 'A fact or situation that is observed to exist.',
        example: 'Migration is a phenomenon seen across many species.',
        acceptedForms: ['phenomena'],
      },
      {
        headword: 'substantial',
        phonetic: '/səbˈstænʃl/',
        partOfSpeech: 'adjective',
        definition: 'Large in size, value or importance.',
        example: 'There was a substantial increase in rainfall.',
      },
      {
        headword: 'infrastructure',
        phonetic: '/ˈɪnfrəstrʌktʃə/',
        partOfSpeech: 'noun',
        definition: 'The basic physical systems a country or organisation needs to function.',
        example: 'Transport infrastructure absorbed most of the budget.',
      },
      {
        headword: 'deteriorate',
        phonetic: '/dɪˈtɪəriəreɪt/',
        partOfSpeech: 'verb',
        definition: 'To become progressively worse.',
        example: 'Air quality deteriorated sharply during the summer.',
        acceptedForms: ['deteriorated', 'deteriorating', 'deteriorates'],
      },
    ],
  },
  {
    slug: 'reading-fib-basic',
    title: 'Reading Fill in the Blanks — basic',
    description:
      'High-frequency academic vocabulary from both Reading fill-in-the-blanks tasks. Suitable if you are targeting 50 to 65.',
    badge: 'R-FIB',
    color: '#2563eb',
    modes: ['READING'],
    questionTypeCode: 'READING_FILL_BLANKS',
    isPremium: false,
    displayOrder: 3,
    words: [
      {
        headword: 'significant',
        phonetic: '/sɪɡˈnɪfɪkənt/',
        partOfSpeech: 'adjective',
        definition: 'Large enough or important enough to have an effect.',
        example: 'There was a significant difference between the two groups.',
      },
      {
        headword: 'approach',
        phonetic: '/əˈprəʊtʃ/',
        partOfSpeech: 'noun',
        definition: 'A way of dealing with something.',
        example: 'The team adopted a quantitative approach.',
      },
      {
        headword: 'establish',
        phonetic: '/ɪˈstæblɪʃ/',
        partOfSpeech: 'verb',
        definition: 'To set up, or to show something to be true.',
        example: 'The study established a clear link between the two.',
        acceptedForms: ['established', 'establishes', 'establishing'],
      },
      {
        headword: 'constitute',
        phonetic: '/ˈkɒnstɪtjuːt/',
        partOfSpeech: 'verb',
        definition: 'To be the parts that together form something.',
        example: 'Women constitute nearly half of the workforce.',
      },
    ],
  },
  {
    slug: 'reading-fib-advanced',
    title: 'Reading Fill in the Blanks — advanced',
    description:
      'The harder half of the Reading FIB vocabulary. Work through this once the basic book is comfortable and you are targeting 79 or above.',
    badge: 'R-FIB',
    color: '#1d4ed8',
    modes: ['READING'],
    questionTypeCode: 'READING_WRITING_FILL_BLANKS',
    isPremium: true,
    displayOrder: 4,
    words: [
      {
        headword: 'ubiquitous',
        phonetic: '/juːˈbɪkwɪtəs/',
        partOfSpeech: 'adjective',
        definition: 'Present or found everywhere.',
        example: 'Mobile phones are now ubiquitous in rural areas.',
      },
      {
        headword: 'mitigate',
        phonetic: '/ˈmɪtɪɡeɪt/',
        partOfSpeech: 'verb',
        definition: 'To make something less severe.',
        example: 'Tree planting can mitigate the effects of flooding.',
        acceptedForms: ['mitigated', 'mitigating', 'mitigates'],
      },
      {
        headword: 'paradigm',
        phonetic: '/ˈpærədaɪm/',
        partOfSpeech: 'noun',
        definition: 'A typical example or pattern of something; a model.',
        example: 'The discovery forced a paradigm shift in the field.',
      },
      {
        headword: 'empirical',
        phonetic: '/ɪmˈpɪrɪkl/',
        partOfSpeech: 'adjective',
        definition: 'Based on observation or experience rather than theory.',
        example: 'There is little empirical evidence for the claim.',
      },
    ],
  },
  {
    slug: 'pte-basic-vocab',
    title: 'PTE basic vocabulary',
    description:
      'The vocabulary you need across every section if you are targeting a score between 30 and 60. Recommended for all test takers.',
    badge: 'PTE',
    color: '#ea580c',
    modes: ['READING', 'LISTENING'],
    isPremium: false,
    displayOrder: 5,
    words: [
      {
        headword: 'evidence',
        phonetic: '/ˈevɪdəns/',
        partOfSpeech: 'noun',
        definition: 'Facts or information showing whether something is true.',
        example: 'There is strong evidence for this conclusion.',
      },
      {
        headword: 'contribute',
        phonetic: '/kənˈtrɪbjuːt/',
        partOfSpeech: 'verb',
        definition: 'To give something in order to help achieve a result.',
        example: 'Several factors contribute to the problem.',
        acceptedForms: ['contributed', 'contributes', 'contributing'],
      },
      {
        headword: 'consequence',
        phonetic: '/ˈkɒnsɪkwəns/',
        partOfSpeech: 'noun',
        definition: 'A result or effect of an action.',
        example: 'The consequences were felt across the region.',
      },
      {
        headword: 'previous',
        phonetic: '/ˈpriːviəs/',
        partOfSpeech: 'adjective',
        definition: 'Happening before the one being referred to.',
        example: 'This contradicts the previous study.',
      },
    ],
  },
  {
    slug: 'pte-advanced-vocab',
    title: 'PTE advanced vocabulary',
    description:
      'The vocabulary that separates a 79 from a 65 — precise verbs and abstract nouns the essay and summary tasks reward.',
    badge: 'PTE',
    color: '#be123c',
    modes: ['READING', 'LISTENING'],
    isPremium: true,
    displayOrder: 6,
    words: [
      {
        headword: 'exacerbate',
        phonetic: '/ɪɡˈzæsəbeɪt/',
        partOfSpeech: 'verb',
        definition: 'To make a problem worse.',
        example: 'Rising costs exacerbate inequality.',
        acceptedForms: ['exacerbated', 'exacerbates', 'exacerbating'],
      },
      {
        headword: 'discrepancy',
        phonetic: '/dɪsˈkrepənsi/',
        partOfSpeech: 'noun',
        definition: 'A difference between two things that should be the same.',
        example: 'There was a discrepancy between the two datasets.',
        acceptedForms: ['discrepancies'],
      },
      {
        headword: 'prevalent',
        phonetic: '/ˈprevələnt/',
        partOfSpeech: 'adjective',
        definition: 'Widespread in a particular area or at a particular time.',
        example: 'The practice is most prevalent in coastal regions.',
      },
      {
        headword: 'scrutiny',
        phonetic: '/ˈskruːtəni/',
        partOfSpeech: 'noun',
        definition: 'Careful and critical examination.',
        example: 'The findings did not survive close scrutiny.',
      },
    ],
  },
]
