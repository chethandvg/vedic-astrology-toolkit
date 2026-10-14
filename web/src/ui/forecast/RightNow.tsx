// "Right now": the running hora and choghadiya and whether an inauspicious window is on,
// refreshed every minute by the shared clock.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Hourglass, ShieldAlert, ShieldCheck, Sparkle, Sunrise } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { formatJd } from '@/engine/time'
import type { DayTimings } from '@/engine/types'
import { rich, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/components/Badge'
import { BODY_GLYPH, bodyColor, GLYPH_FONT } from '@/ui/chart/planets'
// Planet colour variables used by bodyColor().
import '@/ui/chart/chart.css'
import { HORA_USE, QUALITY_META, TONE_VARS, type Tone } from './meta'
import { avoidWindows, runningAt, timeRange, windowName } from './timing'

export function RightNow({ timings, nowJd, className }: { timings: DayTimings; nowJd: number; className?: string }) {
  const { t, n } = useT()
  const id = useId()
  const zone = timings.timeZone
  const sd = timings.solarDay
  const time = (jd: number) => formatJd(jd, zone, 'time')
  if (nowJd < sd.sunriseJd || nowJd >= sd.nextSunriseJd) {
    return (
      <section aria-label={t('now.title')} className={cn('glass flex items-center gap-3 rounded-[var(--radius-card)] p-4', className)}>
        <span aria-hidden className="chip grid size-10 shrink-0 place-items-center rounded-xl"><Sunrise className="size-5" /></span>
        <p className="text-sm text-[var(--text-muted)]">
          {nowJd < sd.sunriseJd ? rich(t('now.beforeSunrise'), { time: <strong className="text-[var(--text)]">{time(sd.sunriseJd)}</strong> }) : t('now.ended')}
        </p>
      </section>
    )
  }
  const hora = runningAt(timings.horas, nowJd)
  const chog = runningAt(timings.choghadiya, nowJd)
  const avoid = runningAt(avoidWindows(timings), nowJd)
  const abhijit = timings.abhijit && runningAt([timings.abhijit], nowJd)
  const rahu = timings.rahuKalam
  const nextAvoid = avoidWindows(timings).find((w) => w.startJd > nowJd)
  return (
    <section aria-labelledby={id} className={cn('glass rounded-[var(--radius-card)] p-4 sm:p-5', className)}>
      <h2 id={id} className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-good)] opacity-60 motion-reduce:hidden" />
          <span className="relative inline-flex size-2 rounded-full bg-[var(--color-good)]" />
        </span>
        {t('now.title')} · {time(nowJd)}
      </h2>
      {/* Three across only where each tile has room (tablets); stacked on phones and beside the hero. */}
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 lg:grid-cols-1">
        {avoid ? (
          <Tile tone="bad" icon={<ShieldAlert />} label={t('now.avoid')} value={windowName(avoid.name)} sub={t('common.until', { x: time(avoid.endJd) })} />
        ) : abhijit ? (
          <Tile tone="good" icon={<ShieldCheck />} label={t('now.auspicious')} value={n.window['Abhijit Muhurta']} sub={t('common.until', { x: time(abhijit.endJd) })} />
        ) : (
          // Only these windows are meant here: a choghadiya marked Avoid has its own tile.
          <Tile
            tone="good" icon={<ShieldCheck />} label={t('now.inauspicious')}
            value={nextAvoid ? t('now.noneUntil', { time: time(nextAvoid.startJd) }) : t('now.allOver')}
            sub={nextAvoid
              ? `${t('now.next', { name: windowName(nextAvoid.name), range: timeRange(nextAvoid.startJd, nextAvoid.endJd, zone) })}${nextAvoid !== rahu && nowJd < rahu.startJd ? ` · ${n.window['Rahu Kalam']} ${timeRange(rahu.startJd, rahu.endJd, zone)}` : ''}`
              : t('now.passed', { range: timeRange(rahu.startJd, rahu.endJd, zone) })}
          />
        )}
        {hora && (
          <Tile
            icon={<span style={{ fontFamily: GLYPH_FONT, color: bodyColor(hora.lord) }} className="text-lg leading-none">{BODY_GLYPH[hora.lord]}</span>}
            label={t('timings.hora')} value={<span style={{ color: bodyColor(hora.lord) }}>{n.body[hora.lord]}</span>}
            sub={`${t('common.until', { x: time(hora.endJd) })} · ${HORA_USE[hora.lord as keyof typeof HORA_USE] ?? ''}`}
          />
        )}
        {chog && (
          <Tile
            tone={QUALITY_META[chog.quality].tone} icon={chog.quality === 'good' ? <Sparkle /> : <Hourglass />} label={t('timings.choghadiya')}
            value={<span className="flex flex-wrap items-center gap-x-2 gap-y-1">{n.choghadiya[chog.name as keyof typeof n.choghadiya] ?? chog.name}<Badge tone={QUALITY_META[chog.quality].tone}>{QUALITY_META[chog.quality].label}</Badge></span>}
            sub={t('common.until', { x: time(chog.endJd) })}
          />
        )}
      </div>
    </section>
  )
}

function Tile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: string; tone?: Tone }) {
  const vars = tone ? TONE_VARS[tone] : null
  return (
    <div
      className="flex min-w-0 items-start gap-3 rounded-2xl bg-[var(--surface-2)] p-3 ring-1 ring-inset ring-[var(--surface-border)]"
      style={vars && tone === 'bad' ? { background: vars.bg, boxShadow: `inset 0 0 0 1px ${vars.border}` } : undefined}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-xl [&_svg]:size-[18px]"
        style={vars ? { background: vars.bg, color: vars.fg } : { background: 'var(--surface-3)' }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">{label}</p>
        <p className="mt-0.5 font-semibold leading-snug text-[var(--text)]">{value}</p>
        {sub && <p className="mt-0.5 text-xs leading-snug text-[var(--text-muted)]">{sub}</p>}
      </div>
    </div>
  )
}
