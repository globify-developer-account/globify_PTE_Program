import {
  AudioLines,
  BookMarked,
  FileText,
  Keyboard,
  Layers,
  ListChecks,
  Mic,
  PlayCircle,
  type LucideIcon,
} from 'lucide-react'
import type { LessonKind } from '@prisma/client'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * How each lesson kind is labelled across the learn area.
 *
 * `blurb` is written as an instruction rather than a description, because it is
 * shown at the top of the lesson where the student is deciding what to do.
 */
export const LESSON_KIND_META: Record<
  LessonKind,
  { label: string; icon: LucideIcon; tone: NonNullable<BadgeProps['tone']>; blurb: string }
> = {
  VIDEO: {
    label: 'Video',
    icon: PlayCircle,
    tone: 'brand',
    blurb: 'Watch with the captions on, then read the transcript back without them.',
  },
  ARTICLE: {
    label: 'Read',
    icon: FileText,
    tone: 'neutral',
    blurb: 'Read it once for the idea, then again for the phrases you could reuse.',
  },
  VOCABULARY: {
    label: 'Vocabulary',
    icon: BookMarked,
    tone: 'info',
    blurb: 'Say each word aloud and put it in a sentence of your own before moving on.',
  },
  FLASHCARD: {
    label: 'Flashcards',
    icon: Layers,
    tone: 'info',
    blurb: 'Cover the definition, recall it, then check. Repeat the ones you miss.',
  },
  DICTATION: {
    label: 'Dictation',
    icon: Keyboard,
    tone: 'warning',
    blurb: 'Type each line exactly as you hear it — spelling counts, just as it does in the exam.',
  },
  SHADOWING: {
    label: 'Shadowing',
    icon: Mic,
    tone: 'success',
    blurb: 'Play a line, repeat it immediately, then compare the two recordings.',
  },
  PRONUNCIATION: {
    label: 'Pronunciation',
    icon: AudioLines,
    tone: 'success',
    blurb: 'Focus on the stressed syllable in each item before you record.',
  },
  QUIZ: {
    label: 'Quiz',
    icon: ListChecks,
    tone: 'navy',
    blurb: 'Answer without looking back at the lesson, then review what you missed.',
  },
}

export function LessonKindBadge({ kind, className }: { kind: LessonKind; className?: string }) {
  const meta = LESSON_KIND_META[kind]
  const Icon = meta.icon
  return (
    <Badge tone={meta.tone} size="sm" className={className}>
      <Icon aria-hidden />
      {meta.label}
    </Badge>
  )
}

export function LessonKindIcon({ kind, className }: { kind: LessonKind; className?: string }) {
  const Icon = LESSON_KIND_META[kind].icon
  return <Icon className={cn('size-4', className)} aria-hidden />
}
