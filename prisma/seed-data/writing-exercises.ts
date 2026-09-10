/**
 * The writing improvement library.
 *
 * These are practice prompts, not bank questions: they never appear in a mock
 * test and are never scored inside a session. They exist so a student has
 * something to write about when they open the improvement tool.
 *
 * `category` is the filter chip shown in the UI, so keep the set small.
 */

export interface SeedWritingExercise {
  slug: string
  title: string
  category: string
  taskKind: 'ESSAY' | 'SUMMARIZE_WRITTEN_TEXT' | 'SUMMARIZE_SPOKEN_TEXT' | 'FREEFORM'
  prompt: string
  passage?: string
  guidance?: string
  tags: string[]
  difficulty: 'EASY' | 'MEDIUM' | 'HARD'
  wordMin: number
  wordMax: number
  minutes: number
  isPremium: boolean
}

const ESSAY = { taskKind: 'ESSAY', wordMin: 200, wordMax: 300, minutes: 20 } as const
const SWT = { taskKind: 'SUMMARIZE_WRITTEN_TEXT', wordMin: 5, wordMax: 75, minutes: 10 } as const
const SST = { taskKind: 'SUMMARIZE_SPOKEN_TEXT', wordMin: 50, wordMax: 70, minutes: 10 } as const

export const SEED_WRITING_EXERCISES: SeedWritingExercise[] = [
  // --- Agree / disagree ------------------------------------------------------
  {
    ...ESSAY,
    slug: 'science-and-human-lives',
    title: 'Science and human lives',
    category: 'Agree or disagree',
    prompt:
      'Some people say that the only purpose of scientific research should be to improve human lives, and that research with no obvious practical benefit is a waste of money. To what extent do you agree or disagree with this view?',
    guidance:
      'Take one clear position in your introduction and hold it. A concession paragraph is fine, but it must end by returning to your side.',
    tags: ['science', 'technology', 'opinion'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'foreign-language-primary-school',
    title: 'Learning a foreign language at primary school',
    category: 'Agree or disagree',
    prompt:
      'Learning a foreign language should be compulsory from the first year of primary school rather than from secondary school. Do you agree or disagree? Support your position with reasons and examples.',
    guidance:
      'Watch your comparatives here — "earlier than", "more effective than". Comparative errors are one of the most common grammar losses on this task.',
    tags: ['education', 'language', 'children'],
    difficulty: 'EASY',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'accepting-versus-improving',
    title: 'Accepting a situation or improving it',
    category: 'Agree or disagree',
    prompt:
      'Some people believe that we should accept the situation we find ourselves in; others argue that we should always try to change it for the better. Discuss both views and give your own opinion.',
    guidance:
      'A discuss-both-views prompt needs three positions: theirs, the other one, and yours. Do not let your own opinion appear only in the last sentence.',
    tags: ['society', 'philosophy', 'discussion'],
    difficulty: 'HARD',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'remote-work-productivity',
    title: 'Remote work and productivity',
    category: 'Agree or disagree',
    prompt:
      'Working from home is more productive than working in an office. To what extent do you agree or disagree? Include relevant examples from your own experience or observation.',
    guidance: 'Use a concrete example rather than a generalisation. "In my previous role…" scores better than "many people say…".',
    tags: ['work', 'technology', 'opinion'],
    difficulty: 'EASY',
    isPremium: false,
  },

  // --- Problem and solution --------------------------------------------------
  {
    ...ESSAY,
    slug: 'urban-traffic-congestion',
    title: 'Traffic congestion in growing cities',
    category: 'Problem and solution',
    prompt:
      'Traffic congestion is worsening in most large cities. What are the main causes of this problem, and what measures could governments take to address it?',
    guidance:
      'Two-part prompts need two clearly separated body paragraphs. Signpost them: "The principal cause is…", "The most effective remedy would be…".',
    tags: ['cities', 'environment', 'government'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'childrens-moral-education',
    title: "Children's moral education",
    category: 'Problem and solution',
    prompt:
      'Some people think that children should be punished for breaking rules, while others believe that explaining why the rule exists is more effective. Why do children break rules, and which approach do you consider more effective?',
    guidance: 'Answer both halves. An essay that explains the causes beautifully but never picks an approach loses content marks.',
    tags: ['children', 'education', 'society'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'plastic-waste-reduction',
    title: 'Reducing household plastic waste',
    category: 'Problem and solution',
    prompt:
      'Household plastic waste continues to rise despite recycling programmes. What are the reasons for this, and what practical steps could individuals and manufacturers take?',
    guidance: 'Keep individuals and manufacturers distinct. Blurring the two is the fastest way to lose your structure marks.',
    tags: ['environment', 'consumption'],
    difficulty: 'MEDIUM',
    isPremium: true,
  },
  {
    ...ESSAY,
    slug: 'youth-unemployment',
    title: 'Graduate unemployment',
    category: 'Problem and solution',
    prompt:
      'In many countries, a growing number of university graduates cannot find work in their field of study. What causes this, and what should universities and employers do about it?',
    guidance: 'Cause-and-effect vocabulary is the target here: "stems from", "results in", "contributes to", "is driven by".',
    tags: ['work', 'education', 'economy'],
    difficulty: 'HARD',
    isPremium: true,
  },

  // --- Advantages and disadvantages ------------------------------------------
  {
    ...ESSAY,
    slug: 'specialised-versus-broad-study',
    title: 'Specialised or broad university study',
    category: 'Advantages and disadvantages',
    prompt:
      'Some universities require students to specialise in one subject from the first year, while others expect students to study a range of subjects before choosing. Discuss the advantages and disadvantages of each approach.',
    guidance:
      'Balance matters on this prompt. If one side gets six sentences and the other gets two, the marker sees an opinion essay, not a discussion.',
    tags: ['education', 'university', 'discussion'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'risk-taking-at-work',
    title: 'Taking risks professionally and personally',
    category: 'Advantages and disadvantages',
    prompt:
      'Taking risks in your professional and personal life can lead to great rewards, but it can also lead to serious loss. Discuss the advantages and disadvantages of a willingness to take risks.',
    guidance: 'Define what you mean by "risk" in the introduction. An undefined key term makes every later paragraph vaguer.',
    tags: ['work', 'personal development'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'social-media-and-news',
    title: 'Getting news from social media',
    category: 'Advantages and disadvantages',
    prompt:
      'More people now get their news from social media than from newspapers or television. What are the advantages and disadvantages of this shift?',
    guidance: 'Avoid listing. Three developed points beat six undeveloped ones on this task type.',
    tags: ['media', 'technology', 'society'],
    difficulty: 'EASY',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'ageing-population',
    title: 'An ageing population',
    category: 'Advantages and disadvantages',
    prompt:
      'In many developed countries, people are living considerably longer than previous generations. Discuss the advantages and disadvantages this presents for society.',
    guidance: 'Reach for precise quantifiers — "a substantial proportion", "a marked increase" — rather than "a lot" and "very many".',
    tags: ['society', 'health', 'economy'],
    difficulty: 'HARD',
    isPremium: true,
  },

  // --- Two-part questions ----------------------------------------------------
  {
    ...ESSAY,
    slug: 'researching-house-history',
    title: 'Researching the history of a house',
    category: 'Two-part question',
    prompt:
      'In some countries, many people are interested in finding out about the history of the house or building they live in. Why might people want to do this, and how could they go about researching it?',
    guidance: 'This prompt invites narrative drift. Every paragraph must answer "why" or "how", not describe an old building.',
    tags: ['history', 'culture', 'research'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...ESSAY,
    slug: 'arts-funding',
    title: 'Public funding for the arts',
    category: 'Two-part question',
    prompt:
      'Some governments fund museums, theatres and galleries from public money. Why do governments choose to do this, and is it the best use of public funds?',
    guidance: 'The second half asks for judgement. State it plainly — hedging through the whole essay reads as having no position.',
    tags: ['culture', 'government', 'economy'],
    difficulty: 'HARD',
    isPremium: true,
  },

  // --- Summarize Written Text ------------------------------------------------
  {
    ...SWT,
    slug: 'swt-antibiotic-resistance',
    title: 'Antibiotic resistance',
    category: 'Summarise a passage',
    prompt: 'Read the passage and summarise it in one sentence of 5 to 75 words.',
    passage:
      'Antibiotic resistance occurs when bacteria change in response to the use of these medicines, so that the drugs that once killed them no longer work. It is a natural evolutionary process, but it has been dramatically accelerated by the overuse and misuse of antibiotics in both human medicine and agriculture. Patients who stop a course early, physicians who prescribe antibiotics for viral infections, and farmers who use them routinely to promote growth in livestock all create conditions in which resistant strains survive and multiply. The consequences are already visible: infections that were once routinely treatable now require longer hospital stays, more expensive drugs and, in a growing number of cases, produce outcomes that cannot be treated at all. Public health bodies argue that the response must be coordinated internationally, since resistant bacteria do not respect borders, and must combine tighter prescribing rules with sustained investment in developing genuinely new classes of antibiotic.',
    guidance:
      'One sentence. Not two, and not one sentence with a semicolon standing in for a full stop — that scores zero for form.',
    tags: ['health', 'science'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...SWT,
    slug: 'swt-urban-green-space',
    title: 'Urban green space',
    category: 'Summarise a passage',
    prompt: 'Read the passage and summarise it in one sentence of 5 to 75 words.',
    passage:
      'Research into the effect of urban green space on wellbeing has moved well beyond the simple observation that people enjoy parks. Longitudinal studies now suggest that residents living within a short walk of a well-maintained green space report lower levels of stress hormones, sleep more consistently, and are measurably more likely to meet recommended activity levels than comparable residents who do not. The effect appears to be strongest for lower-income households, who are also the least likely to have access to private gardens, which has led some urban planners to argue that green space provision should be treated as a matter of health equity rather than amenity. Critics caution that much of the evidence remains correlational, and that neighbourhoods with generous parkland differ from others in ways that are difficult to control for. Even so, the consistency of the findings across cities and continents has been enough to shift planning policy in a number of large municipalities.',
    guidance: 'Capture the finding, the group it most affects, and the caveat. Leaving out the caveat costs you content marks.',
    tags: ['cities', 'health', 'research'],
    difficulty: 'HARD',
    isPremium: false,
  },
  {
    ...SWT,
    slug: 'swt-remote-sensing',
    title: 'Satellites and crop forecasting',
    category: 'Summarise a passage',
    prompt: 'Read the passage and summarise it in one sentence of 5 to 75 words.',
    passage:
      'Agricultural forecasters once relied almost entirely on ground surveys, sending inspectors into sample fields and extrapolating from what they found. Satellite remote sensing has largely displaced that method. Instruments now measure the light reflected from crops across several wavelengths, and because healthy vegetation reflects near-infrared light strongly while stressed vegetation does not, analysts can estimate the condition of a crop across an entire region within days rather than weeks. The resulting forecasts have proved accurate enough that commodity markets react to their publication, and aid agencies use them to anticipate food shortages months before harvest. The limitation is cloud cover, which blocks the optical instruments entirely; radar satellites can see through cloud but yield data that is considerably harder to interpret, so the two are increasingly used together.',
    guidance: 'Compress hard. Everything before "Satellite remote sensing" is background and can go.',
    tags: ['technology', 'agriculture'],
    difficulty: 'MEDIUM',
    isPremium: true,
  },

  // --- Summarize Spoken Text -------------------------------------------------
  {
    ...SST,
    slug: 'sst-behavioural-economics',
    title: 'Lecture: behavioural economics',
    category: 'Summarise a lecture',
    prompt:
      'You have listened to a lecture on behavioural economics. Write a summary of 50 to 70 words for a fellow student who missed it.',
    passage:
      'Lecture notes: Classical economics assumes people are rational agents who weigh costs and benefits and choose optimally. Behavioural economics starts from the observation that they demonstrably do not. Kahneman and Tversky showed that people fear a loss roughly twice as much as they value an equivalent gain — loss aversion. They also anchor on irrelevant numbers, judge probability by how easily an example comes to mind, and consistently prefer a smaller reward now to a larger one later. None of this makes people irrational in a useless sense; the biases are systematic and therefore predictable, which is precisely what makes them useful. Governments now design default options in pension and organ-donation schemes around them, because changing what happens when someone does nothing turns out to change behaviour far more reliably than information campaigns do.',
    guidance:
      'Fifty to seventy words, and it must read as continuous prose. A list of bullet points written as a paragraph still reads as a list.',
    tags: ['economics', 'psychology'],
    difficulty: 'MEDIUM',
    isPremium: false,
  },
  {
    ...SST,
    slug: 'sst-coral-bleaching',
    title: 'Lecture: coral bleaching',
    category: 'Summarise a lecture',
    prompt:
      'You have listened to a lecture on coral bleaching. Write a summary of 50 to 70 words that captures the main points.',
    passage:
      'Lecture notes: Reef-building corals live in symbiosis with algae called zooxanthellae, which photosynthesise inside the coral tissue and supply most of the coral’s energy. When water temperature rises even one or two degrees above the seasonal maximum for a sustained period, that relationship breaks down and the coral expels the algae. The coral turns white — that is the bleaching — and it is not yet dead, but it is starving. If conditions return to normal quickly enough the algae recolonise and the coral recovers. If they do not, the coral dies, and the reef structure begins to erode. What has changed in recent decades is the interval between bleaching events: it is now frequently shorter than the ten or so years a badly damaged reef needs to recover.',
    guidance: 'The examiner wants mechanism, consequence and what has changed. Squeeze the background into a clause.',
    tags: ['environment', 'biology'],
    difficulty: 'HARD',
    isPremium: true,
  },

  // --- Freeform --------------------------------------------------------------
  {
    taskKind: 'FREEFORM',
    wordMin: 0,
    wordMax: 0,
    minutes: 15,
    slug: 'freeform-cover-letter',
    title: 'A cover letter or personal statement',
    category: 'Everyday writing',
    prompt:
      'Write the cover letter, personal statement or application email you actually need to send. Say who you are, what you are applying for, and why you are a good fit.',
    guidance:
      'Real writing is the best practice there is. Write it as you would send it, and let the tool show you what a marker would change.',
    tags: ['application', 'professional'],
    difficulty: 'EASY',
    isPremium: false,
  },
  {
    taskKind: 'FREEFORM',
    wordMin: 0,
    wordMax: 0,
    minutes: 10,
    slug: 'freeform-complaint-email',
    title: 'A formal complaint or request',
    category: 'Everyday writing',
    prompt:
      'Write a formal email complaining about a product or service, or requesting something from an institution. Keep the tone firm and polite.',
    guidance:
      'Formal register is a scored habit, not a separate skill. Watch for contractions and conversational openers creeping in.',
    tags: ['professional', 'register'],
    difficulty: 'EASY',
    isPremium: false,
  },
]
