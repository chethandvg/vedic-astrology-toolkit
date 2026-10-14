// The Vedic day from sunrise to the next sunrise: a bar with Rahu Kalam, Yamaganda,
// Gulika Kalam, Durmuhurta and Abhijit marked and a "now" marker, the same windows as a
// list, and tabs with the 16 choghadiyas and 24 horas.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Clock, Moon, Sunrise, Sunset } from 'lucide-react'
import { useState, type CSSProperties, type ReactNode } from 'react'
import { addDays, formatJd, localToJd } from '@/engine/time'
import type { DayTimings, Hora, TimeWindow } from '@/engine/types'
import { t, useT, type MessageKey } from '@/i18n'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/components/Badge'
import { SegmentedControl } from '@/ui/components/SegmentedControl'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/components/Tabs'
import { BODY_GLYPH, bodyColor, GLYPH_FONT } from '@/ui/chart/planets'
// Planet colour variables used by bodyColor().
import '@/ui/chart/chart.css'
import { HORA_USE, QUALITY_META, TONE_VARS } from './meta'
import { Panel } from './Section'
import { markedWindows, runningAt, spokenRange, timeRange, windowName, windowNote } from './timing'

/** Colour, short mark and fill for each kind of window on the bar; `halo` keeps the mark legible over the "now" line. */
/** Messages for the one-letter mark and the short name of each window on the bar. */
const WINDOW_KEYS: Record<string, [MessageKey, MessageKey]> = {
  'Rahu Kalam': ['mark.rahu', 'short.rahu'], Yamaganda: ['mark.yama', 'short.yama'], 'Gulika Kalam': ['mark.gulika', 'short.gulika'],
  Durmuhurta: ['mark.durmuhurta', 'short.durmuhurta'], 'Abhijit Muhurta': ['mark.abhijit', 'short.abhijit'],
}
const WINDOW_LOOK: Record<string, { fill: string; ink: string; halo: string }> = {
  'Rahu Kalam': { fill: 'var(--color-bad)', ink: '#2a0a12', halo: 'var(--color-bad)' },
  Yamaganda: { fill: 'color-mix(in oklab, var(--color-bad) 45%, var(--color-mixed))', ink: '#2a1305', halo: 'color-mix(in oklab, var(--color-bad) 45%, var(--color-mixed))' },
  'Gulika Kalam': { fill: '#a78bfa', ink: '#1a1036', halo: '#a78bfa' },
  Durmuhurta: { fill: 'repeating-linear-gradient(135deg, var(--color-bad) 0 4px, color-mix(in oklab, var(--color-bad) 55%, transparent) 4px 8px)', ink: '#2a0a12', halo: 'var(--color-bad)' },
  'Abhijit Muhurta': { fill: 'var(--color-good)', ink: '#04251a', halo: 'var(--color-good)' },
}
const lookOf = (w: TimeWindow) => {
  const [mark, short] = WINDOW_KEYS[w.name] ?? WINDOW_KEYS.Durmuhurta
  return { ...(WINDOW_LOOK[w.name] ?? WINDOW_LOOK.Durmuhurta), mark: t(mark), short: t(short) }
}

export interface DayTimingsPanelProps {
  timings: DayTimings
  /** Current instant (JD); the marker shows only while it falls inside this day. */
  nowJd: number
  /** Control for changing the place, shown in the panel heading. */
  placeAction?: ReactNode
  className?: string
}

