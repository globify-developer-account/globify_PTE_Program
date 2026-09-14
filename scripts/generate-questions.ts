import 'dotenv/config'
import { readFileSync, statSync } from 'node:fs'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { PrismaClient, type Prisma } from '@prisma/client'
import { z } from 'zod'
import { env } from '../src/lib/env'
import { contentGenerationClient } from '../src/lib/ai/anthropic-client'
import { parseJson } from '../src/lib/ai/providers/anthropic'
import {
  GENERATABLE_TYPES,
  GENERATION_SYSTEM_PROMPT,
  GenerationError,
  generationPrompt,
  generationSpec,
  importSpec,
  type GenerationDifficulty,
  type QuestionDraft,
} from '../src/lib/content/question-generation'
import type { QuestionTypeCode } from '../src/lib/pte/question-types'
import { attachBuiltMedia, builtMediaFor, readContentItems } from './lib/question-media'

/**
 * Writes original PTE practice questions with Claude and saves them as drafts.
 *
 *   npm run content:generate -- --type READ_ALOUD --count 5
 *   npm run content:generate -- --type READING_FILL_BLANKS,ESSAY --count 3 --difficulty HARD
 *   npm run content:generate -- --type all --count 2 --topic "renewable energy"
 *   npm run content:generate -- --type WRITE_FROM_DICTATION --count 3 --dry-run
 *
 * --from imports items written elsewhere instead of calling Claude, in the same
 * JSON shape the API returns. They pass the same checks and are saved the same
 * way. Every item is validated before anything is written, and an item whose
 * title already exists for its type is skipped, so a file can be re-imported:
 *
 *   npm run content:generate -- --from content/questions/reading.json
 *   npm run content:generate -- --from content/questions --publish   (every file in the folder)
 *   [{ "typeCode": "READ_ALOUD", "difficulty": "MEDIUM", "content": { "title": …, "tags": […], "passage": … } }]
 *
 * By default nothing is published: every question is created with status DRAFT
 * and the tag `ai-generated`; review it in /admin/questions before students see
 * it. `--publish` (imports only) is for the reviewed bank in content/questions:
 * it publishes new items and any matching drafts, numbering each one the way
 * the admin screen does.
 *
 * Listening and audio-prompt tasks need a recording, and Describe Image needs
 * its figure. Build both with `npm run content:media` first; an import links
 * each question to the files built for it. Describe Image can only be
 * imported, because its figure is drawn from the item's chart data.
 *
 * Codes take the form RA-AI-001. The seed bank upserts RA-001-style codes, so
 * keeping generated items in their own range means a re-seed never overwrites them.
 *
 * --dry-run validates and prints instead of saving, and needs no database.
 * Calling Claude uses CONTENT_AI_API_KEY, never the scoring key in AI_API_KEY
 * (plus AWS_REGION and ANTHROPIC_AWS_WORKSPACE_ID when it is a Claude Platform
 * on AWS key). The question types must already exist in the database: run
 * `npm run sync:question-types`.
 */

const DIFFICULTIES: GenerationDifficulty[] = ['EASY', 'MEDIUM', 'HARD']
const ATTEMPTS_PER_QUESTION = 3

const { values } = parseArgs({
  options: {
    type: { type: 'string' },
    count: { type: 'string', default: '1' },
    difficulty: { type: 'string' },
    topic: { type: 'string' },
    from: { type: 'string' },
    publish: { type: 'boolean', default: false },
    'dry-run': { type: 'boolean', default: false },
  },
})

const dryRun = values['dry-run']
const prisma = dryRun ? null : new PrismaClient()

function fail(message: string): never {
  console.error(message)
  console.error(`\nGeneratable types: ${GENERATABLE_TYPES.join(', ')}`)
  process.exit(1)
}

// --- storage -------------------------------------------------------------------

const typeIds = new Map<string, string>()

async function questionTypeId(typeCode: string): Promise<string> {
  const known = typeIds.get(typeCode)
  if (known) return known
  const row = await prisma!.questionType.findUnique({ where: { code: typeCode }, select: { id: true } })
  if (!row) throw new Error(`${typeCode} is not in the database. Run \`npm run sync:question-types\` first.`)
  typeIds.set(typeCode, row.id)
  return row.id
}

