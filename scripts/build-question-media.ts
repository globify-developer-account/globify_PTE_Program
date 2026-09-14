import 'dotenv/config'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { parseArgs } from 'node:util'
import { PrismaClient } from '@prisma/client'
import { SEED_QUESTIONS } from '../prisma/seed-data/questions'
import { renderChartSvg, chartSchema, type Chart } from '../src/lib/content/charts'
import {
  mediaSlug,
  needsPromptAudio,
  needsPromptImage,
  questionAudioPath,
  questionImagePath,
  speechScript,
  type SpeechSegment,
} from '../src/lib/content/media'
import { importSpec } from '../src/lib/content/question-generation'
import { openaiSpeechProvider } from '../src/lib/ai/speech/providers/openai'
import { attachBuiltMedia, publicFile, readContentItems } from './lib/question-media'

/**
 * Builds the prompt media for the question bank.
 *
 *   npm run content:media                  build anything missing
 *   npm run content:media -- --force       rebuild everything
 *   npm run content:media -- --type WRITE_FROM_DICTATION
 *   npm run content:media -- --attach      also link built files to database rows
 *
 * Sources are the seed bank (prisma/seed-data/questions.ts) and every file in
 * content/questions. Output goes to public/media/questions and is committed, so
 * it deploys with the app: nothing is synthesised at request time.
 *
 * Describe Image figures are drawn from each item's `chart` data.
 *
 * Recordings are spoken from each item's transcript with one of two engines:
 *   --engine openai  OpenAI text-to-speech (needs AI_SPEECH_API_KEY). Natural voices.
 *   --engine sapi    The Windows speech engine. Offline and free, clearly synthetic.
 * The default is openai when AI_SPEECH_API_KEY is set, otherwise sapi. Either
 * way ffmpeg must be on PATH: it joins group-discussion speakers, adds the Select
 * Missing Word beep and encodes the mp3.
 *
 * Generated recordings are a practice stand-in. A real recording uploaded in
 * /admin/questions always takes precedence, and `--attach` never replaces one.
 */

const { values } = parseArgs({
  options: {
    force: { type: 'boolean', default: false },
    attach: { type: 'boolean', default: false },
    type: { type: 'string' },
    engine: { type: 'string' },
  },
})

interface MediaJob {
  typeCode: string
  title: string
  transcript: string | null
  chart: Chart | null
}

// --- sources -------------------------------------------------------------------------

function collectJobs(): MediaJob[] {
  const jobs: MediaJob[] = []

  for (const question of SEED_QUESTIONS) {
    jobs.push({
      typeCode: question.typeCode,
      title: question.title,
      transcript: question.audioTranscript ?? null,
      chart: question.chart ?? null,
    })
  }

  for (const item of readContentItems()) {
    const spec = importSpec(item.typeCode)
    if (!spec) throw new Error(`${item.file} #${item.index + 1}: no spec for ${item.typeCode}`)
    const draft = spec.build(item.content)
    const rawChart = (item.content as { chart?: unknown }).chart
    jobs.push({
      typeCode: item.typeCode,
      title: draft.title,
      transcript: draft.audioTranscript,
      chart: rawChart ? chartSchema.parse(rawChart) : null,
    })
  }

  const only = values.type?.split(',').map((code) => code.trim().toUpperCase())
  return only ? jobs.filter((job) => only.includes(job.typeCode)) : jobs
}

// --- speech engines --------------------------------------------------------------------

type Engine = 'openai' | 'sapi'

function chooseEngine(): Engine {
  const requested = values.engine?.toLowerCase()
  if (requested === 'openai' || requested === 'sapi') return requested
  if (requested) throw new Error('--engine must be openai or sapi.')
  if (process.env.AI_SPEECH_API_KEY?.trim()) return 'openai'
  if (process.platform === 'win32') return 'sapi'
  throw new Error('No speech engine: set AI_SPEECH_API_KEY, or run on Windows to use the built-in voices.')
}

/** Picks a stable voice per question so a bank does not sound like one speaker. */
function narratorVoice(title: string): number {
  let hash = 0
  for (const char of title) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 2
}

interface Utterance {
  out: string
  voice: number
  text: string
}

const SAPI_SCRIPT = String.raw`
param([string]$JobFile)
Add-Type -AssemblyName System.Speech
$jobs = Get-Content -Raw -Encoding UTF8 $JobFile | ConvertFrom-Json
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$installed = @($synth.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name })
$preferred = @('Microsoft David Desktop', 'Microsoft Zira Desktop')
$voices = @($preferred | Where-Object { $installed -contains $_ })
if ($voices.Count -eq 0) { $voices = $installed }
foreach ($job in $jobs) {
  $name = $voices[$job.voice % $voices.Count]
  # A third speaker reuses the first voice, pitched down so the two stay distinct.
  $pitch = if ($job.voice -ge $voices.Count) { '-20%' } else { '0%' }
  $text = [System.Security.SecurityElement]::Escape($job.text)
  $ssml = '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="' + $name + '"><prosody rate="-5%" pitch="' + $pitch + '">' + $text + '</prosody></voice></speak>'
  $synth.SetOutputToWaveFile($job.out)
  $synth.SpeakSsml($ssml)
}
$synth.SetOutputToNull()
$synth.Dispose()
`

function synthesizeWithSapi(utterances: Utterance[], workDir: string): void {
  const scriptFile = join(workDir, 'speak.ps1')
  const jobFile = join(workDir, 'jobs.json')
  writeFileSync(scriptFile, SAPI_SCRIPT, 'utf8')
  writeFileSync(jobFile, JSON.stringify(utterances), 'utf8')
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptFile, '-JobFile', jobFile],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  )
  if (result.status !== 0) throw new Error('The Windows speech engine failed.')
}

