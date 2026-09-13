import { Suspense } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { RegisterForm } from '@/components/auth/register-form'
import { Skeleton } from '@/components/ui/states'
import { getCurrentUser } from '@/lib/auth/session'
import { enabledOAuthProviders } from '@/lib/auth/oauth'
import { pageMetadata } from '@/lib/metadata'
import { getSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export const metadata = pageMetadata({
  title: 'Create account',
  description:
    'Create a free Globify PTE Premium account and start practising with AI-assisted scoring across Speaking, Writing, Reading and Listening.',
  path: '/register',
})

export default async function RegisterPage() {
  const user = await getCurrentUser()
  if (user) redirect('/dashboard')

  const settings = await getSettings()
  if (!settings.registrationEnabled) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-navy-900">Registrations are paused</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
          We are not accepting new accounts at the moment. Contact our team and we will set your account up
          manually.
        </p>
        <Link href="/contact" className="mt-6 inline-block font-medium text-brand-600 hover:underline">
          Contact us
        </Link>
      </div>
    )
  }

  return (
    <Suspense fallback={<Skeleton className="h-[32rem] w-full" />}>
      <RegisterForm oauthProviders={enabledOAuthProviders()} />
    </Suspense>
  )
}
