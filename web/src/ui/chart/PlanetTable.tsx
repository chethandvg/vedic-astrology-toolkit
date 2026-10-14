// Positions of the ascendant and the nine grahas: a table on wide screens and stacked
// cards on phones (only one of the two is ever displayed, so assistive tech reads one).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { clsx } from 'clsx'
import { formatDegree } from '@/engine/core'
import { useT } from '@/i18n'
import { PLANETS, type Body, type BodyPosition, type Chart } from '@/engine/types'
import { DIGNITY_LABEL, dignity, type Dignity } from './dignity'
import { BODY_GLYPH, bodyColor, GLYPH_FONT } from './planets'
import './chart.css'

const ROWS: readonly Body[] = ['Asc', ...PLANETS]

const DIGNITY_TONE: Record<Dignity, string> = {
  exalted: 'var(--badge-good)', own: 'var(--badge-own)', debilitated: 'var(--badge-bad)',
}

export function PlanetTable({ chart, className }: { chart: Chart; className?: string }) {
  const { t, n } = useT()
  const rows = ROWS.map((b) => chart.positions[b])
  return (
    <div className={className}>
      <table className="hidden w-full border-collapse text-sm md:table">
        <caption className="sr-only">{t('planets.caption')}</caption>
        <thead>
          <tr className="border-b border-(--surface-border) text-left text-[0.7rem] uppercase tracking-[0.12em] text-(--text-muted)">
            <th scope="col" className="py-2.5 pr-3 font-medium">{t('planets.body')}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('moon.sign')}</th>
            <th scope="col" className="px-3 py-2.5 text-right font-medium">{t('planets.degree')}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('moon.nakshatra')}</th>
            <th scope="col" className="px-3 py-2.5 font-medium">{t('planets.lord')}</th>
            <th scope="col" className="py-2.5 pl-3 font-medium">{t('planets.status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.body} className="border-b border-(--surface-border) last:border-0">
              <th scope="row" className="py-2.5 pr-3 text-left font-normal"><BodyCell body={p.body} /></th>
              <td className="px-3 py-2.5">
                <span className="text-(--text)">{n.sign[p.sign]}</span>
                <span className="ml-1.5 text-xs text-(--text-muted)">{n.signAlt[p.sign]}</span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-(--text)">{formatDegree(p.longitude)}</td>
              <td className="px-3 py-2.5">
                <span className="text-(--text)">{n.nakshatra[p.nakshatra.index - 1]}</span>
                <span className="ml-1.5 text-xs text-(--text-muted)">{t('chart.pada', { n: p.nakshatra.pada })}</span>
              </td>
              <td className="px-3 py-2.5" style={{ color: bodyColor(p.nakshatra.lord) }}>{n.body[p.nakshatra.lord]}</td>
              <td className="py-2.5 pl-3"><Badges position={p} placeholder /></td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="grid gap-2 md:hidden" aria-label={t('planets.caption')}>
        {rows.map((p) => (
          <li key={p.body} className="rounded-2xl border border-(--surface-border) bg-(--bg-elevated) px-3.5 py-3">
            <div className="flex items-center justify-between gap-3">
              <BodyCell body={p.body} />
              <span className="text-right text-sm">
                <span className="text-(--text)">{n.sign[p.sign]}</span>{' '}
                <span className="tabular-nums text-(--text)">{formatDegree(p.longitude)}</span>
                <span className="block text-xs text-(--text-muted)">{n.signAlt[p.sign]}</span>
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-(--surface-border) pt-2 text-xs text-(--text-muted)">
              <span>
                <span className="text-(--text)">{n.nakshatra[p.nakshatra.index - 1]}</span> · {t('chart.pada', { n: p.nakshatra.pada })} · {t('chart.lord')}{' '}
                <span style={{ color: bodyColor(p.nakshatra.lord) }}>{n.body[p.nakshatra.lord]}</span>
              </span>
              <Badges position={p} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function BodyCell({ body }: { body: Body }) {
  const { n } = useT()
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden className={clsx('grid size-8 shrink-0 place-items-center rounded-full', body === 'Asc' ? 'text-[0.7rem] font-bold' : 'text-base leading-none')}
        style={{ color: bodyColor(body), background: `color-mix(in oklab, ${bodyColor(body)} 16%, transparent)`, fontFamily: body === 'Asc' ? undefined : GLYPH_FONT }}
      >
        {BODY_GLYPH[body]}
      </span>
      <span className="leading-tight">
        <span className="block font-medium text-(--text)">{n.body[body]}</span>
        {n.bodyAlt[body] && <span className="block text-xs text-(--text-muted)">{n.bodyAlt[body]}</span>}
      </span>
    </span>
  )
}

function Badge({ tone, children }: { tone: string; children: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold"
      style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${tone} 35%, transparent)` }}
    >
      {children}
    </span>
  )
}

/** Dignity and retrograde badges; `placeholder` renders a dash when there are none (table cells). */
function Badges({ position: p, placeholder }: { position: BodyPosition; placeholder?: boolean }) {
  const { t } = useT()
  const d = dignity(p.body, p.sign)
  if (!p.retrograde && !d) {
    return placeholder ? <span className="text-xs text-(--text-muted)"><span aria-hidden>—</span><span className="sr-only">{t('common.none')}</span></span> : null
  }
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {d && <Badge tone={DIGNITY_TONE[d]}>{DIGNITY_LABEL[d]}</Badge>}
      {p.retrograde && <Badge tone="var(--badge-retro)">{t('chart.retrograde')}</Badge>}
    </span>
  )
}
