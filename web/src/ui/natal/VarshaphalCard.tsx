// The Tajaka annual chart (Varshaphal) of the year that begins in the calendar year shown: when it
// starts, its ascendant, the Muntha, the year lord and why, the running Mudda dasha period and a
// few key sahams with their houses in the annual chart.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CalendarClock } from 'lucide-react'
import type { ReactNode } from 'react'
import { T } from '@/content/active'
import { useT } from '@/i18n'
import { dateTime, fullDate } from '@/i18n/format'
import { houseFrom, signOf } from '@/engine/core'
import type { AnnualChart } from '@/engine/tajaka'
import { bodyColor } from '@/ui/chart/planets'
import { Panel } from '@/ui/forecast/Section'

export function VarshaphalCard({ annual, timeZone, nowJd, className }: { annual: AnnualChart; timeZone: string; nowJd: number; className?: string }) {
  const { t, n } = useT()
  const asc = annual.chart.positions.Asc.sign
  const lord = annual.yearLord
  const mudda = annual.mudda.find((p) => p.startJd <= nowJd && nowJd < p.endJd)
  const running = mudda ?? annual.mudda.find((p) => p.endJd > annual.returnJd) ?? annual.mudda[0]
  const next = annual.mudda[annual.mudda.indexOf(running) + 1]
  return (
    <Panel
      title={t('varsha.title')}
      description={t('varsha.span', { from: fullDate(annual.returnJd, timeZone), to: fullDate(annual.nextReturnJd, timeZone) })}
      icon={<CalendarClock />}
      className={className}
    >
      <p className="mb-4 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{T.VARSHAPHAL_INTRO}</p>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        <Fact term={t('varsha.begins')}>{dateTime(annual.returnJd, timeZone)}</Fact>
        <Fact term={t('varsha.asc')}>{n.sign[asc]}</Fact>
        <Fact term={t('muntha.title')}>{t('varsha.muntha', { sign: n.sign[annual.munthaSign], nth: n.ordinal(annual.munthaHouse) })}</Fact>
        <Fact term={t('varsha.lord')}>
          {lord?.lord ? <span className="font-semibold" style={{ color: bodyColor(lord.lord) }}>{n.body[lord.lord]}</span>
            : lord ? <>{t('varsha.tied', { list: lord.tiedCandidates.map((p) => n.body[p]).join(', ') })}</> : t('varsha.noLord')}
          {lord && <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">{lord.lord ? T.YEAR_LORD_REASON_TEXT[lord.reason] : T.YEAR_LORD_TIED_TEXT} {t('varsha.candidates', { list: [...new Set(annual.yearLordCandidates ?? [])].map((p) => n.body[p]).join(', ') })}</span>}
        </Fact>
        <Fact term={mudda ? t('varsha.muddaNow') : t('varsha.muddaStart')}>
          <span className="font-semibold" style={{ color: bodyColor(running.lord) }}>{n.body[running.lord]}</span> {t('common.until', { x: fullDate(running.endJd, timeZone) })}
          {next && <span className="text-[var(--text-muted)]">{t('varsha.then', { lord: n.body[next.lord] })}</span>}
          <span className="mt-0.5 block text-xs leading-relaxed text-[var(--text-muted)]">{T.MUDDA_TEXT}</span>
        </Fact>
        {annual.sahams && (
          <Fact term={t('varsha.sahams')}>
            <ul className="space-y-0.5">
              {T.KEY_SAHAMS.map((s) => {
                const sign = signOf(annual.sahams![s.name as keyof NonNullable<typeof annual.sahams>])
                return <li key={s.name}>{s.label} <span className="text-[var(--text-muted)]">({s.name})</span>: {t('varsha.saham', { sign: n.sign[sign], nth: n.ordinal(houseFrom(asc, sign)) })}</li>
              })}
            </ul>
          </Fact>
        )}
      </dl>
    </Panel>
  )
}

function Fact({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">{term}</dt>
      <dd className="m-0 mt-0.5 text-[var(--text)]">{children}</dd>
    </div>
  )
}
