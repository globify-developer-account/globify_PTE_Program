import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge, humanizeStatus, statusTone } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { StatTile } from '@/components/charts/stat-tile'
import { Meter } from '@/components/charts/score-ring'
import { AiEstimateBadge } from '@/components/dashboard/ai-estimate'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { getEntitlements } from '@/lib/access'
import { formatMoney } from '@/lib/money'
import { SECTIONS, SECTION_META } from '@/lib/pte/question-types'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, formatDateTime, relativeTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Student',
  description: 'A single student account, their progress and their payments.',
  path: '/admin/students',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff('students.view')
  const { id } = await params

  const student = await prisma.user.findFirst({
    where: { id, role: 'STUDENT' },
    include: {
      profile: true,
      progress: true,
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          reference: true,
          status: true,
          totalCents: true,
          currency: true,
          createdAt: true,
          plan: { select: { name: true } },
        },
      },
    },
  })
  if (!student) notFound()

  const [entitlements, attemptCount, lastAttempts, mockResults] = await Promise.all([
    getEntitlements(student.id),
    prisma.attempt.count({ where: { userId: student.id, status: 'SCORED' } }),
    prisma.attempt.findMany({
      where: { userId: student.id, status: 'SCORED' },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        submittedAt: true,
        score: { select: { overall: true, source: true } },
        question: { select: { title: true, questionType: { select: { name: true, section: true } } } },
      },
    }),
    prisma.mockTestResult.findMany({
      where: { userId: student.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, sessionId: true, overallScore: true, createdAt: true, mockTest: { select: { title: true } } },
    }),
  ])

  const progressBySection = new Map(student.progress.map((row) => [row.section, row]))
  const target = student.profile?.targetScore ?? 79

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/students"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-700"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All students
        </Link>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{student.name}</h2>
            <p className="mt-1 text-sm text-ink-500">{student.email}</p>
            <p className="mt-1 text-xs text-ink-400">
              Joined {formatDate(student.createdAt)} ·{' '}
              {student.lastLoginAt ? `last seen ${relativeTime(student.lastLoginAt)}` : 'never signed in'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(student.status)}>{humanizeStatus(student.status)}</Badge>
            {entitlements.isPremium ? (
              <Badge tone="success">
                {entitlements.plan?.name} · {entitlements.daysRemaining}d left
              </Badge>
            ) : (
              <Badge tone="neutral">{entitlements.tier === 'expired' ? 'Expired' : 'Free'}</Badge>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Questions answered" value={attemptCount} />
        <StatTile
          label="Current estimate"
          value={student.profile?.currentEstimateScore ?? '—'}
          hint={`Target ${target}`}
        />
        <StatTile
          label="Practice streak"
          value={`${student.profile?.streakDays ?? 0} days`}
          hint={`Longest ${student.profile?.longestStreak ?? 0}`}
        />
        <StatTile label="Mock tests" value={mockResults.length} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Section estimates" action={<AiEstimateBadge />} />
          <CardBody className="space-y-4">
            {SECTIONS.map((section) => {
              const row = progressBySection.get(section)
              const meta = SECTION_META[section]
              return (
                <div key={section}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-ink-600">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      />
                      {meta.label}
                    </span>
                    <span className="tabular text-navy-900">
                      {row && row.attemptsCount > 0 ? row.estimatedScore : '—'}
                      <span className="text-ink-400"> ({row?.attemptsCount ?? 0})</span>
                    </span>
                  </div>
                  <Meter
                    value={row?.estimatedScore ?? 0}
                    max={90}
                    color={meta.color}
                    trackColor="var(--color-ink-100)"
                    className="mt-2"
                    height={6}
                  />
                </div>
              )
            })}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Profile" />
          <CardBody>
            <dl className="space-y-2.5 text-sm">
              <Row label="Phone" value={student.profile?.phone ?? '—'} />
              <Row label="City" value={student.profile?.city ?? '—'} />
              <Row label="Country" value={student.profile?.country ?? '—'} />
              <Row label="Study destination" value={student.profile?.studyDestination ?? '—'} />
              <Row label="Target score" value={String(target)} />
              <Row label="Daily goal" value={`${student.profile?.dailyGoalMinutes ?? 45} minutes`} />
              <Row
                label="Planned test date"
                value={student.profile?.preferredTestDate ? formatDate(student.profile.preferredTestDate) : '—'}
              />
              <Row label="Referral code" value={student.profile?.referralCode ?? '—'} mono />
            </dl>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent answers" description="The last ten scored responses." />
        <DataTable
          rows={lastAttempts}
          rowKey={(attempt) => attempt.id}
          empty={{ title: 'No answers yet', description: 'This student has not practised.' }}
          columns={[
            {
              key: 'question',
              header: 'Question',
              render: (attempt) => (
                <div className="min-w-0">
                  <p className="truncate text-sm text-navy-900">{attempt.question.title}</p>
                  <p className="truncate text-xs text-ink-500">{attempt.question.questionType.name}</p>
                </div>
              ),
            },
            {
              key: 'score',
              header: 'Score',
              align: 'right',
              render: (attempt) => (
                <span className="tabular font-medium text-navy-900">{attempt.score?.overall ?? '—'}</span>
              ),
            },
            {
              key: 'source',
              header: 'Source',
              secondary: true,
              render: (attempt) => (
                <Badge tone="neutral" size="sm">
                  {attempt.score?.source ?? '—'}
                </Badge>
              ),
            },
            {
              key: 'when',
              header: 'When',
              align: 'right',
              secondary: true,
              render: (attempt) => (
                <span className="text-xs text-ink-500">{formatDateTime(attempt.submittedAt)}</span>
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <CardHeader title="Payments" />
        <DataTable
          rows={student.payments}
          rowKey={(payment) => payment.id}
          empty={{ title: 'No payments', description: 'This student has never checked out.' }}
          columns={[
            {
              key: 'plan',
              header: 'Plan',
              render: (payment) => (
                <div className="min-w-0">
                  <p className="text-sm text-navy-900">{payment.plan.name}</p>
                  <p className="font-mono text-xs text-ink-400">{payment.reference}</p>
                </div>
              ),
            },
            {
              key: 'amount',
              header: 'Amount',
              align: 'right',
              render: (payment) => (
                <span className="tabular font-medium text-navy-900">
                  {formatMoney(payment.totalCents, payment.currency)}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (payment) => (
                <Badge tone={statusTone(payment.status)}>{humanizeStatus(payment.status)}</Badge>
              ),
            },
            {
              key: 'when',
              header: 'When',
              align: 'right',
              secondary: true,
              render: (payment) => (
                <span className="text-xs text-ink-500">{formatDate(payment.createdAt)}</span>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500">{label}</dt>
      <dd className={mono ? 'font-mono text-xs text-navy-900' : 'text-navy-900'}>{value}</dd>
    </div>
  )
}
