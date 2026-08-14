import { Gift, Monitor, ShieldCheck, User } from 'lucide-react'
import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  PasswordForm,
  ProfileDetailsForm,
  ReferralCard,
  SignOutEverywhere,
} from '@/components/profile/profile-forms'
import { requireStudent } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { siteConfig } from '@/lib/site'
import { formatMoney } from '@/lib/money'
import { pageMetadata } from '@/lib/metadata'
import { formatDateTime, initials } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Profile',
  description: 'Your details, goals, security and referral link.',
  path: '/profile',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await requireStudent('/profile')
  const profile = user.profile

  const [sessions, referrals] = await Promise.all([
    prisma.session.findMany({
      where: { userId: user.id, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastSeenAt: 'desc' },
      take: 8,
      select: { id: true, userAgent: true, ip: true, lastSeenAt: true, createdAt: true },
    }),
    prisma.referral.findMany({
      where: { referrerId: user.id },
      select: { id: true, status: true, rewardCents: true, createdAt: true },
    }),
  ])

  const rewarded = referrals.filter((referral) => referral.status === 'REWARDED')
  const totalReward = rewarded.reduce((sum, referral) => sum + referral.rewardCents, 0)
  const referralUrl = `${siteConfig.url}/register?ref=${profile?.referralCode ?? ''}`

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-brand-600 text-xl font-semibold text-white">
          {initials(user.name)}
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-navy-900">{user.name}</h2>
          <p className="mt-1 text-sm text-ink-500">{user.email}</p>
        </div>
        <Badge tone="neutral" className="ml-auto">
          Member since {new Date(user.createdAt).getFullYear()}
        </Badge>
      </div>

      {/* Details */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <User className="size-4 text-ink-400" aria-hidden />
              Your details
            </span>
          }
          description="Your target score and daily goal drive the dashboard and recommendations."
        />
        <CardBody>
          <ProfileDetailsForm
            initial={{
              name: user.name,
              email: user.email,
              phone: profile?.phone ?? '',
              city: profile?.city ?? '',
              country: profile?.country ?? '',
              studyDestination: profile?.studyDestination ?? '',
              targetScore: profile?.targetScore ?? 79,
              dailyGoalMinutes: profile?.dailyGoalMinutes ?? 45,
              preferredTestDate: profile?.preferredTestDate
                ? profile.preferredTestDate.toISOString().slice(0, 10)
                : '',
            }}
          />
        </CardBody>
      </Card>

      {/* Referrals */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Gift className="size-4 text-ink-400" aria-hidden />
              Refer a friend
            </span>
          }
          description="Share your link. When someone you refer subscribes, you earn a reward."
        />
        <CardBody className="space-y-4">
          {profile?.referralCode ? <ReferralCard code={profile.referralCode} url={referralUrl} /> : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="People referred" value={referrals.length} />
            <Stat label="Subscribed" value={rewarded.length} />
            <Stat label="Rewards earned" value={formatMoney(totalReward)} />
          </div>
        </CardBody>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-ink-400" aria-hidden />
              Password
            </span>
          }
        />
        <CardBody>
          <PasswordForm hasPassword={Boolean(user.passwordHash)} />
        </CardBody>
      </Card>

      {/* Sessions */}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <Monitor className="size-4 text-ink-400" aria-hidden />
              Active sessions
            </span>
          }
          description="Devices currently signed in to your account."
          action={<SignOutEverywhere />}
        />
        {sessions.length > 0 ? (
          <ul className="divide-y divide-hairline">
            {sessions.map((session) => (
              <li key={session.id} className="px-5 py-3.5">
                <p className="truncate text-sm text-navy-900">
                  {describeAgent(session.userAgent)}
                </p>
                <p className="mt-0.5 text-xs text-ink-500">
                  {session.ip ?? 'Unknown address'} · last active {formatDateTime(session.lastSeenAt ?? session.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <CardBody>
            <p className="text-sm text-ink-500">No other active sessions.</p>
          </CardBody>
        )}
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-hairline p-4">
      <p className="text-xs text-ink-500">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-navy-900 tabular">{value}</p>
    </div>
  )
}

/** A readable device name rather than a raw user-agent string. */
function describeAgent(userAgent: string | null): string {
  if (!userAgent) return 'Unknown device'
  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /Chrome\//.test(userAgent)
      ? 'Chrome'
      : /Safari\//.test(userAgent)
        ? 'Safari'
        : /Firefox\//.test(userAgent)
          ? 'Firefox'
          : 'Browser'
  const platform = /Android/.test(userAgent)
    ? 'Android'
    : /iPhone|iPad/.test(userAgent)
      ? 'iOS'
      : /Mac OS X/.test(userAgent)
        ? 'macOS'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : 'Unknown platform'
  return `${browser} on ${platform}`
}
