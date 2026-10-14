// Natal strengths, ported from the Python toolkit as analysis.chart() uses them:
// dignities and combustion (strengths.py), natural and compound relationships
// (core.py, Rao Table 7), Shadbala under the Raman/Sripati profile with its
// historical motion model (strengths.py + strength_context.py; B. V. Raman,
// "Graha and Bhava Balas"), Vimsopaka per varga group (BPHS ch. 7) and the
// functional nature table (functional.ts, Rao PDF 152-153).
// These are traditional scores defined by texts, not physical quantities.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { degreeInSign, norm, SIGN_LORDS, signOf, houseFrom } from './core'
import { functionalNature, type FunctionalNature } from './functional'
import { planetLongitude } from './ephem'
import { SE, swe } from './swe'
import type { Ayanamsa, Body, Chart, Planet, SignIndex } from './types'

export type Graha = Exclude<Planet, 'Rahu' | 'Ketu'>
export const GRAHAS: readonly Graha[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const NINE: readonly Planet[] = [...GRAHAS, 'Rahu', 'Ketu']

// ---------------------------------------------------------------- arithmetic

/** Python's float modulo: the result takes the sign of the divisor. */
const pmod = (x: number, m: number): number => {
  const r = x % m
  return r !== 0 && r < 0 !== m < 0 ? r + m : r
}
/** Shorter arc between two longitudes, [0, 180] (strengths.angular_distance). */
export const angularDistance = (a: number, b: number): number => Math.abs(pmod(a - b + 180, 360) - 180)

// ---------------------------------------------------------------- dignities (core.py, strengths.py)

/** Exaltation signs incl. nodes, core.EXALT (Rahu Gemini, Ketu Sagittarius). Debilitation is opposite. */
export const EXALTATION_SIGN: Readonly<Record<Planet, SignIndex>> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 2, Ketu: 8 }
/** Moolatrikona signs, core.MOOLA. */
export const MOOLATRIKONA_SIGN: Readonly<Record<Planet, SignIndex>> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10, Rahu: 5, Ketu: 11 }
/** Deep exaltation longitudes, tajaka.DEEP_EXALT. */
export const DEEP_EXALTATION: Readonly<Record<Graha, number>> = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 }
/** Moolatrikona degree spans [from, to) within the moolatrikona sign, strengths.MOOLA_ZONES. */
const MOOLA_ZONES: Readonly<Record<Graha, readonly [SignIndex, number, number]>> = {
  Sun: [4, 0, 20], Moon: [1, 3, 30], Mars: [0, 0, 12], Mercury: [5, 15, 20], Jupiter: [8, 0, 10], Venus: [6, 0, 15], Saturn: [10, 0, 20],
}

export type DegreeZone = 'moolatrikona' | 'exaltation' | 'own' | 'debilitation' | 'other'

export interface PlanetDignity {
  exaltedSign: boolean
  debilitatedSign: boolean
  ownSign: boolean
  moolatrikonaSign: boolean
  degreeInSign: number
  /** Degree-based zone; null for Rahu and Ketu, for which the source gives none. */
  degreeZone: DegreeZone | null
  moolatrikonaDegreeZone: boolean | null
  /** Degrees from the deep exaltation point; null for the nodes. */
  distanceFromDeepExaltation: number | null
}

const isGraha = (p: Planet): p is Graha => p !== 'Rahu' && p !== 'Ketu'

function ownsSign(planet: Planet, sign: SignIndex): boolean {
  if (planet === 'Rahu') return sign === 10
  if (planet === 'Ketu') return sign === 7
  return SIGN_LORDS[sign] === planet
}

