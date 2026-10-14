// Vimsottari dasha, ported from vimsottari() in vedic_toolkit/dashas.py and dated() in
// vedic_toolkit/astronomy.py (book PDF 189-194). Periods are half-open [startJd, endJd).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { NAKSHATRA_SPAN, norm, VIM_ORDER, VIM_YEARS } from './core'
import type { DashaPeriod, Planet, TimedEvent, YearModel } from './types'

/** Days per dasha year: Rao's book counts 360-day savana years; most software uses 365.2425. */
export const DASHA_YEAR_DAYS: Readonly<Record<YearModel, number>> = { solar: 365.2425, savana: 360 }

const TOTAL_YEARS = 120
const LEVEL_NAMES = ['Mahadasha', 'Antardasha', 'Pratyantardasha'] as const

const rotate = (start: Planet): Planet[] => {
  const i = VIM_ORDER.indexOf(start)
  return [...VIM_ORDER.slice(i), ...VIM_ORDER.slice(0, i)]
}

/**
 * Split [startJd, endJd) among the nine lords in proportion to their years, starting with
 * `lord` itself (the parent's own sub-period comes first). Adjacent children share their
 * boundary value and the last child ends exactly at the parent's end, so intervals tile.
 */
function subdivide(lord: Planet, level: 0 | 1 | 2, startJd: number, endJd: number, depth: number): DashaPeriod[] {
  const span = endJd - startJd
  let elapsed = 0
  let t = startJd
  return rotate(lord).map((sub, i) => {
    elapsed += VIM_YEARS[sub]
    const end = i === 8 ? endJd : startJd + (span * elapsed) / TOTAL_YEARS
    const period: DashaPeriod = { lord: sub, level, startJd: t, endJd: end }
    if (level < depth) period.children = subdivide(sub, (level + 1) as 1 | 2, t, end, depth)
    t = end
    return period
  })
}

/**
 * Vimsottari mahadashas from the natal Moon. The first mahadasha is the lord of the Moon's
 * nakshatra and starts before birth by the fraction of the nakshatra already traversed; its
 * sub-periods divide the FULL mahadasha, never just the balance left at birth.
 * `depth` 0 = mahadashas only, 1 = with antardashas, 2 = with pratyantardashas.
 * `cycles` repeats the 120-year sequence (1..5).
 */
export function vimsottari(moonLongitude: number, birthJd: number, yearModel: YearModel, depth: 0 | 1 | 2 = 2, cycles = 1): DashaPeriod[] {
  if (!Number.isInteger(cycles) || cycles < 1 || cycles > 5) throw new Error('cycles must be an integer 1..5')
  const x = norm(moonLongitude)
  const n = Math.min(26, Math.floor(x / NAKSHATRA_SPAN))
  const elapsed = (x - n * NAKSHATRA_SPAN) / NAKSHATRA_SPAN
  const first = VIM_ORDER[n % 9]
  const days = DASHA_YEAR_DAYS[yearModel]
  const sequence = Array.from({ length: cycles }, () => rotate(first)).flat()
  // Accumulate in years, as the toolkit does, so boundaries do not drift with JD rounding.
  let years = -elapsed * VIM_YEARS[first]
  let start = birthJd + years * days
  return sequence.map((lord) => {
    years += VIM_YEARS[lord]
    const end = birthJd + years * days
    const period: DashaPeriod = { lord, level: 0, startJd: start, endJd: end }
    if (depth > 0) period.children = subdivide(lord, 1, start, end, depth)
    start = end
    return period
  })
}

/** The running chain [mahadasha, antardasha, pratyantardasha] at `jd` (shorter if depth is less); [] outside the range. */
export function dashaChainAt(periods: readonly DashaPeriod[], jd: number): DashaPeriod[] {
  const chain: DashaPeriod[] = []
  let level: readonly DashaPeriod[] | undefined = periods
  while (level?.length) {
    const hit: DashaPeriod | undefined = level.find((p) => p.startJd <= jd && jd < p.endJd)
    if (!hit) break
    chain.push(hit)
    level = hit.children
  }
  return chain
}

/** Rough length in plain words, e.g. "about 2 years 8 months", "about 3 weeks". */
export function describeDuration(days: number): string {
  const months = Math.round(days / (365.2425 / 12))
  if (months >= 12) {
    const y = Math.floor(months / 12), m = months % 12
    return `about ${y} year${y > 1 ? 's' : ''}${m ? ` ${m} month${m > 1 ? 's' : ''}` : ''}`
  }
  if (months >= 2) return `about ${months} months`
  const weeks = Math.round(days / 7)
  if (weeks >= 2) return `about ${weeks} weeks`
  const d = Math.max(1, Math.round(days))
  return `about ${d} day${d > 1 ? 's' : ''}`
}

/**
 * Dasha changes with startJd <= jd < endJd, down to `maxLevel` (0..2). A new mahadasha also
 * starts its first antardasha and pratyantardasha, so each instant yields one event, named
 * after the highest level that changes, e.g. "Antardasha of Venus begins (Jupiter–Venus)".
 */
export function dashaChanges(periods: readonly DashaPeriod[], startJd: number, endJd: number, maxLevel: 0 | 1 | 2): TimedEvent[] {
  const out: TimedEvent[] = []
  const visit = (list: readonly DashaPeriod[], parents: readonly Planet[], parentStart: number | null) => {
    for (const p of list) {
      if (p.endJd <= startJd || p.startJd >= endJd || p.level > maxLevel) continue
      const chain = [...parents, p.lord]
      // A child that starts with its parent is already announced by the parent's event.
      if (p.startJd >= startJd && p.startJd !== parentStart) {
        out.push({
          jd: p.startJd,
          kind: 'dasha',
          body: p.lord,
          title: `${LEVEL_NAMES[p.level]} of ${p.lord} begins${chain.length > 1 ? ` (${chain.join('–')})` : ''}`,
          detail: `Lasts ${describeDuration(p.endJd - p.startJd)}.`,
        })
      }
      if (p.children) visit(p.children, chain, p.startJd)
    }
  }
  visit(periods, [], null)
  return out.sort((a, b) => a.jd - b.jd)
}
