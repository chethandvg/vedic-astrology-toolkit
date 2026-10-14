// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { ChevronDown } from 'lucide-react'
import { Collapsible } from 'radix-ui'
import type { ReactNode } from 'react'

export interface DisclosureProps {
  title: ReactNode
  children: ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  className?: string
}

/** A show/hide section for optional detail, such as advanced form fields. */
export function Disclosure({ title, children, open, defaultOpen, onOpenChange, className }: DisclosureProps) {
  return (
    <Collapsible.Root open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} className={className}>
      <Collapsible.Trigger className="group flex min-h-11 w-full items-center justify-between gap-3 rounded-xl text-left text-sm font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
        {title}
        <ChevronDown aria-hidden className="size-4 shrink-0 transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </Collapsible.Trigger>
      <Collapsible.Content>{children}</Collapsible.Content>
    </Collapsible.Root>
  )
}
