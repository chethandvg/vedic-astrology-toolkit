// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

/** Frosted-glass surface. Add `interactive` for cards that act as links. */
export function Card({ className, interactive = false, ...props }: ComponentProps<'div'> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        'glass rounded-[var(--radius-card)] p-5 sm:p-6',
        interactive && 'transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:shadow-[var(--shadow-glow)]',
        className,
      )}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('font-display text-lg font-semibold tracking-tight text-[var(--text)]', className)} {...props} />
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-sm leading-relaxed text-[var(--text-muted)]', className)} {...props} />
}
