// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  icon: LucideIcon
  title: ReactNode
  description?: ReactNode
  /** Buttons or links. */
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('glass flex flex-col items-center rounded-[var(--radius-card)] px-6 py-12 text-center sm:py-16', className)}>
      <div className="relative mb-5 chip grid size-16 place-items-center rounded-2xl">
        <Icon aria-hidden className="size-7" strokeWidth={1.6} />
      </div>
      <h2 className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--text-muted)] sm:text-base">{description}</p>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}
