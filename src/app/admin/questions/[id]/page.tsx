import { notFound } from 'next/navigation'
import { QuestionEditor } from '@/components/admin/question-editor'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Edit question',
  description: 'Edit a PTE practice question.',
  path: '/admin/questions',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function EditQuestionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('questions.manage')
  const { id } = await params

  const question = await prisma.question.findUnique({
    where: { id },
    include: { questionType: { select: { code: true } } },
  })
  if (!question) notFound()

  return (
    <QuestionEditor
      initial={{
        id: question.id,
        code: question.code,
        typeCode: question.questionType.code,
        title: question.title,
        prompt: question.prompt ?? '',
        passage: question.passage ?? '',
        audioTranscript: question.audioTranscript ?? '',
        imageUrl: question.imageUrl ?? '',
        audioUrl: question.audioUrl ?? '',
        explanation: question.explanation ?? '',
        sampleAnswer: question.sampleAnswer ?? '',
        options: question.options,
        correctAnswer: (question.correctAnswer ?? {}) as Record<string, unknown>,
        difficulty: question.difficulty,
        status: question.status,
        tags: question.tags,
        timeLimitSeconds: question.timeLimitSeconds,
        preparationSeconds: question.preparationSeconds,
        wordLimitMin: question.wordLimitMin,
        wordLimitMax: question.wordLimitMax,
        isPremium: question.isPremium,
      }}
    />
  )
}