/** core.dignity + strengths.degree_dignity. Zone boundaries belong to the following zone. */
export function dignityOf(planet: Planet, longitude: number): PlanetDignity {
  const s = signOf(longitude)
  const d = degreeInSign(longitude)
  const base = {
    exaltedSign: s === EXALTATION_SIGN[planet], debilitatedSign: s === (EXALTATION_SIGN[planet] + 6) % 12,
    ownSign: ownsSign(planet, s), moolatrikonaSign: s === MOOLATRIKONA_SIGN[planet], degreeInSign: d,
  }
  if (!isGraha(planet)) return { ...base, degreeZone: null, moolatrikonaDegreeZone: null, distanceFromDeepExaltation: null }
  const [ms, lo, hi] = MOOLA_ZONES[planet]
  const moola = s === ms && lo <= d && d < hi
  let zone: DegreeZone
  if (moola) zone = 'moolatrikona'
  else if ((planet === 'Mercury' && s === 5 && d < 15) || (planet === 'Moon' && s === 1 && d < 3)) zone = 'exaltation'
  else if (SIGN_LORDS[s] === planet) zone = 'own'
  else if (base.exaltedSign) zone = 'exaltation'
  else if (base.debilitatedSign) zone = 'debilitation'
  else zone = 'other'
  return { ...base, degreeZone: zone, moolatrikonaDegreeZone: moola, distanceFromDeepExaltation: angularDistance(longitude, DEEP_EXALTATION[planet]) }
}

// ---------------------------------------------------------------- combustion

/** Classical combustion limits from the Sun (strengths.COMBUSTION_LIMITS); retrograde Mercury 12, Venus 8. */
export const COMBUSTION_LIMITS: Readonly<Partial<Record<Graha, number>>> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 16 }

export interface Combustion {
  applicable: boolean
  combust: boolean
  /** Degrees from the Sun; absent for the Sun itself. */
  separation?: number
  limit?: number
}

export function combustionOf(planet: Graha, longitude: number, sun: number, speed = 0): Combustion {
  const table = COMBUSTION_LIMITS[planet]
  if (table === undefined) return { combust: false, applicable: false }
  const limit = planet === 'Mercury' && speed < 0 ? 12 : planet === 'Venus' && speed < 0 ? 8 : table
  const separation = angularDistance(longitude, sun)
  return { combust: separation < limit, applicable: true, separation, limit }
}

// ---------------------------------------------------------------- relationships (core.py, Rao Table 7)

export type Relation = 'own' | 'great_friend' | 'friend' | 'neutral' | 'enemy' | 'great_enemy'
export type NaturalRelation = 'friend' | 'neutral' | 'enemy'

export const NATURAL_FRIENDS: Readonly<Record<Graha, readonly Graha[]>> = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
}
export const NATURAL_ENEMIES: Readonly<Record<Graha, readonly Graha[]>> = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
}

export function naturalRelation(planet: Graha, other: Graha): NaturalRelation {
  return NATURAL_FRIENDS[planet].includes(other) ? 'friend' : NATURAL_ENEMIES[planet].includes(other) ? 'enemy' : 'neutral'
}

/** Temporary friendship: the other sits 2, 3, 4, 10, 11 or 12 signs from the planet. */
export function temporaryFriend(planetSign: SignIndex, otherSign: SignIndex): boolean {
  return [2, 3, 4, 10, 11, 12].includes(houseFrom(planetSign, otherSign))
}

/** Five-fold compound relationship (core.compound_relation); `signs` gives the frame (normally D1). */
export function compoundRelation(planet: Graha, other: Graha, signs: Readonly<Partial<Record<Body, SignIndex>>>): Relation {
  if (planet === other) return 'own'
  const nat = { friend: 1, neutral: 0, enemy: -1 }[naturalRelation(planet, other)]
  const temp = temporaryFriend(signs[planet]!, signs[other]!) ? 1 : -1
  return (['great_enemy', 'enemy', 'neutral', 'friend', 'great_friend'] as const)[nat + temp + 2]
}

// ---------------------------------------------------------------- natural benefics (strengths.benefic_classification)

export type MoonPolicy = 'waxing' | 'raman_tithi8_to23'
export type MercuryPolicy = 'any_malefic' | 'majority'
export type MercuryTie = 'unresolved' | 'benefic' | 'malefic'

export interface NaturalNature {
  benefics: Planet[]
  malefics: Planet[]
  /** Mercury when the majority policy meets an unresolved equal tie. */
  unknown: Planet[]
  mercuryCompanions: { benefic: number; malefic: number }
}

/**
 * Natural benefics and malefics. Moon: 'waxing' (0-180 degrees from the Sun)
 * or Raman's tithi 8-23 band (84-276 degrees); the two are not synonyms.
 * Mercury: malefic with any malefic companion (Raman profile), or by majority
 * (Rao PDF 34-35) with equal ties left unresolved unless a tie policy is given.
 */
