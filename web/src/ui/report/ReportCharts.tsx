// Report sections for the birth chart: the rasi (D1) and navamsa (D9) charts in the user's
// chart style, and a compact planet table that fits an A4 page (sign, degree, nakshatra,
// star lord, navamsa sign, dignity and motion).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { formatDegree } from '@/engine/core'
import { useT } from '@/i18n'
import { PLANETS, type Body, type Chart } from '@/engine/types'
import type { ChartStyle } from '@/state/settings'
import { NorthIndianChart, SouthIndianChart } from '@/ui/chart'
import { DIGNITY_LABEL, dignity } from '@/ui/chart/dignity'
import { BODY_GLYPH, bodyColor, GLYPH_FONT } from '@/ui/chart/planets'
import { vargaInfo } from '@/ui/chart/vargas'
import { Badge } from '@/ui/components/Badge'
import { TableScroll } from './ReportParts'

const DIVISIONS = [1, 9] as const

/** D1 and D9 side by side (stacked on phones), each with its name and theme underneath. */
export function ReportCharts({ chart, chartStyle }: { chart: Chart; chartStyle: ChartStyle }) {
  useT()
  const Drawing = chartStyle === 'south' ? SouthIndianChart : NorthIndianChart
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      {DIVISIONS.map((n) => {
        const info = vargaInfo(n)
        return (
          <div key={n} className="report-avoid-break">
            {/* 72 mm keeps both charts and the planet table on one A4 page. */}
            <Drawing chart={chart} varga={n} className="mx-auto w-full max-w-[72mm]" />
            <p className="mt-2 text-center text-sm">
              <span className="font-semibold text-[var(--text)]">{info.name} (D{n})</span>
              <span className="block text-xs text-[var(--text-muted)]">{info.theme}</span>
            </p>
          </div>
        )
      })}
    </div>
  )
}

const ROWS: readonly Body[] = ['Asc', ...PLANETS]

/** One row per body: the table stays a table at every width (scrolls sideways on narrow phones). */
export function ReportPlanetTable({ chart }: { chart: Chart }) {
  const { t, n } = useT()
  const navamsa = chart.vargas[9]
  return (
    <TableScroll>
      <table className="report-table min-w-[32rem]">
        <caption className="sr-only">{t('planets.caption')}</caption>
        <thead>
          <tr>
            <th scope="col">{t('planets.body')}</th>
            <th scope="col">{t('moon.sign')}</th>
            <th scope="col" className="!text-right">{t('planets.degree')}</th>
            <th scope="col">{t('moon.nakshatra')}</th>
            <th scope="col">{t('planets.lord')}</th>
            <th scope="col">{n.varga[9]}</th>
            <th scope="col">{t('report.dignity')}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((body) => {
            const p = chart.positions[body]
            const d = dignity(body, p.sign)
            return (
              <tr key={body}>
                <th scope="row" className="font-medium">
                  <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="inline-block w-4 text-center" style={{ color: bodyColor(body), fontFamily: body === 'Asc' ? undefined : GLYPH_FONT }}>
                      {BODY_GLYPH[body]}
                    </span>
                    <span style={{ color: bodyColor(body) }}>{n.body[body]}</span>
                  </span>
                </th>
                <td>{n.sign[p.sign]}</td>
                <td className="whitespace-nowrap text-right">
                  {formatDegree(p.longitude)}
                  {p.retrograde && <sup className="ml-0.5 font-bold text-[var(--chart-retro)]" title={t('chart.retrograde')}>R<span className="sr-only"> {t('chart.retrograde')}</span></sup>}
                </td>
                <td className="whitespace-nowrap">{n.nakshatra[p.nakshatra.index - 1]} <span className="text-[var(--text-muted)]">· {p.nakshatra.pada}</span></td>
                <td style={{ color: bodyColor(p.nakshatra.lord) }}>{n.body[p.nakshatra.lord]}</td>
                <td>{n.sign[navamsa[body]]}</td>
                <td>
                  {d
                    ? <Badge tone={d === 'debilitated' ? 'bad' : d === 'exalted' ? 'good' : 'accent'}>{DIGNITY_LABEL[d]}</Badge>
                    : <span className="text-[var(--text-muted)]"><span aria-hidden>—</span><span className="sr-only">{t('common.none')}</span></span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        {t('report.planetsNote')}
      </p>
    </TableScroll>
  )
}
