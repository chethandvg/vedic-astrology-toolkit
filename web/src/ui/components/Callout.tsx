// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CircleAlert, Info, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const TONES = {
  info: { icon: Info, box: 'border-[var(--surface-border)] bg-[var(--surface-2)]', iconClass: 'text-[var(--accent-text)]' },
  warning: { icon: TriangleAlert, box: 'border-[var(--mixed-border)] bg-[var(--mixed-bg)]', iconClass: 'text-[var(--mixed-fg)]' },
  error: { icon: CircleAlert, box: 'border-[var(--bad-border)] bg-[var(--bad-bg)]', iconClass: 'text-[var(--bad-fg)]' },
}

/** An inline note: info for tips, warning for things to double-check, error for blocking problems. */
export function Callout({ tone = 'info', title, children, className }: { tone?: keyof typeof TONES; title?: ReactNode; children: ReactNode; className?: string }) {
  const { icon: Icon, box, iconClass } = TONES[tone]
  return (
    <div className={cn('flex gap-3 rounded-2xl border p-3.5 text-sm leading-relaxed', box, className)} role={tone === 'error' ? 'alert' : undefined}>
      <Icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', iconClass)} />
      <div className="min-w-0 text-[var(--text)]">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn(title && 'mt-0.5', 'text-[var(--text-muted)]')}>{children}</div>
      </div>
    </div>
  )
}
