import { Lightbulb } from 'lucide-react'
import { paragraphs } from '@/lib/pte/schemas'

/**
 * Lesson prose.
 *
 * The body is plain text split on blank lines rather than rendered markdown:
 * lesson copy is authored in the seed and the admin bank, and shipping an HTML
 * renderer for it would mean sanitising author input on every read.
 */
export function ArticleBody({ body, keyPoints }: { body: string | null; keyPoints: string[] }) {
  const blocks = body ? paragraphs(body) : []
  if (blocks.length === 0 && keyPoints.length === 0) return null

  return (
    <div className="space-y-5">
      {blocks.length > 0 ? (
        <div className="space-y-4">
          {blocks.map((block, index) => (
            <p key={index} className="text-[15px] leading-relaxed text-ink-700">
              {block}
            </p>
          ))}
        </div>
      ) : null}

      {keyPoints.length > 0 ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy-900">
            <Lightbulb className="size-4 text-brand-600" aria-hidden />
            Take these away
          </h3>
          <ul className="mt-3 space-y-2">
            {keyPoints.map((point, index) => (
              <li key={index} className="flex gap-2.5 text-sm leading-relaxed text-ink-700">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