async function existingTitles(typeCode: string): Promise<string[]> {
  if (!prisma) return []
  const rows = await prisma.question.findMany({
    where: { questionTypeId: await questionTypeId(typeCode) },
    select: { title: true },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  return rows.map((row) => row.title)
}

const nextNumbers = new Map<string, number>()

async function nextCode(prefix: string): Promise<string> {
  let next = nextNumbers.get(prefix)
  if (next === undefined) {
    const rows = prisma
      ? await prisma.question.findMany({ where: { code: { startsWith: `${prefix}-AI-` } }, select: { code: true } })
      : []
    const numbers = rows
      .map((row) => /-AI-(\d+)$/.exec(row.code)?.[1])
      .filter((value): value is string => Boolean(value))
      .map(Number)
    next = Math.max(0, ...numbers) + 1
  }
  nextNumbers.set(prefix, next + 1)
  return `${prefix}-AI-${String(next).padStart(3, '0')}`
}

/**
 * Reserves the next "RA #12"-style number for a type. The same counter update
 * as src/lib/pte/numbering, which is server-only and cannot be imported here.
 */
async function allocateTypeNumber(tx: Prisma.TransactionClient, typeId: string): Promise<number> {
  const updated = await tx.questionType.update({
    where: { id: typeId },
    data: { lastTypeNumber: { increment: 1 } },
    select: { lastTypeNumber: true },
  })
  return updated.lastTypeNumber
}

async function save(
  typeCode: QuestionTypeCode,
  difficulty: GenerationDifficulty,
  question: QuestionDraft,
  publish = false,
): Promise<string> {
  const code = await nextCode(importSpec(typeCode)!.prefix)
  if (!prisma) return code

  const typeId = await questionTypeId(typeCode)
  await prisma.$transaction(async (tx) => {
    await tx.question.create({
      data: {
        code,
        questionTypeId: typeId,
        ...question,
        ...builtMediaFor(typeCode, question.title),
        options: question.options as object,
        correctAnswer: question.correctAnswer as object,
        tags: [...question.tags, 'ai-generated'],
        difficulty,
        status: publish ? 'PUBLISHED' : 'DRAFT',
        typeNumber: publish ? await allocateTypeNumber(tx, typeId) : null,
      },
    })
  })
  return code
}

/** Publishes the draft with this title, if there is one, keeping any number it already has. */
async function publishExisting(typeCode: QuestionTypeCode, title: string): Promise<boolean> {
  const typeId = await questionTypeId(typeCode)
  return prisma!.$transaction(async (tx) => {
    const draft = await tx.question.findFirst({
      where: { questionTypeId: typeId, title: { equals: title, mode: 'insensitive' }, status: 'DRAFT' },
      select: { id: true, typeNumber: true },
    })
    if (!draft) return false
    await tx.question.update({
      where: { id: draft.id },
      data: { status: 'PUBLISHED', typeNumber: draft.typeNumber ?? (await allocateTypeNumber(tx, typeId)) },
    })
    return true
  })
}

// --- generate with Claude -------------------------------------------------------

let claude: Anthropic | null = null

async function askClaude(prompt: string, jsonSchema: Record<string, unknown>): Promise<unknown> {
  claude ??= contentGenerationClient()
  const message = await claude.beta.messages.create({
    model: env.ai.model || 'claude-opus-5',
    max_tokens: 16000,
    system: GENERATION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    output_config: { effort: 'high', format: { type: 'json_schema', schema: jsonSchema } },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  })

  if (message.stop_reason === 'refusal') throw new GenerationError('The model declined this request.')
  if (message.stop_reason === 'max_tokens') throw new GenerationError('The response was cut off.')

  const text = message.content.map((block) => (block.type === 'text' ? block.text : '')).join('')
  return parseJson(text)
}

async function generateOne(
  typeCode: QuestionTypeCode,
  difficulty: GenerationDifficulty,
  avoidTitles: string[],
): Promise<QuestionDraft | null> {
  const definition = generationSpec(typeCode)!
  const prompt = generationPrompt({ typeCode, difficulty, topic: values.topic, avoidTitles })

  for (let attempt = 1; attempt <= ATTEMPTS_PER_QUESTION; attempt++) {
    try {
      return definition.build(await askClaude(prompt, definition.jsonSchema))
    } catch (error) {
      // Only a failed content check is worth asking again for; auth, quota
      // and configuration errors will fail the same way every time.
      if (!(error instanceof GenerationError)) throw error
      console.warn(`  attempt ${attempt} rejected: ${error.message}`)
    }
  }
  return null
}

function resolveTypes(raw: string | undefined): QuestionTypeCode[] {
  if (!raw) fail('Pass --type with a question type code, a comma-separated list, or "all" — or --from with a file.')
  if (raw.toLowerCase() === 'all') return GENERATABLE_TYPES
  const codes = raw.split(',').map((code) => code.trim().toUpperCase())
  const unknown = codes.filter((code) => !generationSpec(code))
  if (unknown.length > 0) fail(`Cannot generate: ${unknown.join(', ')}`)
  return codes as QuestionTypeCode[]
}

async function generateWithClaude() {
  const types = resolveTypes(values.type)
  const count = Number.parseInt(values.count, 10)
  if (!Number.isInteger(count) || count < 1 || count > 50) fail('--count must be a whole number from 1 to 50.')
  const fixedDifficulty = values.difficulty?.toUpperCase() as GenerationDifficulty | undefined
  if (fixedDifficulty && !DIFFICULTIES.includes(fixedDifficulty)) fail('--difficulty must be EASY, MEDIUM or HARD.')

  const model = env.ai.model || 'claude-opus-5'
  console.log(`Generating ${count} per type for ${types.length} type(s) with ${model}${dryRun ? ' (dry run)' : ''}.\n`)
  let saved = 0
  let rejected = 0

  for (const typeCode of types) {
    const avoidTitles = await existingTitles(typeCode)
    console.log(typeCode)

    for (let i = 0; i < count; i++) {
      const difficulty = fixedDifficulty ?? DIFFICULTIES[i % DIFFICULTIES.length]!
      const question = await generateOne(typeCode, difficulty, avoidTitles)
      if (!question) {
        rejected += 1
        console.warn(`  skipped: no valid item after ${ATTEMPTS_PER_QUESTION} attempts`)
        continue
      }
      avoidTitles.push(question.title)

      const code = await save(typeCode, difficulty, question)
      saved += 1
      if (dryRun) console.log(JSON.stringify({ code, typeCode, difficulty, ...question }, null, 2))
      else console.log(`  ${code}  ${difficulty.padEnd(6)}  ${question.title}`)
    }
  }

  console.log(`\nDone: ${saved} ${dryRun ? 'generated' : 'saved as drafts'}, ${rejected} skipped.`)
  if (!dryRun && saved > 0) console.log('Review and publish them in /admin/questions.')
}

// --- import from a file ------------------------------------------------------------

const importFileSchema = z.array(
  z.object({
    typeCode: z.string(),
    difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']),
    content: z.unknown(),
    // Present when a whole folder is read, to point problems at the right file.
    file: z.string().optional(),
    index: z.number().optional(),
  }),
)

async function importFile(path: string) {
  const raw: unknown = statSync(path).isDirectory() ? readContentItems(path) : JSON.parse(readFileSync(path, 'utf8'))
  const parsed = importFileSchema.safeParse(raw)
  if (!parsed.success) fail(`${path} must be a JSON list of { typeCode, difficulty, content } items.`)

  // Validate the whole file first, so a bad item never leaves it half imported.
  const problems: string[] = []
  const items = parsed.data.flatMap((item, index) => {
    const definition = importSpec(item.typeCode)
    const label = item.file ? `${item.file} #${(item.index ?? index) + 1} ${item.typeCode}` : `#${index + 1} ${item.typeCode}`
    if (!definition) {
      problems.push(`${label}: no generator for this type`)
      return []
    }
    try {
      const question = definition.build(item.content)
      return [{ typeCode: item.typeCode as QuestionTypeCode, difficulty: item.difficulty, question }]
    } catch (error) {
      problems.push(`${label}: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  })

  if (problems.length > 0) {
    console.error(`${problems.length} of ${parsed.data.length} item(s) failed validation; nothing was saved.\n`)
    for (const problem of problems) console.error(`  ${problem}`)
    process.exitCode = 1
    return
  }

  console.log(`${items.length} item(s) valid${dryRun ? ' (dry run — nothing saved)' : ''}.\n`)
  let saved = 0
  let skipped = 0
  let published = 0
  const titlesByType = new Map<string, Set<string>>()

  for (const { typeCode, difficulty, question } of items) {
    let titles = titlesByType.get(typeCode)
    if (!titles) {
      titles = new Set((await existingTitles(typeCode)).map((title) => title.toLowerCase()))
      titlesByType.set(typeCode, titles)
    }
    if (titles.has(question.title.toLowerCase())) {
      skipped += 1
      if (values.publish && prisma && (await publishExisting(typeCode, question.title))) {
        published += 1
        console.log(`  published  ${typeCode.padEnd(28)} ${question.title}`)
      }
      continue
    }
    titles.add(question.title.toLowerCase())

    const code = await save(typeCode, difficulty, question, values.publish)
    saved += 1
    console.log(`  ${code.padEnd(10)} ${typeCode.padEnd(28)} ${difficulty.padEnd(6)} ${question.title}`)
  }

  const outcome = dryRun ? 'would be saved' : values.publish ? 'saved and published' : 'saved as drafts'
  const drafts = published > 0 ? ` (${published} existing draft(s) published)` : ''
  console.log(`\nDone: ${saved} ${outcome}, ${skipped} already existed${drafts}.`)

  if (prisma) {
    const attached = await attachBuiltMedia(prisma)
    console.log(`Linked ${attached.audio} recording(s) and ${attached.images} figure(s) to questions that had none.`)
  }
  if (!dryRun && saved > 0 && !values.publish) console.log('Review and publish them in /admin/questions.')
}

main()

async function main() {
  try {
    if (values.from) await importFile(values.from)
    else await generateWithClaude()
  } catch (error) {
    console.error('\nGeneration failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  } finally {
    await prisma?.$disconnect()
  }
}
