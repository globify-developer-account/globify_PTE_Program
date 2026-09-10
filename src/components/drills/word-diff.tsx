import type { DiffToken } from '@/lib/drills/diff'
import { cn } from '@/lib/utils'

/**
 * The word-by-word verdict.
 *
 * Rendered in the target sentence's order rather than as two separate texts to
 * compare by eye — a learner needs to see *which* word they missed, in the place
 * they missed it, and a substitution needs both words side by side.
 *
 * Colour alone never carries the verdict: every non-matching word also has a
 * shape cue (strikethrough, a dotted gap) and a screen-reader label.
 */
export function WordDiff({ tokens, className }: { tokens: DiffToken[]; className?: string }) {
  if (tokens.length === 0) {
    return <p className={cn('text-sm text-ink-500', className)}>Nothing to compare.</p>
  }

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-1.5 gap-y-2 text-[15px] leading-relaxed', className)}>
      {tokens.map((token, index) => {
        const key = `${index}-${token.expected ?? token.given ?? ''}`

        if (token.status === 'correct') {
          return (
            <span key={key} className="text-navy-900">
              {token.expected}
            </span>
          )
        }

        if (token.status === 'wrong') {
          return (
            <span key={key} className="inline-flex items-baseline gap-1">
              <span className="sr-only">You said</span>
              <del className="rounded bg-red-50 px-1 text-danger decoration-danger/60">{token.given}</del>
              <span className="sr-only">, the word was</span>
              <ins className="rounded bg-emerald-50 px-1 font-medium text-emerald-700 no-underline">
                {token.expected}
              </ins>
            </span>
          )
        }

        if (token.status === 'missing') {
          return (
            <span
              key={key}
              className="rounded border-b-2 border-dotted border-amber-500 bg-amber-50 px-1 font-medium text-amber-800"
            >
              <span className="sr-only">Missed: </span>
              {token.expected}
            </span>
          )
        }

        return (
          <del key={key} className="rounded bg-ink-100 px-1 text-ink-500 decoration-ink-400">
            <span className="sr-only">Extra word: </span>
            {token.given}
          </del>
        )
      })}
    </p>
  )
}

export function DiffLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500', className)}>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-navy-900" aria-hidden />
        Correct
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-danger" aria-hidden />
        Wrong word
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-amber-500" aria-hidden />
        Missed
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full bg-ink-300" aria-hidden />
        Extra
      </li>
    </ul>
  )
}
