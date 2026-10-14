// One-line headlines assembled from the strongest supportive and cautionary reasons.
// Phrases are keyed by Reason.factor; templates are original.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Planet, Rating } from '@/engine/types'
import { capitalize } from './format'

const PLANET_SUPPORT: Readonly<Record<Planet, string>> = {
  Sun: 'the Sun\'s backing', Moon: 'a kindly Moon', Mars: 'Mars\'s drive', Mercury: 'Mercury\'s clear thinking',
  Jupiter: 'Jupiter\'s blessing', Venus: 'Venus\'s charm', Saturn: 'Saturn\'s steady backing', Rahu: 'Rahu\'s boldness', Ketu: 'Ketu\'s focus',
}

/** Each phrase has to fit every difficult house of its planet (see GOCHARA_TEXT), not just one. */
const PLANET_CAUTION: Readonly<Record<Planet, string>> = {
  Sun: 'conserve your energy and avoid ego clashes', Moon: 'keep the pace gentle', Mars: 'keep haste and tempers in check',
  Mercury: 'double-check messages and figures', Jupiter: 'avoid overcommitting', Venus: 'handle relationships with extra tact',
  Saturn: 'pace yourself', Rahu: 'avoid shortcuts', Ketu: 'stay grounded',
}

const perPlanet = (prefix: string, phrases: Readonly<Record<Planet, string>>) =>
  Object.fromEntries(Object.entries(phrases).map(([p, s]) => [`${prefix}_${p}`, s]))

/** Noun phrases for supportive factors, used mid-sentence. */
export const SUPPORT_PHRASE: Readonly<Record<string, string>> = {
  tara_bala: 'a favourable Moon star',
  chandra_bala: 'a well-placed Moon',
  dasha_transit: 'your dasha lord\'s support',
  dasha_promise: 'a well-placed dasha lord',
  best_days: 'a few bright days',
  muntha: 'a well-placed Muntha',
  ...perPlanet('gochara', PLANET_SUPPORT),
  ...perPlanet('ingress', PLANET_SUPPORT),
}

/** Imperative clauses for cautionary factors, used mid-sentence. */
export const CAUTION_PHRASE: Readonly<Record<string, string>> = {
  tara_bala: 'keep important starts for another day',
  chandra_bala: 'keep the pace gentle',
  chandrashtama: 'go gently while the Moon crosses your 8th',
  careful_days: 'go gently on the harder days',
  dasha_transit: 'give your current dasha themes some patience',
  dasha_promise: 'pace the demands of your current dasha',
  tithi: 'save new ventures for a fuller tithi',
  vishti: 'avoid new starts during Vishti karana',
  rahu_kalam: 'keep big decisions away from Rahu Kalam',
  sade_sati: 'stay patient through Saturn\'s Sade Sati',
  ashtama_shani: 'keep a steady pace through Saturn\'s slower phase',
  muntha: 'plan carefully where the year\'s Muntha points',
  ...perPlanet('gochara', PLANET_CAUTION),
  ...perPlanet('ingress', PLANET_CAUTION),
}

/**
 * Caution for a day the Moon's stay in the 8th sign only touches (it begins after the middle of the
 * daytime or ends before it), with its time: such a day keeps its own rating until then.
 */
export function chandrashtamaCaution(at: { from: string } | { until: string }): string {
  return 'from' in at ? `go gently from ${at.from}, as the Moon enters your 8th` : `go gently until ${at.until}, when the Moon leaves your 8th`
}

type DayTemplate = (support?: string, caution?: string) => string

/** Two wordings per rating; the engine alternates them by date so consecutive days read differently. */
const DAY_TEMPLATES: Readonly<Record<Rating, readonly DayTemplate[]>> = {
  favourable: [
    (s, c) => `${s ? `${capitalize(s)} lifts the day` : 'A supportive day'}${c ? `, but ${c}` : ''}.`,
    (s, c) => `${s ? `A good day, helped by ${s}` : 'A good day overall'}${c ? `; just ${c}` : ''}.`,
  ],
  mixed: [
    (s, c) => (s && c ? `Mixed signals: ${s} helps, but ${c}.` : s ? `A mixed day; ${s} is your best support.` : `A quiet, mixed day${c ? `: ${c}` : ''}.`),
    (s, c) => (s && c ? `A balanced day: lean on ${s} and ${c}.` : s ? `An even day, with ${s} on your side.` : `An even day${c ? `; ${c}` : ''}.`),
  ],
  challenging: [
    (s, c) => `A day to take slowly${c ? `: ${c}` : ''}${s ? `, though ${s} helps` : ''}.`,
    (s, c) => `A quieter day${c ? ` to ${c}` : ''}${s ? `, with ${s} still on your side` : ''}.`,
  ],
}

/** Number of headline wordings per rating for a day (any integer works as `variant`). */
export const DAY_HEADLINE_VARIANTS = 2

/** Headline of a single day from its strongest supportive phrase and cautionary clause. */
export function dayHeadline(rating: Rating, support?: string, caution?: string, variant = 0): string {
  const templates = DAY_TEMPLATES[rating]
  return templates[((variant % templates.length) + templates.length) % templates.length](support, caution)
}

/** A mixed Chandrashtama day still opens with the 8th-sign Moon; the support comes second. */
const CHANDRASHTAMA_MIXED: readonly ((support?: string) => string)[] = [
  (s) => `${capitalize(CAUTION_PHRASE.chandrashtama)}${s ? `; ${s} keeps the day workable` : ''}.`,
  (s) => `A steady day at best: ${CAUTION_PHRASE.chandrashtama}${s ? `, with ${s} on your side` : ''}.`,
]

/**
 * Headline of a Chandrashtama day (the Moon in the 8th sign from the birth Moon for most of the
 * daytime): its caution always leads. Such a day is rated mixed at best, never favourable.
 */
export function chandrashtamaHeadline(rating: Rating, support?: string, variant = 0): string {
  if (rating !== 'mixed') return dayHeadline('challenging', support, CAUTION_PHRASE.chandrashtama, variant)
  const n = CHANDRASHTAMA_MIXED.length
  return CHANDRASHTAMA_MIXED[((variant % n) + n) % n](support)
}

/**
 * Headline of a week or month from its best and most careful dates (already formatted). The
 * dates are never the subject of a verb, so one date and a list of dates read equally well.
 */
export function periodHeadline(horizon: 'week' | 'month', rating: Rating, best?: string, careful?: string): string {
  const at = horizon === 'week' ? 'on' : 'around'
  if (rating === 'favourable') return `A supportive ${horizon}${best ? `, brightest ${at} ${best}` : ''}${careful ? `; go gently ${at} ${careful}` : ''}.`
  if (rating === 'challenging') {
    return `A ${horizon} for patience${careful ? `, especially ${at} ${careful}` : ''}${best ? `; most support ${at} ${best}` : ''}.`
  }
  return `A mixed ${horizon}${best ? `: best ${at} ${best}` : ''}${careful ? `${best ? ',' : ':'} go gently ${at} ${careful}` : ''}.`
}

/** Headline of a year from its strongest long-running support and caution. */
export function yearHeadline(rating: Rating, support?: string, caution?: string): string {
  if (rating === 'favourable') return `A promising year${support ? ` with ${support}` : ''}${caution ? `, though ${caution}` : ''}.`
  if (rating === 'challenging') return `A year to build patiently${caution ? `: ${caution}` : ''}${support ? `, helped by ${support}` : ''}.`
  if (support && caution) return `A mixed year: ${support} helps, but ${caution}.`
  return `A mixed year${support ? ` with ${support}` : ''}${caution ? `; ${caution}` : ''}.`
}
