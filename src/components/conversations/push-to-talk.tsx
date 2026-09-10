'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'
import { cn, formatDuration } from '@/lib/utils'

/**
 * Push-to-talk recorder for a conversation.
 *
 * Deliberately not the exam `AudioRecorder`: there is no preparation
 * countdown and no forced stop, because a conversation turn is not a timed
 * task. The student starts and stops when they have finished their thought.
 *
 * The microphone stream is released the moment recording ends — holding it
 * open leaves the browser's recording indicator lit, which people reasonably
 * read as "this site is still listening".
 */

/** A turn longer than this is almost always a forgotten stop button. */
const MAX_SECONDS = 120

interface PushToTalkProps {
  onRecorded: (blob: Blob, durationMs: number) => void
  disabled?: boolean
  onError?: (message: string) => void
}

export function PushToTalk({ onRecorded, disabled = false, onError }: PushToTalkProps) {
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [level, setLevel] = useState(0)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const frameRef = useRef(0)
  const audioContextRef = useRef<AudioContext | null>(null)

  const release = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    cancelAnimationFrame(frameRef.current)
    void audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    setLevel(0)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setSupported(false)
    }
  }, [])

  useEffect(() => release, [release])

  const stop = useCallback(() => {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }, [])

  useEffect(() => {
    if (!recording) return
    if (elapsed >= MAX_SECONDS) {
      stop()
      return
    }
    const timer = window.setTimeout(() => setElapsed((value) => value + 1), 1000)
    return () => window.clearTimeout(timer)
  }, [recording, elapsed, stop])

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream

      // A single moving level bar, rather than a full waveform: it answers
      // "is it hearing me?" without pulling attention from the conversation.
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      audioContext.createMediaStreamSource(stream).connect(analyser)
      const buffer = new Uint8Array(analyser.fftSize)

      const measure = () => {
        frameRef.current = requestAnimationFrame(measure)
        analyser.getByteTimeDomainData(buffer)
        let peak = 0
        for (const sample of buffer) peak = Math.max(peak, Math.abs(sample / 128 - 1))
        setLevel(Math.min(1, peak * 1.8))
      }
      measure()

      const mimeType =
        ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) =>
          MediaRecorder.isTypeSupported(type),
        ) ?? ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
        const durationMs = Date.now() - startedAtRef.current
        release()
        setRecording(false)
        setElapsed(0)
        if (blob.size === 0) {
          onError?.('Nothing was recorded. Check that the right microphone is selected.')
          return
        }
        onRecorded(blob, durationMs)
      }

      startedAtRef.current = Date.now()
      recorder.start()
      setElapsed(0)
      setRecording(true)
    } catch (cause) {
      release()
      const name = cause instanceof DOMException ? cause.name : ''
      onError?.(
        name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Microphone access was blocked. Allow it in your browser’s address-bar permissions.'
          : name === 'NotFoundError'
            ? 'No microphone was found. Connect one and try again.'
            : 'The microphone could not be started. Close other apps using it and try again.',
      )
    }
  }, [onError, onRecorded, release])

  if (!supported) return null

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <span className="flex items-center gap-1.5 text-xs tabular text-danger" aria-live="polite">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-danger opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-danger" />
            </span>
            {formatDuration(elapsed)}
          </span>
          <span className="h-6 w-14 overflow-hidden rounded-full bg-ink-100" aria-hidden>
            <span
              className="block h-full rounded-full bg-brand-500 transition-[width] duration-100"
              style={{ width: `${Math.round(level * 100)}%` }}
            />
          </span>
        </>
      ) : null}

      <button
        type="button"
        onClick={recording ? stop : () => void start()}
        disabled={disabled}
        aria-label={recording ? 'Stop recording and send' : 'Record your answer'}
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full transition-colors',
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
          'disabled:cursor-not-allowed disabled:opacity-50',
          recording
            ? 'bg-danger text-white hover:bg-red-700'
            : 'bg-brand-50 text-brand-600 hover:bg-brand-100',
        )}
      >
        {recording ? <Square className="size-4" aria-hidden /> : <Mic className="size-5" aria-hidden />}
      </button>
    </div>
  )
}