export function DayTimingsPanel({ timings, nowJd, placeAction, className }: DayTimingsPanelProps) {
  const { t } = useT()
  const zone = timings.timeZone
  const sd = timings.solarDay
  const live = nowJd >= sd.sunriseJd && nowJd < sd.nextSunriseJd
  const windows = markedWindows(timings)
  return (
    <Panel title={t('timings.title')} description={t('timings.description')} icon={<Clock />} action={placeAction} className={className}>
      <dl className="mb-5 grid grid-cols-3 gap-2 text-center">
        <SunStat icon={<Sunrise />} label={t('timings.sunrise')} value={formatJd(sd.sunriseJd, zone, 'time')} />
        <SunStat icon={<Sunset />} label={t('timings.sunset')} value={formatJd(sd.sunsetJd, zone, 'time')} />
        <SunStat icon={<Moon />} label={t('timings.nextSunrise')} value={formatJd(sd.nextSunriseJd, zone, 'time')} />
      </dl>
      <DayBar timings={timings} windows={windows} nowJd={live ? nowJd : null} />
      <ul className="mt-5 grid gap-x-6 gap-y-1 sm:grid-cols-2" aria-label={t('timings.windows')}>
        {windows.map((w) => <WindowRow key={`${w.name}-${w.startJd}`} window={w} zone={zone} active={live && w.startJd <= nowJd && nowJd < w.endJd} />)}
        {!timings.abhijit && (
          <li className="flex min-h-11 items-center gap-3 text-sm text-[var(--text-muted)]">
            <span aria-hidden className="size-3 shrink-0 rounded-full border border-dashed border-[var(--text-muted)]" />
            {t('timings.noAbhijit')}
          </li>
        )}
      </ul>
      <Tabs defaultValue="choghadiya" className="mt-6">
        <TabsList aria-label={t('timings.divisions')}>
          <TabsTrigger value="choghadiya">{t('timings.choghadiya')}</TabsTrigger>
          <TabsTrigger value="horas">{t('timings.horas')}</TabsTrigger>
        </TabsList>
        <TabsContent value="choghadiya">
          <SplitList
            day={timings.choghadiya.slice(0, 8)} night={timings.choghadiya.slice(8)} nowJd={live ? nowJd : null}
            row={(c, active) => <ChoghadiyaRow key={c.startJd} item={c} zone={zone} active={active} />}
          />
        </TabsContent>
        <TabsContent value="horas">
          <SplitList
            day={timings.horas.slice(0, 12)} night={timings.horas.slice(12)} nowJd={live ? nowJd : null}
            row={(h, active) => <HoraRow key={h.startJd} hora={h} zone={zone} active={active} />}
          />
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function SunStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--surface-2)] px-2 py-2.5 ring-1 ring-inset ring-[var(--surface-border)]">
      <dt className="flex items-center justify-center gap-1.5 whitespace-nowrap text-[0.62rem] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)] max-[380px]:tracking-normal [&_svg]:size-3.5 [&_svg]:text-[var(--accent-text)]">
        <span aria-hidden className="max-[420px]:hidden">{icon}</span>{label}
      </dt>
      <dd className="m-0 mt-1 font-display text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function DayBar({ timings, windows, nowJd }: { timings: DayTimings; windows: TimeWindow[]; nowJd: number | null }) {
  const zone = timings.timeZone
  const { sunriseJd: start, sunsetJd, nextSunriseJd: end } = timings.solarDay
  const pct = (jd: number) => ((jd - start) / (end - start)) * 100
  const sunsetPct = pct(sunsetJd)
  // Clock hours every three hours, for faint guide lines.
  const hours = [0, 3, 6, 9, 12, 15, 18, 21].flatMap((h) => [timings.date, addDays(timings.date, 1)].map((d) => localToJd(d, zone, `${String(h).padStart(2, '0')}:00`)))
    .filter((jd) => jd > start && jd < end)
  const noon = localToJd(timings.date, zone, '12:00')
  const midnight = localToJd(addDays(timings.date, 1), zone, '00:00')
  const summary = `${t('timings.summary', { sunrise: formatJd(start, zone, 'time'), next: formatJd(end, zone, 'time'), sunset: formatJd(sunsetJd, zone, 'time') })} `
    + windows.map((w) => `${windowName(w.name)} ${spokenRange(w.startJd, w.endJd, zone)}`).join('; ')
    + (nowJd !== null ? `. ${t('common.now')} ${formatJd(nowJd, zone, 'time')}.` : '.')
  const laneClass = (w: TimeWindow) => (w.name === 'Durmuhurta' || w.name === 'Abhijit Muhurta' ? 'bottom-1.5' : 'top-1.5') + ' h-[calc(50%-0.4rem)]'
  const place = (w: TimeWindow): CSSProperties => ({ left: `${pct(w.startJd)}%`, width: `${pct(w.endJd) - pct(w.startJd)}%` })
  return (
    <div className="@container">
      <div className="relative pt-7">
        {nowJd !== null && (
          <span
            aria-hidden
            className="absolute top-0 z-10 -translate-x-1/2 rounded-full bg-[var(--text)] px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--bg)] shadow"
            style={{ left: `clamp(1.5rem, ${pct(nowJd)}%, calc(100% - 1.5rem))` }}
          >
            {t('common.now')} {formatJd(nowJd, zone, 'time')}
          </span>
        )}
        <div role="img" aria-label={summary} className="relative h-16 overflow-hidden rounded-2xl ring-1 ring-inset ring-[var(--surface-border)]">
          <div className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgb(248_189_87/0.12),rgb(248_189_87/0.3)_50%,rgb(248_189_87/0.14))]" style={{ width: `${sunsetPct}%` }} />
          <div className="absolute inset-y-0 right-0 bg-[linear-gradient(90deg,rgb(139_124_246/0.2),rgb(76_92_170/0.16)_60%,rgb(139_124_246/0.14))]" style={{ width: `${100 - sunsetPct}%` }} />
          {hours.map((jd) => <span key={jd} className="absolute inset-y-0 w-px bg-[var(--divider)]" style={{ left: `${pct(jd)}%` }} />)}
          {/* Three layers: the window fills, the "now" line over them, and the marks (with a halo) over the line. */}
          {windows.map((w) => (
            <span key={`${w.name}-${w.startJd}`} className={cn('absolute rounded-md shadow-sm', laneClass(w))} style={{ ...place(w), background: lookOf(w).fill }} />
          ))}
          {nowJd !== null && <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-[var(--text)] shadow-[0_0_0_1px_var(--bg)]" style={{ left: `${pct(nowJd)}%` }} />}
          {windows.map((w) => {
            const look = lookOf(w)
            return (
              <span
                key={`${w.name}-${w.startJd}`}
                className={cn('absolute flex items-center justify-center overflow-hidden text-[0.65rem] font-bold', laneClass(w))}
                style={{ ...place(w), color: look.ink, textShadow: `0 0 2px ${look.halo}, 0 0 2px ${look.halo}, 0 0 1px ${look.halo}` }}
              >
                <span className="@lg:hidden">{look.mark}</span>
                <span className="hidden @lg:inline">{look.short}</span>
              </span>
            )
          })}
        </div>
        <div aria-hidden className="relative mt-1.5 h-4 text-[0.68rem] tabular-nums text-[var(--text-muted)]">
          <span className="absolute left-0">{formatJd(start, zone, 'time')}</span>
          {noon > start && noon < sunsetJd && <span className="absolute hidden -translate-x-1/2 @sm:block" style={{ left: `${pct(noon)}%` }}>12:00</span>}
          <span className="absolute -translate-x-1/2 font-semibold text-[var(--text)]" style={{ left: `${sunsetPct}%` }}>{formatJd(sunsetJd, zone, 'time')}</span>
          {midnight > sunsetJd && midnight < end && <span className="absolute hidden -translate-x-1/2 @sm:block" style={{ left: `${pct(midnight)}%` }}>00:00</span>}
          <span className="absolute right-0">{formatJd(end, zone, 'time')}</span>
        </div>
      </div>
    </div>
  )
}

