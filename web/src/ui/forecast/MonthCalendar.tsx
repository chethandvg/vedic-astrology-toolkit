// A month as a heatmap: each day tinted by its rating (with an icon, never colour alone);
// arrows move between days and Enter opens the day.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useState, type CSSProperties } from 'react'
import { useLocation } from 'wouter'
import type { Forecast, Rating } from '@/engine/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { CalendarGrid } from './CalendarGrid'
import { dateParts, longDate, monthLong, periodEnd } from './dates'
import { RATING_ICON, RATING_TONE, RATING_WORD, scorePercent, TONE_VARS } from './meta'
import { forecastRoute } from './useForecastDate'

export interface MonthCalendarProps {
  /** Daily forecasts of the month. */
  parts: readonly Forecast[]
  /** First day of the month. */
  month: string
  profileId: string
  today: string
  selected?: string
  className?: string
}

const inside = (d: string | undefined, first: string, last: string): d is string => !!d && d >= first && d <= last

export function MonthCalendar({ parts, month, profileId, today, selected, className }: MonthCalendarProps) {
  const { t } = useT()
  const [, navigate] = useLocation()
  const last = periodEnd('month', month)
  const [focus, setFocus] = useState(() => (inside(selected, month, last) ? selected : inside(today, month, last) ? today : month))
  const byDate = new Map(parts.map((p) => [p.start, p]))
  const { year, month: m } = dateParts(month)
  return (
    <div className={className}>
      <CalendarGrid
        month={month}
        focusDate={inside(focus, month, last) ? focus : month}
        onFocusDateChange={setFocus}
        onSelect={(d) => navigate(forecastRoute(profileId, 'today', d))}
        label={t('month.gridAria', { month: `${monthLong(m)} ${year}` })}
        selected={inside(selected, month, last) ? selected : undefined}
        today={today}
        cellClassName="p-[3px] sm:p-1"
        renderDay={(d) => {
          const p = byDate.get(d)
          if (!p) return { className: 'aspect-square text-[var(--text-muted)]' }
          const tone = TONE_VARS[RATING_TONE[p.rating]]
          const Icon = RATING_ICON[p.rating]
          const isToday = d === today
          return {
            label: t('month.dayAria', { date: `${longDate(d)}${isToday ? `, ${t('common.today')}` : ''}`, rating: RATING_WORD[p.rating], pct: scorePercent(p.score) }),
            className: cn(
              'aspect-square flex-col gap-0.5 font-semibold ring-1 ring-inset hover:brightness-110',
              d === selected && 'shadow-[0_0_0_2px_var(--accent)]',
            ),
            style: { background: tone.bg, color: 'var(--text)', '--tw-ring-color': isToday ? 'var(--accent)' : tone.border } as CSSProperties,
            children: (
              <>
                <span className={cn('text-sm sm:text-base', isToday && 'text-[var(--accent-text)]')}>{dateParts(d).day}</span>
                <Icon aria-hidden className="size-3.5 sm:size-4" style={{ color: tone.fg }} strokeWidth={2.2} />
              </>
            ),
          }
        }}
      />
      <RatingLegend className="mt-3" />
    </div>
  )
}

function RatingLegend({ className }: { className?: string }) {
  const { t } = useT()
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[var(--text-muted)]', className)} aria-label={t('month.legend')}>
      {(['favourable', 'mixed', 'challenging'] as Rating[]).map((r) => {
        const tone = TONE_VARS[RATING_TONE[r]]
        const Icon = RATING_ICON[r]
        return (
          <li key={r} className="flex items-center gap-1.5">
            <span aria-hidden className="grid size-5 place-items-center rounded-md ring-1 ring-inset" style={{ background: tone.bg, '--tw-ring-color': tone.border } as CSSProperties}>
              <Icon className="size-3" style={{ color: tone.fg }} strokeWidth={2.4} />
            </span>
            {RATING_WORD[r]}
          </li>
        )
      })}
    </ul>
  )
}
