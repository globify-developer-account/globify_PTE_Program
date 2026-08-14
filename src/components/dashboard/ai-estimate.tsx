import { Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

/**
 * Every surface that shows a machine-produced score must say so. These two
 * components exist so that labelling is a single import rather than something
 * each page has to remember to write.
 */

export function AiEstimateBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-600',
        className,
      )}
    >
      <Info className="size-3" aria-hidden />
      AI Estimated Score
    </span>
  )
}

export function AiEstimateNote({ className }: { className?: string }) {
  return (
    <p className={cn('text-xs leading-relaxed text-ink-500', className)}>
      Scores shown are <strong className="font-semibold text-ink-600">AI estimated scores</strong> generated for
      practice purposes. They are not official Pearson PTE scores, and Globify Consultants is not affiliated with or
      endorsed by Pearson.{' '}
      <Link href="/ai-disclaimer" className="font-medium text-brand-600 hover:text-brand-700">
        How our scoring works
      </Link>
    </p>
  )
}
