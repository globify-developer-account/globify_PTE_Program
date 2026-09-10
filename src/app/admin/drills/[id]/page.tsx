import { notFound } from 'next/navigation'
import { DrillEditor } from '@/components/admin/drill-editor'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { resolveMediaUrl } from '@/lib/storage'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Edit exercise',
  description: 'Edit a dictation and shadowing exercise.',
  path: '/admin/drills',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function EditDrillPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('content.manage')
  const { id } = await params

  const [drill, categories] = await Promise.all([
    prisma.drill.findUnique({
      where: { id },
      include: { segments: { orderBy: { order: 'asc' } } },
    }),
    prisma.drillCategory.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ])
  if (!drill) notFound()

  return (
    <DrillEditor
      categories={categories}
      previewUrl={await resolveMediaUrl(drill.audioUrl)}
      initial={{
        id: drill.id,
        slug: drill.slug,
        title: drill.title,
        description: drill.description ?? '',
        categoryId: drill.categoryId,
        audioUrl: drill.audioUrl,
        audioDurationMs: drill.audioDurationMs,
        transcript: drill.transcript,
        accent: drill.accent ?? '',
        difficulty: drill.difficulty,
        status: drill.status,
        isPremium: drill.isPremium,
        tags: drill.tags,
        displayOrder: drill.displayOrder,
        segments: drill.segments.map((segment) => ({
          text: segment.text,
          startMs: segment.startMs,
          endMs: segment.endMs,
        })),
      }}
    />
  )
}
