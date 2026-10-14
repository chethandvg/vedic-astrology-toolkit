// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SectionHeaderProps {
  /** Small label above the title. */
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  /** Right-aligned controls, wrapped below the text on phones. */
  action?: ReactNode
  /** Heading level; pages use 1 once, sections 2. */
  level?: 1 | 2 | 3
  align?: 'left' | 'center'
  className?: string
  id?: string
}

const SIZES = {
  1: 'text-3xl sm:text-4xl lg:text-[2.75rem]',
  2: 'text-2xl sm:text-3xl',
  3: 'text-xl sm:text-2xl',
}

export function SectionHeader({ eyebrow, title, description, action, level = 2, align = 'left', className, id }: SectionHeaderProps) {
  const Heading = `h${level}` as const
  const centered = align === 'center'
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between', centered && 'items-center text-center sm:flex-col sm:items-center', className)}>
      <div className={cn('max-w-2xl', centered && 'mx-auto')}>
        {eyebrow && <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">{eyebrow}</p>}
        <Heading id={id} className={cn('text-balance font-display font-semibold leading-[1.1] tracking-tight', SIZES[level])}>{title}</Heading>
        {description && <p className="mt-3 text-pretty text-[0.95rem] leading-relaxed text-[var(--text-muted)] sm:text-base">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  )
}