function WindowRow({ window: w, zone, active }: { window: TimeWindow; zone: string; active: boolean }) {
  const { t } = useT()
  const look = lookOf(w)
  const tone = TONE_VARS[QUALITY_META[w.quality].tone]
  return (
    <li className={cn('flex min-h-11 items-start gap-3 rounded-xl py-2', active && '-mx-2 px-2 ring-1 ring-inset')} style={active ? { background: tone.bg, '--tw-ring-color': tone.border } as CSSProperties : undefined}>
      <span aria-hidden className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md text-[0.6rem] font-bold" style={{ background: look.fill, color: look.ink }}>{look.mark}</span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="font-medium text-[var(--text)]">{windowName(w.name)}</span>
          <span className="text-sm tabular-nums text-[var(--text-muted)]">
            <span aria-hidden>{timeRange(w.startJd, w.endJd, zone)}</span>
            <span className="sr-only">{spokenRange(w.startJd, w.endJd, zone)}</span>
          </span>
        </span>
        {w.note && <span className="mt-0.5 block text-xs leading-snug text-[var(--text-muted)]">{windowNote(w)}</span>}
      </span>
      {active && <Badge tone={QUALITY_META[w.quality].tone} className="mt-0.5 shrink-0">{t('common.now')}</Badge>}
    </li>
  )
}

