import { cva, type VariantProps } from 'class-variance-authority'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-[background-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-55 active:translate-y-px [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-brand-600 text-white shadow-[0_1px_2px_rgb(11_21_51/0.12)] hover:bg-brand-700 hover:shadow-ring',
        navy: 'bg-navy-900 text-white hover:bg-navy-800',
        secondary: 'bg-white text-navy-900 border border-hairline hover:border-brand-200 hover:bg-brand-50/60',
        ghost: 'text-ink-600 hover:bg-ink-100 hover:text-navy-900',
        outline: 'border border-brand-200 text-brand-700 hover:bg-brand-50',
        danger: 'bg-danger text-white hover:bg-red-700',
        success: 'bg-success text-white hover:bg-green-700',
        link: 'text-brand-600 underline-offset-4 hover:underline p-0 h-auto',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm [&_svg]:size-4',
        md: 'h-11 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-6 text-base [&_svg]:size-5',
        icon: 'h-10 w-10 [&_svg]:size-4',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
)

type BaseProps = VariantProps<typeof buttonVariants> & {
  loading?: boolean
  className?: string
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, BaseProps {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, loading, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </button>
  )
})

export interface ButtonLinkProps extends BaseProps {
  href: string
  children: React.ReactNode
  prefetch?: boolean
  target?: string
  rel?: string
  'aria-label'?: string
}

export function ButtonLink({ href, className, variant, size, block, children, ...props }: ButtonLinkProps) {
  return (
    <Link href={href} className={cn(buttonVariants({ variant, size, block }), className)} {...props}>
      {children}
    </Link>
  )
}

export { buttonVariants }
