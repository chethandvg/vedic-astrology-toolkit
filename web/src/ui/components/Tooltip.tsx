// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import type { ReactElement, ReactNode } from 'react'

/** Wrap the app once so tooltips share open/close delays. */
export function TooltipProvider({ children }: { children: ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={300} skipDelayDuration={200}>{children}</TooltipPrimitive.Provider>
}

export interface TooltipProps {
  content: ReactNode
  /** A single focusable element; the tooltip also opens on keyboard focus. */
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="tip z-50 max-w-64 rounded-lg border border-[var(--surface-border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs leading-snug text-[var(--text)] shadow-lg"
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-[var(--bg)]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
