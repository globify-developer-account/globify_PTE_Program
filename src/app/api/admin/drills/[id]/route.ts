import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { badRequest, notFound, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { drillInputSchema } from '@/lib/admin/drill-schema'
import { assertCategoryExists, drillFields, syncSegments } from '@/lib/drills/authoring'

export const runtime = 'nodejs'

export const PATCH = route(async (request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('content.manage')
  const { id } = await context.params

  const input = await parseJson(request, drillInputSchema)
  await assertCategoryExists(input.categoryId)

  const existing = await prisma.drill.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!existing) throw notFound('That exercise does not exist.')

  if (input.slug !== existing.slug) {
    const clash = await prisma.drill.findUnique({ where: { slug: input.slug }, select: { id: true } })
    if (clash) throw badRequest('Another exercise already uses that web address.')
  }

  await prisma.drill.update({ where: { id }, data: drillFields(input) })
  await syncSegments(id, input.segments)

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'drill.updated',
    entity: 'Drill',
    entityId: id,
    metadata: { slug: input.slug, status: input.status, segments: input.segments.length },
  })

  return ok({ id, slug: input.slug })
})

/**
 * Archives rather than deletes, for the same reason questions are archived:
 * attempts reference the exercise, and a learner's history should not develop
 * holes because content was tidied up later.
 */
export const DELETE = route(async (_request, context: { params: Promise<{ id: string }> }) => {
  const staff = await requireApiStaff('content.manage')
  const { id } = await context.params

  const drill = await prisma.drill.findUnique({ where: { id }, select: { id: true, slug: true } })
  if (!drill) throw notFound('That exercise does not exist.')

  await prisma.drill.update({ where: { id }, data: { status: 'ARCHIVED' } })

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'drill.archived',
    entity: 'Drill',
    entityId: id,
    metadata: { slug: drill.slug },
  })

  return ok({ archived: true })
})
