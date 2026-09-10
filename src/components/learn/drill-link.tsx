import { Headphones, Keyboard } from 'lucide-react'
import type { LessonKind } from '@prisma/client'
import { ButtonLink } from '@/components/ui/button'

/**
 * Hands a dictation or shadowing lesson over to the drill engine.
 *
 * The exercise itself lives in `/drills`, which already does segment replay,
 * word-level marking and attempt history. Duplicating a lighter version of that
 * inside the lesson would give students a second, worse answer to the same
 * question — so the lesson supplies the context and links out to the drill.
 */
export function DrillLink({ kind, drillSlug }: { kind: LessonKind; drillSlug: string | null }) {
  const mode = kind === 'SHADOWING' ? 'shadowing' : 'dictation'
  const href = drillSlug ? `/drills/${drillSlug}?mode=${mode}` : `/drills?mode=${mode}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-100 bg-brand-50/50 p-5">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-600 text-white">
          {mode === 'shadowing' ? (
            <Headphones className="size-5" aria-hidden />
          ) : (
            <Keyboard className="size-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-navy-900">
            {mode === 'shadowing' ? 'Shadow this recording' : 'Type this recording'}
          </h3>
          <p className="mt-1 text-sm text-ink-600">
            {drillSlug
              ? 'The exercise opens with line-by-line replay and marking, and your attempts are saved.'
              : 'This lesson has no exercise attached yet. The drills library has recordings you can use instead.'}
          </p>
        </div>
      </div>

      <ButtonLink href={href} size="sm">
        {drillSlug ? 'Open the exercise' : 'Browse drills'}
      </ButtonLink>
    </div>
  )
}