export function naturalNature(
  longitudes: Readonly<Partial<Record<Body, number>>>,
  options: { moonPolicy?: MoonPolicy; mercuryPolicy?: MercuryPolicy; mercuryTie?: MercuryTie; mercuryOrb?: number | null } = {},
): NaturalNature {
  const { moonPolicy = 'waxing', mercuryPolicy = 'any_malefic', mercuryTie = 'unresolved', mercuryOrb = null } = options
  const present = NINE.filter((p) => longitudes[p] !== undefined)
  const lon = (p: Planet) => longitudes[p]!
  const elong = norm(lon('Moon') - lon('Sun'))
  const moonGood = moonPolicy === 'waxing' ? elong > 0 && elong < 180 : elong >= 84 && elong < 276
  const bad = new Set<Planet>(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'])
  if (!moonGood) bad.add('Moon')
  const joined = (p: Planet) => (mercuryOrb === null ? signOf(lon('Mercury')) === signOf(lon(p)) : angularDistance(lon('Mercury'), lon(p)) < mercuryOrb)
  const companions = present.filter((p) => p !== 'Mercury' && joined(p))
  const nbad = companions.filter((p) => bad.has(p)).length
  const ngood = companions.length - nbad
  const unknown: Planet[] = []
  let mercuryBad = nbad > 0
  if (mercuryPolicy === 'majority') {
    mercuryBad = nbad > ngood
    if (nbad === ngood && nbad) {
      mercuryBad = mercuryTie === 'malefic'
      if (mercuryTie === 'unresolved') unknown.push('Mercury')
    }
  }
  if (mercuryBad) bad.add('Mercury')
  return {
    benefics: present.filter((p) => !bad.has(p) && !unknown.includes(p)),
    malefics: present.filter((p) => bad.has(p)),
    unknown,
    mercuryCompanions: { benefic: ngood, malefic: nbad },
  }
}

// ---------------------------------------------------------------- vimsopaka (BPHS ch. 7)

export type VimsopakaGroup = 'shad' | 'sapta' | 'dasa' | 'shodasa'
/** [varga, weight] pairs per group, strengths.VIMSOPAKA_WEIGHTS; each group sums to 20. */
export const VIMSOPAKA_WEIGHTS: Readonly<Record<VimsopakaGroup, readonly (readonly [number, number])[]>> = {
  shad: [[1, 6], [2, 2], [3, 4], [9, 5], [12, 2], [30, 1]],
  sapta: [[1, 5], [2, 2], [3, 3], [7, 2.5], [9, 4.5], [12, 2], [30, 1]],
  dasa: [[1, 3], [2, 1.5], [3, 1.5], [7, 1.5], [9, 1.5], [10, 1.5], [12, 1.5], [16, 1.5], [30, 1.5], [60, 5]],
  shodasa: [[1, 3.5], [2, 1], [3, 1], [4, 0.5], [7, 0.5], [9, 3], [10, 0.5], [12, 0.5], [16, 2], [20, 0.5], [24, 0.5], [27, 0.5], [30, 1], [40, 0.5], [45, 0.5], [60, 4]],
}
const VISWA: Readonly<Record<Relation, number>> = { own: 20, great_friend: 18, friend: 15, neutral: 10, enemy: 7, great_enemy: 5 }

export interface VimsopakaRow { varga: number; weight: number; lord: Planet; relation: Relation; contribution: number }
export interface VimsopakaScore { total: number; maximum: 20; components: VimsopakaRow[] }

/** Weighted varga-viswa out of 20 (strengths.vimsopaka). Relationships from D1; exaltation is not substituted for own sign. */
export function vimsopaka(vargas: Chart['vargas'], group: VimsopakaGroup): Record<Graha, VimsopakaScore> {
  const d1 = vargas[1]
  const out = {} as Record<Graha, VimsopakaScore>
  for (const p of GRAHAS) {
    const components = VIMSOPAKA_WEIGHTS[group].map(([varga, weight]): VimsopakaRow => {
      const lord = SIGN_LORDS[vargas[varga][p]]
      const relation = compoundRelation(p, lord as Graha, d1)
      return { varga, weight, lord, relation, contribution: (weight * VISWA[relation]) / 20 }
    })
    out[p] = { total: components.reduce((sum, r) => sum + r.contribution, 0), maximum: 20, components }
  }
  return out
}

// ---------------------------------------------------------------- shadbala (strengths.shadbala, raman_sripati)

export type MotionPlanet = 'Mars' | 'Mercury' | 'Venus' | 'Jupiter' | 'Saturn'
export interface MotionInput { meanLongitude: number; seeghrochcha: number }
export interface TimeLords { year: Graha; month: Graha; weekday: Graha; hora: Graha }

export interface SthanaComponents { uchcha: number; saptavargaja: number; ojhayugma: number; kendradi: number; drekkana: number }
export interface KalaComponents {
  nathonnatha: number; paksha: number; tribhaga: number
  year: number; month: number; weekday: number; hora: number
  ayana: number; yuddha: number
}

/** All values in virupas (60 virupas = 1 rupa). */
export interface ShadbalaPlanet {
  sthana: number
  sthanaComponents: SthanaComponents
  saptavargaja: { varga: number; relation: Relation; virupas: number }[]
  dig: number
  kala: number
  kalaComponents: KalaComponents
  /** 0 for the Sun and Moon: their motion is counted by doubled Ayana and Paksha in this profile. */
  chesta: number
  naisargika: number
  drik: number
  drikComponents: Partial<Record<Graha, number>>
  totalVirupas: number
  rupas: number
  requiredVirupas: number
  ratioToRequirement: number
}

export interface PlanetaryWar { winner: Graha; loser: Graha; transferVirupas: number }

export interface ShadbalaInputs {
  /** Sidereal longitudes of the seven grahas, the nodes and the ascendant. */
  longitudes: Readonly<Record<Body, number>>
  vargas: Chart['vargas']
  /** Sidereal midheaven. */
  mc: number
  tropical: Readonly<Record<Graha, number>>
  apparentSolarHour: number
  isDay: boolean
  /** Elapsed fraction of the day (sunrise-sunset) or night (sunset-sunrise), [0, 1). */
  periodFraction: number
  timeLords: TimeLords
  motion: Readonly<Record<MotionPlanet, MotionInput>>
}

export interface ShadbalaComplete {
  status: 'complete'
  profile: 'raman_sripati'
  motionModel: 'raman_linear_chapter'
  planets: Record<Graha, ShadbalaPlanet>
  wars: PlanetaryWar[]
  timeLords: TimeLords
  motionInputs: Record<MotionPlanet, MotionInput>
  astronomicalInputs: { mc: number; apparentSolarHour: number; periodFraction: number }
}
export interface ShadbalaUnavailable {
  /** 'unavailable': no ordinary sunrise/sunset (polar); 'needs_explicit_choice': the profile cannot decide. */
  status: 'unavailable' | 'needs_explicit_choice'
  reason: string
}
export type Shadbala = ShadbalaComplete | ShadbalaUnavailable

/** A case the declared profile does not decide (Python raises ValueError; analysis reports needs_explicit_choice). */
class ChoiceError extends Error {}

const SAPTA_POINTS: Readonly<Record<Relation, number>> = { own: 30, great_friend: 22.5, friend: 15, neutral: 7.5, enemy: 3.75, great_enemy: 1.875 }
/** Minimum virupas, BPHS ch. 27 profile (strengths.MINIMUM_VIRUPAS). */
export const MINIMUM_VIRUPAS: Readonly<Record<Graha, number>> = { Sun: 390, Moon: 360, Mars: 300, Mercury: 420, Jupiter: 390, Venus: 330, Saturn: 300 }
const NAISARGIKA_RANK: Readonly<Record<Graha, number>> = { Sun: 7, Moon: 6, Mars: 2, Mercury: 3, Jupiter: 4, Venus: 5, Saturn: 1 }
const SAPTA_VARGAS = [1, 2, 3, 7, 9, 12, 30] as const

/** Sripati/Raman piecewise aspect curve with the special Mars, Jupiter and Saturn intervals. */
export function drishtiValue(angle: number, planet?: Graha): number {
  const a = pmod(angle, 360)
  let x: number
  if (a < 30 || a >= 300) x = 0
  else if (a < 60) x = (a - 30) / 2
  else if (a < 90) x = a - 45
  else if (a < 120) x = (120 - a) / 2 + 30
  else if (a < 150) x = 150 - a
  else if (a < 180) x = (a - 150) * 2
  else x = (300 - a) / 2
  if (planet === 'Mars' && ((a >= 90 && a < 120) || (a >= 210 && a < 240))) x += 15
  if (planet === 'Jupiter' && ((a >= 120 && a < 150) || (a >= 240 && a < 270))) x += 30
  if (planet === 'Saturn' && ((a >= 60 && a < 90) || (a >= 270 && a < 300))) x += 45
  return x
}

/** Raman's six linear segments for declination (degrees); an approximation, not true declination. */
function ramanKranti(tropicalLongitude: number): number {
  const x = pmod(tropicalLongitude, 360)
  const b = Math.min(pmod(x, 180), 180 - pmod(x, 180))
  const increments = [362, 341, 299, 236, 150, 52]
  const n = Math.min(Math.floor(b / 15), 5)
  let sum = 0
  for (let i = 0; i < n; i++) sum += increments[i]
  const value = (sum + (increments[n] * (b - n * 15)) / 15) / 60
  return x < 180 ? value : -value
}

function ayanaBala(planet: Graha, tropicalLongitude: number): number {
  let k = ramanKranti(tropicalLongitude)
  k = planet === 'Mercury' ? Math.abs(k) : planet === 'Moon' || planet === 'Saturn' ? -k : k
  return (24 + k) * 1.25 * (planet === 'Sun' ? 2 : 1)
}

/** One third of the distance from the seeghrochcha to the circular midpoint of mean and true longitudes. */
function chestaBala(meanLongitude: number, trueLongitude: number, seeghrochcha: number): number {
  const delta = pmod(trueLongitude - meanLongitude + 180, 360) - 180
  if (Math.abs(Math.abs(delta) - 180) <= 1e-10) throw new ChoiceError('Antipodal mean/true longitudes have no unique midpoint')
  return angularDistance(seeghrochcha, meanLongitude + delta / 2) / 3
}

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0)

