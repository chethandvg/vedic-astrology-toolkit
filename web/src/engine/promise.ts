// Natal promise: what each planet can deliver in its dasha for this particular chart, so that the
// forecasts read the running dasha lords (and, modestly, the transiting planets) from the birth
// chart rather than from the planet's general nature alone.
//
// The classical basis:
// - A dasha gives the results of the houses its lord rules and occupies, counted from the lagna,
//   coloured by its strength. BPHS ch. 53 v. 49 (dasha effects): a strong dasha lord in an angle,
//   a trine or the 11th brings comfort and gains; lords in or of the 6th, 8th and 12th give harder
//   results. Rao reads dashas the same way (ch. 16, PDF 189-202) from functional nature.
// - Functional nature by lordship for each rising sign: Rao Table 30 (PDF 152-153, functional.ts),
//   which follows Laghu Parashari (trine lords good, lords of 3, 6, 8, 11 harder, angle lords
//   neutral, a planet ruling both an angle and a trine a yogakaraka).
// - Vipareeta raja yoga: a lord of the 6th, 8th or 12th placed in one of those houses turns the
//   difficulty around (Rao PDF 124, the toolkit's Vipareeta_Raaja_base condition); it is not
//   counted when that lord is debilitated, as most modern texts add, nor for a lord of the lagna or
//   a trine, whose own houses suffer from a 6th/8th/12th placement (BPHS ch. 24, lords in houses).
// - Upachaya: natural malefics (Sun, Mars, Saturn and the nodes) do well in the 3rd, 6th and 11th
//   (Rao PDF 127-128, the toolkit's advanced_raaja_05/17 conditions, and the gochara rule in
//   gochara.ts; the 11th is good for every planet anyway).
// - Rahu and Ketu own no sign here; as commonly taught they act for their sign lord (dispositor)
//   and the house they occupy, so they borrow half of the dispositor's functional role.
// - Strength: dignity (Rao Table 7 compound relations), Shadbala as a share of the Raman/Sripati
//   minimum (strengths.ts), combustion, and the met yogas the planet takes part in (yogas.ts).
// The weights below are this app's own, chosen so that a typical chart's promises average close to
// zero (tests/predict.test.ts measures them over the toolkit fixtures).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { yogaContent } from '../content/yogas'
import { houseFrom, SIGN_LORDS } from './core'
import { functionalRole, type FunctionalRole } from './functional'
import { compoundRelation, GRAHAS, strengthsFor, strongPlanets, type Graha, type NatalStrengths, type Relation } from './strengths'
import type { Chart, Effect, Planet } from './types'
import { PLANETS } from './types'
import { evaluateYogas, type YogaResult } from './yogas'

export type Dignity = 'exalted' | 'moolatrikona' | Relation | 'debilitated'

export interface LordPromise {
  planet: Planet
  /** Functional role for the rising sign; the nodes are 'unclassified' and borrow their dispositor's. */
  role: FunctionalRole
  yogakaraka: boolean
  /** Houses it rules, counted from the lagna (none for the nodes). */
  rules: number[]
  /** House it occupies, counted from the lagna. */
  house: number
  /** Sign lord, for the nodes (whose role they borrow). */
  dispositor?: Planet
  dignity: Dignity
  /** Shadbala as a share of the required minimum; null for the nodes or when Shadbala is unavailable. */
  strengthRatio: number | null
  combust: boolean
  /** A lord of the 6th, 8th or 12th placed in one of them, not debilitated, ruling no trine or the lagna. */
  vipareeta: boolean
  /** Toolkit names of the met yogas it takes part in, by their nature. */
  supportiveYogas: string[]
  challengingYogas: string[]
  /** Combined promise in [-1, 1]. */
  score: number
  /** +1 supportive, -1 asks for care, 0 mixed (|score| below PROMISE_THRESHOLD). */
  effect: Effect
}

/** |score| at or above this gives a clear effect. */
export const PROMISE_THRESHOLD = 0.15

/** Shares of the promise score. Lordship leads, as in Laghu Parashari; placement next. */
export const PROMISE_WEIGHTS = { role: 0.4, placement: 0.25, dignity: 0.15, strength: 0.15, yogas: 0.1, combust: 0.1 } as const

const ROLE_VALUE: Readonly<Record<FunctionalRole, number>> = { benefic: 0.75, neutral: 0, malefic: -0.75, unclassified: 0 }

