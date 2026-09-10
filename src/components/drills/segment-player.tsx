'use client'

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { Gauge, Play, Repeat, RotateCcw, Square } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Plays one line of a drill's recording.
 *
 * A drill is a single audio file with per-segment offsets, so playback is
 * bounded here rather than by cutting the audio into files: one request, one
 * cache entry, and moving between lines never waits on a download.
 *
 * Unlike `PromptAudio` in the practice engine there is no play-once rule. This
 * is a lesson, not an exam — replaying a line until it resolves is the whole
 * technique, and how many replays it took is recorded with the attempt.
 */

const SPEEDS = [0.6, 0.8, 1] as const

export interface SegmentPlayerHandle {
  play: () => void
  stop: () => void
}

export function SegmentPlayer({
  src,
  startMs,
  endMs,
  onPlay,
  autoPlay = false,
  disabled = false,
  handleRef,
  className,
}: {
  src: string
  startMs: number
  endMs: number
  /** Called each time playback of the line starts, for the replay counter. */
  onPlay?: () => void
  autoPlay?: boolean
  disabled?: boolean
  handleRef?: Ref<SegmentPlayerHandle>
  className?: string
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const frameRef = useRef(0)
  const [playing, setPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [speed, setSpeed] = useState<number>(1)
  const [loop, setLoop] = useState(false)
  const [blocked, setBlocked] = useState(false)

  // A drill whose segments carry no timing plays as one whole clip.
  const bounded = endMs > startMs
  const start = bounded ? startMs / 1000 : 0
  const end = bounded ? endMs / 1000 : Number.POSITIVE_INFINITY
  const length = bounded ? end - start : 0

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    const element = audioRef.current
    if (element && !element.paused) element.pause()
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    const element = audioRef.current
    if (!element || disabled) return

    setBlocked(false)
    element.playbackRate = speed
    element.currentTime = start
    setPosition(0)

    void element
      .play()
      .then(() => {
        setPlaying(true)
        onPlay?.()
      })
      .catch(() => setBlocked(true))
  }, [disabled, onPlay, speed, start])

  useImperativeHandle(handleRef, () => ({ play, stop }), [play, stop])

  // Bounding playback needs finer resolution than `timeupdate` offers — that
  // event fires about four times a second, which would run a quarter of a
  // second into the next line before stopping.
  useEffect(() => {
    if (!playing) return

    const tick = () => {
      const element = audioRef.current
      if (!element) return
      setPosition(Math.max(0, element.currentTime - start))

      if (element.currentTime >= end) {
        if (loop) {
          element.currentTime = start
          onPlay?.()
        } else {
          stop()
          return
        }
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [playing, start, end, loop, onPlay, stop])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed
  }, [speed])

  // Restart on the line the player was handed, and stop whatever was playing
  // when the learner moves on.
  useEffect(() => {
    stop()
    if (autoPlay) play()
    // Re-running on `play` would restart the clip every time the speed changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, startMs, endMs])

  const percent = length > 0 ? Math.min(100, (position / length) * 100) : playing ? 100 : 0

  return (
    <div className={cn('rounded-xl border border-hairline bg-ink-50/70 p-4', className)}>
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={stop}
        onPause={() => setPlaying(false)}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={playing ? stop : play}
          disabled={disabled}
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-full transition-colors',
            disabled
              ? 'cursor-not-allowed bg-ink-100 text-ink-400'
              : 'bg-brand-600 text-white hover:bg-brand-700',
          )}
          aria-label={playing ? 'Stop the recording' : 'Play this line'}
        >
          {playing ? (
            <Square className="size-4" aria-hidden />
          ) : (
            <Play className="size-5 translate-x-0.5" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-200">
            <div
              className="h-full rounded-full bg-brand-600"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-ink-500 tabular" aria-live="polite">
            {blocked
              ? 'Press play to start the audio.'
              : length > 0
                ? `${formatDuration(position)} / ${formatDuration(length)}`
                : playing
                  ? 'Playing'
                  : 'Ready'}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={play}
            disabled={disabled}
            className="grid size-9 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-navy-900 disabled:opacity-40"
            aria-label="Replay this line"
          >
            <RotateCcw className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setLoop((value) => !value)}
            aria-pressed={loop}
            className={cn(
              'grid size-9 place-items-center rounded-lg transition-colors',
              loop ? 'bg-brand-50 text-brand-700' : 'text-ink-500 hover:bg-ink-100 hover:text-navy-900',
            )}
            aria-label="Repeat this line continuously"
          >
            <Repeat className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-hairline pt-3">
        <Gauge className="size-3.5 text-ink-400" aria-hidden />
        <span className="text-xs text-ink-500">Speed</span>
        <div className="flex gap-1" role="group" aria-label="Playback speed">
          {SPEEDS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setSpeed(value)}
              aria-pressed={speed === value}
              className={cn(
                'rounded-md px-2 py-1 text-xs font-medium tabular transition-colors',
                speed === value
                  ? 'bg-navy-900 text-white'
                  : 'text-ink-500 hover:bg-ink-100 hover:text-navy-900',
              )}
            >
              {value}×
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
