// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border font-medium [&_svg]:shrink-0',
  {
    variants: {
      tone: {
        neutral: 'border-[var(--surface-border)] bg-[var(--surface-2)] text-[var(--text-muted)]',
        accent: 'border-[var(--accent-soft)] bg-[var(--accent-soft)] text-[var(--accent-text)]',
        good: 'border-[var(--good-border)] bg-[var(--good-bg)] text-[var(--good-fg)]',
        mixed: 'border-[var(--mixed-border)] bg-[var(--mixed-bg)] text-[var(--mixed-fg)]',
        bad: 'border-[var(--bad-border)] bg-[var(--bad-bg)] text-[var(--bad-fg)]',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs [&_svg]:size-3.5',
        md: 'px-2.5 py-1 text-[0.8rem] [&_svg]:size-4',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
)

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export function Badge({ className, tone, size, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size }), className)} {...props} />
}