const DIGNITY_VALUE: Readonly<Record<Dignity, number>> = {
  exalted: 1, moolatrikona: 0.75, own: 0.75, great_friend: 0.5, friend: 0.25, neutral: 0, enemy: -0.25, great_enemy: -0.5, debilitated: -1,
}

const DUSTHANA = [6, 8, 12]
const TRIKONA = [1, 5, 9]
const KENDRA = [4, 7, 10]
const UPACHAYA_GOOD = [3, 6, 11]
const NATURAL_MALEFICS: readonly Planet[] = ['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu']

/**
 * BPHS ch. 53 v. 49: trines best, angles and the 11th good, the 6th, 8th and 12th hard; natural
 * malefics are good in the 3rd, 6th and 11th (upachaya), checked before the hard-house rule.
 */
export function placementValue(planet: Planet, house: number, vipareeta: boolean): number {
  if (TRIKONA.includes(house)) return 1
  if (NATURAL_MALEFICS.includes(planet) && UPACHAYA_GOOD.includes(house)) return 0.5
  if (KENDRA.includes(house) || house === 11) return 0.5
  if (DUSTHANA.includes(house)) return vipareeta ? 0.5 : -1
  return 0
}

/** Yogas whose effect the `vipareeta` flag already carries (a hard-house lord in a hard house). */
const VIPAREETA_YOGAS: readonly string[] = ['Vipareeta_Raaja_base', 'Vipareeta_Raaja_ideal', 'Harsha', 'Sarala', 'Vimala']

/**
 * Shadbala as a share of the minimum, centred on 1.1 (the mean over the toolkit's 64 fixture charts
 * is 1.12): 0.7 or less maps to -1, 1.5 or more to +1.
 */
const strengthValue = (ratio: number | null) => (ratio === null ? 0 : Math.max(-1, Math.min(1, (ratio - 1.1) / 0.4)))

/**
 * Subtracted from every raw promise. Placement alone averages about +0.3 (six of the twelve houses
 * count as good, three as hard, and Vipareeta lifts some of those), so without it a typical chart's
 * planets averaged +0.12 and most dashas read as supportive.
 */
export const PROMISE_CENTRE = 0.1

/** Yoga categories whose rules name a few specific planets (the chart patterns involve all seven). */
const PATTERN_CATEGORIES: readonly string[] = ['nabhasa', 'sankhya']

const clamp1 = (x: number) => Math.max(-1, Math.min(1, x))
const round3 = (x: number) => Math.round(x * 1000) / 1000 + 0

export const promiseEffect = (score: number): Effect => (score >= PROMISE_THRESHOLD ? 1 : score <= -PROMISE_THRESHOLD ? -1 : 0)

function dignityFor(chart: Chart, strengths: NatalStrengths, planet: Planet): Dignity {
  const d = strengths.dignities[planet]
  if (d.exaltedSign) return 'exalted'
  if (d.debilitatedSign) return 'debilitated'
  if (d.moolatrikonaDegreeZone) return 'moolatrikona'
  if (d.ownSign) return 'own'
  if (planet === 'Rahu' || planet === 'Ketu') return 'neutral'
  const lord = SIGN_LORDS[chart.positions[planet].sign] as Graha
  return compoundRelation(planet as Graha, lord, chart.vargas[1])
}

