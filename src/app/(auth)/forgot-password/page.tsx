import { ForgotPasswordForm } from '@/components/auth/reset-forms'
import { pageMetadata } from '@/lib/metadata'

export const metadata = pageMetadata({
  title: 'Forgot password',
  description: 'Reset your Globify PTE Premium password.',
  path: '/forgot-password',
  noIndex: true,
})

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />
}
