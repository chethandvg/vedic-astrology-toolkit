// The transiting Moon around midday (where the day's Moon factors are read) judged from the
// birth Moon: sign, nakshatra, Tara bala, Chandra bala and Chandrashtama, plus the Moon's
// changes during the day.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { MoonStar } from 'lucide-react'
import type { ReactNode } from 'react'
import type { MoonDay } from '@/engine/moon'
import { formatJd, jdToLocal, weekdayOf } from '@/engine/time'
import type { TimedEvent, TimeWindow } from '@/engine/types'
import { useT } from '@/i18n'
import { Badge } from '@/ui/components/Badge'
import { Callout } from '@/ui/components/Callout'
import { bodyColor } from '@/ui/chart/planets'
// Planet colour variables used by bodyColor().
import '@/ui/chart/chart.css'
import { shortDate, weekdayShort } from './dates'
import { moonMoves } from './moonMoves'
import { Panel } from './Section'

const TARA_TONE = { good: 'good', mixed: 'mixed', adverse: 'bad' } as const
const TARA_WORD = { good: 'moon.taraGood', mixed: 'moon.taraMixed', adverse: 'moon.taraTender' } as const

export function MoonCard({ moon, chandrashtama, events, date, timeZone, className }: {
  moon: MoonDay
  chandrashtama?: TimeWindow
  /** The day's events; the Moon's sign and nakshatra changes are listed. */
  events: readonly TimedEvent[]
  /** The civil date of the day shown; changes after midnight carry their weekday. */
  date: string
  timeZone: string
  className?: string
}) {
  const { t, n } = useT()
  const { nakshatra: nak, tara, chandraBala: bala } = moon
  const moves = moonMoves(events, timeZone)
  const when = (jd: number) => `${shortDate(jdToLocal(jd, timeZone, 'minute').date)}, ${formatJd(jd, timeZone, 'time')}`
  return (
    <Panel title={t('moon.title')} description={t('moon.description')} icon={<MoonStar />} className={className}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
        <Fact term={t('moon.sign')} note={n.signAlt[moon.sign]}>{n.sign[moon.sign]}</Fact>
        <Fact term={t('moon.nakshatra')} note={<>{t('chart.pada', { n: nak.pada })} · {t('chart.lord')} <span style={{ color: bodyColor(nak.lord) }}>{n.body[nak.lord]}</span></>}>{n.nakshatra[nak.index - 1]}</Fact>
        <Fact term={t('moon.tara')} note={t('moon.taraNote', { nth: n.ordinal(tara.number) })}>
          <span className="flex flex-wrap items-center gap-1.5">{n.tara[tara.name]}<Badge tone={TARA_TONE[tara.classification]}>{t(TARA_WORD[tara.classification])}</Badge></span>
        </Fact>
        <Fact term={t('moon.chandraBala')} note={t('moon.balaNote', { nth: n.ordinal(bala.house) })}>
          <span className="flex flex-wrap items-center gap-1.5">
            {moon.chandrashtama ? n.window.Chandrashtama : bala.good ? t('moon.strong') : t('moon.weak')}
            <Badge tone={moon.chandrashtama ? 'bad' : bala.good ? 'good' : 'mixed'}>{n.ordinal(bala.house)}</Badge>
          </span>
        </Fact>
      </dl>
      {chandrashtama && (
        <Callout tone="warning" title={n.window.Chandrashtama} className="mt-4">
          {t('moon.chandrashtama', { from: when(chandrashtama.startJd), to: when(chandrashtama.endJd) })}
        </Callout>
      )}
      {moves.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-[var(--divider)] pt-3 text-sm">
          {moves.map((m) => (
            <li key={m.key} className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[var(--text-muted)]">
                {m.label}
                {m.chandrashtama && (
                  <Badge tone={m.chandrashtama === 'begins' ? 'bad' : 'neutral'}>{t(m.chandrashtama === 'begins' ? 'moon.cBegins' : 'moon.cEnds')}</Badge>
                )}
              </span>
              <span className="shrink-0 font-medium tabular-nums">{m.date !== date && `${weekdayShort(weekdayOf(m.date))} `}{formatJd(m.jd, timeZone, 'time')}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

function Fact({ term, note, children }: { term: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{term}</dt>
      <dd className="m-0 mt-1 font-medium leading-snug text-[var(--text)]">{children}</dd>
      {note && <dd className="m-0 mt-0.5 text-xs text-[var(--text-muted)]">{note}</dd>}
    </div>
  )
}
