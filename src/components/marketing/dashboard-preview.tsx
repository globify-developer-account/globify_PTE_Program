import { Flame, TrendingUp } from 'lucide-react'
import { SECTION_META } from '@/lib/pte/question-types'
import { Meter, ScoreRing } from '@/components/charts/score-ring'
import { Sparkline } from '@/components/charts/sparkline'

/**
 * The hero visual — a real, composed UI built from the same primitives the
 * signed-in dashboard uses, not a screenshot. The numbers are illustrative and
 * the panel says so, so nothing here can be mistaken for a real student record.
 */

const SECTIONS = [
  { section: 'SPEAKING' as const, score: 74, previous: 68, trend: [58, 60, 63, 62, 66, 69, 71, 74] },
  { section: 'WRITING' as const, score: 71, previous: 70, trend: [61, 63, 65, 64, 67, 69, 70, 71] },
  { section: 'READING' as const, score: 76, previous: 71, trend: [62, 64, 66, 69, 70, 73, 75, 76] },
  { section: 'LISTENING' as const, score: 68, previous: 69, trend: [60, 63, 66, 68, 70, 69, 68, 68] },
]

export function DashboardPreview() {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-500/18 via-brand-400/8 to-transparent blur-2xl"
        aria-hidden
      />
      <div className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-pop">
        <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-3.5">
          <div>
            <p className="text-[13px] font-semibold text-navy-900">Good morning, Adnan</p>
            <p className="text-xs text-ink-500">You are 7 points from your target</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
            <Flame className="size-3.5" aria-hidden />
            12-day streak
          </span>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-[auto_1fr]">
          <div className="flex justify-center sm:block">
            <ScoreRing value={72} target={79} size={148} strokeWidth={11} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {SECTIONS.map((item) => {
              const meta = SECTION_META[item.section]
              const delta = item.score - item.previous
              return (
                <div key={item.section} className="rounded-xl border border-hairline p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-ink-600">
                      <span className="size-2 rounded-full" style={{ backgroundColor: meta.color }} aria-hidden />
                      {meta.label}
                    </span>
                    <span
                      className={`text-[11px] font-medium ${delta >= 0 ? 'text-green-700' : 'text-danger'}`}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-end justify-between gap-2">
                    <span className="text-2xl font-semibold leading-none text-navy-900 tabular">{item.score}</span>
                    <Sparkline points={item.trend} color={meta.color} width={54} height={22} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid gap-3 border-t border-hairline bg-ink-50/60 px-5 py-4 sm:grid-cols-2">
          <div className="rounded-xl border border-hairline bg-white p-3.5">
            <p className="text-xs font-medium text-ink-500">Today&rsquo;s goal</p>
            <p className="mt-1 text-sm font-semibold text-navy-900 tabular">35 / 45 minutes</p>
            <Meter value={35} max={45} className="mt-2.5" height={6} />
          </div>
          <div className="rounded-xl border border-hairline bg-white p-3.5">
            <p className="text-xs font-medium text-ink-500">Latest mock test</p>
            <div className="mt-1 flex items-baseline gap-2">
              <p className="text-sm font-semibold text-navy-900 tabular">Overall 72</p>
              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700">
                <TrendingUp className="size-3" aria-hidden />
                +4
              </span>
            </div>
            <p className="mt-1.5 text-xs text-ink-500">Weakest area: Listening — Write From Dictation</p>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-ink-400">
        Illustrative dashboard. Your own numbers appear here once you start practising.
      </p>
    </div>
  )
}
