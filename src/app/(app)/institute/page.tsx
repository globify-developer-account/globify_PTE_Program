import { Building2, Users } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/states'
import { requireStudent } from '@/lib/auth/guards'
import {
  INSTITUTE_ROLE_LABEL,
  canManageCohort,
  getCohort,
  getMembership,
  type CohortMember,
} from '@/lib/institute'
import { contactInfo } from '@/lib/site'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, initials, pluralize } from '@/lib/utils'
import { JoinInstituteForm } from '@/components/institute/join-form'

export const metadata = pageMetadata({
  title: 'Institute Mode',
  description: 'Study with your coaching centre and let your teachers follow your progress.',
  path: '/institute',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function InstitutePage() {
  const user = await requireStudent('/institute')
  const membership = await getMembership(user.id)

  if (!membership) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Institute mode</h2>
          <p className="mt-1.5 text-sm text-ink-500">
            Link your account to your coaching centre so your teachers can follow your practice and
            set work for your batch.
          </p>
        </div>

        <Card>
          <CardHeader
            title="Join your institute"
            description="Ask your centre for their join code — it is six characters long."
          />
          <CardBody>
            <JoinInstituteForm />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Run a coaching centre?" />
          <CardBody className="text-sm leading-relaxed text-ink-600">
            <p>
              Institute mode gives your centre one dashboard across every student: who is
              practising, which task types the batch is weakest on, and how each learner is
              tracking against their target.
            </p>
            <p className="mt-3">
              Email{' '}
              <a
                href={`mailto:${contactInfo.email}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                {contactInfo.email}
              </a>{' '}
              or call{' '}
              <a
                href={`tel:${contactInfo.phoneHref}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                {contactInfo.phoneDisplay}
              </a>{' '}
              and we will set your centre up.
            </p>
          </CardBody>
        </Card>
      </div>
    )
  }

  const manages = canManageCohort(membership.role)
  const cohort = manages ? await getCohort(membership.instituteId) : []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline bg-white p-5">
        {membership.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={membership.logoUrl} alt="" className="size-14 shrink-0 rounded-xl object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
            <Building2 className="size-6" aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold tracking-tight text-navy-900">{membership.name}</h2>
          <p className="mt-1 text-sm text-ink-500">
            {INSTITUTE_ROLE_LABEL[membership.role]}
            {membership.batch ? ` · ${membership.batch}` : ''} · joined{' '}
            {formatDate(membership.joinedAt)}
          </p>
        </div>
        {manages ? (
          <div className="text-right">
            <p className="text-2xl font-semibold leading-none tabular-nums text-navy-900">
              {membership.memberCount}
              <span className="text-base font-medium text-ink-400">/{membership.seatLimit}</span>
            </p>
            <p className="mt-1 text-xs text-ink-500">seats used</p>
          </div>
        ) : null}
      </div>

      {manages ? (
        <Card>
          <CardHeader
            title="Your students"
            description={
              cohort.length === 0
                ? 'No students have joined yet.'
                : `${pluralize(cohort.length, 'student')} in this institute.`
            }
          />
          {cohort.length === 0 ? (
            <EmptyState
              icon={<Users aria-hidden />}
              title="No students yet"
              description="Share your join code with your batch and they will appear here as they link their accounts."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-400">
                    <th scope="col" className="px-5 py-3 font-medium">
                      Student
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Batch
                    </th>
                    <th scope="col" className="px-5 py-3 text-right font-medium">
                      Questions
                    </th>
                    <th scope="col" className="px-5 py-3 font-medium">
                      Last practised
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {cohort.map((member) => (
                    <CohortRow key={member.userId} member={member} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <CardHeader
            title="What your teachers can see"
            description="Institute mode is not a one-way mirror — this is the whole list."
          />
          <CardBody>
            <ul className="space-y-2 text-sm leading-relaxed text-ink-600">
              <li>· How many questions you have practised, and when you last practised.</li>
              <li>· Your section estimates and mock test scores.</li>
              <li>· Which batch you are in.</li>
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              They cannot see your password, your payment details, or anything you post in Circle
              under your own name. To leave an institute, contact your centre or email{' '}
              <a
                href={`mailto:${contactInfo.supportEmail}`}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                {contactInfo.supportEmail}
              </a>
              .
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function CohortRow({ member }: { member: CohortMember }) {
  return (
    <tr>
      <td className="px-5 py-3">
        <div className="flex items-center gap-2.5">
          {member.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={member.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink-200 text-[11px] font-semibold text-ink-600">
              {initials(member.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-navy-900">{member.name}</p>
            <p className="truncate text-xs text-ink-500">{member.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3 text-ink-600">{member.batch ?? '—'}</td>
      <td className="px-5 py-3 text-right tabular-nums text-ink-700">{member.attempts}</td>
      <td className="px-5 py-3 text-ink-600">
        {member.lastPracticeDate ? formatDate(member.lastPracticeDate) : 'Never'}
      </td>
    </tr>
  )
}
