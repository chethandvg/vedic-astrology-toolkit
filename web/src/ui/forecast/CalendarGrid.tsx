// A month of days as an ARIA grid (Sunday first) with one tab stop: arrows move by day and
// week, Home and End to the week's ends, Page Up and Page Down by month, Enter or Space picks.
// Shared by the month heatmap and the date picker.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useEffect, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { addDays, addMonths, weekdayOf } from '@/engine/time'
import { cn } from '@/lib/cn'
import { dateParts, longDate, monthWeeks, periodEnd, periodStart, weekdayLong, weekdayNarrow } from './dates'

export interface DayLook {
  /** Accessible name; defaults to the long date. */
  label?: string
  className?: string
  style?: CSSProperties
  children?: ReactNode
}

export interface CalendarGridProps {
  /** Any date in the month shown. */
  month: string
  /** The day holding the grid's single tab stop. */
  focusDate: string
  onFocusDateChange: (date: string) => void
  onSelect: (date: string) => void
  /** Accessible name of the grid, e.g. "October 2026". */
  label: string
  selected?: string
  today?: string
  /** 'clamp' keeps keyboard focus inside the month; 'follow' lets it leave (the parent then shows the new month). */
  edge?: 'clamp' | 'follow'
  /** Focus the tab stop when the grid mounts (a picker that just opened). */
  autoFocus?: boolean
  renderDay?: (date: string) => DayLook
  className?: string
  cellClassName?: string
}

const STEP: Record<string, (d: string) => string> = {
  ArrowLeft: (d) => addDays(d, -1),
  ArrowRight: (d) => addDays(d, 1),
  ArrowUp: (d) => addDays(d, -7),
  ArrowDown: (d) => addDays(d, 7),
  Home: (d) => addDays(d, -weekdayOf(d)),
  End: (d) => addDays(d, 6 - weekdayOf(d)),
  PageUp: (d) => addMonths(d, -1),
  PageDown: (d) => addMonths(d, 1),
}

export function CalendarGrid({
  month, focusDate, onFocusDateChange, onSelect, label, selected, today, edge = 'clamp', autoFocus, renderDay, className, cellClassName,
}: CalendarGridProps) {
  const ref = useRef<HTMLTableElement>(null)
  const first = periodStart('month', month)
  const last = periodEnd('month', first)
  const weeks = monthWeeks(first)
  const stop = focusDate >= first && focusDate <= last ? focusDate : selected && selected >= first && selected <= last ? selected : first

  // Keep DOM focus on the tab stop while the grid has focus (arrow keys), or on mount when asked.
  const mounted = useRef(false)
  useEffect(() => {
    const table = ref.current
    if (!table) return
    if ((autoFocus && !mounted.current) || table.contains(document.activeElement)) {
      table.querySelector<HTMLButtonElement>(`[data-date="${stop}"]`)?.focus()
    }
    mounted.current = true
  }, [stop, autoFocus])

  function onKeyDown(e: KeyboardEvent<HTMLTableElement>) {
    const step = STEP[e.key]
    if (!step) return
    e.preventDefault()
    let next = step(stop)
    if (edge === 'clamp') next = next < first ? first : next > last ? last : next
    if (next !== stop) onFocusDateChange(next)
  }

  return (
    <table ref={ref} role="grid" aria-label={label} className={cn('w-full table-fixed border-separate', className)} onKeyDown={onKeyDown}>
      <thead>
        <tr>
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <th key={i} scope="col" abbr={weekdayLong(i)} className="pb-2 text-center text-[0.7rem] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <span aria-hidden>{weekdayNarrow(i)}</span>
              <span className="sr-only">{weekdayLong(i)}</span>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {weeks.map((week, w) => (
          <tr key={w}>
            {week.map((date, i) => {
              if (!date) return <td key={`blank-${i}`} aria-hidden className={cellClassName} />
              const look = renderDay?.(date) ?? {}
              const isSelected = date === selected
              return (
                <td key={date} className={cellClassName} aria-selected={isSelected}>
                  <button
                    type="button"
                    data-date={date}
                    tabIndex={date === stop ? 0 : -1}
                    aria-label={look.label ?? longDate(date)}
                    aria-current={date === today ? 'date' : undefined}
                    onClick={() => {
                      onFocusDateChange(date)
                      onSelect(date)
                    }}
                    className={cn(
                      'relative flex w-full items-center justify-center rounded-xl text-sm tabular-nums transition-[background-color,box-shadow,transform] focus-visible:z-10 focus-visible:outline-offset-1 active:scale-95',
                      look.className,
                    )}
                    style={look.style}
                  >
                    {look.children ?? dateParts(date).day}
                  </button>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
