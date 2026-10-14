// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Standard page column with responsive gutters (16 px on phones). */
export function Page({ children, width = 'wide', className }: { children: ReactNode; width?: 'wide' | 'narrow'; className?: string }) {
  return (
    <div className={cn('mx-auto w-full px-4 pb-10 pt-6 sm:px-6 sm:pt-10', width === 'narrow' ? 'max-w-3xl' : 'max-w-6xl', className)}>
      {children}
    </div>
  )
}
