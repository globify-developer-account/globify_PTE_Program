import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/auth/login-form'
import { Skeleton } from '@/components/ui/states'
import { getCurrentUser, isStaffRole } from '@/lib/auth/session'
import { googleEnabled } from '@/lib/auth/google'
import { pageMetadata } from '@/lib/metadata'

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'Login',
  description: 'Sign in to Globify PTE Premium to continue your PTE preparation.',
  path: '/login',
})

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(isStaffRole(user.role) && user.role !== 'STUDENT' ? '/admin' : '/dashboard')

  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <LoginForm googleEnabled={googleEnabled()} />
    </Suspense>
  )
}
