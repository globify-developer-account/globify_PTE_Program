import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ConversationChat, type ChatMessage } from '@/components/conversations/conversation-chat'
import type { ReportPayload } from '@/components/conversations/report-card'
import { requireStudent } from '@/lib/auth/guards'
import { getConversationWithReport, MAX_USER_TURNS, MIN_TURNS_FOR_REPORT } from '@/lib/conversations'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Conversation',
  description: 'Practise speaking English in a real conversation.',
  path: '/conversations',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireStudent(`/conversations/${id}`)
  const conversation = await getConversationWithReport(user.id, id)

  const messages: ChatMessage[] = conversation.messages.map((message) => ({
    id: message.id,
    role: message.role as 'USER' | 'ASSISTANT',
    index: message.index,
    content: message.content,
    correction: message.correction,
    correctionNote: message.correctionNote,
    suggestions: message.suggestions,
    transcribed: message.transcribed,
  }))

  const report: ReportPayload | null = conversation.report
    ? {
        estimatedScore: conversation.report.estimatedScore,
        fluency: conversation.report.fluency,
        vocabulary: conversation.report.vocabulary,
        grammar: conversation.report.grammar,
        interaction: conversation.report.interaction,
        summary: conversation.report.summary,
        strengths: conversation.report.strengths,
        improvements: conversation.report.improvements,
        nextSteps: conversation.report.nextSteps,
        corrections: (conversation.report.corrections as ReportPayload['corrections'] | null) ?? [],
        goalsMet: conversation.report.goalsMet,
        simulated: conversation.report.simulated,
      }
    : null

  return (
    <div className="space-y-4">
      <Link
        href="/conversations"
        className="inline-flex items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-brand-600"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All conversations
      </Link>

      <ConversationChat
        conversationId={conversation.id}
        title={conversation.title}
        personaName={conversation.personaName}
        goals={conversation.goals}
        level={conversation.level}
        status={conversation.status}
        maxTurns={MAX_USER_TURNS}
        userTurns={conversation.userTurns}
        minTurnsForReport={MIN_TURNS_FOR_REPORT}
        initialMessages={messages}
        initialReport={report}
      />
    </div>
  )
}
