import { Card, CardBody, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { requireStaff } from '@/lib/auth/guards'
import { prisma } from '@/lib/db'
import { PERMISSIONS, permissionsFor } from '@/lib/auth/permissions'
import { pageMetadata } from '@/lib/metadata'
import { formatDate, relativeTime } from '@/lib/utils'

export const metadata = pageMetadata({
  title: 'Team',
  description: 'Staff accounts and their permissions.',
  path: '/admin/team',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrator',
  CONTENT_MANAGER: 'Content Manager',
  TEACHER: 'Teacher',
}

export default async function AdminTeamPage() {
  await requireStaff('admins.manage')

  const team = await prisma.user.findMany({
    where: { role: { not: 'STUDENT' } },
    orderBy: [{ role: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      adminProfile: { select: { title: true, permissions: true, isActive: true } },
    },
  })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-navy-900">Team</h2>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-500">
          Roles carry a fixed set of permissions; individual grants can add to them but never remove.
          Every page and API route re-checks the permission it needs on the server.
        </p>
      </div>

      <Card>
        <CardHeader title={`${team.length} staff accounts`} />
        <DataTable
          rows={team}
          rowKey={(member) => member.id}
          empty={{ title: 'No staff accounts', description: 'Run the seed script to create an admin.' }}
          columns={[
            {
              key: 'name',
              header: 'Member',
              render: (member) => (
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{member.name}</p>
                  <p className="truncate text-xs text-ink-500">{member.email}</p>
                </div>
              ),
            },
            {
              key: 'role',
              header: 'Role',
              render: (member) => (
                <div>
                  <Badge tone={member.role === 'SUPER_ADMIN' ? 'navy' : 'brand'}>
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                  {member.adminProfile?.title ? (
                    <p className="mt-1 text-xs text-ink-500">{member.adminProfile.title}</p>
                  ) : null}
                </div>
              ),
            },
            {
              key: 'permissions',
              header: 'Permissions',
              secondary: true,
              render: (member) => {
                const count = permissionsFor(member.role, member.adminProfile?.permissions ?? []).size
                return (
                  <span className="text-sm text-ink-600 tabular">
                    {count} of {PERMISSIONS.length}
                  </span>
                )
              },
            },
            {
              key: 'lastLogin',
              header: 'Last sign-in',
              secondary: true,
              render: (member) => (
                <span className="text-xs text-ink-500">
                  {member.lastLoginAt ? relativeTime(member.lastLoginAt) : 'Never'}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (member) => (
                <Badge
                  tone={
                    member.status !== 'ACTIVE' || member.adminProfile?.isActive === false
                      ? 'danger'
                      : 'success'
                  }
                >
                  {member.status !== 'ACTIVE'
                    ? 'Suspended'
                    : member.adminProfile?.isActive === false
                      ? 'Deactivated'
                      : 'Active'}
                </Badge>
              ),
            },
            {
              key: 'joined',
              header: 'Joined',
              align: 'right',
              secondary: true,
              render: (member) => (
                <span className="text-xs text-ink-500">{formatDate(member.createdAt)}</span>
              ),
            },
          ]}
        />
      </Card>

      <Card>
        <CardHeader
          title="Permission reference"
          description="What each permission unlocks. Grants are additive on top of the role."
        />
        <CardBody>
          <div className="flex flex-wrap gap-2">
            {PERMISSIONS.map((permission) => (
              <span
                key={permission}
                className="rounded-md border border-hairline bg-ink-50 px-2 py-1 font-mono text-[11px] text-ink-600"
              >
                {permission}
              </span>
            ))}
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Staff accounts are created by a Super Admin directly in the database or through the seed script.
            Self-service invitation is intentionally not exposed — see docs/SETUP.md.
          </p>
        </CardBody>
      </Card>
    </div>
  )
}
