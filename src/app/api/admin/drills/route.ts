import { prisma } from '@/lib/db'
import { requireApiStaff } from '@/lib/auth/guards'
import { conflict, ok, parseJson, route } from '@/lib/http'
import { writeAudit } from '@/lib/audit'
import { drillInputSchema } from '@/lib/admin/drill-schema'
import { assertCategoryExists, drillFields, syncSegments } from '@/lib/drills/authoring'

export const runtime = 'nodejs'

export const POST = route(async (request) => {
  const staff = await requireApiStaff('content.manage')
  const input = await parseJson(request, drillInputSchema)

  await assertCategoryExists(input.categoryId)

  const existing = await prisma.drill.findUnique({ where: { slug: input.slug }, select: { id: true } })
  if (existing) throw conflict('An exercise with that web address already exists.')

  const drill = await prisma.drill.create({
    data: { ...drillFields(input), createdById: staff.id },
    select: { id: true, slug: true },
  })

  await syncSegments(drill.id, input.segments)

  await writeAudit({
    actorId: staff.id,
    actorRole: staff.role,
    action: 'drill.created',
    entity: 'Drill',
    entityId: drill.id,
    metadata: { slug: drill.slug, status: input.status, segments: input.segments.length },
  })

  return ok(drill, { status: 201 })
})
