import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ShieldCheck } from 'lucide-react'
import { LoginForm } from '@/components/auth/login-form'
import { Logo } from '@/components/layout/logo'
import { Skeleton } from '@/components/ui/states'
import { getCurrentUser, isStaffRole } from '@/lib/auth/session'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Admin sign in',
  description: 'Sign in to the Globify PTE Premium administration area.',
  path: '/admin/login',
  noIndex: true,
})

export const dynamic = 'force-dynamic'

export default async function AdminLoginPage() {
  const user = await getCurrentUser()
  if (user && isStaffRole(user.role)) redirect('/admin')

  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo href="/" tone="light" showProduct={false} />
          <h1 className="mt-5 text-xl font-semibold text-white">Administration</h1>
          <p className="mt-1.5 text-sm text-navy-100/70">
            Staff access only. Student accounts should sign in at the main login page.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lift">
          <Suspense fallback={<Skeleton className="h-72 w-full" />}>
            <LoginForm hideSignUp />
          </Suspense>
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-xs text-navy-100/60">
          <ShieldCheck className="size-3.5" aria-hidden />
          All administrative actions are recorded in the audit log.
        </p>
      </div>
    </div>
  )
}
