// Previous / next / back-to-now controls for a forecast period, with a popover picker
// (days for the day and week views, months for the month view, years for the year view).
// Left and Right arrow keys anywhere in the group step the period.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Popover } from 'radix-ui'
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { addMonths } from '@/engine/time'
import type { Horizon } from '@/engine/types'
import { t, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/Button'
import { CalendarGrid } from './CalendarGrid'
import { dateParts, isoDate, monthLong, monthShort, periodEnd, periodShortLabel, periodStart, shiftDate } from './dates'
import type { ForecastDate } from './useForecastDate'

const UNIT = { day: 'unit.day', week: 'unit.week', month: 'unit.month', year: 'unit.year' } as const
const BACK = { day: 'rel.today', week: 'rel.thisWeek', month: 'rel.thisMonth', year: 'rel.thisYear' } as const

const iconButton = 'grid size-10 shrink-0 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--hover)] hover:text-[var(--text)] focus-visible:outline-offset-0 [&_svg]:size-5'

export function DateNavigator({ horizon, nav, className }: { horizon: Horizon; nav: ForecastDate; className?: string }) {
  useT()
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const step = (n: number) => nav.setDate(shiftDate(horizon, nav.date, n))
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    // React bubbles events out of the portalled picker too; only keys pressed on the group itself count.
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.defaultPrevented || !e.currentTarget.contains(e.target as Node)) return
    e.preventDefault()
    step(e.key === 'ArrowLeft' ? -1 : 1)
  }
  return (
    // On the narrowest phones the back-to-now button wraps under the stepper rather than squeezing its label.
    <div role="group" aria-label={t('nav.choose', { unit: t(UNIT[horizon]) })} className={cn('flex flex-wrap items-center gap-2', className)} onKeyDown={onKeyDown}>
      <div className="flex min-w-[13rem] flex-1 items-center rounded-full border border-[var(--surface-border)] bg-[var(--surface-2)] p-0.5 sm:flex-none">
        <button type="button" className={iconButton} aria-label={t('nav.previous', { unit: t(UNIT[horizon]) })} aria-keyshortcuts="ArrowLeft" onClick={() => step(-1)}>
          <ChevronLeft aria-hidden />
        </button>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger
            ref={trigger}
            className="flex h-10 min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--hover)] focus-visible:outline-offset-0 data-[state=open]:bg-[var(--hover)] sm:min-w-[9.5rem]"
            aria-label={t('nav.pick', { label: periodShortLabel(horizon, nav.anchor), unit: t(UNIT[horizon]) })}
          >
            <CalendarDays aria-hidden className="size-4 shrink-0 text-[var(--accent-text)]" />
            <span className="truncate tabular-nums">{periodShortLabel(horizon, nav.anchor)}</span>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="center"
              sideOffset={8}
              collisionPadding={12}
              // Each picker focuses its selected day, month or year itself rather than the first button.
              onOpenAutoFocus={(e) => e.preventDefault()}
              className="pop glass z-50 w-[20rem] max-w-[calc(100vw-1.5rem)] rounded-2xl bg-[var(--bg)] p-3"
            >
              <Picker
                horizon={horizon}
                nav={nav}
                onPick={(d) => {
                  nav.setDate(d)
                  setOpen(false)
                }}
              />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <button type="button" className={iconButton} aria-label={t('nav.next', { unit: t(UNIT[horizon]) })} aria-keyshortcuts="ArrowRight" onClick={() => step(1)}>
          <ChevronRight aria-hidden />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {!nav.isCurrent && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.16 }}>
            <Button
              variant="secondary" size="sm" className="h-11 px-4"
              onClick={() => {
                nav.setDate(null)
                // This button disappears once the current period shows; keep keyboard focus in the navigator.
                trigger.current?.focus()
              }}
            >
              {t(BACK[horizon])}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PickerHeader({ title, onPrev, onNext, prevLabel, nextLabel }: { title: ReactNode; onPrev: () => void; onNext: () => void; prevLabel: string; nextLabel: string }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <button type="button" className={iconButton} aria-label={prevLabel} onClick={onPrev}><ChevronLeft aria-hidden /></button>
      <p className="font-display text-base font-semibold" aria-live="polite">{title}</p>
      <button type="button" className={iconButton} aria-label={nextLabel} onClick={onNext}><ChevronRight aria-hidden /></button>
    </div>
  )
}

