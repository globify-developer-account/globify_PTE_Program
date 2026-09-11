import 'dotenv/config'
import { PrismaClient, type PteSection } from '@prisma/client'
import { QUESTION_TYPES } from '../src/lib/pte/question-types'

/**
 * Syncs the PTE task catalogue into the database.
 *
 * The full seed does this too, but it also writes demo students, questions and
 * practice history — which is not what you want against an installation that
 * already has real users. This script touches nothing but QuestionType rows.
 *
 * Run it whenever src/lib/pte/question-types.ts changes: after Pearson adds a
 * task, after a score weight is revised, or after a migration adds a column the
 * catalogue now populates.
 *
 *   npm run sync:question-types
 *
 * It is idempotent. `lastTypeNumber` is never written — that is a live
 * allocator, and resetting it would reissue numbers existing questions hold.
 */

const prisma = new PrismaClient()

async function main() {
  const before = await prisma.questionType.findMany({
    where: { exam: 'PTE' },
    select: { code: true },
  })
  const existing = new Set(before.map((row) => row.code))

  let created = 0
  let updated = 0

  for (const type of QUESTION_TYPES) {
    const data = {
      name: type.name,
      shortName: type.shortName,
      section: type.section as PteSection,
      renderer: type.renderer,
      description: type.description,
      skills: [...type.skills],
      defaultTimeLimitSeconds: type.defaultTimeLimitSeconds,
      defaultPreparationSeconds: type.defaultPreparationSeconds,
      requiresAudioResponse: type.requiresAudioResponse,
      requiresTextResponse: type.requiresTextResponse,
      scoreWeight: type.scoreWeight,
      variants: [...type.variants],
      isNew: type.isNew,
      isActive: true,
      displayOrder: type.displayOrder,
    }

    await prisma.questionType.upsert({
      where: { code: type.code },
      create: { code: type.code, ...data },
      update: data,
    })

    if (existing.has(type.code)) updated += 1
    else created += 1
  }

  // A type that is in the database but no longer in the catalogue is not
  // deleted — questions still point at it. It is deactivated instead, which
  // takes it out of the menus while leaving every attempt and score intact.
  // Widened to string: the codes coming back from the database are plain
  // strings, and a Set of the literal union would not accept them.
  const catalogueCodes = new Set<string>(QUESTION_TYPES.map((type) => type.code))
  const orphaned = before.filter((row) => !catalogueCodes.has(row.code))
  if (orphaned.length > 0) {
    await prisma.questionType.updateMany({
      where: { code: { in: orphaned.map((row) => row.code) } },
      data: { isActive: false },
    })
  }

  console.log(`Question types synced: ${created} created, ${updated} updated.`)
  if (orphaned.length > 0) {
    console.log(
      `Deactivated ${orphaned.length} no longer in the catalogue: ${orphaned
        .map((row) => row.code)
        .join(', ')}`,
    )
  }
}

main()
  .catch((error) => {
    console.error('Sync failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