const OPENAI_VOICES = ['alloy', 'nova', 'onyx']

async function synthesizeWithOpenAi(utterances: Utterance[]): Promise<void> {
  for (const utterance of utterances) {
    const result = await openaiSpeechProvider.synthesize({
      text: utterance.text,
      voice: OPENAI_VOICES[utterance.voice % OPENAI_VOICES.length],
    })
    writeFileSync(utterance.out, result.data.audio)
  }
}

// --- encoding ----------------------------------------------------------------------------

const SAMPLE_RATE = 24000

function ffmpeg(args: string[]): void {
  const result = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], {
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  if (result.error) throw new Error('ffmpeg was not found on PATH.')
  if (result.status !== 0) throw new Error(`ffmpeg failed (exit ${result.status}).`)
}

/** Joins the spoken parts with short pauses, adds the beep if needed, and writes a mono mp3. */
function encode(parts: string[], endsWithBeep: boolean, out: string): void {
  const inputs: string[] = []
  const chain: string[] = []
  let count = 0

  const add = (input: string[], label: string) => {
    inputs.push(...input)
    chain.push(`[${count}:a]aresample=${SAMPLE_RATE},aformat=channel_layouts=mono[${label}]`)
    count += 1
  }
  const silence = (seconds: number) => ['-f', 'lavfi', '-t', String(seconds), '-i', `anullsrc=r=${SAMPLE_RATE}:cl=mono`]

  const order: string[] = []
  add(silence(0.4), 's0')
  order.push('s0')
  parts.forEach((part, index) => {
    if (index > 0) {
      add(silence(0.6), `p${index}`)
      order.push(`p${index}`)
    }
    add(['-i', part], `v${index}`)
    order.push(`v${index}`)
  })
  if (endsWithBeep) {
    add(silence(0.3), 'bgap')
    add(['-f', 'lavfi', '-i', `sine=frequency=1000:sample_rate=${SAMPLE_RATE}:duration=0.9`], 'beepraw')
    chain.push('[beepraw]volume=1.2[beep]')
    order.push('bgap', 'beep')
  }
  add(silence(0.4), 'end')
  order.push('end')

  const filter = `${chain.join(';')};${order.map((label) => `[${label}]`).join('')}concat=n=${order.length}:v=0:a=1[out]`
  mkdirSync(dirname(out), { recursive: true })
  ffmpeg([...inputs, '-filter_complex', filter, '-map', '[out]', '-ac', '1', '-ar', String(SAMPLE_RATE), '-b:a', '32k', out])
}

// --- main ----------------------------------------------------------------------------------

async function main() {
  const jobs = collectJobs()
  const force = values.force

  // Figures
  let drawn = 0
  for (const job of jobs.filter((job) => needsPromptImage(job.typeCode))) {
    if (!job.chart) {
      console.warn(`  no chart data: ${job.typeCode} "${job.title}"`)
      continue
    }
    const file = publicFile(questionImagePath(job.typeCode, job.title))
    if (existsSync(file) && !force) continue
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, renderChartSvg(job.chart), 'utf8')
    drawn += 1
  }
  console.log(`Figures: ${drawn} drawn.`)

  // Recordings
  const pending = jobs.filter(
    (job) =>
      needsPromptAudio(job.typeCode) &&
      job.transcript &&
      (force || !existsSync(publicFile(questionAudioPath(job.typeCode, job.title)))),
  )
  const missingTranscript = jobs.filter((job) => needsPromptAudio(job.typeCode) && !job.transcript)
  for (const job of missingTranscript) console.warn(`  no transcript: ${job.typeCode} "${job.title}"`)

  if (pending.length > 0) {
    const engine = chooseEngine()
    console.log(`Recordings: synthesising ${pending.length} with ${engine}…`)
    const workDir = mkdtempSync(join(tmpdir(), 'question-media-'))

    try {
      const plans = pending.map((job, jobIndex) => {
        const script = speechScript(job.transcript!)
        const offset = script.segments.length === 1 ? narratorVoice(job.title) : 0
        const utterances = script.segments.map((segment: SpeechSegment, segmentIndex) => ({
          out: join(workDir, `${jobIndex}-${segmentIndex}-${mediaSlug(job.title).slice(0, 20)}.${engine === 'sapi' ? 'wav' : 'mp3'}`),
          voice: segment.voice + offset,
          text: segment.text,
        }))
        return { job, script, utterances }
      })

      const all = plans.flatMap((plan) => plan.utterances)
      if (engine === 'sapi') synthesizeWithSapi(all, workDir)
      else await synthesizeWithOpenAi(all)

      for (const plan of plans) {
        const out = publicFile(questionAudioPath(plan.job.typeCode, plan.job.title))
        encode(plan.utterances.map((utterance) => utterance.out), plan.script.endsWithBeep, out)
        console.log(`  ${questionAudioPath(plan.job.typeCode, plan.job.title)}`)
      }
    } finally {
      rmSync(workDir, { recursive: true, force: true })
    }
  } else {
    console.log('Recordings: nothing to build.')
  }

  if (values.attach) {
    const prisma = new PrismaClient()
    try {
      const attached = await attachBuiltMedia(prisma)
      console.log(`Attached ${attached.audio} recording(s) and ${attached.images} figure(s) to questions.`)
    } finally {
      await prisma.$disconnect()
    }
  }
}

main().catch((error) => {
  console.error('\nMedia build failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
