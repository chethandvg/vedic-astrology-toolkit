// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { motion } from 'motion/react'
import { RadioGroup } from 'radix-ui'
import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: ReactNode
  icon?: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onValueChange: (value: T) => void
  options: readonly SegmentOption<T>[]
  'aria-label'?: string
  'aria-labelledby'?: string
  size?: 'sm' | 'md'
  /** Stretch segments to fill the row. */
  fullWidth?: boolean
  className?: string
}

/** A radio group drawn as a pill switcher; arrow keys move between options. */
export function SegmentedControl<T extends string>({
  value, onValueChange, options, size = 'md', fullWidth = false, className, ...aria
}: SegmentedControlProps<T>) {
  const thumbId = useId()
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={(v) => onValueChange(v as T)}
      orientation="horizontal"
      className={cn(
        'relative isolate rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] p-1',
        fullWidth ? 'flex w-full' : 'inline-flex max-w-full',
        className,
      )}
      {...aria}
    >
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'relative inline-flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full font-medium text-[var(--text-muted)] transition-colors hover:text-[var(--text)] data-[state=checked]:text-[var(--accent-text)] focus-visible:outline-offset-0 [&_svg]:size-4 [&_svg]:shrink-0',
            size === 'md' ? 'h-11 px-2.5 text-sm sm:px-4' : 'h-8 px-3 text-[0.8rem]',
            options.length > 2 && 'max-sm:[&_svg]:hidden',
          )}
        >
          {value === o.value && (
            <motion.span
              layoutId={thumbId}
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full bg-[var(--selected-bg)] shadow-sm ring-1 ring-[var(--accent)]/45"
              transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
            />
          )}
          {o.icon}
          <span className="truncate">{o.label}</span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
