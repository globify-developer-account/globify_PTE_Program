import 'server-only'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'

/**
 * Per-type question numbers — the "RA #677" students quote to each other.
 *
 * The number is allocated from a counter on the question type rather than
 * from `COUNT(*)`, because a count is not stable: deleting question 40 would
 * make the next question reuse number 40 and silently point every student who
 * bookmarked the old one at different content. A monotonic counter never
 * reissues a number, so a reference stays valid for as long as the question
 * does.
 *
 * Reading and formatting references is pure and lives in ./question-ref, so
 * client components can share the same definition.
 */

/**
 * Reserves the next number for a question type.
 *
 * Must run inside a transaction together with the write that consumes the
 * number. `UPDATE ... RETURNING` takes a row lock, so two concurrent
 * allocations serialise rather than both reading the same value.
 */
export async function allocateTypeNumber(
  tx: Prisma.TransactionClient,
  questionTypeId: string,
): Promise<number> {
  const updated = await tx.questionType.update({
    where: { id: questionTypeId },
    data: { lastTypeNumber: { increment: 1 } },
    select: { lastTypeNumber: true },
  })
  return updated.lastTypeNumber
}

/**
 * Gives a question its number if it does not have one yet.
 *
 * Idempotent: re-publishing a question that was already numbered keeps the
 * number it had, so a task that is unpublished for an edit and republished
 * does not move.
 */
export async function ensureTypeNumber(questionId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const question = await tx.question.findUniqueOrThrow({
      where: { id: questionId },
      select: { typeNumber: true, questionTypeId: true },
    })
    if (question.typeNumber !== null) return question.typeNumber

    const next = await allocateTypeNumber(tx, question.questionTypeId)
    await tx.question.update({
      where: { id: questionId },
      data: { typeNumber: next },
    })
    return next
  })
}
