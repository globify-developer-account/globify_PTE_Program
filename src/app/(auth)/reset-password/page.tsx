import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-forms'
import { Skeleton } from '@/components/ui/states'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Reset password',
  description: 'Choose a new password for your Globify PTE Premium account.',
  path: '/reset-password',
  noIndex: true,
})

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<Skeleton className="h-80 w-full" />}>
      <ResetPasswordForm />
    </Suspense>
  )
}
