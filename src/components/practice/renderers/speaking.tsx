'use client'

import { useState } from 'react'
import { AudioRecorder } from '../audio-recorder'
import { PromptAudio } from '../prompt-audio'
import type { RendererProps } from '../types'

/** Read Aloud — the passage stays visible for the whole answer. */
export function ReadAloudRenderer({ question, onChange, value, disabled }: RendererProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-hairline bg-white p-6">
        <p className="text-[17px] leading-[1.75] text-navy-900">{question.passage ?? question.prompt}</p>
      </div>
      <AudioRecorder
        preparationSeconds={question.preparationSeconds}
        timeLimitSeconds={question.timeLimitSeconds}
        disabled={disabled}
        onRecorded={(audio) => onChange({ ...value, audio })}
      />
    </div>
  )
}

/**
 * Repeat Sentence, Retell Lecture and Answer Short Question.
 *
 * The recorder only appears once the prompt has finished playing — offering it
 * earlier invites students to talk over the audio, which is the single most
 * common cause of a wasted attempt.
 */
export function AudioPromptRenderer({ question, onChange, value, disabled }: RendererProps) {
  const [finished, setFinished] = useState(false)

  return (
    <div className="space-y-5">
      {question.prompt ? <p className="text-sm text-ink-600">{question.prompt}</p> : null}

      {question.audioUrl ? (
        <PromptAudio src={question.audioUrl} onEnded={() => setFinished(true)} />
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This question has no audio attached yet.
        </p>
      )}

      {finished || !question.audioUrl ? (
        <AudioRecorder
          preparationSeconds={question.preparationSeconds}
          timeLimitSeconds={question.timeLimitSeconds}
          disabled={disabled}
          autoStart={(question.preparationSeconds ?? 0) <= 3}
          onRecorded={(audio) => onChange({ ...value, audio })}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-hairline p-5 text-center text-sm text-ink-500">
          Listen carefully. Recording begins when the audio ends.
        </p>
      )}
    </div>
  )
}

/** Describe Image — the image is the whole prompt, so it gets the room. */
export function ImagePromptRenderer({ question, onChange, value, disabled }: RendererProps) {
  return (
    <div className="space-y-5">
      {question.prompt ? <p className="text-sm text-ink-600">{question.prompt}</p> : null}

      {question.imageUrl ? (
        // Question images are uploaded to arbitrary storage backends, so a plain
        // img avoids per-host next/image configuration.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={question.imageUrl}
          alt={question.title}
          className="w-full rounded-xl border border-hairline bg-white object-contain p-3"
        />
      ) : (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This question has no image attached yet.
        </p>
      )}

      <AudioRecorder
        preparationSeconds={question.preparationSeconds}
        timeLimitSeconds={question.timeLimitSeconds}
        disabled={disabled}
        onRecorded={(audio) => onChange({ ...value, audio })}
      />
    </div>
  )
}
