// Report sections from the year forecast (engine forecast(..., 'year', ...), the same call as the
// Year page): the year's outlook with its months and leading reasons and the Muntha, then the
// slow transits with Saturn's phases (Sade Sati status) and the key dates.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { useT } from '@/i18n'
import { fullDate } from '@/i18n/format'
import { formatJd } from '@/engine/time'
import type { Forecast } from '@/engine/types'
import { bodyColor } from '@/ui/chart/planets'
import { Badge } from '@/ui/components/Badge'
import type { ForecastExtras } from '@/ui/forecast/data'
import { leadingReasons } from '@/ui/forecast/balance'
import { dateParts, monthShort } from '@/ui/forecast/dates'
import { EFFECT_META, RATING_TONE, RATING_WORD, scorePercent, TONE_VARS } from '@/ui/forecast/meta'
import { SubHeading, TableScroll } from './ReportParts'

/** Reasons that describe Saturn's phases from the Moon (engine/predict.ts saturnReasons). */
const SATURN_FACTORS: readonly string[] = ['sade_sati', 'ashtama_shani']

/** How many of the heaviest reasons the outlook lists. */
const REASONS_SHOWN = 5

/** Rating, months and the leading reasons of the year (the Muntha is among the reasons when it counts). */
export function ReportOutlook({ forecast }: { forecast: Forecast }) {
  const { t } = useT()
  const tone = RATING_TONE[forecast.rating]
  const leading = leadingReasons(forecast.reasons, REASONS_SHOWN)
  const reasons = forecast.reasons.filter((r) => leading.has(r))
  return (
    <div>
      <div className="report-avoid-break flex flex-wrap items-start gap-x-5 gap-y-3 rounded-xl border px-4 py-3.5" style={{ borderColor: TONE_VARS[tone].border, background: TONE_VARS[tone].bg }}>
        <div className="shrink-0">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]">{t('report.overall')}</p>
          <p className="font-display text-2xl font-semibold" style={{ color: TONE_VARS[tone].fg }}>{RATING_WORD[forecast.rating]}</p>
          <p className="text-xs tabular-nums text-[var(--text-muted)]">{t('score.aria', { pct: scorePercent(forecast.score) })}</p>
        </div>
        <p className="min-w-0 flex-1 basis-64 text-pretty text-sm leading-relaxed text-[var(--text)]">{forecast.headline}</p>
      </div>

      {forecast.parts && forecast.parts.length > 0 && (
        <div className="report-avoid-break mt-5">
          <SubHeading>{t('year.months')}</SubHeading>
          <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-6" aria-label={t('year.monthsAria')}>
            {forecast.parts.map((p) => {
              const t = TONE_VARS[RATING_TONE[p.rating]]
              return (
                <li key={p.start} className="rounded-lg border px-2 py-1.5 text-center" style={{ borderColor: t.border, background: t.bg }}>
                  <span className="block text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{monthShort(dateParts(p.start).month)}</span>
                  <span className="block text-xs font-semibold" style={{ color: t.fg }}>{RATING_WORD[p.rating]}</span>
                  <span className="block text-[0.65rem] tabular-nums text-[var(--text-muted)]">{scorePercent(p.score)}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {reasons.length > 0 && (
        <div className="mt-6">
          <SubHeading>{t('reasons.year')}</SubHeading>
          <ul className="space-y-3">
            {reasons.map((r) => {
              const meta = EFFECT_META[r.effect]
              return (
                <li key={`${r.factor}-${r.title}`} className="report-avoid-break border-l-2 pl-3" style={{ borderColor: TONE_VARS[meta.tone].border }}>
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--text)]">
                    {r.title}
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </p>
                  <p className="mt-0.5 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{r.text}</p>
                  <p className="mt-0.5 text-[0.7rem] italic text-[var(--text-muted)]">{r.source}</p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

    </div>
  )
}

export function ReportTransits({ forecast, extras, timeZone, placeName }: { forecast: Forecast; extras?: ForecastExtras; timeZone: string; placeName: string }) {
  const { t, n } = useT()
  const date = (jd: number) => fullDate(jd, timeZone)
  const saturnReasons = forecast.reasons.filter((r) => SATURN_FACTORS.includes(r.factor))
  const phases = extras?.saturn ?? []
  const tracks = extras?.transits ?? []
  return (
    <div>
      <div className="report-avoid-break">
        <SubHeading>{t('report.sadeSati')}</SubHeading>
        {saturnReasons.length > 0 ? (
          <ul className="space-y-2.5">
            {saturnReasons.map((r) => (
              <li key={r.title} className="text-sm">
                <span className="font-semibold text-[var(--text)]">{r.title}.</span>{' '}
                <span className="text-pretty leading-relaxed text-[var(--text-muted)]">{r.text}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t('report.noPhases')}</p>
        )}
        {phases.length > 0 && (
          <TableScroll className="mt-3"><table className="report-table">
            <caption className="sr-only">{t('report.phasesCaption')}</caption>
            <thead>
              <tr><th scope="col">{t('report.phase')}</th><th scope="col">{t('report.saturnIn', { saturn: n.body.Saturn })}</th><th scope="col">{t('report.from')}</th><th scope="col">{t('report.until')}</th></tr>
            </thead>
            <tbody>
              {phases.map((p) => (
                <tr key={p.startJd}>
                  <th scope="row" className="font-medium">{T.SATURN_PHASE_TITLE[p.phase]}</th>
                  <td>{t('bands.where', { sign: n.sign[p.sign], nth: n.ordinal(p.house) })}</td>
                  <td className="whitespace-nowrap">{date(p.startJd)}</td>
                  <td className="whitespace-nowrap">{date(p.endJd)}</td>
                </tr>
              ))}
            </tbody>
          </table></TableScroll>
        )}
      </div>

      {tracks.length > 0 && (
        <div className="report-avoid-break mt-6">
          <SubHeading>{t('report.slow')}</SubHeading>
          <TableScroll><table className="report-table">
            <caption className="sr-only">{t('report.slowCaption')}</caption>
            <thead>
              <tr><th scope="col">{t('strength.planet')}</th><th scope="col">{t('moon.sign')}</th><th scope="col">{t('report.houseFromMoon')}</th><th scope="col">{t('report.from')}</th><th scope="col">{t('report.until')}</th></tr>
            </thead>
            <tbody>
              {tracks.flatMap((track) => track.stays.map((s, i) => (
                <tr key={`${track.planet}-${s.startJd}`}>
                  <th scope="row" className="font-semibold" style={{ color: bodyColor(track.planet) }}>{i === 0 ? n.body[track.planet] : <span className="sr-only">{n.body[track.planet]}</span>}</th>
                  <td>{n.sign[s.sign]}</td>
                  <td>{n.ordinal(s.house)}</td>
                  <td className="whitespace-nowrap">{date(s.startJd)}</td>
                  <td className="whitespace-nowrap">{date(s.endJd)}</td>
                </tr>
              )))}
            </tbody>
          </table></TableScroll>
        </div>
      )}

      <div className="mt-6">
        <SubHeading>{t('events.keyDates')}</SubHeading>
        {forecast.events.length ? (
          <TableScroll><table className="report-table">
            <caption className="sr-only">{t('report.keyDatesCaption')}</caption>
            <thead>
              <tr><th scope="col">{t('field.date')}</th><th scope="col">{t('field.time')}</th><th scope="col">{t('report.event')}</th></tr>
            </thead>
            <tbody>
              {forecast.events.map((e) => {
                const meta = e.effect === undefined ? null : EFFECT_META[e.effect]
                return (
                  <tr key={`${e.jd}-${e.title}`}>
                    <td className="whitespace-nowrap">{date(e.jd)}</td>
                    <td className="whitespace-nowrap text-[var(--text-muted)]">{formatJd(e.jd, timeZone, 'time')}</td>
                    <td>
                      <span className="font-medium text-[var(--text)]">{e.title}</span>
                      {meta && e.effect !== 0 && <Badge tone={meta.tone} className="ml-2 align-middle">{meta.label}</Badge>}
                      {e.detail && <span className="block text-xs leading-relaxed text-[var(--text-muted)]">{e.detail}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></TableScroll>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">{t('events.noneYear')}</p>
        )}
        <p className="mt-2 text-xs text-[var(--text-muted)]">{t('events.localTimes', { place: placeName })}.</p>
      </div>
    </div>
  )
}
