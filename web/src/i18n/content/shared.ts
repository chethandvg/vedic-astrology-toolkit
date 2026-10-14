// Language-neutral pieces of the Indian-language interpretation packs: date formats through Intl,
// rough durations, outcome pickers and the headline template picker. Each pack supplies its own
// words; the logic mirrors the English pack (content/*.ts) so every language says the same thing.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { dateRuns, type LocalParts } from '@/content/engine'
import type { KootaKey, PoruthamKey, PoruthamStatus } from '@/engine/matching'
import { intlDates } from '../intl'
import type { Names } from '../names/en'

/** Date phrases of ENGINE_TEXT for a locale: "ಬುಧ, 14 ಅಕ್ಟೋ", runs joined with the language's "and". */
export function engineDates(tag: string, n: Names) {
  const d = intlDates(tag)
  const runLabel = (first: string, last: string, weekday: boolean) =>
    first === last ? d.short(first, weekday) : `${d.short(first, weekday)} – ${d.short(last, weekday)}`
  return {
    dateLabel: (date: string, weekday = true): string => d.short(date, weekday),
    dateList: (dates: readonly string[], weekday = true): string => n.list(dateRuns(dates).map((r) => runLabel(r[0], r.at(-1)!, weekday))),
    /** A time on another civil date than the day's: "04:03 (ಗುರು, 15 ಅಕ್ಟೋ)". */
    clockOn: (p: LocalParts): string => `${p.time} (${d.short(p.date)})`,
    fullDate: (p: LocalParts): string => d.full(p.date),
    dateTime: (p: LocalParts): string => `${d.full(p.date)}, ${p.time}`,
    monthYear: (year: number, month: number): string => d.monthYear(year, month, 'short'),
    instant: (p: LocalParts, weekday: boolean): string => `${d.short(p.date, weekday)} ${p.time}`,
  }
}

/** engine/dasha.ts describeDuration with the language's unit words: "about 2 years 8 months". */
export function duration(days: number, words: { about: (x: string) => string; years: (n: number) => string; months: (n: number) => string; weeks: (n: number) => string; days: (n: number) => string }): string {
  const months = Math.round(days / (365.2425 / 12))
  if (months >= 12) {
    const y = Math.floor(months / 12), m = months % 12
    return words.about(`${words.years(y)}${m ? ` ${words.months(m)}` : ''}`)
  }
  if (months >= 2) return words.about(words.months(months))
  const weeks = Math.round(days / 7)
  if (weeks >= 2) return words.about(words.weeks(weeks))
  return words.about(words.days(Math.max(1, Math.round(days))))
}

export interface OutcomeText {
  about: string
  full: string
  some: string
  none: string
}

/** content/matching.ts kootaOutcome over a language's table. */
export const kootaOutcomeOf = (table: Readonly<Record<KootaKey, OutcomeText>>) => (key: KootaKey, points: number, max: number): string => {
  const t = table[key]
  return points >= max ? t.full : points <= 0 ? t.none : points / max >= 0.5 ? t.some : t.none
}

/** content/matching.ts poruthamOutcome over a language's table. */
export const poruthamOutcomeOf = (table: Readonly<Record<PoruthamKey, OutcomeText>>) => (key: PoruthamKey, status: PoruthamStatus): string => {
  const t = table[key]
  return status === 'match' ? t.full : status === 'partial' ? t.some : t.none
}

/** The `variant`-th template, wrapping around (any integer works, as in content/headlines.ts). */
export const pick = <T>(templates: readonly T[], variant: number): T => templates[((variant % templates.length) + templates.length) % templates.length]

/** Prefix factor keys for per-planet phrases ("gochara_Sun"), as content/headlines.ts does. */
export const perPlanet = (prefix: string, phrases: Readonly<Record<string, string>>): Record<string, string> =>
  Object.fromEntries(Object.entries(phrases).map(([p, s]) => [`${prefix}_${p}`, s]))
