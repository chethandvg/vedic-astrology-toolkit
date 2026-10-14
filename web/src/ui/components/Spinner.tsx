// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { LoaderCircle } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'

export function Spinner({ className, label }: { className?: string; label?: string }) {
  const { t } = useT()
  return (
    <span role="status" className="inline-flex items-center">
      <LoaderCircle aria-hidden className={cn('size-5 animate-spin text-[var(--accent-text)]', className)} />
      <span className="sr-only">{label ?? t('common.loading')}</span>
    </span>
  )
}

/** Placeholder block with a soft shimmer while content loads. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden className={cn('skeleton rounded-xl', className)} {...props} />
}
