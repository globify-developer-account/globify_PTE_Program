import { prisma } from '@/lib/db'
import { requireApiUser } from '@/lib/auth/guards'
import { ok, route } from '@/lib/http'
import { LIMITS, clientKey, enforceRateLimit } from '@/lib/rate-limit'
import { parseQuestionReference, questionHref, questionLabel } from '@/lib/pte/question-ref'
import { QUESTION_TYPES, SECTION_META } from '@/lib/pte/question-types'

export const runtime = 'nodejs'

const MAX_RESULTS = 12

export interface QuestionSearchHit {
  id: string
  label: string
  title: string
  sectionLabel: string
  href: string
}

/**
 * The masthead question search.
 *
 * Students look questions up two ways: by the reference they saw in a study
 * group ("RA 677") and by a phrase they half-remember from the text. A
 * reference is an exact lookup and returns at most one row; anything else
 * falls through to a contains-match over the visible content.
 *
 * Only published questions are searchable. Drafts have no stable number and
 * are not something a student should be able to reach by guessing an id.
 */
export const GET = route(async (request) => {
  await requireApiUser()
  enforceRateLimit(clientKey(request, 'q-search'), LIMITS.general.limit, LIMITS.general.windowMs)

  const query = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return ok({ hits: [] satisfies QuestionSearchHit[] })

  const reference = parseQuestionReference(query)

  const rows = reference
    ? await prisma.question.findMany({
        where: {
          status: 'PUBLISHED',
          typeNumber: reference.number,
          ...(reference.shortName
            ? { questionType: { shortName: { equals: reference.shortName, mode: 'insensitive' } } }
            : {}),
        },
        select: SELECT,
        take: MAX_RESULTS,
      })
    : await prisma.question.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { passage: { contains: query, mode: 'insensitive' } },
            { prompt: { contains: query, mode: 'insensitive' } },
          ],
        },
        select: SELECT,
        orderBy: [{ questionTypeId: 'asc' }, { typeNumber: 'asc' }],
        take: MAX_RESULTS,
      })

  return ok({ hits: rows.map(toHit) })
})

const SELECT = {
  id: true,
  title: true,
  typeNumber: true,
  questionType: { select: { code: true, shortName: true, section: true } },
} as const

type Row = {
  id: string
  title: string
  typeNumber: number | null
  questionType: { code: string; shortName: string; section: keyof typeof SECTION_META }
}

function toHit(row: Row): QuestionSearchHit {
  const section = SECTION_META[row.questionType.section]
  // The DB row is the source of truth for the code, but the label reads better
  // from the compile-time catalogue, which is where the short names students
  // recognise live.
  const known = QUESTION_TYPES.find((type) => type.code === row.questionType.code)
  return {
    id: row.id,
    label: questionLabel(known?.code ?? row.questionType.shortName, row.typeNumber),
    title: row.title,
    sectionLabel: section.label,
    href: questionHref(section.slug, row.questionType.code, row.id),
  }
}
