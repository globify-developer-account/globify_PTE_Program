'use client'

import { useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Prompt audio for Listening and audio-prompted Speaking tasks.
 *
 * In the real exam the recording plays once, automatically, after a short lead
 * in. `playOnce` reproduces that; practice pages can relax it so a student can
 * study a difficult clip. Browsers block autoplay with sound until the user has
 * interacted with the page, so a manual play button is always available too.
 */
export function PromptAudio({
  src,
  leadInSeconds = 3,
  playOnce = true,
  onEnded,
  label = 'Prompt audio',
}: {
  src: string
  leadInSeconds?: number
  playOnce?: boolean
  onEnded?: () => void
  label?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [countdown, setCountdown] = useState(leadInSeconds)
  const [playing, setPlaying] = useState(false)
  const [played, setPlayed] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [autoplayBlocked, setAutoplayBlocked] = useState(false)

  useEffect(() => {
    if (countdown <= 0) return
    const timer = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [countdown])

  useEffect(() => {
    if (countdown > 0 || played) return
    const element = audioRef.current
    if (!element) return
    element.play().catch(() => setAutoplayBlocked(true))
  }, [countdown, played])

  function toggle() {
    const element = audioRef.current
    if (!element) return
    if (element.paused) {
      setAutoplayBlocked(false)
      void element.play().catch(() => setAutoplayBlocked(true))
    } else {
      element.pause()
    }
  }

  const locked = playOnce && played
  const percent = duration > 0 ? (progress / duration) * 100 : 0

  return (
    <div className="rounded-xl border border-hairline bg-ink-50/70 p-5">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setProgress(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => {
          setPlaying(false)
          setPlayed(true)
          onEnded?.()
        }}
      />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          disabled={locked}
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full transition-colors',
            locked
              ? 'cursor-not-allowed bg-ink-100 text-ink-400'
              : 'bg-brand-600 text-white hover:bg-brand-700',
          )}
          aria-label={playing ? 'Pause prompt audio' : 'Play prompt audio'}
        >
          {playing ? <Pause className="size-5" aria-hidden /> : <Play className="size-5 translate-x-0.5" aria-hidden />}
        </button>

        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-medium text-navy-900">
            <Headphones className="size-4 text-ink-400" aria-hidden />
            {label}
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-500" aria-live="polite">
            {countdown > 0 && !played
              ? `Audio begins in ${countdown}s`
              : locked
                ? 'The recording has played. In the real exam it plays only once.'
                : `${formatDuration(progress)} / ${formatDuration(duration)}`}
          </p>
        </div>
      </div>

      {autoplayBlocked && !played ? (
        <p className="mt-3 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
          Your browser blocked automatic playback. Press play when you are ready.
        </p>
      ) : null}
    </div>
  )
}