const choice = (selected: boolean, current: boolean) => cn(
  'h-11 rounded-xl text-sm font-medium transition-colors focus-visible:outline-offset-0',
  selected ? 'bg-[var(--accent)] text-[var(--accent-contrast)]' : 'text-[var(--text)] hover:bg-[var(--hover)]',
  current && !selected && 'ring-1 ring-inset ring-[var(--accent)]',
)

function Picker({ horizon, nav, onPick }: { horizon: Horizon; nav: ForecastDate; onPick: (date: string) => void }) {
  const [focus, setFocus] = useState(nav.date)
  const [view, setView] = useState(nav.date)
  const { year } = dateParts(view)
  const todayParts = dateParts(nav.today)
  const selected = dateParts(nav.date)

  if (horizon === 'year') {
    const first = year - 5
    return (
      <div>
        <PickerHeader
          title={`${first} – ${first + 11}`} prevLabel={t('nav.earlierYears')} nextLabel={t('nav.laterYears')}
          onPrev={() => setView(shiftDate('year', view, -12))} onNext={() => setView(shiftDate('year', view, 12))}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => first + i).map((y) => (
            <button
              key={y} type="button" className={choice(y === selected.year, y === todayParts.year)} aria-pressed={y === selected.year}
              autoFocus={y === selected.year} onClick={() => onPick(isoDate(y, 1, 1))}
            >
              {y}
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (horizon === 'month') {
    return (
      <div>
        <PickerHeader
          title={year} prevLabel={t('nav.previous', { unit: t('unit.year') })} nextLabel={t('nav.next', { unit: t('unit.year') })}
          onPrev={() => setView(shiftDate('year', view, -1))} onNext={() => setView(shiftDate('year', view, 1))}
        />
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => monthShort(i + 1)).map((m, i) => {
            const isSel = year === selected.year && i + 1 === selected.month
            return (
              <button
                key={m} type="button" aria-label={`${monthLong(i + 1)} ${year}`} aria-pressed={isSel} autoFocus={isSel}
                className={choice(isSel, year === todayParts.year && i + 1 === todayParts.month)}
                onClick={() => onPick(isoDate(year, i + 1, 1))}
              >
                {m}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  const weekStart = periodStart('week', nav.date)
  const weekEnd = periodEnd('week', weekStart)
  return (
    <div>
      <PickerHeader
        title={`${monthLong(dateParts(view).month)} ${year}`} prevLabel={t('nav.previous', { unit: t('unit.month') })} nextLabel={t('nav.next', { unit: t('unit.month') })}
        onPrev={() => setView(addMonths(view, -1))} onNext={() => setView(addMonths(view, 1))}
      />
      <CalendarGrid
        month={view}
        focusDate={focus}
        onFocusDateChange={(d) => {
          setFocus(d)
          setView(d)
        }}
        onSelect={onPick}
        label={`${monthLong(dateParts(view).month)} ${year}`}
        selected={nav.date}
        today={nav.today}
        edge="follow"
        autoFocus
        cellClassName="p-0.5"
        renderDay={(d) => {
          const inWeek = horizon === 'week' && d >= weekStart && d <= weekEnd
          return {
            className: cn(
              'h-10',
              d === nav.date ? 'bg-[var(--accent)] font-semibold text-[var(--accent-contrast)]'
                : inWeek ? 'bg-[var(--accent-soft)] text-[var(--text)]' : 'text-[var(--text)] hover:bg-[var(--hover)]',
              d === nav.today && d !== nav.date && 'ring-1 ring-inset ring-[var(--accent)]',
            ),
          }
        }}
      />
    </div>
  )
}
