// The five limbs of the birth panchanga plus sunrise and sunset in the birth zone.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import { CalendarDays, Hourglass, MoonStar, Orbit, Sparkles, Sunrise, Sunset } from 'lucide-react'
import { clsx } from 'clsx'
import { formatJd } from '@/engine/time'
import { useT } from '@/i18n'
import { weekdayLong } from '@/ui/forecast/dates'
import type { Chart } from '@/engine/types'
import { bodyColor } from './planets'
import './chart.css'


export function PanchangaCard({ chart, className }: { chart: Chart; className?: string }) {
  const { t, n, lang } = useT()
  const p = chart.panchanga
  const sd = chart.solarDay
  const zone = chart.input.timeZone
  const nak = p.nakshatra
  const time = (jd: number) => formatJd(jd, zone, 'time')
  // "Shukla" is the spelling most panchang publishers use for the bright half.
  const paksha = lang === 'en' ? (p.paksha === 'Sukla' ? 'Shukla' : 'Krishna') : n.paksha[p.paksha]
  const tithiName = p.tithi === 15 ? n.purnima : p.tithi === 30 ? n.amavasya : n.tithi[p.tithiInPaksha - 1]
  return (
    <section
      aria-label={t('panchanga.aria')}
      className={clsx('rounded-card border border-(--surface-border) bg-(--bg-elevated) p-5 backdrop-blur sm:p-6', className)}
    >
      <header className="mb-4 flex items-baseline justify-between gap-3">
        <h3 className="font-display text-xl text-(--text)">{t('panchanga.title')}</h3>
        {sd && <span className="text-xs text-(--text-muted)">{sd.isDay ? t('panchanga.dayBirth') : t('panchanga.nightBirth')}</span>}
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Item icon={<CalendarDays />} term={t('panchanga.vara')} note={sd ? t('panchanga.varaNote', { vara: n.vara[sd.weekday] }) : undefined}>
          {sd ? weekdayLong(sd.weekday) : t('panchanga.noSunrise')}
        </Item>
        <Item icon={<MoonStar />} term={t('panchanga.tithi')} note={t('panchanga.tithiNote', { n: p.tithi, paksha })}>
          {p.tithiInPaksha === 15 ? tithiName : `${paksha} ${tithiName}`}
        </Item>
        <Item icon={<Sparkles />} term={t('moon.nakshatra')} note={<>{t('chart.pada', { n: nak.pada })} · {t('chart.lord')} <span style={{ color: bodyColor(nak.lord) }}>{n.body[nak.lord]}</span></>}>
          {n.nakshatra[nak.index - 1]}
        </Item>
        <Item icon={<Orbit />} term={t('panchanga.yoga')} note={t('panchanga.of27', { n: p.yogaIndex })}>{n.yoga[p.yogaIndex - 1] ?? p.yoga}</Item>
        <Item icon={<Hourglass />} term={t('panchanga.karana')} note={t('panchanga.karanaNote')}>{n.karana[p.karana] ?? p.karana}</Item>
        <Item icon={<Sunrise />} term={t('panchanga.sun')} note={sd ? t('panchanga.local', { zone }) : t('panchanga.noSun')}>
          {sd ? (
            <span className="inline-flex items-center gap-2 tabular-nums">
              <span className="sr-only">{t('timings.sunrise')}</span>{time(sd.sunriseJd)}
              <Sunset aria-hidden className="size-4 text-(--text-muted)" />
              <span className="sr-only">{t('timings.sunset')}</span>{time(sd.sunsetJd)}
            </span>
          ) : '—'}
        </Item>
      </dl>
    </section>
  )
}

function Item({ icon, term, note, children }: { icon: ReactNode; term: string; note?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-(--surface-border) text-(--accent) [&>svg]:size-[18px]">
        {icon}
      </span>
      <div className="min-w-0">
        <dt className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-(--text-muted)">{term}</dt>
        <dd className="m-0 mt-0.5 text-[0.95rem] font-medium leading-snug text-(--text)">{children}</dd>
        {note && <dd className="m-0 mt-0.5 text-xs text-(--text-muted)">{note}</dd>}
      </div>
    </div>
  )
}
