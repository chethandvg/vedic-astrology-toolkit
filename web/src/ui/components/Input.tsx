// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Label as LabelPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Shared text-field look (also used by Select and the place search). */
export const inputClass =
  'h-11 w-full min-w-0 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 text-[0.95rem] text-[var(--text)] shadow-[inset_0_1px_2px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--text-muted)] hover:border-[var(--text-muted)] focus-visible:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring)] disabled:opacity-50 aria-[invalid=true]:border-[var(--bad-fg)] aria-[invalid=true]:focus-visible:ring-[var(--focus-ring-bad)]'

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClass, className)} {...props} />
}

export function Label({ className, ...props }: ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn('text-sm font-medium text-[var(--text)]', className)} {...props} />
}

/** Props a control needs to be described by its field's hint and error. */
export interface FieldControlProps {
  id: string
  'aria-invalid': boolean | undefined
  'aria-describedby': string | undefined
}

export interface FieldProps {
  id: string
  label: ReactNode
  /** Shown under the control; replaced by the error when there is one. */
  hint?: ReactNode
  error?: string
  /** Marks the label "(optional)". */
  optional?: boolean
  className?: string
  children: (control: FieldControlProps) => ReactNode
}

/** Label, control, hint and error wired together for screen readers. */
export function Field({ id, label, hint, error, optional, className, children }: FieldProps) {
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-[var(--text-muted)]">(optional)</span>}
      </Label>
      {children({ id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error ? (
        <p id={`${id}-error`} className="text-[0.8rem] leading-snug text-[var(--bad-fg)]">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-[0.8rem] leading-snug text-[var(--text-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
