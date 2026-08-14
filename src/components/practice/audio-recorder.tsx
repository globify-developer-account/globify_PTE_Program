'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, Mic, RotateCcw, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Speaking recorder.
 *
 * Mirrors the real exam's rhythm — a preparation countdown, then recording
 * starts on its own and stops at the time limit — because a student who has
 * only ever practised with a manual start button is not ready for the test.
 *
 * The microphone stream is released the moment recording ends. Holding it open
 * leaves the browser's recording indicator lit, which people reasonably read as
 * "this site is still listening".
 */

export type RecorderPhase =
  | 'idle'
  | 'preparing'
  | 'recording'
  | 'recorded'
  | 'denied'
  | 'unsupported'

export interface RecordedAudio {
  blob: Blob
  durationMs: number
  url: string
}

interface AudioRecorderProps {
  preparationSeconds: number | null
  timeLimitSeconds: number | null
  onRecorded: (audio: RecordedAudio | null) => void
  disabled?: boolean
  /** Skips the preparation countdown — used when the prompt audio plays first. */
  autoStart?: boolean
}

export function AudioRecorder({
  preparationSeconds,
  timeLimitSeconds,
  onRecorded,
  disabled = false,
  autoStart = false,
}: AudioRecorderProps) {
  const [phase, setPhase] = useState<RecorderPhase>('idle')
  const [remaining, setRemaining] = useState(preparationSeconds ?? 0)
  const [elapsed, setElapsed] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [audio, setAudio] = useState<RecordedAudio | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const limit = timeLimitSeconds ?? 60

  const releaseStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    cancelAnimationFrame(frameRef.current)
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setPhase('unsupported')
    }
  }, [])

  useEffect(() => releaseStream, [releaseStream])

  // --- waveform ---------------------------------------------------------------

  const drawWaveform = useCallback((analyser: AnalyserNode) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return

    const buffer = new Uint8Array(analyser.fftSize)
    const ratio = window.devicePixelRatio || 1
    canvas.width = canvas.clientWidth * ratio
    canvas.height = canvas.clientHeight * ratio
    context.scale(ratio, ratio)

    const render = () => {
      frameRef.current = requestAnimationFrame(render)
      analyser.getByteTimeDomainData(buffer)

      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)

      context.lineWidth = 2
      context.strokeStyle = '#2e5bff'
      context.beginPath()

      const step = width / buffer.length
      for (let i = 0; i < buffer.length; i++) {
        const value = buffer[i]! / 128 - 1
        const y = height / 2 + (value * height) / 2.4
        if (i === 0) context.moveTo(0, y)
        else context.lineTo(i * step, y)
      }
      context.stroke()
    }
    render()
  }, [])

  // --- recording --------------------------------------------------------------

  const stopRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  const beginRecording = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 1024
      audioContext.createMediaStreamSource(stream).connect(analyser)
      drawWaveform(analyser)

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type)) ?? ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const durationMs = Date.now() - startedAtRef.current
        releaseStream()
        if (blob.size === 0) {
          setPhase('idle')
          setError('Nothing was recorded. Check that the right microphone is selected and try again.')
          return
        }
        const recorded = { blob, durationMs, url: URL.createObjectURL(blob) }
        setAudio(recorded)
        setPhase('recorded')
        onRecorded(recorded)
      }

      startedAtRef.current = Date.now()
      recorder.start()
      setElapsed(0)
      setPhase('recording')
    } catch (cause) {
      releaseStream()
      const name = cause instanceof DOMException ? cause.name : ''
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setPhase('denied')
      } else {
        setPhase('idle')
        setError(
          name === 'NotFoundError'
            ? 'No microphone was found. Connect one and try again.'
            : 'The microphone could not be started. Close other apps using it and try again.',
        )
      }
    }
  }, [drawWaveform, onRecorded, releaseStream])

  // --- countdowns -------------------------------------------------------------

  useEffect(() => {
    if (phase !== 'preparing') return
    if (remaining <= 0) {
      void beginRecording()
      return
    }
    const timer = window.setTimeout(() => setRemaining((value) => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, remaining, beginRecording])

  useEffect(() => {
    if (phase !== 'recording') return
    if (elapsed >= limit) {
      stopRecording()
      return
    }
    const timer = window.setTimeout(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [phase, elapsed, limit, stopRecording])

  useEffect(() => {
    if (autoStart && phase === 'idle') void beginRecording()
    // Only ever fires the automatic start once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  function start() {
    if (preparationSeconds && preparationSeconds > 0) {
      setRemaining(preparationSeconds)
      setPhase('preparing')
    } else {
      void beginRecording()
    }
  }

  function reset() {
    if (audio) URL.revokeObjectURL(audio.url)
    setAudio(null)
    setElapsed(0)
    setRemaining(preparationSeconds ?? 0)
    setPhase('idle')
    setError(null)
    onRecorded(null)
  }

  // --- render -----------------------------------------------------------------

  if (phase === 'unsupported') {
    return (
      <Notice tone="warning">
        This browser cannot record audio. Chrome, Edge, Firefox or Safari on a recent version will work.
      </Notice>
    )
  }

  if (phase === 'denied') {
    return (
      <div className="space-y-3">
        <Notice tone="warning">
          Microphone access was blocked. Allow it in your browser&rsquo;s address-bar permissions, then try again.
        </Notice>
        <Button variant="secondary" size="sm" onClick={() => setPhase('idle')}>
          Try again
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-hairline bg-white p-5">
      {/* Status line */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span
            className={cn(
              'grid size-10 place-items-center rounded-full transition-colors',
              phase === 'recording' ? 'bg-red-50 text-danger' : 'bg-brand-50 text-brand-600',
            )}
          >
            {phase === 'recording' ? (
              <span className="relative flex size-3">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
                <span className="relative inline-flex size-3 rounded-full bg-danger" />
              </span>
            ) : (
              <Mic className="size-[18px]" aria-hidden />
            )}
          </span>
          <div>
            <p className="text-sm font-semibold text-navy-900">
              {phase === 'idle' && 'Ready to record'}
              {phase === 'preparing' && 'Get ready'}
              {phase === 'recording' && 'Recording'}
              {phase === 'recorded' && 'Recording saved'}
            </p>
            <p className="text-xs text-ink-500" aria-live="polite">
              {phase === 'idle' && `You will have ${formatDuration(limit)} to answer.`}
              {phase === 'preparing' && `Recording starts in ${remaining}s`}
              {phase === 'recording' && `${formatDuration(elapsed)} of ${formatDuration(limit)}`}
              {phase === 'recorded' && `${formatDuration(Math.round((audio?.durationMs ?? 0) / 1000))} recorded`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === 'idle' ? (
            <Button size="sm" onClick={start} disabled={disabled}>
              <Mic aria-hidden />
              Start
            </Button>
          ) : null}
          {phase === 'recording' ? (
            <Button size="sm" variant="danger" onClick={stopRecording}>
              <Square aria-hidden />
              Stop
            </Button>
          ) : null}
          {phase === 'recorded' ? (
            <Button size="sm" variant="secondary" onClick={reset} disabled={disabled}>
              <RotateCcw aria-hidden />
              Record again
            </Button>
          ) : null}
        </div>
      </div>

      {/* Waveform / progress */}
      {phase === 'recording' || phase === 'preparing' ? (
        <div className="mt-4">
          <canvas
            ref={canvasRef}
            className="h-16 w-full rounded-lg bg-ink-50"
            aria-hidden
          />
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-[width] duration-1000 ease-linear"
              style={{ width: `${phase === 'recording' ? (elapsed / limit) * 100 : 0}%` }}
            />
          </div>
        </div>
      ) : null}

      {phase === 'recorded' && audio ? (
        <audio
          src={audio.url}
          controls
          className="mt-4 w-full"
          aria-label="Your recording"
        />
      ) : null}

      {error ? <Notice tone="warning" className="mt-4">{error}</Notice> : null}
    </div>
  )
}

function Notice({
  children,
  tone,
  className,
}: {
  children: React.ReactNode
  tone: 'warning'
  className?: string
}) {
  return (
    <p
      className={cn(
        'flex items-start gap-2 rounded-lg border p-3 text-sm',
        tone === 'warning' && 'border-amber-200 bg-amber-50 text-amber-900',
        className,
      )}
      role="status"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  )
}
