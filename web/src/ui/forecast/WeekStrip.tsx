// The seven days of a week as rating-coloured pills (tap opens that day), and the week's
// best and gentlest days.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Leaf, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { jdToLocal, weekdayOf } from '@/engine/time'
import type { Forecast } from '@/engine/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { dateParts, longDate, shortDate, weekdayShort } from './dates'
import { RATING_ICON, RATING_TONE, RATING_WORD, scorePercent, TONE_VARS } from './meta'
import { forecastHref, useForecastLink } from './useForecastDate'

export interface DayPartsProps {
  parts: readonly Forecast[]
  profileId: string
  today: string
  /** The date in the URL, highlighted when it is in this period. */
  selected?: string
}

export function WeekStrip({ parts, profileId, today, selected, className }: DayPartsProps & { className?: string }) {
  const { t } = useT()
  const onClick = useForecastLink()
  return (
    <ol className={cn('grid grid-cols-7 gap-1.5 sm:gap-2', className)} aria-label={t('week.daysAria')}>
      {parts.map((p) => {
        const tone = TONE_VARS[RATING_TONE[p.rating]]
        const Icon = RATING_ICON[p.rating]
        const pct = scorePercent(p.score)
        const isToday = p.start === today
        return (
          <li key={p.start}>
            <a
              href={forecastHref(profileId, 'today', p.start)}
              onClick={onClick(profileId, 'today', p.start)}
              aria-label={t('week.dayAria', { date: `${longDate(p.start)}${isToday ? `, ${t('common.today')}` : ''}`, rating: RATING_WORD[p.rating], pct })}
              aria-current={isToday ? 'date' : undefined}
              className={cn(
                'group relative flex flex-col items-center rounded-2xl px-1 pb-2.5 pt-2 ring-1 ring-inset transition-[transform,box-shadow] hover:-translate-y-0.5 active:scale-[0.97]',
                p.start === selected && 'shadow-[0_0_0_2px_var(--accent)]',
              )}
              style={{ background: tone.bg, '--tw-ring-color': tone.border } as CSSProperties}
            >
              {/* Today keeps its weekday (the word "Today" does not fit a 320 px phone) and gets a dot. */}
              {isToday && <span aria-hidden className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]" />}
              <span className={cn('text-[0.65rem] font-semibold uppercase tracking-[0.08em]', isToday ? 'text-[var(--accent-text)]' : 'text-[var(--text-muted)]')}>
                {weekdayShort(weekdayOf(p.start))}
              </span>
              <span className="font-display text-xl font-semibold tabular-nums leading-tight sm:text-2xl">{dateParts(p.start).day}</span>
              <Icon aria-hidden className="mt-0.5 size-4" style={{ color: tone.fg }} strokeWidth={2.2} />
              <span aria-hidden className="mt-2 h-1 w-[70%] overflow-hidden rounded-full bg-[var(--surface-3)]">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: tone.solid }} />
              </span>
            </a>
          </li>
        )
      })}
    </ol>
  )
}

/** Neutral look for a group with nothing in it: an empty "Go gently" box should not look like a warning. */
const QUIET = { fg: 'var(--text-muted)', bg: 'var(--surface-2)', border: 'var(--surface-border)' }

/** "Fri 2 Oct 15:41", read once to the minute so that the time and its date agree. */
function instant(jd: number, zone: string): string {
  const p = jdToLocal(jd, zone, 'minute')
  return `${shortDate(p.date)} ${p.time}`
}

/** Upcoming entries first, then past ones, each in date order. */
const upcomingFirst = <T extends { past: boolean }>(items: readonly T[]) => [...items.filter((x) => !x.past), ...items.filter((x) => x.past)]

export interface DayHighlightsProps {
  /** A week or month forecast: its highlights name the days (as its headline does), its parts describe them. */
  forecast: Forecast
  profileId: string
  today: string
  /** Zone of the place the forecast was computed for. */
  timeZone: string
  className?: string
}

/**
 * The days the period's summary names (Forecast.highlights) as links: best days, days to take
 * gently and the Moon's stays in the 8th sign (Chandrashtama) with their times. While the period
 * is running, upcoming entries come first and past ones are dimmed.
 */
export function DayHighlights({ forecast, profileId, today, timeZone, className }: DayHighlightsProps) {
  const { t, n } = useT()
  const onClick = useForecastLink()
  const running = forecast.start <= today && today <= forecast.end
  const byDate = new Map((forecast.parts ?? []).map((p) => [p.start, p]))
  const days = (dates: readonly string[] = []) => upcomingFirst(dates.flatMap((d) => {
    const p = byDate.get(d)
    return p ? [{ p, past: running && d < today }] : []
  }))
  const eighth = upcomingFirst((forecast.highlights?.chandrashtama ?? []).map((w) => ({ w, past: running && jdToLocal(w.endJd, timeZone).date < today })))
  const groups = [
    { key: 'best', title: t('highlights.best'), icon: Sparkles, tone: TONE_VARS.good, items: days(forecast.highlights?.best), stays: [] as typeof eighth, empty: t('highlights.bestNone') },
    { key: 'gentle', title: t('highlights.gentle'), icon: Leaf, tone: TONE_VARS.bad, items: days(forecast.highlights?.careful), stays: eighth, empty: t('highlights.gentleNone') },
  ]
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {groups.map(({ key, title, icon: Icon, tone: groupTone, items, stays, empty }) => {
        const tone = items.length || stays.length ? groupTone : QUIET
        return (
          <section key={key} aria-label={title} className="rounded-2xl p-3.5 ring-1 ring-inset" style={{ background: tone.bg, '--tw-ring-color': tone.border } as CSSProperties}>
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: tone.fg }}>
              <Icon aria-hidden className="size-4" />{title}
            </h3>
            {items.length || stays.length ? (
              <ul className="mt-2 space-y-1">
                {items.map(({ p, past }) => (
                  <li key={p.start} className={cn(past && 'opacity-60')}>
                    <a
                      href={forecastHref(profileId, 'today', p.start)} onClick={onClick(profileId, 'today', p.start)}
                      className="-mx-1.5 block rounded-lg px-1.5 py-1 transition-colors hover:bg-[var(--hover)]"
                    >
                      <span className="block text-sm font-semibold text-[var(--text)]">{shortDate(p.start)}{past && <span className="sr-only"> {t('common.past')}</span>}</span>
                      <span className="block text-xs leading-snug text-[var(--text-muted)]">{p.headline}</span>
                    </a>
                  </li>
                ))}
                {stays.map(({ w, past }) => (
                  <li key={w.startJd} className={cn('py-1', past && 'opacity-60')}>
                    <span className="block text-sm font-semibold text-[var(--text)]">{t('highlights.eighth', { name: n.window.Chandrashtama })}{past && <span className="sr-only"> {t('common.past')}</span>}</span>
                    <span className="block text-xs leading-snug text-[var(--text-muted)]">{instant(w.startJd, timeZone)} – {instant(w.endJd, timeZone)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-2 text-sm text-[var(--text-muted)]">{empty}</p>}
          </section>
        )
      })}
    </div>
  )
}
