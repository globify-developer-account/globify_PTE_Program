import Link from 'next/link'
import { ArrowLeft, BarChart3, Mic, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/layout/logo'
import { siteConfig } from '@/lib/site'

const HIGHLIGHTS = [
  {
    icon: <Mic />,
    title: 'AI scoring on every response',
    body: 'Speaking and writing tasks come back with a trait-by-trait breakdown, not just a number.',
  },
  {
    icon: <BarChart3 />,
    title: 'Progress you can actually read',
    body: 'Score trend, accuracy by task type, and the exact gap to your target score.',
  },
  {
    icon: <ShieldCheck />,
    title: 'Your data stays yours',
    body: 'Recordings are stored privately and never used to identify you with our AI providers.',
  },
]

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col px-6 py-8 sm:px-10">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-brand-600"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Back to site
          </Link>
        </div>

        <main id="main" className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-ink-400">
          <Link href="/terms" className="hover:text-ink-600">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-ink-600">
            Privacy
          </Link>
          <Link href="/ai-disclaimer" className="hover:text-ink-600">
            AI Disclaimer
          </Link>
          <span>
            © {new Date().getFullYear()} {siteConfig.company}
          </span>
        </footer>
      </div>

      <aside className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="grid-veil absolute inset-0 opacity-70" aria-hidden />
        <div
          className="absolute -right-32 top-1/4 size-[30rem] rounded-full bg-brand-600/25 blur-3xl"
          aria-hidden
        />

        <div className="relative flex h-full flex-col justify-center px-14 py-16">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-300">
            {siteConfig.product}
          </p>
          <h2 className="mt-4 max-w-md text-[34px] font-bold leading-tight tracking-tight text-white">
            {siteConfig.tagline}
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-navy-200">
            {siteConfig.promise}
          </p>

          <ul className="mt-12 max-w-md space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span
                  className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/8 text-brand-200 [&_svg]:size-[18px]"
                  aria-hidden
                >
                  {item.icon}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-navy-300">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
