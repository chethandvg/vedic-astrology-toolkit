// Cover of the printable report: who the chart is for, the birth details as entered and as
// computed (UTC offset, UTC instant), the calculation settings, the chart at a glance and the
// contents of the report.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useT } from '@/i18n'
import type { Chart, DashaPeriod } from '@/engine/types'
import { profileName, type Profile } from '@/state/profiles'
import type { AppSettings } from '@/state/settings'
import { bodyColor } from '@/ui/chart/planets'
import { LogoMark } from '@/ui/components/Logo'
import { longDate } from '@/ui/forecast/dates'
import { APP_URL, coordinate, FactList, Sheet, utcOffsetLabel, type Fact } from './ReportParts'


export interface ContentsEntry {
  id: string
  title: string
}

export interface ReportCoverProps {
  profile: Profile
  settings: AppSettings
  /** Natal chart, once computed. */
  chart?: Chart
  /** Running mahadasha and antardasha (and deeper), when known. */
  dasha?: readonly DashaPeriod[]
  contents: readonly ContentsEntry[]
  /** Civil date the report is prepared on, "YYYY-MM-DD". */
  today: string
}

function Glance({ term, value, note, color }: { term: string; value: string; note?: string; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--bg-elevated)] px-3.5 py-3">
      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{term}</p>
      <p className="mt-0.5 font-display text-lg font-semibold leading-tight" style={color ? { color } : undefined}>{value}</p>
      {note && <p className="text-xs text-[var(--text-muted)]">{note}</p>}
    </div>
  )
}

export function ReportCover({ profile, settings, chart, dasha, contents, today }: ReportCoverProps) {
  const { t, n } = useT()
  const { birth } = profile
  const ayanamsa = t(`ayanamsa.${settings.ayanamsa}`)
  const node = t(`node.${settings.node}`)
  const yearModel = t(`yearModel.${settings.yearModel}`)
  const birthFacts: Fact[] = [
    { term: t('field.date'), value: longDate(birth.date) },
    { term: t('field.time'), value: birth.time, note: t('report.localTime') },
    { term: t('field.place'), value: birth.place || '—' },
    { term: t('field.coordinates'), value: `${coordinate(birth.latitude, t('coord.n'), t('coord.s'))}, ${coordinate(birth.longitude, t('coord.e'), t('coord.w'))}` },
    { term: t('field.timeZone'), value: birth.timeZone, note: chart ? t('form.atBirth', { offset: utcOffsetLabel(chart.utcOffsetMinutes) }) : undefined },
    ...(chart ? [{ term: t('report.utc'), value: chart.utc.replace('T', ' ').replace(/(\.\d+)?Z$/, ' UTC') }] : []),
  ]
  const calcFacts: Fact[] = [
    { term: t('settings.ayanamsa'), value: ayanamsa, note: chart ? `${chart.ayanamsaDegrees.toFixed(4)}°` : undefined },
    { term: t('settings.preset'), value: settings.preset === 'custom' ? t('preset.custom') : t(`preset.${settings.preset}.long`) },
    { term: t('report.nodes'), value: node },
    { term: t('settings.dashaYear'), value: yearModel },
    { term: t('chart.style'), value: t(settings.chartStyle === 'north' ? 'chart.northIndian' : 'chart.southIndian') },
  ]
  const asc = chart?.positions.Asc
  const moon = chart?.positions.Moon
  const sun = chart?.positions.Sun
  return (
    <Sheet label={t('report.cover')} className="report-cover">
      <div className="flex items-center gap-2.5">
        <LogoMark className="size-9" />
        <span className="font-display text-lg font-semibold tracking-tight text-[var(--text)]">Jyotish Daily</span>
      </div>
      <div className="mt-12 sm:mt-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-text)]">{t('report.title')}</p>
        <h1 className="mt-2 text-balance font-display text-4xl font-semibold leading-tight tracking-tight text-[var(--text)] sm:text-5xl">{profileName(profile)}</h1>
        <p className="mt-3 text-pretty text-base text-[var(--text-muted)]">
          {birth.place ? t('report.bornIn', { date: longDate(birth.date), time: birth.time, place: birth.place }) : t('report.born', { date: longDate(birth.date), time: birth.time })}
        </p>
      </div>

      {asc && moon && sun && (
        <div className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4" aria-label={t('report.glance')} role="group">
          <Glance term={t('report.lagna')} value={n.sign[asc.sign]} note={t('report.ascNote', { alt: n.signAlt[asc.sign] })} color="var(--planet-asc)" />
          <Glance term={t('report.moonSign')} value={n.sign[moon.sign]} note={t('report.rasiNote', { alt: n.signAlt[moon.sign] })} color={bodyColor('Moon')} />
          <Glance term={t('report.star')} value={n.nakshatra[moon.nakshatra.index - 1]} note={`${t('chart.pada', { n: moon.nakshatra.pada })} · ${t('chart.lord')} ${n.body[moon.nakshatra.lord]}`} />
          <Glance term={t('report.sunSign')} value={n.sign[sun.sign]} note={t('report.siderealNote', { alt: n.signAlt[sun.sign] })} color={bodyColor('Sun')} />
        </div>
      )}
      {dasha && dasha.length >= 2 && (
        <p className="mt-3 text-sm text-[var(--text-muted)]">
          {t('report.runningNow')} <span className="font-medium text-[var(--text)]">{n.body[dasha[0].lord]}</span> {n.dashaLevel[0]},{' '}
          <span className="font-medium text-[var(--text)]">{n.body[dasha[1].lord]}</span> {n.dashaLevel[1]}
        </p>
      )}

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <h2 className="report-heading mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('chartPage.details')}</h2>
          <FactList facts={birthFacts} />
        </div>
        <div>
          <h2 className="report-heading mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('settings.calculation')}</h2>
          <FactList facts={calcFacts} />
        </div>
      </div>

      <nav aria-label={t('report.contents')} className="mt-10">
        <h2 className="mb-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('report.contents')}</h2>
        <ol className="grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
          {contents.map((c, i) => (
            <li key={c.id} className="flex gap-2.5">
              <span className="w-5 shrink-0 tabular-nums text-[var(--accent-text)]">{i + 1}</span>
              <a href={`#${c.id}`} onClick={(e) => { e.preventDefault(); document.getElementById(c.id)?.scrollIntoView({ behavior: 'smooth' }) }} className="text-[var(--text)] no-underline hover:underline">
                {c.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-auto pt-10 text-xs leading-relaxed text-[var(--text-muted)]">
        <p>
          {t('report.prepared', { date: longDate(today) })}
        </p>
        <p className="mt-1">
          {t('report.tendencies')} <span className="whitespace-nowrap">{APP_URL}</span>
        </p>
      </div>
    </Sheet>
  )
}
