// Section headings and titled cards used across the forecast screens.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function SectionTitle({ id, children, description, action, className }: { id?: string; children: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2', className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-xl font-semibold tracking-tight sm:text-2xl">{children}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </div>
      {action}
    </div>
  )
}

/** A glass card with a heading; `action` sits at the heading's right. */
export function Panel({ title, description, action, children, className, icon }: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('glass rounded-[var(--radius-card)] p-4 sm:p-6', className)}>
      {/* The action drops under the title when they would squeeze each other (320 px phones). */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 basis-40 items-center gap-2.5">
          {icon && <span aria-hidden className="chip grid size-8 shrink-0 place-items-center rounded-xl [&_svg]:size-4">{icon}</span>}
          <div className="min-w-0">
            <h2 id={id} className="font-display text-lg font-semibold tracking-tight">{title}</h2>
            {description && <p className="text-[0.8rem] leading-snug text-[var(--text-muted)]">{description}</p>}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
