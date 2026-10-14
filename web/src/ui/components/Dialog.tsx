// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  /** 'center' is a modal card; 'sheet' slides up from the bottom on phones. */
  variant?: 'center' | 'sheet'
  hideClose?: boolean
}

export function DialogContent({ className, children, variant = 'center', hideClose = false, ...props }: DialogContentProps) {
  const { t } = useT()
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="overlay fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[3px]" />
      <DialogPrimitive.Content
        className={cn(
          'glass fixed z-50 bg-[var(--bg)] text-[var(--text)] focus-visible:outline-none',
          variant === 'sheet'
            ? 'sheet inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[1.5rem] px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[var(--radius-card)] sm:p-6'
            : 'pop left-1/2 top-1/2 max-h-[88dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[var(--radius-card)] p-6',
          className,
        )}
        {...props}
      >
        {variant === 'sheet' && <div aria-hidden className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--surface-3)] sm:hidden" />}
        {children}
        {!hideClose && (
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2" aria-label={t('common.close')}>
              <X />
            </Button>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn('pr-10 font-display text-xl font-semibold tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn('mt-2 text-sm leading-relaxed text-[var(--text-muted)]', className)} {...props} />
}

export function DialogFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}>{children}</div>
}