/**
 * Six-fold strength from explicit inputs (strengths.shadbala: raman_sripati points, rasi
 * relationship frame, Raman war rule, BPHS-27 minimums). Throws for cases the profile
 * leaves undecided; chartShadbala reports those as needs_explicit_choice.
 */
export function shadbala(inputs: ShadbalaInputs): ShadbalaComplete {
  const { longitudes: lon, vargas, mc, tropical, apparentSolarHour, isDay, periodFraction, timeLords, motion } = inputs
  if (!(periodFraction >= 0 && periodFraction < 1)) throw new ChoiceError('period_fraction must lie in [0,1)')
  if (!(apparentSolarHour >= 0 && apparentSolarHour < 24)) throw new ChoiceError('apparent solar hour must lie in [0,24)')
  const s = vargas[1]
  const good = new Set(naturalNature(lon, { moonPolicy: 'raman_tithi8_to23' }).benefics)
  const elong = angularDistance(lon.Moon, lon.Sun) / 3
  const dayStrength = (12 - Math.abs(apparentSolarHour - 12)) * 5
  const third = Math.min(2, Math.floor(periodFraction * 3))
  const thirdLord: Graha = (isDay ? (['Mercury', 'Sun', 'Saturn'] as const) : (['Moon', 'Venus', 'Mars'] as const))[third]
  const planets = {} as Record<Graha, ShadbalaPlanet>
  const base = {} as Record<Graha, number>
  for (const p of GRAHAS) {
    const moolaZone = dignityOf(p, lon[p]).moolatrikonaDegreeZone
    const saptavargaja = SAPTA_VARGAS.map((n) => {
      const relation = compoundRelation(p, SIGN_LORDS[vargas[n][p]] as Graha, s)
      return { varga: n as number, relation, virupas: n === 1 && moolaZone ? 45 : SAPTA_POINTS[relation] }
    })
    const female = p === 'Moon' || p === 'Venus'
    const genderDecan = female ? 2 : p === 'Saturn' || p === 'Mercury' ? 1 : 0
    const house = houseFrom(s.Asc, s[p])
    const uchchaDelta = Math.abs(norm(lon[p]) - ((DEEP_EXALTATION[p] + 180) % 360))
    const sthanaComponents: SthanaComponents = {
      uchcha: (60 * Math.min(uchchaDelta, 360 - uchchaDelta)) / 180,
      saptavargaja: sum(saptavargaja.map((r) => r.virupas)),
      ojhayugma: 15 * [1, 9].filter((n) => vargas[n][p] % 2 === (female ? 1 : 0)).length,
      kendradi: [60, 30, 15][(house - 1) % 3],
      drekkana: Math.floor(degreeInSign(lon[p]) / 10) === genderDecan ? 15 : 0,
    }
    const powerless = p === 'Sun' || p === 'Mars' ? pmod(mc + 180, 360)
      : p === 'Jupiter' || p === 'Mercury' ? pmod(lon.Asc + 180, 360)
        : p === 'Moon' || p === 'Venus' ? mc : lon.Asc
    const dig = angularDistance(lon[p], powerless) / 3
    const nathonnatha = p === 'Mercury' ? 60 : p === 'Sun' || p === 'Jupiter' || p === 'Venus' ? dayStrength : 60 - dayStrength
    const kalaComponents: KalaComponents = {
      nathonnatha,
      paksha: (good.has(p) ? elong : 60 - elong) * (p === 'Moon' ? 2 : 1),
      tribhaga: p === thirdLord || p === 'Jupiter' ? 60 : 0,
      year: timeLords.year === p ? 15 : 0,
      month: timeLords.month === p ? 30 : 0,
      weekday: timeLords.weekday === p ? 45 : 0,
      hora: timeLords.hora === p ? 60 : 0,
      ayana: ayanaBala(p, tropical[p]),
      yuddha: 0,
    }
    const chesta = p === 'Sun' || p === 'Moon' ? 0 : chestaBala(motion[p].meanLongitude, lon[p], motion[p].seeghrochcha)
    const drikComponents: Partial<Record<Graha, number>> = {}
    for (const o of GRAHAS) if (o !== p) drikComponents[o] = (drishtiValue(lon[p] - lon[o], o) * (good.has(o) ? 1 : -1)) / 4
    const sthana = sum(Object.values(sthanaComponents))
    const k = kalaComponents
    // The war transfer uses totals before Ayana, Chesta, Naisargika and Drik, as strengths.py.
    base[p] = sthana + dig + sum([k.nathonnatha, k.paksha, k.tribhaga, k.year, k.month, k.weekday, k.hora])
    planets[p] = {
      sthana, sthanaComponents, saptavargaja, dig, kala: 0, kalaComponents, chesta,
      naisargika: (60 * NAISARGIKA_RANK[p]) / 7, drik: sum(Object.values(drikComponents)), drikComponents,
      totalVirupas: 0, rupas: 0, requiredVirupas: MINIMUM_VIRUPAS[p], ratioToRequirement: 0,
    }
  }
  // Planetary war (Raman): within 1 degree, the planet of lower longitude wins; the
  // transfer is the pre-war difference divided by the difference of disc diameters.
  const wars: PlanetaryWar[] = []
  const eligible: Graha[] = ['Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
  const diameters: Partial<Record<Graha, number>> = { Mars: 9.4, Mercury: 6.6, Jupiter: 190.4, Venus: 16.6, Saturn: 158.0 }
  eligible.forEach((p, i) => {
    for (const q of eligible.slice(i + 1)) {
      if (angularDistance(lon[p], lon[q]) >= 1) continue
      const delta = pmod(lon[q] - lon[p] + 180, 360) - 180
      if (Math.abs(delta) < 1e-10) throw new ChoiceError('Exactly tied war longitudes require a winner decision')
      const [winner, loser] = delta > 0 ? [p, q] : [q, p]
      const value = Math.abs(base[p] - base[q]) / Math.abs(diameters[p]! - diameters[q]!)
      planets[winner].kalaComponents.yuddha += value
      planets[loser].kalaComponents.yuddha -= value
      wars.push({ winner, loser, transferVirupas: value })
    }
  })
  for (const p of GRAHAS) {
    const row = planets[p]
    row.kala = sum(Object.values(row.kalaComponents))
    row.totalVirupas = row.sthana + row.dig + row.kala + row.chesta + row.naisargika + row.drik
    row.rupas = row.totalVirupas / 60
    row.ratioToRequirement = row.totalVirupas / row.requiredVirupas
  }
  return {
    status: 'complete', profile: 'raman_sripati', motionModel: 'raman_linear_chapter', planets, wars, timeLords,
    motionInputs: { ...motion }, astronomicalInputs: { mc, apparentSolarHour, periodFraction },
  }
}

// ---------------------------------------------------------------- astronomical inputs (strength_context.py)

const SIDM: Readonly<Record<Ayanamsa, number>> = {
  lahiri: SE.SIDM_LAHIRI, raman: SE.SIDM_RAMAN, krishnamurti: SE.SIDM_KRISHNAMURTI,
  true_citra: SE.SIDM_TRUE_CITRA, true_pushya: SE.SIDM_TRUE_PUSHYA, yukteshwar: SE.SIDM_YUKTESHWAR,
}
const TROPICAL_ID: Readonly<Record<Graha, number>> = {
  Sun: SE.SUN, Moon: SE.MOON, Mars: SE.MARS, Mercury: SE.MERCURY, Jupiter: SE.JUPITER, Venus: SE.VENUS, Saturn: SE.SATURN,
}
const HORA_ORDER: readonly Graha[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']
const DAY_MS = 86_400_000
/** Days from 1970-01-01 to 1900-01-01. */
const EPOCH_1900_DAYS = Date.UTC(1900, 0, 1) / DAY_MS

/** Local-mean-time year and day number (days since 1970-01-01) of an instant, as from_jd(jd, timezone(lon/15 h)). */
function localMeanDate(jd: number, longitude: number): { year: number; day: number } {
  const u = swe().jdut1ToUtc(jd)
  const ms = Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute) + u.second * 1000 + (longitude / 15) * 3_600_000
  return { year: new Date(Math.floor(ms)).getUTCFullYear(), day: Math.floor(ms / DAY_MS) }
}

/**
 * Raman's historical linear mean motions (ch. VI, tables IV-IX) with the
 * chapter's Venus secular term (.001/year), shifted by `offset` from the
 * Raman ayanamsa frame into the chart's frame (strength_context.raman_motion_inputs).
 */
export function ramanMotionInputs(jd: number, year: number, offset = 0): Record<MotionPlanet, MotionInput> {
  if (year < 1800 || year > 2100) throw new ChoiceError('Historical approximation exposed only for 1800..2100')
  const interval = jd - (2415020.5 - 76 / 360)
  const y = year - 1900
  const sun = pmod(257.4568 + interval * 0.98560265, 360)
  const mean: Record<MotionPlanet, number> = {
    Mars: pmod(270.22 + interval * 0.524019, 360), Mercury: sun, Venus: sun,
    Jupiter: pmod(220.04 + interval * 0.0830956 - 3.33 - 0.0067 * y, 360),
    Saturn: pmod(236.74 + interval * 0.033439 + 5 + 0.001 * y, 360),
  }
  const seeghra: Record<MotionPlanet, number> = {
    Mars: sun, Jupiter: sun, Saturn: sun,
    Mercury: pmod(164 + interval * 4.092318 - 0.00133 * y + 6.67, 360),
    Venus: pmod(328.51 + interval * 1.602146 - 5 - 0.001 * y, 360),
  }
  const out = {} as Record<MotionPlanet, MotionInput>
  for (const p of ['Mars', 'Mercury', 'Venus', 'Jupiter', 'Saturn'] as const) {
    out[p] = { meanLongitude: pmod(mean[p] + offset, 360), seeghrochcha: pmod(seeghra[p] + offset, 360) }
  }
  return out
}

/** Raman's condensed-ahargana year and month lords (360/30-day cycles), weekday lord and hora lord. */
export function ramanTimeLords(civilDay: number, weekday: number, isDay: boolean, periodFraction: number): TimeLords {
  const days = civilDay - EPOCH_1900_DAYS + 26543
  const weekdayLord = GRAHAS[weekday]
  const hour = Math.min(11, Math.floor(periodFraction * 12)) + (isDay ? 0 : 12)
  return {
    year: GRAHAS[pmod(3 * Math.floor(days / 360) + 3, 7)],
    month: GRAHAS[pmod(2 * Math.floor(days / 30) + 3, 7)],
    weekday: weekdayLord,
    hora: HORA_ORDER[(HORA_ORDER.indexOf(weekdayLord) + hour) % 7],
  }
}

/** Shadbala for a natal chart with the inputs strength_context.from_chart derives. Requires the ephemeris. */
export function chartShadbala(chart: Chart): Shadbala {
  const day = chart.solarDay
  if (!day) return { status: 'unavailable', reason: 'Ordinary sunrise/day-night partition unavailable' }
  try {
    const { jd } = chart
    const { latitude, longitude } = chart.input
    const lon = Object.fromEntries(Object.entries(chart.positions).map(([b, v]) => [b, v.longitude])) as Record<Body, number>
    const sw = swe()
    const tropical = {} as Record<Graha, number>
    for (const p of GRAHAS) tropical[p] = sw.calcUt(jd, TROPICAL_ID[p], SE.FLG_SPEED).longitude
    sw.setSiderealMode(SIDM[chart.settings.ayanamsa])
    const mc = sw.housesEx(jd, SE.FLG_SIDEREAL, latitude, longitude).mc
    const ra = sw.calcUt(jd, SE.SUN, SE.FLG_EQUATORIAL).longitude
    const apparentSolarHour = pmod((sw.siderealTime(jd) * 15 + longitude - ra) / 15 + 12, 24)
    const [start, end] = day.isDay ? [day.sunriseJd, day.sunsetJd] : [day.sunsetJd, day.nextSunriseJd]
    const periodFraction = (jd - start) / (end - start)
    // The sunrise preceding birth gives the traditional date (local mean time) and weekday.
    const civil = localMeanDate(day.sunriseJd, longitude)
    const year = localMeanDate(jd, longitude).year
    const ramanSun = planetLongitude(jd, 'Sun', { ...chart.settings, ayanamsa: 'raman' }).longitude
    const motion = ramanMotionInputs(jd, year, pmod(lon.Sun - ramanSun + 180, 360) - 180)
    return shadbala({
      longitudes: lon, vargas: chart.vargas, mc, tropical, apparentSolarHour, isDay: day.isDay, periodFraction,
      timeLords: ramanTimeLords(civil.day, day.weekday, day.isDay, periodFraction), motion,
    })
  } catch (e) {
    if (e instanceof ChoiceError) return { status: 'needs_explicit_choice', reason: e.message }
    throw e
  }
}

/** Planets at or above their minimum Shadbala (analysis.chart `strong`); empty when Shadbala is unavailable. */
export function strongPlanets(sb: Shadbala): Partial<Record<Graha, boolean>> {
  if (sb.status !== 'complete') return {}
  return Object.fromEntries(GRAHAS.map((p) => [p, sb.planets[p].ratioToRequirement >= 1]))
}

// ---------------------------------------------------------------- bundle

export interface NatalStrengths {
  dignities: Record<Planet, PlanetDignity>
  combustion: Record<Graha, Combustion>
  /** relationships[a][b]: compound relationship of graha a towards graha b in the rasi chart. */
  relationships: Record<Graha, Record<Graha, Relation>>
  shadbala: Shadbala
  vimsopaka: Record<VimsopakaGroup, Record<Graha, VimsopakaScore>>
  functional: FunctionalNature
}

/** Every natal strength analysis.chart() reports, as plain structured-clone data. Requires the ephemeris. */
export function strengthsFor(chart: Chart): NatalStrengths {
  const pos = chart.positions
  const d1 = chart.vargas[1]
  const sun = pos.Sun.longitude
  const elong = norm(pos.Moon.longitude - sun)
  return {
    dignities: Object.fromEntries(NINE.map((p) => [p, dignityOf(p, pos[p].longitude)])) as Record<Planet, PlanetDignity>,
    combustion: Object.fromEntries(GRAHAS.map((p) => [p, combustionOf(p, pos[p].longitude, sun, pos[p].speed)])) as Record<Graha, Combustion>,
    relationships: Object.fromEntries(GRAHAS.map((p) => [p, Object.fromEntries(GRAHAS.map((o) => [o, compoundRelation(p, o, d1)]))])) as Record<Graha, Record<Graha, Relation>>,
    shadbala: chartShadbala(chart),
    vimsopaka: { shad: vimsopaka(chart.vargas, 'shad'), sapta: vimsopaka(chart.vargas, 'sapta'), dasa: vimsopaka(chart.vargas, 'dasa'), shodasa: vimsopaka(chart.vargas, 'shodasa') },
    functional: functionalNature(d1.Asc, elong > 0 && elong < 180),
  }
}