type Half = 'day' | 'night'


/**
 * Day and night halves side by side on wide screens. Phones show one half at a time (the one
 * running now, else the day) behind a Day / Night switch, which keeps the reasons within reach.
 */
function SplitList<T extends { startJd: number; endJd: number }>({ day, night, nowJd, row }: { day: T[]; night: T[]; nowJd: number | null; row: (item: T, active: boolean) => ReactNode }) {
  const { t } = useT()
  const halves = [{ value: 'day' as const, label: t('timings.day'), icon: <Sunrise aria-hidden /> }, { value: 'night' as const, label: t('timings.night'), icon: <Moon aria-hidden /> }]
  const [half, setHalf] = useState<Half>(() => (nowJd !== null && night.length > 0 && nowJd >= night[0].startJd ? 'night' : 'day'))
  const active = (x: T) => nowJd !== null && x === runningAt([...day, ...night], nowJd)
  return (
    <div>
      <SegmentedControl value={half} onValueChange={setHalf} options={halves} size="sm" aria-label={t('timings.part')} className="mb-3 w-full max-w-60 lg:hidden" />
      <div className="grid gap-x-8 gap-y-5 lg:grid-cols-2">
        {([['day', t('timings.day'), day, Sunrise], ['night', t('timings.night'), night, Moon]] as const).map(([key, label, items, Icon]) => (
          <div key={key} className={cn(key !== half && 'max-lg:hidden')}>
            <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)] max-lg:sr-only">
              <Icon aria-hidden className="size-3.5" />{label}
            </h3>
            <ol>{items.map((x) => row(x, active(x)))}</ol>
          </div>
        ))}
      </div>
    </div>
  )
}

const rowClass = (active: boolean) => cn(
  'grid min-h-11 grid-cols-[6.75rem_minmax(0,1fr)_auto] items-center gap-x-3 rounded-xl px-2 py-1.5 text-sm',
  active ? 'bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent)]/50' : 'odd:bg-[var(--surface-2)]',
)

function ChoghadiyaRow({ item, zone, active }: { item: TimeWindow; zone: string; active: boolean }) {
  const { t, n } = useT()
  const quality = QUALITY_META[item.quality]
  return (
    <li className={rowClass(active)} aria-current={active ? 'time' : undefined}>
      <span className="tabular-nums text-[var(--text-muted)]">{timeRange(item.startJd, item.endJd, zone)}</span>
      <span className="min-w-0 font-medium text-[var(--text)]">{n.choghadiya[item.name as keyof typeof n.choghadiya] ?? item.name}</span>
      <Badge tone={quality.tone}>{quality.label}</Badge>
      {/* "Now" opens its own line, so the name keeps its room on a 320 px phone. */}
      {active && (
        <span className="col-span-3 pb-1 text-xs leading-snug text-[var(--text-muted)]">
          <Badge tone="accent" className="mr-1.5 align-middle">{t('common.now')}</Badge>{windowNote(item)}
        </span>
      )}
    </li>
  )
}

function HoraRow({ hora, zone, active }: { hora: Hora; zone: string; active: boolean }) {
  const { t, n } = useT()
  const use = HORA_USE[hora.lord as keyof typeof HORA_USE]
  return (
    <li className={rowClass(active)} aria-current={active ? 'time' : undefined}>
      <span className="tabular-nums text-[var(--text-muted)]">{timeRange(hora.startJd, hora.endJd, zone)}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 font-medium" style={{ color: bodyColor(hora.lord) }}>
          <span aria-hidden style={{ fontFamily: GLYPH_FONT }}>{BODY_GLYPH[hora.lord]}</span>{n.body[hora.lord]}
        </span>
        {use && <span className="block truncate text-xs text-[var(--text-muted)]">{use}</span>}
      </span>
      {active ? <Badge tone="accent">{t('common.now')}</Badge> : <span />}
    </li>
  )
}
