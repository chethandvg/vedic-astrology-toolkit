// Year timelines: the slow grahas' signs (with houses from the natal Moon), Saturn's named
// phases and the dasha periods, drawn as bands across January to December, each followed by
// the same facts in words.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { CSSProperties, ReactNode } from 'react'
import { T } from '@/content/active'
import type { SaturnPeriod } from '@/engine/saturn'
import { jdToLocal, localToJd } from '@/engine/time'
import type { DashaPeriod, Planet } from '@/engine/types'
import { names, t, useT } from '@/i18n'
import { fullDate } from '@/i18n/format'
import { cn } from '@/lib/cn'
import { BODY_GLYPH, bodyColor, GLYPH_FONT } from '@/ui/chart/planets'
// Planet colour variables used by bodyColor().
import '@/ui/chart/chart.css'
import type { TransitTrack } from './data'
import { dayMonth, monthShort } from './dates'
import { TONE_VARS } from './meta'

export interface YearRange {
  year: number
  startJd: number
  endJd: number
  timeZone: string
  /** Current instant, marked when inside the year. */
  nowJd: number
}

interface BandSegment {
  key: string
  startJd: number
  endJd: number
  /** Shown when the segment is wide. */
  label: string
  /** Shown when it is narrow. */
  short?: string
  style: Pick<CSSProperties, 'background' | 'color' | 'boxShadow'>
}

/** The month starts as fractions of the year, for gridlines and the axis. */
function monthMarks({ year, startJd, endJd, timeZone }: YearRange) {
  return Array.from({ length: 12 }, (_, i) => ({ m: monthShort(i + 1), x: (localToJd(`${year}-${String(i + 1).padStart(2, '0')}-01`, timeZone) - startJd) / (endJd - startJd) }))
}

function MonthAxis({ range, className }: { range: YearRange; className?: string }) {
  return (
    <div aria-hidden className={cn('relative h-4 text-[0.62rem] font-medium uppercase tracking-wide text-[var(--text-muted)]', className)}>
      {monthMarks(range).map(({ m, x }) => (
        <span key={m} className="absolute" style={{ left: `${x * 100}%`, width: `${100 / 12}%` }}>
          <span className="pl-1 sm:hidden">{[...m][0]}</span>
          <span className="hidden pl-1 sm:inline">{m}</span>
        </span>
      ))}
    </div>
  )
}

function Band({ range, segments, className }: { range: YearRange; segments: readonly BandSegment[]; className?: string }) {
  const span = range.endJd - range.startJd
  const x = (jd: number) => Math.min(1, Math.max(0, (jd - range.startJd) / span))
  const now = range.nowJd >= range.startJd && range.nowJd < range.endJd ? x(range.nowJd) : null
  const shown = segments.map((s) => ({ s, left: x(s.startJd), width: x(s.endJd) - x(s.startJd) })).filter((p) => p.width > 0)
  const box = (left: number, width: number) => ({ left: `calc(${left * 100}% + 1px)`, width: `calc(${width * 100}% - 2px)` })
  return (
    <div aria-hidden className={cn('relative h-10 overflow-hidden rounded-xl bg-[var(--surface-2)] ring-1 ring-inset ring-[var(--surface-border)]', className)}>
      {monthMarks(range).slice(1).map(({ m, x: mx }) => <span key={m} className="absolute inset-y-0 w-px bg-[var(--divider)]" style={{ left: `${mx * 100}%` }} />)}
      {/* Three layers: the fills, the "now" line over them, and the labels (with a halo) over the line. */}
      {shown.map(({ s, left, width }) => (
        <span key={s.key} className="absolute inset-y-1 rounded-lg" style={{ ...box(left, width), background: s.style.background, boxShadow: s.style.boxShadow }} />
      ))}
      {now !== null && <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--text)]" style={{ left: `${now * 100}%` }} />}
      {shown.map(({ s, left, width }) => (
        <span
          key={s.key}
          className="absolute inset-y-1 flex items-center overflow-hidden px-2 text-[0.72rem] font-semibold [text-shadow:0_0_3px_var(--bg),0_0_2px_var(--bg)]"
          style={{ ...box(left, width), color: s.style.color }}
        >
          <span className="truncate">{width >= 0.22 ? s.label : width >= 0.08 ? s.short ?? s.label : ''}</span>
        </span>
      ))}
    </div>
  )
}

const tint = (color: string, pct: number) => `color-mix(in oklab, ${color} ${pct}%, transparent)`

function Row({ label, children, facts }: { label: ReactNode; children: ReactNode; facts: ReactNode }) {
  return (
    <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] items-start gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
      <div className="pt-2.5 text-sm font-semibold">{label}</div>
      <div className="min-w-0">
        {children}
        {/* Without a band (no Saturn phase this year) the words line up with the label. */}
        <p className={cn('text-xs leading-relaxed text-[var(--text-muted)]', children ? 'mt-1.5' : 'pt-2.5')}>{facts}</p>
      </div>
    </div>
  )
}

/** A date within the year shown, without the year ("2 Jun"). */
const dateIn = (jd: number, range: YearRange) => dayMonth(jdToLocal(jd, range.timeZone).date)

