// A vertical timeline of transit and dasha events at local times in the timings place's
// zone; longer periods group them under their dates and start collapsed after a few.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useState } from 'react'
import { formatJd, jdToLocal, weekdayOf } from '@/engine/time'
import type { TimedEvent } from '@/engine/types'
import { useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Button } from '@/ui/components/Button'
import { shortDate, weekdayShort } from './dates'
import { EVENT_ICON, EFFECT_META, TONE_VARS } from './meta'

export interface EventsTimelineProps {
  events: readonly TimedEvent[]
  timeZone: string
  /** Group under date headings (week, month and year views). */
  grouped?: boolean
  /** Civil date of a day view: events after midnight (the Vedic day runs to the next sunrise) show their weekday. */
  day?: string
  /** How many events show before "Show all". */
  initial?: number
  empty?: string
  className?: string
}

export function EventsTimeline({ events, timeZone, grouped = false, day, initial = 8, empty, className }: EventsTimelineProps) {
  const { t } = useT()
  const [all, setAll] = useState(false)
  if (!events.length) return <p className={cn('text-sm text-[var(--text-muted)]', className)}>{empty ?? t('events.none')}</p>
  const shown = all ? events : events.slice(0, initial)
  const groups: { date: string; label: string; items: TimedEvent[] }[] = []
  for (const e of shown) {
    const date = grouped ? jdToLocal(e.jd, timeZone, 'minute').date : ''
    const last = groups.at(-1)
    if (last && last.date === date) last.items.push(e)
    else groups.push({ date, label: grouped ? shortDate(date) : '', items: [e] })
  }
  return (
    <div className={className}>
      <ol className="space-y-5">
        {groups.map((g) => (
          <li key={g.date || 'all'}>
            {grouped && <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{g.label}</h3>}
            <ol>
              {g.items.map((e, i) => <EventRow key={`${e.jd}-${e.title}`} event={e} timeZone={timeZone} day={day} last={i === g.items.length - 1} />)}
            </ol>
          </li>
        ))}
      </ol>
      {events.length > initial && (
        <Button variant="ghost" size="sm" className="mt-3 h-11 sm:h-9" onClick={() => setAll((a) => !a)} aria-expanded={all}>
          {all ? t('events.fewer') : t('events.all', { n: events.length })}
        </Button>
      )}
    </div>
  )
}

function EventRow({ event, timeZone, day, last }: { event: TimedEvent; timeZone: string; day?: string; last: boolean }) {
  const Icon = EVENT_ICON[event.kind]
  const tone = event.effect === undefined ? null : TONE_VARS[EFFECT_META[event.effect].tone]
  const time = formatJd(event.jd, timeZone, 'time')
  const date = jdToLocal(event.jd, timeZone, 'minute').date
  return (
    <li className="relative grid grid-cols-[3rem_1.75rem_minmax(0,1fr)] gap-x-2.5 pb-4 last:pb-0">
      <time className="pt-1 text-right text-sm font-medium tabular-nums text-[var(--text-muted)]" dateTime={`${date}T${time}`}>
        {time}
        {day && date !== day && <span className="block text-[0.68rem] font-semibold uppercase tracking-wide">{weekdayShort(weekdayOf(date))}</span>}
      </time>
      <span className="relative flex justify-center" aria-hidden>
        {!last && <span className="absolute bottom-[-1rem] top-8 w-px bg-[var(--divider)]" />}
        <span
          className="relative grid size-7 place-items-center rounded-full"
          style={tone ? { background: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.border}` } : { background: 'var(--accent-soft)', color: 'var(--accent-text)' }}
        >
          <Icon className="size-3.5" />
        </span>
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="font-medium leading-snug text-[var(--text)]">{event.title}</p>
        {event.detail && <p className="mt-0.5 text-sm leading-snug text-[var(--text-muted)]">{event.detail}</p>}
      </div>
    </li>
  )
}
