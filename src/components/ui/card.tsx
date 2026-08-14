import { cn } from '@/lib/utils'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('surface-card', className)} {...props} />
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-hairline px-5 py-4', className)}>
      <div className="min-w-0">
        <h3 className="text-[15px] font-semibold text-navy-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-ink-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-5', className)} {...props} />
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-3 border-t border-hairline bg-ink-50/60 px-5 py-3.5', className)} {...props} />
  )
}
