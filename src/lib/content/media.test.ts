import { describe, expect, it } from 'vitest'
import { renderChartSvg, validateChart, type Chart } from './charts'
import { importSpec } from './question-generation'
import { mediaSlug, needsPromptAudio, needsPromptImage, questionAudioPath, speechScript } from './media'

describe('question media paths', () => {
  it('derives a stable path from the task type and title', () => {
    expect(mediaSlug('Why cats purr — and why it matters!')).toBe('why-cats-purr-and-why-it-matters')
    expect(questionAudioPath('WRITE_FROM_DICTATION', 'Library study rooms')).toBe(
      '/media/questions/write-from-dictation/library-study-rooms.mp3',
    )
  })

  it('asks for audio on listening and audio-prompt tasks only', () => {
    expect(needsPromptAudio('REPEAT_SENTENCE')).toBe(true)
    expect(needsPromptAudio('HIGHLIGHT_INCORRECT_WORDS')).toBe(true)
    expect(needsPromptAudio('READ_ALOUD')).toBe(false)
    expect(needsPromptAudio('ESSAY')).toBe(false)
    expect(needsPromptImage('DESCRIBE_IMAGE')).toBe(true)
  })
})

describe('speechScript', () => {
  it('gives each discussion speaker their own voice and drops the labels', () => {
    const script = speechScript('Speaker A: First view.\nSpeaker B: Second view.\nSpeaker C: Third view.')
    expect(script.segments).toEqual([
      { voice: 0, text: 'First view.' },
      { voice: 1, text: 'Second view.' },
      { voice: 2, text: 'Third view.' },
    ])
    expect(script.endsWithBeep).toBe(false)
  })

  it('turns a trailing [beep] into a tone instead of reading it', () => {
    const script = speechScript('Make sure you finish [beep]')
    expect(script.segments).toEqual([{ voice: 0, text: 'Make sure you finish' }])
    expect(script.endsWithBeep).toBe(true)
  })
})

describe('Describe Image charts', () => {
  const bar: Chart = {
    type: 'bar',
    title: 'Sales & <returns>',
    categories: ['A', 'B'],
    series: [{ name: 'Units', values: [3, 5] }],
  }

  it('rejects a series that does not match its categories', () => {
    expect(() => validateChart({ ...bar, series: [{ name: 'Units', values: [3] }] })).toThrow(/1 values for 2/)
  })

  it('renders escaped, self-contained SVG', () => {
    const svg = renderChartSvg(bar)
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true)
    expect(svg).toContain('Sales &amp; &lt;returns&gt;')
    expect(svg).not.toContain('<returns>')
  })

  it('imports a Describe Image item with a prompt worded for its figure', () => {
    const draft = importSpec('DESCRIBE_IMAGE')!.build({
      title: 'Units sold',
      tags: ['chart'],
      chart: { type: 'pie', title: 'Share', slices: [{ label: 'A', value: 60 }, { label: 'B', value: 40 }] },
      sample_answer: Array.from({ length: 60 }, () => 'word').join(' '),
    })
    expect(draft.prompt).toContain('pie chart')
    expect(draft.sampleAnswer).toBeTruthy()
  })
})
