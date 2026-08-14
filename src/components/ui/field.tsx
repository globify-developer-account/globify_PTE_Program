'use client'

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const controlClass =
  'w-full rounded-lg border border-hairline bg-white px-3.5 py-2.5 text-sm text-navy-900 shadow-[inset_0_1px_2px_rgb(11_21_51/0.03)] transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-500/10 disabled:bg-ink-50 disabled:text-ink-400'

const errorClass = 'border-danger focus:border-danger focus:ring-danger/10'

interface FieldShellProps {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  required?: boolean
  htmlFor?: string
  children: ReactNode
  className?: string
}

export function FieldShell({ label, hint, error, required, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-900">
          {label}
          {required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-sm text-ink-500">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  wrapperClassName?: string
  leading?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className, wrapperClassName, leading, id, required, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={wrapperClassName}
    >
      <div className="relative">
        {leading ? (
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 [&_svg]:size-4">
            {leading}
          </span>
        ) : null}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={cn(controlClass, leading && 'pl-9', error && errorClass, className)}
          {...props}
        />
      </div>
    </FieldShell>
  )
})

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  /** Applied to the wrapper — use for grid spans, not for styling the control. */
  wrapperClassName?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, className, wrapperClassName, id, required, ...props },
  ref,
) {
  const generatedId = useId()
  const textareaId = id ?? generatedId
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={textareaId}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={textareaId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, 'min-h-28 resize-y leading-relaxed', error && errorClass, className)}
        {...props}
      />
    </FieldShell>
  )
})

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode
  hint?: ReactNode
  error?: string | null
  /** Applied to the wrapper — use for grid spans, not for styling the control. */
  wrapperClassName?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, wrapperClassName, id, required, children, ...props },
  ref,
) {
  const generatedId = useId()
  const selectId = id ?? generatedId
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={selectId}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={selectId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(controlClass, 'appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 20 20\' fill=\'%2364748b\'><path d=\'M5.5 7.5 10 12l4.5-4.5\' stroke=\'%2364748b\' stroke-width=\'1.6\' fill=\'none\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/></svg>")] bg-[length:18px] bg-[right_0.75rem_center] bg-no-repeat pr-10', error && errorClass, className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  )
})

export function Checkbox({
  label,
  description,
  className,
  id,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; description?: ReactNode }) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={checkboxId}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-ink-300 text-brand-600 accent-brand-600 focus:ring-brand-500/30"
        {...props}
      />
      <label htmlFor={checkboxId} className="text-sm text-ink-700">
        <span className="font-medium text-navy-900">{label}</span>
        {description ? <span className="mt-0.5 block text-ink-500">{description}</span> : null}
      </label>
    </div>
  )
}
