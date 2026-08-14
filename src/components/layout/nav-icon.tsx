import {
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileQuestion,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Mic,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react'

/**
 * Navigation icons are named as strings in `src/lib/site.ts` so the nav data
 * stays serialisable and importable from server components. This map is the
 * only place those names are resolved to components.
 */
const ICONS: Record<string, LucideIcon> = {
  BarChart3,
  BookOpen,
  ClipboardList,
  CreditCard,
  FileQuestion,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquareText,
  Mic,
  Receipt,
  ScrollText,
  Settings,
  ShieldCheck,
  Sparkles,
  Ticket,
  TrendingUp,
  User,
  Users,
}

export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard
  return <Icon className={className} aria-hidden />
}
