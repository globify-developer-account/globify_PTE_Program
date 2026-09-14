/**
 * Seed question bank.
 *
 * Every passage, prompt, option set and sample answer here was written for
 * Globify. Blanks are marked `{{1}}`, `{{2}}` … and the renderer splits on
 * those markers; the matching answer key lives in `correctAnswer.blanks`.
 */

import type { Chart } from '../../src/lib/content/charts'

export interface SeedQuestion {
  code: string
  typeCode: string
  title: string
  prompt?: string
  passage?: string
  audioTranscript?: string
  imageUrl?: string
  audioUrl?: string
  /** Describe Image only: the figure `npm run content:media` draws for this question. */
  chart?: Chart
  options?: unknown
  correctAnswer?: unknown
  explanation?: string
  sampleAnswer?: string
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD'
  tags?: string[]
  wordLimitMin?: number
  wordLimitMax?: number
  isPremium?: boolean
}

export const SEED_QUESTIONS: SeedQuestion[] = [
  // --- Speaking: Read Aloud ---------------------------------------------------
  {
    code: 'RA-001',
    typeCode: 'READ_ALOUD',
    title: 'Urban green corridors',
    passage:
      'Cities that thread narrow strips of woodland between their neighbourhoods report measurably cooler summer temperatures than those that do not. These green corridors do more than provide shade: they slow storm water, filter particulates from the air, and give small mammals a route between habitats that would otherwise be isolated by traffic. Planners increasingly treat them as infrastructure rather than decoration.',
    difficulty: 'MEDIUM',
    tags: ['environment', 'urban planning'],
  },
  {
    code: 'RA-002',
    typeCode: 'READ_ALOUD',
    title: 'The economics of repair',
    passage:
      'For most of the twentieth century, repairing a household appliance cost less than replacing it. That balance has inverted. Falling manufacturing costs, sealed enclosures and proprietary components have made repair the expensive option, and consumers have responded rationally by discarding what breaks. Legislators in several countries now argue that the calculation itself is the problem.',
    difficulty: 'MEDIUM',
    tags: ['economics', 'sustainability'],
  },
  {
    code: 'RA-003',
    typeCode: 'READ_ALOUD',
    title: 'Sleep and memory consolidation',
    passage:
      'During deep sleep the hippocampus replays the day’s experiences to the cortex at accelerated speed, a process researchers describe as consolidation. Interrupting this phase does not merely leave a person tired; it measurably degrades their ability to recall what they learned the previous afternoon. The finding has obvious implications for students who study through the night before an examination.',
    difficulty: 'HARD',
    tags: ['science', 'psychology'],
    isPremium: true,
  },

  // --- Speaking: Repeat Sentence ----------------------------------------------
  {
    code: 'RS-001',
    typeCode: 'REPEAT_SENTENCE',
    title: 'Library opening hours',
    prompt: 'Listen to the sentence and repeat it exactly as you hear it.',
    audioTranscript: 'The library extends its opening hours during the examination period.',
    difficulty: 'EASY',
    tags: ['campus'],
  },
  {
    code: 'RS-002',
    typeCode: 'REPEAT_SENTENCE',
    title: 'Research funding',
    prompt: 'Listen to the sentence and repeat it exactly as you hear it.',
    audioTranscript:
      'Most of the funding for this research came from a government grant awarded three years ago.',
    difficulty: 'MEDIUM',
    tags: ['academic'],
  },

  // --- Speaking: Describe Image -----------------------------------------------
  {
    code: 'DI-001',
    typeCode: 'DESCRIBE_IMAGE',
    title: 'Global renewable capacity, 2015–2024',
    prompt:
      'Look at the chart below. In 25 seconds, prepare to describe what it shows. You will then have 40 seconds to speak.',
    sampleAnswer:
      'The bar chart shows installed renewable capacity between 2015 and 2024, measured in gigawatts. Capacity rises steadily across the whole period, from roughly 780 gigawatts in 2015 to just over 2,400 in 2024. Growth is modest until 2019 and then accelerates sharply, with the steepest single-year increase between 2021 and 2022. Overall, the chart shows capacity roughly tripling in under a decade.',
    chart: {
      type: 'bar',
      title: 'Global installed renewable capacity, 2015–2024',
      unit: 'GW',
      yLabel: 'Capacity (gigawatts)',
      categories: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024'],
      series: [{ name: 'Renewable capacity', values: [785, 940, 1080, 1210, 1350, 1600, 1850, 2150, 2290, 2410] }],
    },
    difficulty: 'MEDIUM',
    tags: ['chart', 'energy'],
  },
  {
    code: 'DI-002',
    typeCode: 'DESCRIBE_IMAGE',
    title: 'Water cycle diagram',
    prompt:
      'Look at the diagram below. In 25 seconds, prepare to describe what it shows. You will then have 40 seconds to speak.',
    sampleAnswer:
      'The diagram illustrates the water cycle. Solar energy evaporates water from oceans and lakes, forming vapour that rises and cools into clouds through condensation. The clouds release precipitation as rain or snow, which either runs off into rivers, infiltrates the soil as groundwater, or is taken up by plants and returned through transpiration. The cycle is continuous, with no beginning or end point.',
    chart: {
      type: 'process',
      title: 'The water cycle',
      cycle: true,
      steps: [
        'Sun heats oceans and lakes',
        'Evaporation: water vapour rises',
        'Condensation forms clouds',
        'Precipitation as rain or snow',
        'Runoff and infiltration to groundwater',
        'Transpiration from plants',
      ],
    },
    difficulty: 'EASY',
    tags: ['diagram', 'science'],
  },

  // --- Speaking: Retell Lecture -----------------------------------------------
  {
    code: 'RL-001',
    typeCode: 'RETELL_LECTURE',
    title: 'Why cities grew beside rivers',
    prompt: 'You will hear a short lecture. Retell it in your own words.',
    audioTranscript:
      'Almost every ancient city of consequence sits on a river, and the reason is not primarily drinking water. Rivers were the cheapest transport available. Moving a tonne of grain overland by cart cost roughly twenty times what it cost by barge, which meant a city on a navigable river could feed a far larger population from a far wider hinterland. That advantage compounded: more people meant more specialists, more trade, and more reason for others to settle there. Only with the railway did the constraint loosen, and by then the map of major cities had already been drawn.',
    sampleAnswer:
      'The lecture explains why ancient cities were built beside rivers. The main reason was transport cost rather than drinking water — moving grain by barge was about twenty times cheaper than by cart. That let river cities draw food from a much larger area and support bigger populations, which in turn attracted specialists and trade. The advantage compounded over time, and although railways eventually removed the constraint, the map of major cities had already been fixed by then.',
    difficulty: 'MEDIUM',
    tags: ['history', 'geography'],
  },
  {
    code: 'RL-002',
    typeCode: 'RETELL_LECTURE',
    title: 'The placebo response',
    prompt: 'You will hear a short lecture. Retell it in your own words.',
    audioTranscript:
      'The placebo response is often dismissed as patients imagining improvement, but that description is wrong in an important way. Measurable physiological changes occur: endorphin release, altered immune markers, changes in dopamine signalling in Parkinson’s patients. What the response demonstrates is that expectation is itself a biological input. This creates a genuine problem for trial design, because a treatment must now outperform not nothing, but a brain actively predicting recovery.',
    difficulty: 'HARD',
    tags: ['medicine', 'research'],
    isPremium: true,
  },

  // --- Speaking: Answer Short Question ----------------------------------------
  {
    code: 'ASQ-001',
    typeCode: 'ANSWER_SHORT_QUESTION',
    title: 'Frozen water',
    audioTranscript: 'What do we call water that has frozen into a solid state?',
    correctAnswer: { text: 'ice' },
    difficulty: 'EASY',
    tags: ['general knowledge'],
  },
  {
    code: 'ASQ-002',
    typeCode: 'ANSWER_SHORT_QUESTION',
    title: 'Study of past events',
    audioTranscript: 'What is the name of the academic subject that studies past events?',
    correctAnswer: { text: 'history' },
    difficulty: 'EASY',
    tags: ['general knowledge'],
  },

  // --- Writing: Summarize Written Text ----------------------------------------
  {
    code: 'SWT-001',
    typeCode: 'SUMMARIZE_WRITTEN_TEXT',
    title: 'Antibiotic resistance in agriculture',
    prompt:
      'Read the passage below and summarise it using one sentence of between 5 and 75 words. You have 10 minutes.',
    passage:
      'Roughly two thirds of all antibiotics sold worldwide are given to farm animals, and the majority of those doses are not treating illness. They are administered at low levels across whole herds because animals given routine antibiotics grow faster and tolerate crowded conditions better. The practice is commercially rational and epidemiologically reckless. Bacteria exposed to sub-therapeutic doses are placed under exactly the selective pressure that favours resistant strains, and those strains do not respect the boundary between livestock and people. Resistant infections acquired on farms have been traced into hospital wards hundreds of kilometres away. Several countries have banned growth-promotion use outright, and the evidence from Denmark, which did so in the late 1990s, suggests the cost to producers is real but modest — far smaller than the public health cost of doing nothing.',
    wordLimitMin: 5,
    wordLimitMax: 75,
    sampleAnswer:
      'Because most antibiotics worldwide are given routinely to healthy farm animals to promote growth, bacteria are exposed to the sub-therapeutic doses that select for resistant strains which then spread to humans, and although several countries have banned the practice at a modest cost to producers, that cost is far lower than the public health consequences of inaction.',
    difficulty: 'MEDIUM',
    tags: ['health', 'agriculture'],
  },
  {
    code: 'SWT-002',
    typeCode: 'SUMMARIZE_WRITTEN_TEXT',
    title: 'The decline of cursive handwriting',
    prompt:
      'Read the passage below and summarise it using one sentence of between 5 and 75 words. You have 10 minutes.',
    passage:
      'When several education systems removed cursive handwriting from their curricula, the justification was straightforward: keyboards had replaced pens for almost every task an adult performs, and classroom time is finite. Critics responded that handwriting is not merely a means of recording words. Studies of children taught to form letters by hand show stronger letter recognition and better retention of written material than those taught by typing alone, apparently because the motor act of drawing a shape reinforces the visual memory of it. The counterargument is not that cursive specifically must survive, but that the underlying skill it trains — fine motor control paired with symbol formation — has cognitive value that keyboards do not supply. Where the debate has settled, it has usually settled on teaching print handwriting thoroughly and treating cursive as optional.',
    wordLimitMin: 5,
    wordLimitMax: 75,
    sampleAnswer:
      'Although education systems dropped cursive because keyboards have replaced pens and classroom time is limited, critics point to evidence that forming letters by hand improves letter recognition and retention through motor reinforcement, so the debate has generally settled on teaching print handwriting thoroughly while treating cursive itself as optional.',
    difficulty: 'MEDIUM',
    tags: ['education'],
  },

  // --- Writing: Essay ----------------------------------------------------------
  {
    code: 'WE-001',
    typeCode: 'ESSAY',
    title: 'Remote work and cities',
    prompt:
      'Some people believe that widespread remote work will hollow out city centres, while others argue it will make cities more liveable. Discuss both views and give your own opinion. Write 200–300 words in 20 minutes.',
    wordLimitMin: 200,
    wordLimitMax: 300,
    difficulty: 'MEDIUM',
    tags: ['society', 'work'],
  },
  {
    code: 'WE-002',
    typeCode: 'ESSAY',
    title: 'Free university education',
    prompt:
      'University education should be funded entirely by the government and free at the point of use. To what extent do you agree or disagree? Write 200–300 words in 20 minutes.',
    wordLimitMin: 200,
    wordLimitMax: 300,
    difficulty: 'MEDIUM',
    tags: ['education', 'policy'],
  },
  {
    code: 'WE-003',
    typeCode: 'ESSAY',
    title: 'Automation and employment',
    prompt:
      'Automation will eliminate more jobs than it creates over the next twenty years. Do you agree or disagree? Support your position with reasons and examples. Write 200–300 words in 20 minutes.',
    wordLimitMin: 200,
    wordLimitMax: 300,
    difficulty: 'HARD',
    tags: ['technology', 'economics'],
    isPremium: true,
  },

  // --- Reading: MCQ single -----------------------------------------------------
  {
    code: 'RMCQ-001',
    typeCode: 'READING_MCQ_SINGLE',
    title: 'Coral bleaching',
    prompt: 'According to the passage, what is the immediate cause of coral bleaching?',
    passage:
      'Reef-building corals live in partnership with microscopic algae that photosynthesise inside their tissue and supply most of the coral’s energy. The relationship is finely tuned to temperature. When water warms by even one or two degrees above the summer maximum for a sustained period, the algae begin producing compounds that are toxic to their host, and the coral expels them. Stripped of its algae, the coral loses its colour and, more importantly, its principal food supply. Bleaching itself is not death — corals can recover if temperatures fall quickly enough for the algae to return — but a bleached reef is starving, and prolonged events are usually fatal.',
    options: [
      { id: 'a', text: 'Direct physical damage to the coral skeleton by storms' },
      { id: 'b', text: 'The coral expelling its algae after sustained warming' },
      { id: 'c', text: 'A reduction in the salinity of the surrounding water' },
      { id: 'd', text: 'Overgrowth of the reef by competing seaweed species' },
    ],
    correctAnswer: { optionId: 'b' },
    explanation:
      'The passage states that warming causes the algae to produce compounds toxic to the coral, which then expels them — that expulsion is bleaching. Storms, salinity and seaweed are not mentioned.',
    difficulty: 'EASY',
    tags: ['science', 'marine biology'],
  },
  {
    code: 'RMCQ-002',
    typeCode: 'READING_MCQ_SINGLE',
    title: 'The standardisation of time',
    prompt: 'What does the passage suggest was the main driver of standardised time zones?',
    passage:
      'Before the 1880s, almost every town kept its own clock, set by local noon. The difference between neighbouring towns was a matter of minutes and mattered to nobody. Railways changed that arithmetic. A timetable that had to reconcile dozens of local noons was not merely inconvenient — it was dangerous, because two trains on a single track relied on a shared understanding of when each would arrive. Railway companies therefore imposed their own uniform time along their lines, and the public adopted it because the alternative was missing trains. Legislatures ratified what the companies had already established, often years afterwards.',
    options: [
      { id: 'a', text: 'International diplomatic agreements between governments' },
      { id: 'b', text: 'The invention of more accurate mechanical clocks' },
      { id: 'c', text: 'The operational and safety needs of railway companies' },
      { id: 'd', text: 'Astronomical observations that corrected local noon' },
    ],
    correctAnswer: { optionId: 'c' },
    explanation:
      'The passage attributes standardisation to railways — specifically timetable coordination and the safety of trains sharing track — and notes legislatures merely ratified it afterwards.',
    difficulty: 'MEDIUM',
    tags: ['history'],
  },

  // --- Reading: MCQ multiple ---------------------------------------------------
  {
    code: 'RMCM-001',
    typeCode: 'READING_MCQ_MULTIPLE',
    title: 'Benefits of urban trees',
    prompt: 'Which of the following benefits of urban trees are mentioned in the passage? Choose all that apply.',
    passage:
      'A mature street tree does several jobs at once. Its canopy intercepts rainfall, reducing the volume that reaches the drainage system during a storm and lowering the risk of flash flooding. The same canopy shades pavements and building facades, cutting summer surface temperatures by several degrees and reducing the electricity drawn by air conditioning. Leaves trap particulate matter from vehicle exhaust. Less obviously, streets with established tree cover consistently record higher property values and lower reported stress among residents. What trees do not do, despite frequent claims, is meaningfully reduce traffic noise; the effect is measurable but small.',
    options: [
      { id: 'a', text: 'Reducing storm water reaching drains' },
      { id: 'b', text: 'Substantially reducing traffic noise' },
      { id: 'c', text: 'Lowering summer surface temperatures' },
      { id: 'd', text: 'Trapping particulates from exhaust' },
      { id: 'e', text: 'Raising nearby property values' },
    ],
    correctAnswer: { optionIds: ['a', 'c', 'd', 'e'] },
    explanation:
      'The passage explicitly names rainfall interception, cooling, particulate capture and property values. It states directly that the noise-reduction effect is small, so option B is contradicted.',
    difficulty: 'MEDIUM',
    tags: ['environment'],
  },
  {
    code: 'RMCM-002',
    typeCode: 'READING_MCQ_MULTIPLE',
    title: 'Peer review under strain',
    prompt: 'Which criticisms of peer review does the author make? Choose all that apply.',
    passage:
      'Peer review is defended as the mechanism that separates science from assertion, yet its practical operation deserves scrutiny. Reviewers are unpaid, anonymous and typically given no training in what the task requires. The number of submissions has grown far faster than the pool of people willing to assess them, so editors increasingly send manuscripts to whoever will accept. Studies that deliberately inserted errors into papers found that most reviewers caught fewer than a third. None of this makes the system worthless — it filters out a great deal of obvious weakness — but the claim that it certifies correctness is not one the evidence supports.',
    options: [
      { id: 'a', text: 'Reviewers receive no training for the task' },
      { id: 'b', text: 'Submission volume outpaces reviewer availability' },
      { id: 'c', text: 'Reviewers are paid too much for the work' },
      { id: 'd', text: 'Deliberately inserted errors often go undetected' },
      { id: 'e', text: 'The system removes no weak work at all' },
    ],
    correctAnswer: { optionIds: ['a', 'b', 'd'] },
    explanation:
      'The author cites lack of training, the imbalance between submissions and reviewers, and the error-detection studies. Reviewers are described as unpaid, and the passage explicitly credits the system with filtering obvious weakness.',
    difficulty: 'HARD',
    tags: ['academic'],
    isPremium: true,
  },

  // --- Reading: Re-order paragraphs -------------------------------------------
  {
    code: 'RO-001',
    typeCode: 'REORDER_PARAGRAPHS',
    title: 'How vaccines were standardised',
    prompt: 'The text boxes below are in random order. Restore the original order.',
    options: [
      { id: 'p1', text: 'Early vaccine production was a cottage industry, with each laboratory preparing material to its own recipe.' },
      { id: 'p2', text: 'The consequences became impossible to ignore in 1901, when contaminated batches killed children in two American cities.' },
      { id: 'p3', text: 'Congress responded the following year with legislation requiring federal licensing of every producer.' },
      { id: 'p4', text: 'That framework, refined but not fundamentally altered, still governs biological manufacturing today.' },
    ],
    correctAnswer: { order: ['p1', 'p2', 'p3', 'p4'] },
    explanation:
      'The paragraphs follow a clear chronology: an unregulated starting state, the crisis that exposed it, the legislative response, and its lasting effect.',
    difficulty: 'MEDIUM',
    tags: ['history', 'medicine'],
  },
  {
    code: 'RO-002',
    typeCode: 'REORDER_PARAGRAPHS',
    title: 'The spread of the printing press',
    prompt: 'The text boxes below are in random order. Restore the original order.',
    options: [
      { id: 'q1', text: 'Gutenberg’s press combined three existing technologies: movable type, oil-based ink and the wine press.' },
      { id: 'q2', text: 'None of these was new, but no one had previously seen that together they solved the problem of reproducing text at scale.' },
      { id: 'q3', text: 'Within fifty years presses were operating in more than two hundred European cities.' },
      { id: 'q4', text: 'The resulting collapse in the price of books did more to spread literacy than any decree of the period.' },
    ],
    correctAnswer: { order: ['q1', 'q2', 'q3', 'q4'] },
    explanation:
      'The sequence moves from what the press combined, to why the combination mattered, to how fast it spread, to its consequence.',
    difficulty: 'MEDIUM',
    tags: ['history'],
  },

  // --- Reading: Fill in the blanks --------------------------------------------
  {
    code: 'RFIB-001',
    typeCode: 'READING_FILL_BLANKS',
    title: 'Migration of the Arctic tern',
    prompt: 'Select the appropriate word for each blank.',
    passage:
      'The Arctic tern undertakes the longest {{1}} of any animal, flying from its breeding grounds near the North Pole to the Antarctic and back each year. Tracking studies have {{2}} that the route is not direct: birds follow prevailing winds in a broad S-shape across the Atlantic, which adds distance but {{3}} the energy each journey demands.',
    options: [
      { index: 1, choices: ['migration', 'hibernation', 'digestion', 'formation'] },
      { index: 2, choices: ['revealed', 'concealed', 'reversed', 'delayed'] },
      { index: 3, choices: ['reduces', 'increases', 'ignores', 'doubles'] },
    ],
    correctAnswer: { blanks: { '1': 'migration', '2': 'revealed', '3': 'reduces' } },
    explanation:
      'The passage describes an annual journey (migration), studies that showed something previously unknown (revealed), and a route that adds distance yet saves energy (reduces).',
    difficulty: 'EASY',
    tags: ['biology'],
  },
  {
    code: 'RFIB-002',
    typeCode: 'READING_FILL_BLANKS',
    title: 'Soil carbon',
    prompt: 'Select the appropriate word for each blank.',
    passage:
      'Soils hold more carbon than the atmosphere and all vegetation {{1}}. Ploughing exposes that carbon to oxygen, and a substantial {{2}} of it is lost to the air within a season. Practices such as no-till farming and cover cropping can {{3}} the trend, though the gains accumulate slowly and reverse quickly if the practice is abandoned.',
    options: [
      { index: 1, choices: ['combined', 'separated', 'excluded', 'divided'] },
      { index: 2, choices: ['proportion', 'shortage', 'absence', 'rejection'] },
      { index: 3, choices: ['reverse', 'accelerate', 'confirm', 'measure'] },
    ],
    correctAnswer: { blanks: { '1': 'combined', '2': 'proportion', '3': 'reverse' } },
    explanation:
      '"Combined" completes the comparison, "proportion" fits a quantity being lost, and "reverse" contrasts with the loss the previous sentence describes.',
    difficulty: 'MEDIUM',
    tags: ['environment', 'agriculture'],
  },

  // --- Reading & Writing: Fill in the blanks ----------------------------------
  {
    code: 'RWFIB-001',
    typeCode: 'READING_WRITING_FILL_BLANKS',
    title: 'The replication crisis',
    prompt: 'Choose the word that fits each blank in both meaning and grammar.',
    passage:
      'A finding that cannot be reproduced by an independent team is of limited {{1}}, however striking it appeared on publication. When psychologists attempted to replicate a hundred well-known studies, fewer than half {{2}} the original result. The response has been to change incentives rather than to blame individuals: journals now {{3}} pre-registration of hypotheses, and several funders require data to be made public.',
    options: [
      { index: 1, choices: ['value', 'volume', 'variety', 'vacancy'] },
      { index: 2, choices: ['yielded', 'yield', 'yielding', 'yields'] },
      { index: 3, choices: ['encourage', 'discourage', 'prohibit', 'ignore'] },
    ],
    correctAnswer: { blanks: { '1': 'value', '2': 'yielded', '3': 'encourage' } },
    explanation:
      '"Value" fits the judgement being made; "yielded" agrees with the past-tense narrative; "encourage" matches a reform intended to improve reliability.',
    difficulty: 'HARD',
    tags: ['academic', 'research'],
  },
  {
    code: 'RWFIB-002',
    typeCode: 'READING_WRITING_FILL_BLANKS',
    title: 'Desalination',
    prompt: 'Choose the word that fits each blank in both meaning and grammar.',
    passage:
      'Desalination has become {{1}} cheaper over the past two decades, largely because reverse-osmosis membranes now require far less pressure. The remaining obstacle is not the water but the brine: every litre produced leaves behind a concentrated residue that must be {{2}} somewhere. Discharging it into shallow coastal water {{3}} local ecosystems, so newer plants pipe it far offshore.',
    options: [
      { index: 1, choices: ['substantially', 'substantial', 'substance', 'substantiate'] },
      { index: 2, choices: ['disposed of', 'disposing', 'disposal', 'dispose'] },
      { index: 3, choices: ['damages', 'damage', 'damaging', 'damaged'] },
    ],
    correctAnswer: { blanks: { '1': 'substantially', '2': 'disposed of', '3': 'damages' } },
    explanation:
      'Each blank is a grammatical test: an adverb before a comparative, a passive participle after "must be", and a third-person singular verb agreeing with "discharging".',
    difficulty: 'MEDIUM',
    tags: ['technology', 'environment'],
  },

  // --- Listening: Summarize Spoken Text ---------------------------------------
  {
    code: 'SST-001',
    typeCode: 'SUMMARIZE_SPOKEN_TEXT',
    title: 'Why measuring poverty is difficult',
    prompt: 'You will hear a short lecture. Write a summary of 50–70 words. You have 10 minutes.',
    audioTranscript:
      'Every poverty statistic rests on a definition, and the definitions disagree. An absolute line fixes a basket of goods and asks who cannot afford it; this makes comparison across decades possible but ignores that what counts as necessary changes. A relative line defines poverty as falling below some fraction of median income; this captures exclusion but produces the odd result that a general recession can reduce measured poverty. Neither approach is wrong. The problem is that policy debates routinely cite one figure while arguing about the other, and the resulting conversation is incoherent.',
    wordLimitMin: 50,
    wordLimitMax: 70,
    sampleAnswer:
      'The lecture explains that poverty statistics depend on contested definitions. Absolute measures fix a basket of goods, allowing comparison over time but ignoring changing needs, while relative measures use a fraction of median income, capturing exclusion but implying that recessions reduce poverty. Neither is wrong, but policy debates often cite one measure while arguing about the other, producing incoherent discussion.',
    difficulty: 'HARD',
    tags: ['economics', 'policy'],
  },
  {
    code: 'SST-002',
    typeCode: 'SUMMARIZE_SPOKEN_TEXT',
    title: 'Birdsong dialects',
    prompt: 'You will hear a short lecture. Write a summary of 50–70 words. You have 10 minutes.',
    audioTranscript:
      'Many songbirds learn their song rather than inheriting it, and the consequence is dialect. A white-crowned sparrow raised in one valley sings a recognisably different song from one raised twenty kilometres away, and researchers can identify a bird’s origin by ear. These dialects persist across generations because young males copy the adults around them, and they shift gradually as copying errors accumulate — the same mechanism that produces regional accents in human speech. Where two dialects meet, birds often learn both.',
    wordLimitMin: 50,
    wordLimitMax: 70,
    sampleAnswer:
      'The lecture describes how songbirds learn rather than inherit their songs, producing regional dialects. White-crowned sparrows from valleys twenty kilometres apart sing distinguishably, and researchers can identify origin by ear. Dialects persist because young males copy nearby adults, and drift gradually as copying errors accumulate — the same process behind human regional accents. Birds at dialect boundaries frequently learn both versions.',
    difficulty: 'MEDIUM',
    tags: ['biology'],
  },

  // --- Listening: MCQ single ---------------------------------------------------
  {
    code: 'LMCQ-001',
    typeCode: 'LISTENING_MCQ_SINGLE',
    title: 'Lecture on tidal energy',
    prompt: 'Listen to the recording and answer the question. What is the speaker’s main reservation about tidal energy?',
    audioTranscript:
      'Tidal energy has one enormous advantage over wind and solar: it is completely predictable. We know exactly what the tide will be doing in fifty years’ time, which makes it far easier to integrate into a grid. My reservation is not about the resource but about the sites. The number of estuaries with a tidal range large enough to be worth developing is small, most are ecologically sensitive, and building a barrage across one fundamentally alters the sediment flow of the whole system. The engineering is solved. The siting is not.',
    options: [
      { id: 'a', text: 'Tidal output cannot be predicted accurately' },
      { id: 'b', text: 'Suitable sites are few and ecologically sensitive' },
      { id: 'c', text: 'The necessary engineering has not yet been developed' },
      { id: 'd', text: 'Tidal energy costs more than wind or solar' },
    ],
    correctAnswer: { optionId: 'b' },
    explanation:
      'The speaker praises predictability and says the engineering is solved, locating the problem specifically in the scarcity and sensitivity of suitable estuaries.',
    difficulty: 'MEDIUM',
    tags: ['energy'],
  },

  // --- Listening: MCQ multiple -------------------------------------------------
  {
    code: 'LMCM-001',
    typeCode: 'LISTENING_MCQ_MULTIPLE',
    title: 'Seminar on museum repatriation',
    prompt: 'Listen to the recording. Which points does the speaker make? Choose all that apply.',
    audioTranscript:
      'The repatriation debate is usually framed as ownership, which I think is the least interesting question. Three other things matter more. First, access: an object returned to a community that cannot afford climate control may be preserved worse, and that is a real cost, not a rhetorical one. Second, context: many objects were documented on removal in ways that are now the only surviving record of their use. Third, precedent: museums fear that one return implies a thousand, which is probably true and probably not a reason to refuse. What I do not accept is the argument that universal museums serve humanity better by concentrating objects in a few capitals.',
    options: [
      { id: 'a', text: 'Preservation conditions after return are a genuine concern' },
      { id: 'b', text: 'Ownership is the most important question in the debate' },
      { id: 'c', text: 'Removal records are sometimes the only surviving documentation' },
      { id: 'd', text: 'The speaker accepts the universal museum argument' },
      { id: 'e', text: 'One return does plausibly imply many more' },
    ],
    correctAnswer: { optionIds: ['a', 'c', 'e'] },
    explanation:
      'The speaker calls ownership the least interesting question and explicitly rejects the universal-museum argument, while affirming the preservation, documentation and precedent points.',
    difficulty: 'HARD',
    tags: ['culture'],
    isPremium: true,
  },

  // --- Listening: Fill in the blanks -------------------------------------------
  {
    code: 'LFIB-001',
    typeCode: 'LISTENING_FILL_BLANKS',
    title: 'Volcanic ash and aviation',
    prompt: 'Type the missing word you hear into each blank.',
    passage:
      'Volcanic ash is dangerous to aircraft because it {{1}} inside jet engines, where temperatures are high enough to melt it into glass. The glass then coats the turbine blades and the engine {{2}}. Radar cannot detect ash clouds reliably, so airlines depend on satellite imagery and dispersion {{3}} instead.',
    audioTranscript:
      'Volcanic ash is dangerous to aircraft because it melts inside jet engines, where temperatures are high enough to melt it into glass. The glass then coats the turbine blades and the engine stalls. Radar cannot detect ash clouds reliably, so airlines depend on satellite imagery and dispersion models instead.',
    correctAnswer: { blanks: { '1': 'melts', '2': 'stalls', '3': 'models' } },
    difficulty: 'MEDIUM',
    tags: ['aviation', 'geology'],
  },

  // --- Listening: Highlight Incorrect Words ------------------------------------
  {
    code: 'HIW-001',
    typeCode: 'HIGHLIGHT_INCORRECT_WORDS',
    title: 'Talk on freshwater scarcity',
    prompt: 'Click the words in the transcript that differ from what you hear.',
    passage:
      'Less than three percent of the water on Earth is fresh, and most of that is frozen in glaciers or buried too deep to reach. The portion available in rivers and shallow aquifers is tiny, and demand for it is rising faster than population, because rising incomes change diets towards food that takes more water to produce.',
    audioTranscript:
      'Less than three percent of the water on Earth is fresh, and most of that is locked in glaciers or buried too deep to reach. The portion accessible in rivers and shallow aquifers is tiny, and demand for it is climbing faster than population, because rising incomes shift diets towards food that takes more water to produce.',
    // Word indexes refer to the tokenised passage above.
    correctAnswer: { wordIndexes: [17, 32, 43, 53] },
    explanation:
      'The recording says "locked" not "frozen", "accessible" not "available", "climbing" not "rising", and "shift" not "change".',
    difficulty: 'HARD',
    tags: ['environment'],
  },

  // --- Listening: Write From Dictation -----------------------------------------
  {
    code: 'WFD-001',
    typeCode: 'WRITE_FROM_DICTATION',
    title: 'Assignment deadline',
    audioTranscript: 'The assignment deadline has been extended by one week.',
    correctAnswer: { text: 'The assignment deadline has been extended by one week.' },
    difficulty: 'EASY',
    tags: ['campus'],
  },
  {
    code: 'WFD-002',
    typeCode: 'WRITE_FROM_DICTATION',
    title: 'Laboratory access',
    audioTranscript: 'Students must complete the safety induction before entering the laboratory.',
    correctAnswer: { text: 'Students must complete the safety induction before entering the laboratory.' },
    difficulty: 'MEDIUM',
    tags: ['campus'],
  },
  {
    code: 'WFD-003',
    typeCode: 'WRITE_FROM_DICTATION',
    title: 'Research methodology',
    audioTranscript: 'The research methodology was described in considerable detail in the appendix.',
    correctAnswer: { text: 'The research methodology was described in considerable detail in the appendix.' },
    difficulty: 'HARD',
    tags: ['academic'],
    isPremium: true,
  },
]
