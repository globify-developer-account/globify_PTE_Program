/**
 * Starter catalogue for AI Conversations.
 *
 * Each topic is a scene, not a question list: a persona with a reason to be
 * talking, an opening line the student can answer immediately, and goals the
 * report can actually check. Goals are phrased as things the student does, so
 * both the partner and the assessor can judge them from the transcript.
 */

export interface SeedConversationTopic {
  slug: string
  title: string
  subtitle: string
  description: string
  category: 'DAILY_LIFE' | 'SOCIAL' | 'TRAVEL' | 'WORK_AND_STUDY' | 'EXAM_PREP'
  level: 'EASY' | 'MEDIUM' | 'HARD'
  emoji: string
  personaName: string
  personaRole: string
  scenario: string
  openingLine: string
  goals: string[]
  starterPhrases: string[]
  targetLanguage: string[]
  isPremium: boolean
  displayOrder: number
}

export const SEED_CONVERSATION_TOPICS: SeedConversationTopic[] = [
  // --- daily life -------------------------------------------------------------
  {
    slug: 'introducing-yourself',
    title: 'Introducing yourself',
    subtitle: 'Meet someone new and tell them who you are.',
    description:
      'The conversation everything else builds on. Practise giving your name, where you are from and what you do, without rehearsing a script.',
    category: 'DAILY_LIFE',
    level: 'EASY',
    emoji: '👋',
    personaName: 'Sara',
    personaRole: 'someone you have just been introduced to at a language exchange',
    scenario:
      'You are both at a weekly language exchange meetup. You have never met before and have a few minutes to get to know each other before the session starts.',
    openingLine: "Hi! I don't think we've met — I'm Sara. What's your name?",
    goals: [
      'Give your name and where you are from',
      'Say what you do for work or study',
      'Ask Sara at least one question about herself',
    ],
    starterPhrases: [
      "Hi Sara, I'm — nice to meet you.",
      "I'm originally from, but I live in now.",
      'What about you — what brings you here?',
    ],
    targetLanguage: ['nice to meet you', 'I work as', "I'm originally from", 'what about you'],
    isPremium: false,
    displayOrder: 1,
  },
  {
    slug: 'your-daily-routine',
    title: 'Your daily routine',
    subtitle: 'Walk someone through an ordinary day.',
    description:
      'Sequencing and time expressions, in the tense you use most. A reliable warm-up before any speaking practice.',
    category: 'DAILY_LIFE',
    level: 'EASY',
    emoji: '⏰',
    personaName: 'Daniel',
    personaRole: 'a classmate who is curious how you fit everything in',
    scenario:
      'You are chatting over coffee after class. Daniel is struggling to organise his week and wants to hear how you structure yours.',
    openingLine:
      "I honestly don't know where my days go. What does a normal weekday look like for you — start to finish?",
    goals: [
      'Describe your morning routine in order',
      'Explain what takes up most of your day',
      'Say how your weekend differs from a weekday',
    ],
    starterPhrases: [
      'I usually wake up at around.',
      'After that, I tend to.',
      'Weekends are completely different because.',
    ],
    targetLanguage: ['I usually', 'after that', 'by the time', 'tend to', 'first thing in the morning'],
    isPremium: false,
    displayOrder: 2,
  },
  {
    slug: 'the-meaning-of-your-name',
    title: 'The meaning of your name',
    subtitle: 'Explain where your name comes from.',
    description:
      'A short, personal topic that pushes you into explaining and clarifying — and into spelling things out loud.',
    category: 'DAILY_LIFE',
    level: 'EASY',
    emoji: '🔤',
    personaName: 'Emma',
    personaRole: 'a colleague who is interested in names and their origins',
    scenario:
      'Emma has just heard your name for the first time and wants to know what it means and how to say it properly.',
    openingLine: "That's a lovely name — I don't think I've heard it before. Does it mean something?",
    goals: [
      'Say what your name means or where it comes from',
      'Explain who chose it and why',
      'Ask Emma about her own name',
    ],
    starterPhrases: [
      'It means in.',
      'I was named after.',
      "It's quite a common name where I'm from.",
    ],
    targetLanguage: ['it means', 'named after', "it's derived from", "it's pronounced"],
    isPremium: false,
    displayOrder: 3,
  },
  {
    slug: 'your-family',
    title: 'Your family',
    subtitle: 'Introduce the people you grew up with.',
    description:
      'Relationships, description and comparison — and one of the most common warm-up questions in any speaking test.',
    category: 'DAILY_LIFE',
    level: 'EASY',
    emoji: '👨‍👩‍👧',
    personaName: 'Ravi',
    personaRole: 'a new flatmate getting to know you',
    scenario:
      'You have just moved into a shared flat. Ravi is making dinner and asking about your family back home.',
    openingLine: 'So is it a big family back home, or just a few of you?',
    goals: [
      'Say how many people are in your family',
      'Describe one family member in detail',
      'Say who you are closest to and why',
    ],
    starterPhrases: [
      "There are of us — my and I.",
      "I'd say I'm closest to my because.",
      'She works as a, and in her free time she.',
    ],
    targetLanguage: ['I take after', 'we get on well', 'the eldest', 'close-knit'],
    isPremium: false,
    displayOrder: 4,
  },
  {
    slug: 'hobbies-and-interests',
    title: 'Hobbies and interests',
    subtitle: 'Talk about what you do when nobody is asking you to.',
    description:
      'Opinion and reason-giving. The goal is to get past "I like it" and into why, when and how you got started.',
    category: 'DAILY_LIFE',
    level: 'MEDIUM',
    emoji: '🎧',
    personaName: 'Chloe',
    personaRole: 'someone you met at a weekend club and want to keep talking to',
    scenario:
      'You have both signed up to a weekend club and are waiting for it to start. Chloe wants to know what else you do with your time.',
    openingLine: 'So what do you get up to outside work — anything you are properly into?',
    goals: [
      'Name a hobby and say how you got into it',
      'Explain why you enjoy it, with a reason',
      'Say how often you do it and what it costs you in time',
    ],
    starterPhrases: [
      "I've been into for about years now.",
      'What I like about it is that.',
      'I try to do it at least a week.',
    ],
    targetLanguage: ['I got into it', 'what I enjoy most is', 'it takes up', "I'm hooked on"],
    isPremium: false,
    displayOrder: 5,
  },
  {
    slug: 'birthdays-and-celebrations',
    title: 'Birthdays and celebrations',
    subtitle: 'Describe how you mark the day.',
    description:
      'Past and habitual tenses side by side, plus cultural description — a topic where you always have something to say.',
    category: 'SOCIAL',
    level: 'MEDIUM',
    emoji: '🎂',
    personaName: 'Marco',
    personaRole: 'a friend planning a surprise for someone and looking for ideas',
    scenario:
      'Marco is organising a birthday for a mutual friend and wants to know how birthdays are usually celebrated where you are from.',
    openingLine: "I'm trying to plan something for Ana's birthday. How do people usually celebrate where you're from?",
    goals: [
      'Describe how birthdays are celebrated where you are from',
      'Describe one birthday you remember well',
      'Suggest an idea to Marco and give a reason',
    ],
    starterPhrases: [
      'Where I am from, we usually.',
      'The best birthday I remember was when.',
      'If I were you, I would because.',
    ],
    targetLanguage: ['we tend to', 'it is traditional to', 'looking back', 'if I were you'],
    isPremium: false,
    displayOrder: 6,
  },
  {
    slug: 'your-hometown',
    title: 'Your hometown',
    subtitle: 'Describe the place that shaped you.',
    description:
      'Descriptive language, comparison and change over time. It sets up Describe Image and Retell Lecture vocabulary too.',
    category: 'SOCIAL',
    level: 'MEDIUM',
    emoji: '🏙️',
    personaName: 'Aisha',
    personaRole: 'a travel writer collecting places worth visiting',
    scenario:
      'Aisha writes about places tourists miss. She wants an honest picture of your hometown, not a brochure.',
    openingLine: "I'm collecting places most travellers never think to visit. Tell me about your hometown — what is it actually like?",
    goals: [
      'Describe where your hometown is and what it is known for',
      'Say what you like and dislike about it',
      'Explain how it has changed over time',
    ],
    starterPhrases: [
      "It's a city of about people in the of.",
      "What I love about it is, although.",
      "It's changed a lot since I was a child — there used to be.",
    ],
    targetLanguage: ['it is known for', 'there used to be', 'over the last decade', 'on the outskirts'],
    isPremium: false,
    displayOrder: 7,
  },

  // --- travel -----------------------------------------------------------------
  {
    slug: 'checking-into-a-hotel',
    title: 'Checking into a hotel',
    subtitle: 'Sort out a booking that has gone wrong.',
    description:
      'A transactional conversation with a problem in it. Practise being polite and firm at the same time.',
    category: 'TRAVEL',
    level: 'MEDIUM',
    emoji: '🏨',
    personaName: 'Tom',
    personaRole: 'a hotel receptionist who cannot find your booking',
    scenario:
      'You arrive late at a hotel after a long flight. Tom cannot find your reservation, and the hotel is nearly full.',
    openingLine:
      "Good evening. I'm sorry — I've searched twice and I can't find a booking under that name. Do you have a confirmation number?",
    goals: [
      'Explain your booking clearly, with the details',
      'Ask what options are available',
      'Reach an agreement about where you will sleep tonight',
    ],
    starterPhrases: [
      'I booked a room for nights, arriving today.',
      'I have the confirmation email here — it says.',
      'What can you do for me tonight?',
    ],
    targetLanguage: ['I made a reservation', 'could you check again', 'what are my options', 'I would appreciate it if'],
    isPremium: false,
    displayOrder: 8,
  },
  {
    slug: 'asking-for-directions',
    title: 'Asking for directions',
    subtitle: 'Get where you are going, and check you understood.',
    description:
      'Listening for detail and confirming it back — the repair skill that keeps real conversations from collapsing.',
    category: 'TRAVEL',
    level: 'EASY',
    emoji: '🗺️',
    personaName: 'Grace',
    personaRole: 'a local who is happy to help but talks quickly',
    scenario:
      'You are lost on the way to a train station in an unfamiliar city and stop someone in the street.',
    openingLine: 'You look a bit lost — are you after the station? It is not the easiest one to find.',
    goals: [
      'Explain where you are trying to get to',
      'Repeat the directions back to check you understood',
      'Ask how long it will take',
    ],
    starterPhrases: [
      "Sorry to bother you — I'm trying to get to.",
      'So, if I understood correctly, I go and then?',
      'How long does it take on foot?',
    ],
    targetLanguage: ['sorry to bother you', 'so just to check', 'which way is', 'is it far from here'],
    isPremium: false,
    displayOrder: 9,
  },

  // --- work and study ---------------------------------------------------------
  {
    slug: 'a-job-interview',
    title: 'A job interview',
    subtitle: 'Answer for your experience, and push back politely.',
    description:
      'Structured answers under mild pressure. The interviewer follows up on whatever you leave vague.',
    category: 'WORK_AND_STUDY',
    level: 'HARD',
    emoji: '💼',
    personaName: 'Priya',
    personaRole: 'a hiring manager interviewing you for a role you want',
    scenario:
      'You are twenty minutes into an interview for a role you are qualified for but not overqualified for. Priya is friendly but probes every answer.',
    openingLine:
      "Thanks for coming in. Before we get into the detail — tell me why this role, and why now?",
    goals: [
      'Explain why you want this role, with a concrete reason',
      'Describe a relevant achievement using specifics',
      'Ask Priya a question about the role or the team',
    ],
    starterPhrases: [
      "What draws me to this role is.",
      'In my last position, I was responsible for, and the result was.',
      'Could you tell me more about how the team is structured?',
    ],
    targetLanguage: [
      'I was responsible for',
      'as a result',
      'my strongest area is',
      "I'd be keen to understand",
    ],
    isPremium: true,
    displayOrder: 10,
  },
  {
    slug: 'disagreeing-in-a-meeting',
    title: 'Disagreeing in a meeting',
    subtitle: 'Say no to your colleague without a fight.',
    description:
      'Hedging, concession and counter-argument. The hardest thing to do politely in a second language.',
    category: 'WORK_AND_STUDY',
    level: 'HARD',
    emoji: '🤝',
    personaName: 'James',
    personaRole: 'a colleague pushing a deadline you think is unrealistic',
    scenario:
      'James wants to commit the team to a deadline you believe cannot be met. He is confident, well-liked, and not obviously wrong.',
    openingLine:
      "So I've told the client we can have it done by the end of next week. That works for you, right?",
    goals: [
      'Acknowledge what James is right about',
      'State your disagreement clearly and give a reason',
      'Propose an alternative',
    ],
    starterPhrases: [
      'I can see why you would want to commit to that, but.',
      'My concern is that.',
      'What if we instead?',
    ],
    targetLanguage: [
      'I take your point',
      "I'm not sure that's realistic",
      'my concern is',
      'would it be possible to',
    ],
    isPremium: true,
    displayOrder: 11,
  },
  {
    slug: 'explaining-your-study-plan',
    title: 'Explaining your study plan',
    subtitle: 'Say what you are doing to hit your score.',
    description:
      'Future forms and purpose clauses, on a subject you already know inside out.',
    category: 'WORK_AND_STUDY',
    level: 'MEDIUM',
    emoji: '📚',
    personaName: 'Hina',
    personaRole: 'a study partner preparing for the same exam',
    scenario:
      'You and Hina are both preparing for PTE Academic. She is behind on her plan and wants to compare approaches.',
    openingLine: "I feel like I'm revising without a plan. How are you actually preparing for this?",
    goals: [
      'Say what score you are aiming for and by when',
      'Explain what you practise most and why',
      'Give Hina one piece of specific advice',
    ],
    starterPhrases: [
      "I'm aiming for by.",
      'I spend most of my time on because.',
      'If I were you, I would start with.',
    ],
    targetLanguage: ['I am aiming for', 'in order to', "I've been working on", 'what helped me was'],
    isPremium: false,
    displayOrder: 12,
  },

  // --- exam prep --------------------------------------------------------------
  {
    slug: 'describe-image-out-loud',
    title: 'Talking through a chart',
    subtitle: 'Describe data the way Describe Image wants you to.',
    description:
      'The exact language PTE rewards in Describe Image — trends, comparisons and a conclusion — but in a conversation, so you can be corrected as you go.',
    category: 'EXAM_PREP',
    level: 'HARD',
    emoji: '📊',
    personaName: 'Owen',
    personaRole: 'a tutor who cannot see the chart and needs you to describe it',
    scenario:
      'Owen is helping you prepare for Describe Image. He asks you to describe a chart you have in front of you — any chart, real or imagined — in enough detail that he could redraw it.',
    openingLine:
      "Right — describe the chart to me as if I can't see it. Start with what it shows overall, then take me to the detail.",
    goals: [
      'State what the chart shows and its units',
      'Describe the main trend using comparison language',
      'Finish with a one-sentence conclusion',
    ],
    starterPhrases: [
      'The chart shows between and.',
      'The most striking feature is that.',
      'Overall, it suggests that.',
    ],
    targetLanguage: [
      'the chart illustrates',
      'rose sharply',
      'by contrast',
      'accounts for',
      'overall',
    ],
    isPremium: true,
    displayOrder: 13,
  },
  {
    slug: 'opinion-under-pressure',
    title: 'Defending an opinion',
    subtitle: 'Hold a position while someone argues back.',
    description:
      'Essay-level argument, spoken. Builds the reasoning you need for Write Essay and the fluency you need for Retell Lecture.',
    category: 'EXAM_PREP',
    level: 'HARD',
    emoji: '⚖️',
    personaName: 'Nadia',
    personaRole: 'a debate partner who takes the opposite side on principle',
    scenario:
      'Nadia will argue against whatever position you take, politely but persistently, on a topic of general interest such as technology, education or work.',
    openingLine:
      'Let us do one properly. Here is my claim: remote study is worse than being in a classroom. Do you agree — and why?',
    goals: [
      'State your position clearly in one sentence',
      'Support it with at least two distinct reasons',
      'Respond directly to one of Nadia’s counter-arguments',
    ],
    starterPhrases: [
      'I would argue that, mainly because.',
      'There are two reasons for this. Firstly,.',
      'That is a fair point, but it overlooks.',
    ],
    targetLanguage: [
      'I would argue that',
      'firstly / secondly',
      'that said',
      'the evidence suggests',
      'it overlooks',
    ],
    isPremium: true,
    displayOrder: 14,
  },
]
