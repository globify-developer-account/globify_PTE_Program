import { DrillEditor } from '@/components/admin/drill-editor'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'New exercise',
  description: 'Author a dictation and shadowing exercise.',
  path: '/admin/drills/new',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function NewDrillPage() {
  await requireStaff('content.manage')

  const categories = await prisma.drillCategory.findMany({
    orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  })

  return (
    <DrillEditor
      categories={categories}
      previewUrl={null}
      initial={{
        slug: '',
        title: '',
        description: '',
        categoryId: categories[0]?.id ?? '',
        audioUrl: '',
        audioDurationMs: null,
        transcript: '',
        accent: '',
        difficulty: 'MEDIUM',
        status: 'DRAFT',
        isPremium: false,
        tags: [],
        displayOrder: 0,
        segments: [],
      }}
    />
  )
}
