// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const buttonVariants = cva(
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-[background-color,box-shadow,color,filter,transform] duration-200 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[1.15em] [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'btn-primary hover:brightness-[1.07]',
        secondary: 'border border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--hover)]',
        ghost: 'text-[var(--text-muted)] hover:bg-[var(--hover)] hover:text-[var(--text)]',
        danger: 'border border-[var(--bad-border)] bg-[var(--bad-bg)] text-[var(--bad-fg)] hover:brightness-110',
      },
      size: {
        sm: 'h-9 px-3.5 text-sm',
        md: 'h-11 px-5 text-[0.95rem]',
        lg: 'h-12 px-7 text-base sm:h-13',
        icon: 'size-11 [&_svg]:size-5',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps extends ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /** Style the single child (for example a router Link) as the button. */
  asChild?: boolean
}

export function Button({ className, variant, size, asChild = false, type = 'button', ...props }: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className)
  if (asChild) return <Slot.Root className={classes} {...props} />
  return <button type={type} className={classes} {...props} />
}
