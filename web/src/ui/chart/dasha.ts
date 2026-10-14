// Pure helpers for the dasha timeline: the running chain of periods and human spans.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { t, tp } from '@/i18n'
import { dashaChainAt } from '@/engine/dasha'

/** Mean Gregorian year and month in days, for display spans only. */
const YEAR = 365.2425
const MONTH = YEAR / 12

/** The running mahadasha, antardasha and pratyantardasha at `jd` (as deep as the data goes). */
export const activeChain = dashaChainAt

/** Compact civil length of a period: "19y", "2y 4m", "4m 12d", "18d". */
export function formatSpan(days: number): string {
  if (days >= YEAR - 0.5) {
    let y = Math.floor((days + 0.5) / YEAR)
    let m = Math.round((days - y * YEAR) / MONTH)
    if (m >= 12) { y += 1; m = 0 }
    if (m < 0) m = 0
    return m ? `${y}y ${m}m` : `${y}y`
  }
  if (days >= MONTH - 0.5) {
    const m = Math.floor((days + 0.5) / MONTH)
    const d = Math.round(days - m * MONTH)
    return d > 0 ? `${m}m ${d}d` : `${m}m`
  }
  return `${Math.max(1, Math.round(days))}d`
}

/** Spelled-out span for screen readers: "2 years 4 months". */
export function spokenSpan(days: number): string {
  const units: Record<string, string> = { y: 'year', m: 'month', d: 'day' }
  return formatSpan(days).split(' ').map((part) => {
    const n = Number(part.slice(0, -1))
    return `${n} ${units[part.slice(-1)]}${n === 1 ? '' : 's'}`
  }).join(' ')
}

/** formatSpan in the current language ("2y 3m" -> "2ವ 3ತಿ"). */
export const localSpan = (days: number): string =>
  formatSpan(days).replace(/(\d+)([ymd])/g, (_, n: string, unit: string) => t(`span.${unit as 'y' | 'm' | 'd'}`, { n }))

/** spokenSpan in the current language. */
export const localSpokenSpan = (days: number): string =>
  formatSpan(days).split(' ').map((part) => tp(`spoken.${part.slice(-1)}`, Number(part.slice(0, -1)))).join(' ')

/** Approximate Gregorian year of a JD, for axis ticks (exact to well under a day). */
export const jdYear = (jd: number): number => 2000 + (jd - 2451544.5) / YEAR

/** JD of 1 January of `year` 00:00 UT, from the proleptic Gregorian day count. */
export function jdOfYear(year: number): number {
  const y = year - 1
  return 1721425.5 + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400)
}

/** Year ticks inside [startJd, endJd] every `step` years, aligned to multiples of `step`. */
export function yearTicks(startJd: number, endJd: number, step: number): { year: number; jd: number }[] {
  const ticks: { year: number; jd: number }[] = []
  for (let year = Math.ceil(jdYear(startJd) / step) * step; jdOfYear(year) <= endJd; year += step) {
    const jd = jdOfYear(year)
    if (jd >= startJd) ticks.push({ year, jd })
  }
  return ticks
}
