// Extension slots of the report for sections computed elsewhere: yogas and planetary strengths.
// Both render nothing until given data (or children), so the report never prints an empty section;
// the page lists them in its contents only when hasSlotContent() says they have something.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import type { Planet } from '@/engine/types'
import { useT } from '@/i18n'
import { bodyColor } from '@/ui/chart/planets'
import { Badge, type BadgeTone } from '@/ui/components/Badge'
import { TableScroll } from './ReportParts'

interface SlotProps {
  /** A short paragraph above the list or table. */
  intro?: ReactNode
  /** Free-form content after the list or table (or instead of it). */
  children?: ReactNode
}

/** True when a slot was given anything to show. */
export const hasSlotContent = (props: (SlotProps & { items?: readonly unknown[] }) | undefined): boolean =>
  !!props && (props.items !== undefined || (props.children !== undefined && props.children !== null))

export interface ReportYoga {
  name: string
  /** e.g. "Raja yoga", "Dhana yoga". */
  category?: string
  /** e.g. "Present", "Partial", "Cancelled". */
  status?: string
  statusTone?: BadgeTone
  /** One or two plain sentences on what it suggests. */
  summary?: ReactNode
  /** Grahas that form it. */
  participants?: readonly Planet[]
  /** Where the rule comes from, e.g. "Rao, ch. 11 (p. 123)". */
  source?: string
}

export interface ReportYogasProps extends SlotProps {
  /** Yogas to list; an empty array prints a "none found" line. */
  items?: readonly ReportYoga[]
}

export function ReportYogas({ items, intro, children }: ReportYogasProps) {
  const { t, n } = useT()
  if (!hasSlotContent({ items, children })) return null
  return (
    <div>
      {intro && <div className="mb-3 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{intro}</div>}
      {items && (items.length ? (
        <ul className="space-y-3">
          {items.map((y) => (
            <li key={y.name} className="report-avoid-break border-l-2 border-[var(--accent)] pl-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-[var(--text)]">
                {y.name}
                {y.category && <span className="text-xs font-normal text-[var(--text-muted)]">{y.category}</span>}
                {y.status && <Badge tone={y.statusTone ?? 'neutral'}>{y.status}</Badge>}
              </p>
              {y.participants && y.participants.length > 0 && (
                <p className="text-xs text-[var(--text-muted)]">
                  {t('yoga.formedBy')} {y.participants.map((p, i) => <span key={p}>{i > 0 && ', '}<span style={{ color: bodyColor(p) }}>{n.body[p]}</span></span>)}
                </p>
              )}
              {y.summary && <p className="mt-0.5 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{y.summary}</p>}
              {y.source && <p className="mt-0.5 text-[0.7rem] italic text-[var(--text-muted)]">{y.source}</p>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">{t('report.noYogas')}</p>
      ))}
      {children}
    </div>
  )
}

export interface ReportStrength {
  planet: Planet
  /** Shadbala in rupas. */
  shadbala?: number
  /** Minimum shadbala required for the planet, in rupas. */
  required?: number
  /** Vimsopaka bala out of 20. */
  vimsopaka?: number
  note?: ReactNode
}

export interface ReportStrengthsProps extends SlotProps {
  items?: readonly ReportStrength[]
}

const fixed = (n: number | undefined, digits: number) => (n === undefined ? '—' : n.toFixed(digits))

export function ReportStrengths({ items, intro, children }: ReportStrengthsProps) {
  const { t, n } = useT()
  if (!hasSlotContent({ items, children })) return null
  const has = (key: keyof ReportStrength) => !!items?.some((s) => s[key] !== undefined)
  const ratio = items?.some((s) => s.shadbala !== undefined && s.required !== undefined)
  return (
    <div>
      {intro && <div className="mb-3 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{intro}</div>}
      {items && items.length > 0 && (
        <TableScroll>
        <table className="report-table">
          <caption className="sr-only">{t('report.strengths')}</caption>
          <thead>
            <tr>
              <th scope="col">{t('strength.planet')}</th>
              {has('shadbala') && <th scope="col" className="!text-right">{t('report.shadbala')}</th>}
              {has('required') && <th scope="col" className="!text-right">{t('report.required')}</th>}
              {ratio && <th scope="col" className="!text-right">{t('report.ratio')}</th>}
              {has('vimsopaka') && <th scope="col" className="!text-right">{t('report.vimsopaka')}</th>}
              {has('note') && <th scope="col">{t('report.note')}</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.planet}>
                <th scope="row" className="font-semibold" style={{ color: bodyColor(s.planet) }}>{n.body[s.planet]}</th>
                {has('shadbala') && <td className="text-right">{fixed(s.shadbala, 2)}</td>}
                {has('required') && <td className="text-right">{fixed(s.required, 1)}</td>}
                {ratio && <td className="text-right">{s.shadbala !== undefined && s.required ? (s.shadbala / s.required).toFixed(2) : '—'}</td>}
                {has('vimsopaka') && <td className="text-right">{fixed(s.vimsopaka, 2)}</td>}
                {has('note') && <td className="text-[var(--text-muted)]">{s.note}</td>}
              </tr>
            ))}
          </tbody>
        </table>
        </TableScroll>
      )}
      {children}
    </div>
  )
}
