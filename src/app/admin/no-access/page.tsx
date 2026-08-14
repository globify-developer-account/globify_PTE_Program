import Link from 'next/link'
import { ShieldOff } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'No access',
  description: 'You do not have permission to view this area.',
  path: '/admin/no-access',
  noIndex: true,
})

export default function NoAccessPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-ink-100 text-ink-500">
        <ShieldOff className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 text-xl font-semibold text-navy-900">You do not have access to that area</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        Your account does not hold the permission this page requires, or it has been deactivated. If you
        believe that is wrong, ask a Super Admin to review your role.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/admin">Back to admin</ButtonLink>
        <Link href="/dashboard" className="text-sm font-medium text-ink-500 hover:text-ink-700">
          Go to student view
        </Link>
      </div>
    </div>
  )
}
