import { QuestionEditor } from '@/components/admin/question-editor'
import { requireStaff } from '@/lib/auth/guards'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'New question',
  description: 'Author a new PTE practice question.',
  path: '/admin/questions/new',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function NewQuestionPage() {
  await requireStaff('questions.manage')

  return (
    <QuestionEditor
      initial={{
        code: '',
        typeCode: 'READ_ALOUD',
        title: '',
        prompt: '',
        passage: '',
        audioTranscript: '',
        imageUrl: '',
        audioUrl: '',
        explanation: '',
        sampleAnswer: '',
        options: [],
        correctAnswer: {},
        difficulty: 'MEDIUM',
        status: 'DRAFT',
        tags: [],
        timeLimitSeconds: null,
        preparationSeconds: null,
        wordLimitMin: null,
        wordLimitMax: null,
        isPremium: false,
      }}
    />
  )
}