/** Every planet's natal promise from the chart, its strengths and its yogas. */
export function natalPromise(chart: Chart, strengths: NatalStrengths, yogas: readonly YogaResult[]): Record<Planet, LordPromise> {
  const asc = chart.positions.Asc.sign
  const fn = strengths.functional
  const sb = strengths.shadbala
  const met = yogas.filter((y) => y.status === 'conditions_met' && !PATTERN_CATEGORIES.includes(y.category) && y.participants.length <= 4)
  const out = {} as Record<Planet, LordPromise>
  // Grahas first: the nodes borrow their dispositor's role value.
  const roleValue = {} as Record<Planet, number>
  for (const planet of [...GRAHAS, 'Rahu', 'Ketu'] as Planet[]) {
    const sign = chart.positions[planet].sign
    const house = houseFrom(asc, sign)
    const rules = planet === 'Rahu' || planet === 'Ketu' ? [] : Array.from({ length: 12 }, (_, i) => i + 1).filter((h) => SIGN_LORDS[(asc + h - 1) % 12] === planet)
    const role = functionalRole(fn, planet)
    const yogakaraka = fn.yogakarakas.includes(planet)
    const dispositor = planet === 'Rahu' || planet === 'Ketu' ? SIGN_LORDS[sign] : undefined
    const dignity = dignityFor(chart, strengths, planet)
    const ownsTrine = rules.some((h) => TRIKONA.includes(h))
    const vipareeta = !ownsTrine && rules.some((h) => DUSTHANA.includes(h)) && DUSTHANA.includes(house) && dignity !== 'debilitated'
    let rv = dispositor ? 0.5 * roleValue[dispositor] : yogakaraka ? 1 : ROLE_VALUE[role]
    // A dusthana lord spent in a dusthana loses its harmful lordship (Vipareeta).
    if (vipareeta) rv = Math.max(rv, 0)
    roleValue[planet] = rv
    const strengthRatio = sb.status === 'complete' && planet !== 'Rahu' && planet !== 'Ketu' ? sb.planets[planet as Graha].ratioToRequirement : null
    const combust = planet !== 'Rahu' && planet !== 'Ketu' && planet !== 'Sun' && strengths.combustion[planet as Graha].combust
    const supportiveYogas: string[] = []
    const challengingYogas: string[] = []
    for (const y of met) {
      if (!y.participants.includes(planet) || VIPAREETA_YOGAS.includes(y.name)) continue
      const nature = yogaContent(y.name)?.nature
      // A combust participant lends little to a supportive yoga (e.g. Budha-Aaditya with Mercury too close).
      if (nature === 'supportive' && !combust) supportiveYogas.push(y.name)
      else if (nature === 'challenging') challengingYogas.push(y.name)
    }
    const yogaValue = Math.max(-1, Math.min(1, 0.34 * (supportiveYogas.length - challengingYogas.length)))
    const W = PROMISE_WEIGHTS
    const score = round3(clamp1(
      W.role * rv + W.placement * placementValue(planet, house, vipareeta) + W.dignity * DIGNITY_VALUE[dignity]
      + W.strength * strengthValue(strengthRatio) + W.yogas * yogaValue - (combust ? W.combust : 0) - PROMISE_CENTRE,
    ))
    out[planet] = {
      planet, role, yogakaraka, rules, house, ...(dispositor ? { dispositor } : {}), dignity, strengthRatio, combust, vipareeta,
      supportiveYogas, challengingYogas, score, effect: promiseEffect(score),
    }
  }
  return Object.fromEntries(PLANETS.map((p) => [p, out[p]])) as Record<Planet, LordPromise>
}

export interface NatalAnalysis {
  strengths: NatalStrengths
  yogas: YogaResult[]
  promise: Record<Planet, LordPromise>
}

/** Strengths, yogas (with the toolkit's Shadbala strength map) and the natal promise of a chart. */
export function analyseNatal(chart: Chart): NatalAnalysis {
  const strengths = strengthsFor(chart)
  const yogas = evaluateYogas(chart, { strong: strongPlanets(strengths.shadbala) })
  return { strengths, yogas, promise: natalPromise(chart, strengths, yogas) }
}

/**
 * The running chain's combined promise: antardasha first (0.5), mahadasha (0.3), pratyantardasha
 * (0.2), plus the sub-lord's place from the main lord (BPHS ch. 53: an antardasha lord in an
 * angle or trine from the dasha lord does well, in the 6th, 8th or 12th from it less so).
 */
export function chainPromise(promise: Readonly<Record<Planet, LordPromise>>, chain: readonly Planet[], positions: Chart['positions']): { score: number; effect: Effect; fromMain: number | null } {
  const [md, ad, pd] = chain
  if (!md || !ad) return { score: 0, effect: 0, fromMain: null }
  const fromMain = md === ad ? null : houseFrom(positions[md].sign, positions[ad].sign)
  const relation = fromMain === null ? 0 : [1, 4, 5, 7, 9, 10].includes(fromMain) ? 0.1 : DUSTHANA.includes(fromMain) ? -0.1 : 0
  const score = round3(clamp1(0.3 * promise[md].score + 0.5 * promise[ad].score + 0.2 * promise[pd ?? ad].score + relation))
  return { score, effect: promiseEffect(score), fromMain }
}
