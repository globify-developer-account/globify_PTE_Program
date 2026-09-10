'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Speaks the partner's turns.
 *
 * Two paths, one interface. When a speech provider is configured the server
 * returns audio and we play it; when it is not, the server says so and the
 * browser's own `speechSynthesis` voice reads the text. The second path needs
 * no credentials and works offline, which is what keeps spoken replies working
 * in demo mode.
 */

export type SpeechState = 'idle' | 'loading' | 'speaking'

export function useSpeech() {
  const [state, setState] = useState<SpeechState>('idle')
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  const stop = useCallback(() => {
    cleanup()
    setState('idle')
    setSpeakingId(null)
  }, [cleanup])

  // Never let audio outlive the page that started it.
  useEffect(() => cleanup, [cleanup])

  const speak = useCallback(
    async (text: string, id: string) => {
      if (speakingId === id && state === 'speaking') {
        stop()
        return
      }
      cleanup()
      setState('loading')
      setSpeakingId(id)

      const finish = () => {
        setState('idle')
        setSpeakingId(null)
      }

      const speakInBrowser = () => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          finish()
          return
        }
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = 'en-US'
        utterance.rate = 0.95
        utterance.onend = finish
        utterance.onerror = finish
        setState('speaking')
        window.speechSynthesis.speak(utterance)
      }

      try {
        const response = await fetch('/api/conversations/speech', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })

        if (!response.ok) {
          speakInBrowser()
          return
        }

        // JSON means "no provider configured" — use the browser voice.
        if ((response.headers.get('content-type') ?? '').includes('application/json')) {
          speakInBrowser()
          return
        }

        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        objectUrlRef.current = url

        const audio = new Audio(url)
        audioRef.current = audio
        audio.onended = () => {
          finish()
          cleanup()
        }
        audio.onerror = () => {
          cleanup()
          speakInBrowser()
        }
        setState('speaking')
        await audio.play()
      } catch {
        speakInBrowser()
      }
    },
    [cleanup, speakingId, state, stop],
  )

  return { speak, stop, state, speakingId }
}

/** Remembers whether the student wants replies read aloud automatically. */
export function useAutoSpeak(): [boolean, (value: boolean) => void] {
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    try {
      setEnabled(window.localStorage.getItem('globify:conversation:autospeak') === 'true')
    } catch {
      // Private browsing and blocked site data both throw here. Defaulting to
      // off is the safe end of the trade — audio that starts unasked is worse
      // than a toggle the student has to flip again.
    }
  }, [])

  const update = useCallback((value: boolean) => {
    setEnabled(value)
    try {
      window.localStorage.setItem('globify:conversation:autospeak', String(value))
    } catch {
      // Preference simply will not persist; the session still works.
    }
  }, [])

  return [enabled, update]
}
