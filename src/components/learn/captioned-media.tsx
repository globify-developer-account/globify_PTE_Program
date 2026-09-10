'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Captions, CaptionsOff, Repeat } from 'lucide-react'
import type { PublicCue } from '@/lib/learn'
import { cn, formatDuration } from '@/lib/utils'
import { PLAYBACK_RATES, activeCueIndex, youtubeEmbedUrl, youtubeId } from './media'

/**
 * The captioned player.
 *
 * The transcript beside the video is the point of the feature, not decoration:
 * the active line highlights and scrolls itself into view, clicking a line
 * seeks to it, and "repeat line" loops the current one — which is how a
 * learner actually drills a phrase they could not catch.
 */
export function CaptionedMedia({
  videoUrl,
  audioUrl,
  cues,
  title,
}: {
  videoUrl: string | null
  audioUrl: string | null
  cues: PublicCue[]
  title: string
}) {
  const embedId = youtubeId(videoUrl)
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement | null>(null)
  const transcriptRef = useRef<HTMLOListElement | null>(null)

  const [current, setCurrent] = useState(-1)
  const [showCaptions, setShowCaptions] = useState(true)
  const [repeat, setRepeat] = useState(false)
  const [rate, setRate] = useState(1)

  const hasCues = cues.length > 0
  const activeCue = current >= 0 ? cues[current] : undefined

  const handleTimeUpdate = useCallback(() => {
    const element = mediaRef.current
    if (!element || !hasCues) return

    const index = activeCueIndex(cues, element.currentTime)

    // Looping is checked against the cue that was active when the loop started,
    // so a cue whose end has just been passed still rewinds correctly.
    if (repeat && current >= 0) {
      const cue = cues[current]
      if (cue && element.currentTime >= cue.end) {
        element.currentTime = cue.start
        return
      }
    }
    if (index !== -1 && index !== current) setCurrent(index)
  }, [cues, current, hasCues, repeat])

  // Keep the active line visible without yanking the whole page around.
  useEffect(() => {
    if (current < 0) return
    const list = transcriptRef.current
    const line = list?.querySelector<HTMLElement>(`[data-cue="${current}"]`)
    if (!list || !line) return

    const top = line.offsetTop - list.offsetTop
    if (top < list.scrollTop || top + line.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: top - 8, behavior: 'smooth' })
    }
  }, [current])

  useEffect(() => {
    const element = mediaRef.current
    if (element) element.playbackRate = rate
  }, [rate])

  function seekTo(index: number) {
    const element = mediaRef.current
    const cue = cues[index]
    if (!element || !cue) return
    element.currentTime = cue.start
    setCurrent(index)
    void element.play().catch(() => undefined)
  }

  if (!videoUrl && !audioUrl) {
    return (
      <p className="rounded-xl border border-hairline bg-ink-50 p-5 text-sm text-ink-500">
        This lesson has no media attached yet.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border border-hairline bg-navy-900">
        {embedId ? (
          <iframe
            src={youtubeEmbedUrl(embedId)}
            title={title}
            className="aspect-video w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : videoUrl ? (
          <video
            ref={mediaRef as React.RefObject<HTMLVideoElement>}
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div className="bg-white p-5">
            <audio
              ref={mediaRef as React.RefObject<HTMLAudioElement>}
              src={audioUrl ?? undefined}
              controls
              preload="metadata"
              className="w-full"
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        )}
      </div>

      {/* Caption overlay lives under the frame rather than on it: burned-in
          captions are unreadable on a phone and cover the speaker. */}
      {showCaptions && hasCues && !embedId ? (
        <p
          className="min-h-[3.25rem] rounded-xl bg-navy-900 px-4 py-3 text-center text-[15px] leading-relaxed text-white"
          aria-live="polite"
        >
          {activeCue?.text ?? <span className="text-white/40">Captions appear here as the lesson plays.</span>}
        </p>
      ) : null}

      {hasCues && !embedId ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCaptions((value) => !value)}
            aria-pressed={showCaptions}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              showCaptions
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-hairline text-ink-600 hover:border-brand-200',
            )}
          >
            {showCaptions ? <Captions className="size-4" aria-hidden /> : <CaptionsOff className="size-4" aria-hidden />}
            Captions
          </button>

          <button
            type="button"
            onClick={() => setRepeat((value) => !value)}
            aria-pressed={repeat}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              repeat
                ? 'border-brand-200 bg-brand-50 text-brand-700'
                : 'border-hairline text-ink-600 hover:border-brand-200',
            )}
          >
            <Repeat className="size-4" aria-hidden />
            Repeat line
          </button>

          <div className="ml-auto flex items-center gap-1 rounded-lg border border-hairline p-0.5">
            {PLAYBACK_RATES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRate(value)}
                aria-pressed={rate === value}
                className={cn(
                  'rounded-md px-2 py-1 text-xs font-medium tabular transition-colors',
                  rate === value ? 'bg-brand-600 text-white' : 'text-ink-600 hover:bg-ink-100',
                )}
              >
                {value}&times;
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {hasCues ? (
        <div className="rounded-xl border border-hairline">
          <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
            <h3 className="text-sm font-semibold text-navy-900">Transcript</h3>
            <p className="text-xs text-ink-500">
              {embedId ? 'Read along with the video' : 'Click any line to jump to it'}
            </p>
          </div>
          <ol ref={transcriptRef} className="scrollbar-slim max-h-96 overflow-y-auto p-2">
            {cues.map((cue) => (
              <li key={cue.index}>
                <button
                  type="button"
                  data-cue={cue.index}
                  disabled={Boolean(embedId)}
                  onClick={() => seekTo(cue.index)}
                  aria-current={cue.index === current ? 'true' : undefined}
                  className={cn(
                    'flex w-full gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    cue.index === current
                      ? 'bg-brand-50 text-navy-900'
                      : 'text-ink-700 enabled:hover:bg-ink-50',
                    embedId && 'cursor-default',
                  )}
                >
                  <span className="shrink-0 pt-0.5 text-xs tabular text-ink-400">
                    {formatDuration(cue.start)}
                  </span>
                  <span className="leading-relaxed">{cue.text}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  )
}
