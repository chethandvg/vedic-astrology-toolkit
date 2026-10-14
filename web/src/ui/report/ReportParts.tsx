// Building blocks of the printable report: sheets (each starts a printed page), numbered
// section headings, fact lists and small helpers shared by the report sections.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ReactNode } from 'react'
import { t } from '@/i18n'
import { cn } from '@/lib/cn'
import './print.css'

/** The live app, printed in the footer of every page and on the cover. */
export const APP_URL = 'https://chethandvg.github.io/vedic-astrology-toolkit/'

/** A sheet of paper on screen; in print each sheet after the first starts a new page. */
export function Sheet({ children, className, label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={cn('report-sheet', className)} role={label ? 'group' : undefined} aria-label={label}>
      {children}
    </div>
  )
}

export interface ReportSectionProps {
  /** Anchor id, also used by the contents list on the cover. */
  id: string
  /** Section number shown above the title. */
  number?: number
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}

/** A numbered section of the report with its own heading. */
export function ReportSection({ id, number, title, description, children, className }: ReportSectionProps) {
  const headingId = `${id}-title`
  return (
    <section id={id} aria-labelledby={headingId} className={cn('mt-8 first:mt-0', className)}>
      <header className="report-heading mb-4 border-b border-[var(--divider)] pb-2.5">
        {number !== undefined && (
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[var(--accent-text)]">{t('report.section', { n: number })}</p>
        )}
        <h2 id={headingId} className="font-display text-2xl font-semibold tracking-tight text-[var(--text)]">{title}</h2>
        {description && <p className="mt-1 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>}
      </header>
      {children}
    </section>
  )
}

/** A smaller heading inside a section. */
export function SubHeading({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn('report-heading mb-2 font-display text-base font-semibold text-[var(--text)]', className)}>{children}</h3>
}

export interface Fact {
  term: string
  value: ReactNode
  note?: ReactNode
}

/** Term and value pairs in two columns; values may carry a muted note. */
export function FactList({ facts, className, label }: { facts: readonly Fact[]; className?: string; label?: string }) {
  return (
    <dl className={cn('grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-sm', className)} aria-label={label}>
      {facts.map((f) => (
        <div key={f.term} className="contents">
          <dt className="text-[var(--text-muted)]">{f.term}</dt>
          <dd className="m-0 min-w-0 font-medium text-[var(--text)]">
            {f.value}
            {f.note && <span className="ml-1.5 font-normal text-[var(--text-muted)]">{f.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Lets a wide table scroll sideways on narrow phones instead of widening the page; in print it lays out flat. */
export function TableScroll({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('report-scroll', className)}>{children}</div>
}

/** A muted line for a section whose data is still loading or failed. */
export function SectionStatus({ children }: { children: ReactNode }) {
  return <p className="text-sm text-[var(--text-muted)]">{children}</p>
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** "UTC+05:30" from an offset in minutes east of UTC; seconds only when present (local mean time). */
export function utcOffsetLabel(minutes: number): string {
  const sign = minutes < 0 ? '−' : '+'
  const s = Math.abs(Math.round(minutes * 60))
  const hm = `${pad2(Math.floor(s / 3600))}:${pad2(Math.floor(s / 60) % 60)}`
  return `UTC${sign}${s % 60 ? `${hm}:${pad2(s % 60)}` : hm}`
}

/** "12.9719° N" */
export const coordinate = (value: number, pos: string, neg: string): string => `${Math.abs(value).toFixed(4)}° ${value >= 0 ? pos : neg}`
