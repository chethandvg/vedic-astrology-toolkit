// Report section for the Vimsottari dasha: the nine mahadashas of the cycle and the
// antardashas of the running mahadasha, with the running periods marked and their themes.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '@/content/active'
import { useT } from '@/i18n'
import { fullDate } from '@/i18n/format'
import type { DashaPeriod } from '@/engine/types'
import { activeChain, localSpan } from '@/ui/chart/dasha'
import { bodyColor } from '@/ui/chart/planets'
import { SubHeading, TableScroll } from './ReportParts'

export interface ReportDashaProps {
  /** Mahadashas of one cycle with their antardashas (engine chart().dashas). */
  periods: readonly DashaPeriod[]
  /** Instant treated as now (JD UT). */
  now: number
  /** Birth instant: the first mahadasha began before birth, so its row reads from birth. */
  birthJd: number
  /** Zone the dates are shown in (the birth zone, as on the chart page). */
  timeZone: string
}

function PeriodTable({ periods, chain, caption, birthJd, timeZone, label }: {
  periods: readonly DashaPeriod[]
  chain: readonly DashaPeriod[]
  caption: string
  birthJd?: number
  timeZone: string
  label: string
}) {
  const { t, n } = useT()
  const date = (jd: number) => fullDate(jd, timeZone)
  return (
    <TableScroll>
      <table className="report-table report-table-compact">
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{label}</th>
          <th scope="col">{t('report.from')}</th>
          <th scope="col">{t('report.until')}</th>
          <th scope="col" className="!text-right">{t('report.length')}</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => {
          const running = chain.includes(p)
          const beforeBirth = birthJd !== undefined && p.startJd < birthJd
          return (
            <tr key={p.startJd} aria-current={running ? 'true' : undefined}>
              <th scope="row" className="font-semibold" style={{ color: bodyColor(p.lord) }}>
                {n.body[p.lord]}
                {running && <span className="ml-1.5 rounded-full bg-[var(--accent)] px-1.5 py-px align-middle text-[0.55rem] font-bold uppercase tracking-wider text-[var(--accent-contrast)]">{t('common.now')}</span>}
              </th>
              <td className="whitespace-nowrap">{beforeBirth ? t('report.birth') : date(p.startJd)}</td>
              <td className="whitespace-nowrap">{date(p.endJd)}</td>
              <td className="whitespace-nowrap text-right text-[var(--text-muted)]">{localSpan(p.endJd - (beforeBirth ? birthJd : p.startJd))}</td>
            </tr>
          )
        })}
      </tbody>
      </table>
    </TableScroll>
  )
}

export function ReportDasha({ periods, now, birthJd, timeZone }: ReportDashaProps) {
  const { t, n } = useT()
  const chain = activeChain(periods, now)
  const [md, ad, pd] = chain
  return (
    <div>
      {md && ad ? (
        <div className="report-avoid-break mb-4 rounded-xl border border-[var(--surface-border)] bg-[var(--bg-elevated)] px-4 py-3">
          <p className="text-sm font-semibold text-[var(--text)]">
            {t('report.now')} <span style={{ color: bodyColor(md.lord) }}>{n.body[md.lord]}</span> {n.dashaLevel[0]}, <span style={{ color: bodyColor(ad.lord) }}>{n.body[ad.lord]}</span> {n.dashaLevel[1]}
            {pd && <>, <span style={{ color: bodyColor(pd.lord) }}>{n.body[pd.lord]}</span> {n.dashaLevel[2]}</>}
          </p>
          <p className="mt-1 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">
            {T.dashaCombination(md.lord, ad.lord, pd?.lord)}
          </p>
        </div>
      ) : (
        <p className="mb-4 text-sm text-[var(--text-muted)]">{t('report.outsideCycle')}</p>
      )}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="report-avoid-break">
          <SubHeading>{t('report.mahadashas', { level: n.dashaLevel[0] })}</SubHeading>
          <PeriodTable periods={periods} chain={chain} caption={t('report.mahadashasCaption')} birthJd={birthJd} timeZone={timeZone} label={t('planets.lord')} />
        </div>
        {md?.children && (
          <div className="report-avoid-break">
            <SubHeading>{t('dashaTimeline.children', { level: n.dashaLevel[1], lord: n.body[md.lord] })}</SubHeading>
            <PeriodTable periods={md.children.filter((p) => p.endJd > birthJd)} chain={chain} caption={t('report.antardashasCaption', { lord: n.body[md.lord] })} birthJd={birthJd} timeZone={timeZone} label={t('planets.lord')} />
          </div>
        )}
      </div>
    </div>
  )
}