function stayFacts(stays: TransitTrack['stays'], range: YearRange): string {
  return stays.map((s, i) => {
    const where = t('bands.where', { sign: names().sign[s.sign], nth: names().ordinal(s.house) })
    if (stays.length === 1) return t('bands.allYear', { where })
    if (i === 0) return t('bands.until', { where, date: dateIn(s.endJd, range) })
    return t('bands.from', { where, date: dateIn(s.startJd, range) })
  }).join(' · ')
}

function PlanetLabel({ planet }: { planet: Planet }) {
  const { n } = useT()
  return (
    <span className="flex items-center gap-1.5" style={{ color: bodyColor(planet) }}>
      <span aria-hidden style={{ fontFamily: GLYPH_FONT }}>{BODY_GLYPH[planet]}</span>{n.body[planet]}
    </span>
  )
}

export function TransitBands({ tracks, saturn, range }: { tracks: readonly TransitTrack[]; saturn?: readonly SaturnPeriod[]; range: YearRange }) {
  const { t, n } = useT()
  const phases = (saturn ?? []).filter((p) => p.endJd > range.startJd && p.startJd < range.endJd)
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        <span />
        <MonthAxis range={range} />
      </div>
      {tracks.map((t) => (
        <Row key={t.planet} label={<PlanetLabel planet={t.planet} />} facts={stayFacts(t.stays, range)}>
          <Band
            range={range}
            segments={t.stays.map((s, i) => ({
              key: `${s.startJd}`,
              startJd: s.startJd, endJd: s.endJd,
              label: `${n.sign[s.sign]} · ${n.ordinal(s.house)}`, short: `${n.signShort[s.sign]} ${s.house}`,
              style: { background: tint(bodyColor(t.planet), i % 2 ? 40 : 26), color: 'var(--text)', boxShadow: `inset 0 0 0 1px ${tint(bodyColor(t.planet), 55)}` },
            }))}
          />
        </Row>
      ))}
      <Row
        label={<span className="text-[var(--text-muted)]">{t('bands.saturn')}</span>}
        facts={phases.length
          ? phases.map((p) => `${T.SATURN_PHASE_TITLE[p.phase]}: ${fullDate(p.startJd, range.timeZone)} – ${fullDate(p.endJd, range.timeZone)}`).join(' · ')
          : t('bands.noPhase')}
      >
        {phases.length > 0 && (
          <Band
            range={range}
            segments={phases.map((p) => {
              const tone = TONE_VARS[p.phase === 'sade_sati_peak' || p.phase === 'ashtama' ? 'bad' : 'mixed']
              return {
                key: `${p.startJd}`, startJd: p.startJd, endJd: p.endJd, label: T.SATURN_PHASE_TITLE[p.phase], short: t(p.phase.startsWith('sade') ? 'bands.sadeSati' : 'bands.shani'),
                style: { background: tone.bg, color: tone.fg, boxShadow: `inset 0 0 0 1px ${tone.border}` },
              }
            })}
          />
        )}
      </Row>
    </div>
  )
}

/** Antardashas and pratyantardashas running during the year. */
export function DashaBands({ dashas, range }: { dashas: readonly DashaPeriod[]; range: YearRange }) {
  const { t, n } = useT()
  const overlap = (p: DashaPeriod) => p.endJd > range.startJd && p.startJd < range.endJd
  const mds = dashas.filter(overlap)
  const ads = mds.flatMap((md) => (md.children ?? []).filter(overlap))
  const pds = ads.flatMap((ad) => (ad.children ?? []).filter(overlap))
  const seg = (p: DashaPeriod, i: number): BandSegment => ({
    key: `${p.level}-${p.startJd}`, startJd: p.startJd, endJd: p.endJd, label: n.body[p.lord], short: n.bodyShort[p.lord],
    style: { background: tint(bodyColor(p.lord), i % 2 ? 40 : 26), color: 'var(--text)', boxShadow: `inset 0 0 0 1px ${tint(bodyColor(p.lord), 50)}` },
  })
  const changes = (list: DashaPeriod[]) => list.filter((p) => p.startJd >= range.startJd).map((p) => t('bands.lordFrom', { lord: n.body[p.lord], date: dateIn(p.startJd, range) }))
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 sm:grid-cols-[6.5rem_minmax(0,1fr)]">
        <span />
        <MonthAxis range={range} />
      </div>
      <Row label={n.dashaLevelShort[0]} facts={mds.map((p) => t('bands.mahaUntil', { lord: n.body[p.lord], level: n.dashaLevel[0], date: fullDate(p.endJd, range.timeZone) })).join(' · ')}>
        <Band range={range} segments={mds.map(seg)} />
      </Row>
      <Row label={n.dashaLevelShort[1]} facts={changes(ads).length ? t('bands.changes', { list: changes(ads).join(' · ') }) : t('bands.allYear', { where: ads[0] ? n.body[ads[0].lord] : '' })}>
        <Band range={range} segments={ads.map(seg)} />
      </Row>
      <Row label={n.dashaLevelShort[2]} facts={t('bands.subPeriods', { n: pds.length })}>
        <Band range={range} segments={pds.map(seg)} />
      </Row>
    </div>
  )
}
