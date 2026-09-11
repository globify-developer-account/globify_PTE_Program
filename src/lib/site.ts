/**
 * Single source of truth for brand, contact and navigation data.
 * Anything an admin can change at runtime lives in PlatformSetting instead —
 * see src/lib/settings.ts. This file holds the compile-time defaults.
 */

export const siteConfig = {
  company: 'Globify Consultants',
  product: 'Globify PTE Premium',
  shortName: 'Globify PTE',
  tagline: 'Prepare Smarter. Practice Better. Score Higher.',
  promise: 'Your Complete AI-Powered PTE Preparation Platform.',
  description:
    'AI-powered PTE preparation with realistic practice, intelligent scoring and detailed performance insights. Speaking, Writing, Reading and Listening — with full mock tests and measurable progress.',
  url: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, ''),
  locale: 'en_PK',
  keywords: [
    'PTE preparation',
    'PTE practice',
    'PTE mock test',
    'PTE AI scoring',
    'PTE Academic',
    'PTE speaking practice',
    'PTE writing evaluation',
    'PTE 79 preparation',
    'PTE Pakistan',
    'Globify Consultants',
  ],
} as const

export const contactInfo = {
  email: 'info@globifyconsultants.com',
  supportEmail: 'support@globifyconsultants.com',
  phoneDisplay: '+92 339 1110171',
  phoneHref: '+923391110171',
  whatsapp: '923391110171',
  whatsappDisplay: '+92 339 1110171',
  address: {
    street: '2nd Floor, Kohinoor Plaza, Jaranwala Road',
    locality: 'Faisalabad',
    region: 'Punjab',
    country: 'Pakistan',
  },
  hours: 'Monday – Saturday, 9:00 AM – 9:00 PM (PKT)',
  socials: [
    { label: 'Facebook', href: 'https://facebook.com/globifyconsultants' },
    { label: 'Instagram', href: 'https://instagram.com/globifyconsultants' },
    { label: 'LinkedIn', href: 'https://linkedin.com/company/globifyconsultants' },
    { label: 'YouTube', href: 'https://youtube.com/@globifyconsultants' },
  ],
} as const

export const publicNav = [
  { label: 'PTE Preparation', href: '/pte' },
  { label: 'Practice', href: '/features#practice' },
  { label: 'Mock Tests', href: '/features#mock-tests' },
  { label: 'AI Scoring', href: '/features#ai-scoring' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Resources', href: '/resources' },
] as const

export const appNav = [
  { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Learn', href: '/learn', icon: 'GraduationCap' },
  { label: 'Practice', href: '/practice', icon: 'Mic' },
  { label: 'Mock Tests', href: '/mock-tests', icon: 'ClipboardList' },
  { label: 'Dictation & Shadowing', href: '/drills', icon: 'Headphones' },
  { label: 'Progress', href: '/progress', icon: 'TrendingUp' },
  { label: 'Conversations', href: '/conversations', icon: 'MessagesSquare' },
  { label: 'Writing Improvement', href: '/writing-improvement', icon: 'PenLine' },
  { label: 'AI Tools', href: '/ai-tools', icon: 'Sparkles' },
  { label: 'Resources', href: '/resources', icon: 'BookOpen' },
  { label: 'Profile', href: '/profile', icon: 'User' },
] as const

export const mobileNav = [
  { label: 'Home', href: '/dashboard', icon: 'Home' },
  { label: 'Practice', href: '/practice', icon: 'Mic' },
  { label: 'Mock', href: '/mock-tests', icon: 'ClipboardList' },
  { label: 'Progress', href: '/progress', icon: 'TrendingUp' },
  { label: 'Profile', href: '/profile', icon: 'User' },
] as const

export const adminNav = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard', permission: 'admin.view' },
  { label: 'Students', href: '/admin/students', icon: 'Users', permission: 'students.view' },
  { label: 'Questions', href: '/admin/questions', icon: 'FileQuestion', permission: 'questions.view' },
  { label: 'Mock Tests', href: '/admin/mock-tests', icon: 'ClipboardList', permission: 'mocks.view' },
  { label: 'Plans', href: '/admin/plans', icon: 'CreditCard', permission: 'plans.view' },
  { label: 'Payments', href: '/admin/payments', icon: 'Receipt', permission: 'payments.view' },
  { label: 'Coupons', href: '/admin/coupons', icon: 'Ticket', permission: 'plans.view' },
  { label: 'Courses', href: '/admin/courses', icon: 'GraduationCap', permission: 'content.view' },
  { label: 'Dictation & Shadowing', href: '/admin/drills', icon: 'Headphones', permission: 'content.view' },
  { label: 'Conversations', href: '/admin/conversations', icon: 'MessagesSquare', permission: 'content.view' },
  { label: 'Resources', href: '/admin/resources', icon: 'BookOpen', permission: 'content.view' },
  { label: 'Announcements', href: '/admin/announcements', icon: 'Megaphone', permission: 'content.view' },
  { label: 'Teacher Reviews', href: '/admin/reviews', icon: 'MessageSquareText', permission: 'reviews.view' },
  { label: 'AI Usage', href: '/admin/ai-usage', icon: 'Sparkles', permission: 'ai.view' },
  { label: 'Analytics', href: '/admin/analytics', icon: 'BarChart3', permission: 'analytics.view' },
  { label: 'Team', href: '/admin/team', icon: 'ShieldCheck', permission: 'admins.manage' },
  { label: 'Audit Log', href: '/admin/audit', icon: 'ScrollText', permission: 'audit.view' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings', permission: 'settings.manage' },
] as const

export const footerLinks = [
  {
    title: 'Platform',
    links: [
      { label: 'PTE Preparation', href: '/pte' },
      { label: 'Practice', href: '/features#practice' },
      { label: 'Mock Tests', href: '/features#mock-tests' },
      { label: 'AI Scoring', href: '/features#ai-scoring' },
      { label: 'Pricing', href: '/pricing' },
    ],
  },
  {
    title: 'Prepare',
    links: [
      { label: 'PTE Speaking', href: '/pte/speaking' },
      { label: 'PTE Writing', href: '/pte/writing' },
      { label: 'PTE Reading', href: '/pte/reading' },
      { label: 'PTE Listening', href: '/pte/listening' },
      { label: 'Resources', href: '/resources' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund Policy', href: '/refund-policy' },
      { label: 'AI Disclaimer', href: '/ai-disclaimer' },
    ],
  },
] as const

export const AI_DISCLAIMER =
  'AI Estimated Score. Scores produced by Globify PTE Premium are estimates generated for practice purposes only. They are not official Pearson PTE scores, and Globify Consultants is not affiliated with, endorsed by, or connected to Pearson.'
