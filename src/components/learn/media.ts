/**
 * Media helpers shared by the lesson player and the two listening exercises.
 *
 * Everything here is browser-side and deliberately dependency-free: a lesson
 * plays through the platform's own `<video>`/`<audio>` element so captions,
 * speed and per-cue replay all work off the same timeline.
 */

const YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be']

/**
 * Extracts a YouTube video id, or null for a direct media file.
 *
 * A YouTube lesson is embedded in an iframe, which means the page cannot read
 * or seek its timeline. Those lessons show their transcript as plain text and
 * cannot host dictation or shadowing — both need frame-accurate replay of a
 * single line, so they require an uploaded audio file.
 */
export function youtubeId(url: string | null): string | null {
  if (!url) return null
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (!YOUTUBE_HOSTS.includes(parsed.hostname)) return null

  const id = parsed.hostname.endsWith('youtu.be')
    ? parsed.pathname.slice(1)
    : (parsed.searchParams.get('v') ?? parsed.pathname.replace(/^\/(embed|shorts)\//, ''))

  return /^[\w-]{6,20}$/.test(id) ? id : null
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`
}

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5] as const

/**
 * Plays a single cue and stops at its end.
 *
 * The stop is driven by `timeupdate` rather than a timer, because a timer
 * drifts as soon as the clip is played at anything other than 1×.
 */
export function playRange(
  element: HTMLMediaElement,
  start: number,
  end: number,
  onEnd?: () => void,
): () => void {
  const stopAt = end > start ? end : start + 1

  const handleTimeUpdate = () => {
    if (element.currentTime >= stopAt) stop()
  }
  const handleEnded = () => stop()

  function stop() {
    element.pause()
    element.removeEventListener('timeupdate', handleTimeUpdate)
    element.removeEventListener('ended', handleEnded)
    onEnd?.()
  }

  element.addEventListener('timeupdate', handleTimeUpdate)
  element.addEventListener('ended', handleEnded)
  element.currentTime = start
  void element.play().catch(() => stop())

  return stop
}

/** Index of the cue covering `time`, or -1 when the gap between cues is playing. */
export function activeCueIndex(cues: Array<{ start: number; end: number }>, time: number): number {
  return cues.findIndex((cue) => time >= cue.start && time < cue.end)
}
