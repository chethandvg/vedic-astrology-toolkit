// Tajaka (annual chart) pipeline, ported from vedic_toolkit/tajaka.py, tajaka_yogas.py
// and analysis.solar_return (Rao's book PDF 337-368): exact sidereal solar return, the
// annual chart at the birthplace, Muntha, Harsha bala, Pancha- and Dwadasa-vargeeya bala,
// year lord, the 36 sahams, structural Tajaka yogas with ephemeris checks, Mudda and
// Patyayini dasas. Pure data in, plain data out; no DOM.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SEVEN, type SevenPlanet } from './ashtakavarga'
import { castChart, POLAR_WARNING } from './chart'
import { houseFrom, panchanga, SIGN_LORDS, signOf, VARGAS, vargaSign, VIM_ORDER, VIM_YEARS } from './core'
import { ayanamsaDegrees, planetLongitude, positionsWithAscendant } from './ephem'
import { solarDayAt } from './sunrise'
import { swe } from './swe'
import { localToUtc, offsetMinutesAt } from './time'
import { BODIES, type BirthInput, type Body, type Chart, type Planet, type Settings, type SignIndex } from './types'

// ---------------------------------------------------------------------------------------------
// Tables (tajaka.py; PDF 338-342)

export type { SevenPlanet }
const EXALT: Record<SevenPlanet, SignIndex> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 }
const DEBIL = Object.fromEntries(SEVEN.map((p) => [p, (EXALT[p] + 6) % 12])) as Record<SevenPlanet, SignIndex>
/** Deep exaltation degrees for Uchcha bala. */
const DEEP_EXALT: Record<SevenPlanet, number> = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 }
/** Individual Tajaka orbs (deeptamsas), PDF 338. */
export const TAJAKA_ORBS: Readonly<Record<SevenPlanet, number>> = { Sun: 15, Moon: 12, Mars: 8, Mercury: 7, Jupiter: 9, Venus: 7, Saturn: 9 }
/** Hadda (terms) per sign: end degrees and lords. */
const HADDA: readonly (readonly [readonly number[], readonly SevenPlanet[]])[] = [
  [[6, 12, 20, 25, 30], ['Jupiter', 'Venus', 'Mercury', 'Mars', 'Saturn']],
  [[8, 14, 22, 27, 30], ['Venus', 'Mercury', 'Jupiter', 'Saturn', 'Mars']],
  [[6, 12, 17, 24, 30], ['Mercury', 'Venus', 'Jupiter', 'Mars', 'Saturn']],
  [[7, 13, 19, 26, 30], ['Mars', 'Venus', 'Mercury', 'Jupiter', 'Saturn']],
  [[6, 11, 18, 24, 30], ['Jupiter', 'Venus', 'Saturn', 'Mercury', 'Mars']],
  [[7, 17, 21, 28, 30], ['Mercury', 'Venus', 'Jupiter', 'Mars', 'Saturn']],
  [[6, 14, 21, 28, 30], ['Saturn', 'Mercury', 'Jupiter', 'Venus', 'Mars']],
  [[7, 11, 19, 24, 30], ['Mars', 'Venus', 'Mercury', 'Jupiter', 'Saturn']],
  [[12, 17, 21, 26, 30], ['Jupiter', 'Venus', 'Mercury', 'Mars', 'Saturn']],
  [[7, 14, 22, 26, 30], ['Mercury', 'Jupiter', 'Venus', 'Saturn', 'Mars']],
  [[7, 13, 20, 25, 30], ['Mercury', 'Venus', 'Jupiter', 'Mars', 'Saturn']],
  [[12, 16, 19, 28, 30], ['Venus', 'Jupiter', 'Mercury', 'Mars', 'Saturn']],
]
const TRIRASI_DAY: readonly SevenPlanet[] = ['Sun', 'Venus', 'Saturn', 'Venus', 'Jupiter', 'Moon', 'Mercury', 'Mars', 'Saturn', 'Mars', 'Jupiter', 'Moon']
const TRIRASI_NIGHT: readonly SevenPlanet[] = ['Jupiter', 'Moon', 'Mercury', 'Mars', 'Sun', 'Venus', 'Saturn', 'Venus', 'Saturn', 'Mars', 'Jupiter', 'Moon']
/** Tajika (Tajikasara) constant friendship: two camps, everyone else an enemy. */
const CAMP_A: readonly SevenPlanet[] = ['Sun', 'Moon', 'Mars', 'Jupiter']
export const tajikaFriend = (p: SevenPlanet, other: Planet): boolean =>
  other !== p && (CAMP_A.includes(p) === CAMP_A.includes(other as SevenPlanet)) && (SEVEN as readonly Planet[]).includes(other)
/** Combustion limits as strengths.COMBUSTION_LIMITS (retrograde Mercury 12, Venus 8). */
const COMBUSTION: Partial<Record<SevenPlanet, number>> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 16 }

// ---------------------------------------------------------------------------------------------
// Arithmetic helpers that mirror Python semantics

/** Python's float %: the result takes the sign of the divisor. */
const pyMod = (x: number, m: number): number => {
  const r = x % m
  return r !== 0 && r < 0 !== m < 0 ? r + m : r === 0 ? 0 : r
}
const within = (longitude: number): number => pyMod(longitude, 360) % 30
const lord = (sign: SignIndex): SevenPlanet => SIGN_LORDS[sign] as SevenPlanet
type Longitudes = Readonly<Record<Body, number>>
type Speeds = Readonly<Record<Body, number>>
const signsOf = (l: Longitudes) => Object.fromEntries(BODIES.map((b) => [b, signOf(l[b])])) as Record<Body, SignIndex>

export function haddaLord(longitude: number): SevenPlanet {
  const [ends, lords] = HADDA[signOf(longitude)]
  const d = within(longitude)
  return lords[ends.findIndex((end) => d < end)]
}

// ---------------------------------------------------------------------------------------------
// Solar return (Ephemeris.solar_arc_date): exact sidereal solar arc, 1 year = 360 degrees

const sunAt = (jd: number, settings: Settings) => planetLongitude(jd, 'Sun', settings).longitude

/** The instant the Sun has moved `years` x 360 degrees from its position at `birthJd`, by bisection. */
export function solarArcDate(birthJd: number, years: number, settings: Settings, birthSun = sunAt(birthJd, settings)): number {
  if (!Number.isFinite(years) || Math.abs(years) > 500) throw new Error('Solar arc solver supports +/-500 years')
  if (years === 0) return birthJd
  const target = pyMod(birthSun + 360 * years, 360)
  const guess = birthJd + 365.25636 * years
  const residual = (jd: number) => pyMod(sunAt(jd, settings) - target + 180, 360) - 180
  let lo = guess - 8, hi = guess + 8
  if (!(residual(lo) < 0 && 0 < residual(hi))) throw new Error('Solar return not bracketed')
  for (let i = 0; i < 55; i++) {
    const mid = (lo + hi) / 2
    if (residual(mid) > 0) hi = mid
    else lo = mid
    if (hi - lo < 1e-8) break
  }
  const answer = (lo + hi) / 2
  if (Math.abs(residual(answer)) > 1e-6) throw new Error('Solar return failed precision check')
  return answer
}

/** UTC epoch ms of a JD UT1 via swe_jdut1_to_utc, rounded to the microsecond like Python's from_jd. */
function utcEpochMs(jd: number): number {
  const u = swe().jdut1ToUtc(jd)
  return Date.UTC(u.year, u.month - 1, u.day, u.hour, u.minute) + Math.round(u.second * 1e6) / 1000
}

/**
 * The toolkit casts the annual chart from from_jd(event).isoformat() (microseconds), so the
 * chart JD is the return instant after a UTC round trip. Reproduce it bit for bit: at a
 * Julian Day's float resolution (~40 us) the ascendant moves ~2e-7 degrees.
 */
function roundTripJd(jd: number): number {
  const ms = utcEpochMs(jd)
  const whole = Math.floor(ms / 1000) * 1000
  const us = Math.round((ms - whole) * 1000)
  const d = new Date(whole)
  return swe().utcToJd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() + us / 1e6).ut1
}

/** Chart at an exact instant for an already validated natal input (castChart's assembly without the HH:mm:ss limit). */
function chartAt(jd: number, natal: Chart): Chart {
  const { latitude, longitude, timeZone } = natal.input
  const settings = natal.settings
  const positions = positionsWithAscendant(jd, latitude, longitude, settings)
  const vargas: Chart['vargas'] = {}
  for (const n of VARGAS) vargas[n] = Object.fromEntries(BODIES.map((b) => [b, vargaSign(positions[b].longitude, n)])) as Record<Body, SignIndex>
  const solarDay = solarDayAt(jd, latitude, longitude, timeZone)
  const ms = utcEpochMs(jd)
  const offset = offsetMinutesAt(timeZone, ms)
  const local = new Date(Math.floor(ms / 1000) * 1000 + offset * 60_000).toISOString()
  const input: BirthInput = { ...natal.input, date: local.slice(0, 10), time: local.slice(11, 19), fold: undefined }
  try {
    localToUtc(input)
  } catch {
    // A repeated wall time: name the occurrence that matches this instant.
    input.fold = localToUtc({ ...input, fold: 0 }).offsetMinutes === offset ? 0 : 1
  }
  return {
    input, settings: { ...settings }, jd, utc: new Date(Math.round(ms)).toISOString(), utcOffsetMinutes: offset,
    ayanamsaDegrees: ayanamsaDegrees(jd, settings), positions, vargas,
    panchanga: panchanga(positions.Sun.longitude, positions.Moon.longitude), solarDay,
    warnings: solarDay ? [] : [POLAR_WARNING],
  }
}

// ---------------------------------------------------------------------------------------------
// Strengths (PDF 339-342)

export const muntha = (natalAscendant: number, completedYears: number): SignIndex => {
  if (!Number.isInteger(completedYears) || completedYears < 0) throw new Error('Nonnegative whole completed years required')
  return (signOf(natalAscendant) + completedYears) % 12
}

export interface HarshaBala { prescribedHouse: number; ownOrExalted: number; genderHouse: number; dayNight: number; total: number }

const FEMALE: readonly SevenPlanet[] = ['Moon', 'Mercury', 'Venus', 'Saturn']
const HARSHA_HOUSE: Record<SevenPlanet, number> = { Sun: 9, Moon: 3, Mars: 6, Mercury: 1, Jupiter: 11, Venus: 5, Saturn: 12 }

/** Harsha bala, four 5-unit conditions (tajaka.harsha_bala). */
export function harshaBala(l: Longitudes, isDay: boolean): Record<SevenPlanet, HarshaBala> {
  const s = signsOf(l)
  return Object.fromEntries(SEVEN.map((p) => {
    const house = houseFrom(s.Asc, s[p]), female = FEMALE.includes(p)
    const prescribedHouse = house === HARSHA_HOUSE[p] ? 5 : 0
    const ownOrExalted = lord(s[p]) === p || s[p] === EXALT[p] ? 5 : 0
    const genderHouse = (female ? [1, 2, 3, 7, 8, 9] : [4, 5, 6, 10, 11, 12]).includes(house) ? 5 : 0
    const dayNight = female !== isDay ? 5 : 0
    return [p, { prescribedHouse, ownOrExalted, genderHouse, dayNight, total: prescribedHouse + ownOrExalted + genderHouse + dayNight }]
  })) as Record<SevenPlanet, HarshaBala>
}

/** Uchcha bala on a 20-unit scale: distance from the debilitation point. */
export function uchchaBala(planet: SevenPlanet, longitude: number): number {
  let delta = Math.abs(pyMod(longitude, 360) - ((DEEP_EXALT[planet] + 180) % 360))
  delta = Math.min(delta, 360 - delta)
  return (20 * delta) / 180
}

export type PanchaPart = 'kshetra' | 'hadda' | 'drekkana' | 'navamsa'
export interface PanchaVargeeya {
  uchcha: number
  kshetra: number
  hadda: number
  drekkana: number
  navamsa: number
  /** Sum of the five parts / 4, out of 20. */
  total: number
  relations: Record<PanchaPart, { owner: SevenPlanet; relation: 'own' | 'friend' | 'enemy' }>
  category: 'weak' | 'ordinary' | 'strong' | 'very_strong'
}

/**
 * Pancha-vargeeya bala in the toolkit's default 'pvr_tajikasara' profile (PDF 339-341):
 * constant Tajika friendship (own 1, friend 1/2, enemy 1/4) and the Parasari D3 lord.
 * The Hayanaratna profiles of pancha_with_profile are not ported.
 */
export function panchaVargeeya(l: Longitudes): Record<SevenPlanet, PanchaVargeeya> {
  const fraction = { own: 1, friend: 0.5, enemy: 0.25 } as const
  return Object.fromEntries(SEVEN.map((p) => {
    const v = l[p]
    const owners: [PanchaPart, SevenPlanet, number][] = [
      ['kshetra', lord(signOf(v)), 30], ['hadda', haddaLord(v), 15], ['drekkana', lord(vargaSign(v, 3)), 10], ['navamsa', lord(vargaSign(v, 9)), 5],
    ]
    const uchcha = uchchaBala(p, v)
    const parts = {} as Record<PanchaPart, number>
    const relations = {} as PanchaVargeeya['relations']
    let sum = uchcha
    for (const [name, owner, maximum] of owners) {
      const relation = owner === p ? 'own' : tajikaFriend(p, owner) ? 'friend' : 'enemy'
      parts[name] = maximum * fraction[relation]
      relations[name] = { owner, relation }
      sum += parts[name]
    }
    const total = sum / 4
    const category = total < 5 ? 'weak' : total < 10 ? 'ordinary' : total < 15 ? 'strong' : 'very_strong'
    return [p, { uchcha, ...parts, total, relations, category }]
  })) as Record<SevenPlanet, PanchaVargeeya>
}

export interface DwadasaVargeeya { total: number; /** +1 or -1 for D1..D12. */ components: number[] }

/** Dwadasa-vargeeya bala: +1/-1 in each of D1..D12 (tajaka.dwadasa_vargeeya). */
export function dwadasaVargeeya(l: Longitudes): Record<SevenPlanet, DwadasaVargeeya> {
  return Object.fromEntries(SEVEN.map((p) => {
    const components = Array.from({ length: 12 }, (_, i) => {
      const sign = vargaSign(l[p], i + 1), owner = lord(sign)
      return sign === EXALT[p] || owner === p ? 1 : sign === DEBIL[p] ? -1 : tajikaFriend(p, owner) ? 1 : -1
    })
    return [p, { total: components.reduce((a, b) => a + b, 0), components }]
  })) as Record<SevenPlanet, DwadasaVargeeya>
}

// ---------------------------------------------------------------------------------------------
// Year lord (PDF 342)

/** Lord of the Sun's (day) or Moon's (night) sign, natal lagna lord, Muntha lord, annual lagna lord, Tri-rasi lord. */
export function yearLordCandidates(natalAscendant: number, l: Longitudes, completedYears: number, isDay: boolean): SevenPlanet[] {
  const s = signsOf(l)
  return [lord(s[isDay ? 'Sun' : 'Moon']), lord(signOf(natalAscendant)), lord(muntha(natalAscendant, completedYears)), lord(s.Asc), (isDay ? TRIRASI_DAY : TRIRASI_NIGHT)[s.Asc]]
}

export type YearLordReason = 'benefic_aspect' | 'malefic_aspect_fallback' | 'very_strong_without_aspect' | 'first_candidate_fallback'
export interface YearLordSelection {
  /** null when candidates stay tied. */
  lord: SevenPlanet | null
  tiedCandidates: SevenPlanet[]
  reason: YearLordReason
  tieTolerance: number
  candidates: { planet: SevenPlanet; candidacies: number; aspect: 'benefic' | 'malefic' | 'neutral_or_none'; pancha: number }[]
}

/**
 * tajaka.select_year_lord: prefer candidates aspecting the annual lagna with a friendly
 * (3/5/9/11) sign aspect, else an inimical one (1/4/7/10), else a very strong one; highest
 * Pancha-vargeeya total wins, then most candidacies. Unbroken ties stay ties.
 */
export function selectYearLord(candidates: readonly SevenPlanet[], l: Longitudes, pancha: Record<SevenPlanet, PanchaVargeeya>, tieTolerance = 0): YearLordSelection {
  if (!candidates.length) throw new Error('Classical candidates required')
  const s = signsOf(l)
  const nature = (p: SevenPlanet) => {
    const h = houseFrom(s[p], s.Asc)
    return [3, 5, 9, 11].includes(h) ? 'benefic' : [1, 4, 7, 10].includes(h) ? 'malefic' : 'neutral_or_none'
  }
  const unique = [...new Set(candidates)]
  const count = (p: SevenPlanet) => candidates.filter((x) => x === p).length
  let reason: YearLordReason = 'benefic_aspect'
  let pool = unique.filter((p) => nature(p) === 'benefic')
  if (!pool.length) { pool = unique.filter((p) => nature(p) === 'malefic'); reason = 'malefic_aspect_fallback' }
  if (!pool.length) { pool = unique.filter((p) => pancha[p].total >= 15); reason = 'very_strong_without_aspect' }
  if (!pool.length) { pool = [candidates[0]]; reason = 'first_candidate_fallback' }
  const best = Math.max(...pool.map((p) => pancha[p].total))
  let tied = pool.filter((p) => best - pancha[p].total <= tieTolerance)
  const most = Math.max(...tied.map(count))
  tied = tied.filter((p) => count(p) === most)
  return {
    lord: tied.length === 1 ? tied[0] : null, tiedCandidates: tied.length > 1 ? tied : [], reason, tieTolerance,
    candidates: unique.map((p) => ({ planet: p, candidacies: count(p), aspect: nature(p), pancha: pancha[p].total })),
  }
}

// ---------------------------------------------------------------------------------------------
// Sahams (PDF 343-346, Table 74)

export const SAHAM_NAMES = [
  'Punya', 'Vidya', 'Yasas', 'Mitra', 'Mahatmya', 'Asha', 'Samartha', 'Bhratri', 'Gaurava', 'Pitri', 'Rajya', 'Matri',
  'Putra', 'Jeeva', 'Karma', 'Roga', 'Kali', 'Sastra', 'Bandhu', 'Mrityu', 'Paradesa', 'Artha', 'Paradara', 'Vanik',
  'Karyasiddhi', 'Vivaha', 'Santapa', 'Sraddha', 'Preeti', 'Jadya', 'Vyapara', 'Satru', 'Jalapatana', 'Bandhana', 'Apamrityu', 'Labha',
] as const
export type SahamName = (typeof SAHAM_NAMES)[number]

/** A - B + C, plus 30 degrees when C lies outside the forward arc from B to A. */
export function saham(a: number, b: number, c: number): number {
  const [x, y, z] = [a, b, c].map((v) => pyMod(v, 360))
  return pyMod(x - y + z + (pyMod(z - y, 360) > pyMod(x - y, 360) ? 30 : 0), 360)
}

/** All 36 sahams; by night A and B swap except for the seven fixed formulas. */
export function sahams(l: Longitudes, isDay: boolean): Record<SahamName, number> {
  const v: Record<string, number> = {}
  for (const p of [...SEVEN, 'Asc'] as const) v[p] = pyMod(l[p], 360)
  const asc = v.Asc, s = signOf(asc)
  for (const h of [2, 6, 8, 9, 11]) {
    v[`H${h}`] = pyMod(asc + (h - 1) * 30, 360)
    v[`L${h}`] = v[lord((s + h - 1) % 12)]
  }
  v.AscLord = v[lord(s)]
  v.Cancer15 = 105
  const marsRising = lord(s) === 'Mars'
  const light = isDay ? 'Sun' : 'Moon'
  const forms: [SahamName, string, string, string][] = [
    ['Punya', 'Moon', 'Sun', 'Asc'], ['Vidya', 'Sun', 'Moon', 'Asc'], ['Yasas', 'Jupiter', 'Punya', 'Asc'],
    ['Mitra', 'Jupiter', 'Punya', 'Venus'], ['Mahatmya', 'Punya', 'Mars', 'Asc'], ['Asha', 'Saturn', 'Mars', 'Asc'],
    ['Samartha', marsRising ? 'Jupiter' : 'Mars', marsRising ? 'Mars' : 'AscLord', 'Asc'],
    ['Bhratri', 'Jupiter', 'Saturn', 'Asc'], ['Gaurava', 'Jupiter', 'Moon', 'Sun'], ['Pitri', 'Saturn', 'Sun', 'Asc'],
    ['Rajya', 'Saturn', 'Sun', 'Asc'], ['Matri', 'Moon', 'Venus', 'Asc'], ['Putra', 'Jupiter', 'Moon', 'Asc'],
    ['Jeeva', 'Saturn', 'Jupiter', 'Asc'], ['Karma', 'Mars', 'Mercury', 'Asc'], ['Roga', 'Asc', 'Moon', 'Asc'],
    ['Kali', 'Jupiter', 'Mars', 'Asc'], ['Sastra', 'Jupiter', 'Saturn', 'Mercury'], ['Bandhu', 'Mercury', 'Moon', 'Asc'],
    ['Mrityu', 'H8', 'Moon', 'Asc'], ['Paradesa', 'H9', 'L9', 'Asc'], ['Artha', 'H2', 'L2', 'Asc'],
    ['Paradara', 'Venus', 'Sun', 'Asc'], ['Vanik', 'Moon', 'Mercury', 'Asc'],
    ['Karyasiddhi', 'Saturn', light, lord(signOf(v[light]))],
    ['Vivaha', 'Venus', 'Saturn', 'Asc'], ['Santapa', 'Saturn', 'Moon', 'H6'], ['Sraddha', 'Venus', 'Mars', 'Asc'],
    ['Preeti', 'Sastra', 'Punya', 'Asc'], ['Jadya', 'Mars', 'Saturn', 'Mercury'], ['Vyapara', 'Mars', 'Saturn', 'Asc'],
    ['Satru', 'Mars', 'Saturn', 'Asc'], ['Jalapatana', 'Cancer15', 'Saturn', 'Asc'], ['Bandhana', 'Punya', 'Saturn', 'Asc'],
    ['Apamrityu', 'H8', 'Mars', 'Asc'], ['Labha', 'H11', 'L11', 'Asc'],
  ]
  const fixed = new Set<SahamName>(['Bhratri', 'Mrityu', 'Paradesa', 'Artha', 'Karyasiddhi', 'Vyapara', 'Labha'])
  const out = {} as Record<SahamName, number>
  for (const [name, a0, b0, c] of forms) {
    const [a, b] = !isDay && !fixed.has(name) ? [b0, a0] : [a0, b0]
    out[name] = v[name] = saham(v[a], v[b], v[c])
  }
  return out
}

// ---------------------------------------------------------------------------------------------
// Tajaka aspects and yogas (PDF 338, 348-355; tajaka.aspect, tajaka_yogas.evaluate/qualify)

export type TajakaAspectKind = 'conjunction' | 'semi_sextile' | 'sextile' | 'square' | 'trine' | 'opposition'
/** Values recorded with a yoga; keys are camelCase forms of the toolkit's audit keys. */
export type Conditions = Record<string, string | number | boolean | null | undefined>
export type TajakaAspect = {
  kind: TajakaAspectKind | null
  /** Sign of the second planet counted from the first's (1..12). */
  house: number
  natureInBook?: 'malefic' | 'neutral' | 'benefic'
  strengthInBook?: 'strong' | 'neutral' | 'weak'
  degreeDifference?: number
  mutualOrb?: number
  withinMutualOrb?: boolean
  withinOneDegree?: boolean
  locallyApplying?: boolean
  locallySeparating?: boolean
  candidateIthasala?: boolean
  candidateEesarpha?: boolean
  perfectionRequiresTracking?: boolean
  ithasalaType?: 'poorna' | 'vartamaana'
  bhavishyaCandidate?: boolean
}

const ASPECT_KINDS: Record<number, [TajakaAspectKind, 'malefic' | 'neutral' | 'benefic', 'strong' | 'neutral' | 'weak']> = {
  1: ['conjunction', 'malefic', 'strong'], 2: ['semi_sextile', 'neutral', 'neutral'], 3: ['sextile', 'benefic', 'weak'],
  4: ['square', 'malefic', 'weak'], 5: ['trine', 'benefic', 'strong'], 7: ['opposition', 'malefic', 'strong'],
  9: ['trine', 'benefic', 'strong'], 10: ['square', 'malefic', 'weak'], 11: ['sextile', 'benefic', 'weak'], 12: ['semi_sextile', 'neutral', 'neutral'],
}

/**
 * Sign-based Tajaka aspect with degree-in-sign difference and the smaller of the two orbs.
 * With speeds it also reports local application or separation (candidate Ithasala/Eesarpha).
 */
export function tajakaAspect(p1: SevenPlanet, l1: number, p2: SevenPlanet, l2: number, speed1?: number, speed2?: number): TajakaAspect {
  const house = houseFrom(signOf(l1), signOf(l2))
  const k = ASPECT_KINDS[house]
  if (!k) return { kind: null, house }
  const diff = within(l2) - within(l1)
  const orb = Math.min(TAJAKA_ORBS[p1], TAJAKA_ORBS[p2])
  const out: TajakaAspect = {
    kind: k[0], natureInBook: k[1], strengthInBook: k[2], house, degreeDifference: Math.abs(diff), mutualOrb: orb,
    withinMutualOrb: Math.abs(diff) <= orb, withinOneDegree: Math.abs(diff) <= 1,
  }
  if (speed1 !== undefined && speed2 !== undefined) {
    const closing = diff * (speed2 - speed1) < 0, separating = diff * (speed2 - speed1) > 0
    Object.assign(out, {
      locallyApplying: closing, locallySeparating: separating, candidateIthasala: closing && Math.abs(diff) <= orb,
      candidateEesarpha: separating && Math.abs(diff) <= orb, perfectionRequiresTracking: true,
    })
  }
  return out
}

export const TAJAKA_YOGA_NAMES = [
  'Ishkavala', 'Induvara', 'Ithasala', 'Eesarpha', 'Nakta', 'Yamaya', 'Manahoo', 'Kamboola', 'Gairi-Kamboola',
  'Khallasara', 'Radda', 'Duhphali-Kutta', 'Duttota', 'Thambira', 'Kutta', 'Durupha',
] as const
export type TajakaYogaName = (typeof TAJAKA_YOGA_NAMES)[number]

export interface TajakaYogaHit { planets: SevenPlanet[]; conditions: Conditions }
export interface PendingYoga extends TajakaYogaHit { name: TajakaYogaName }
export interface FuturePositions { longitudes: Longitudes; speeds: Speeds; pancha: Record<SevenPlanet, PanchaVargeeya> }
export interface Ingress { jd: number; fromSign: SignIndex; toSign: SignIndex }
export type PerfectionStatus = 'no_initial_aspect' | 'perfect_at_start' | 'perfects_before_sign_change' | 'sign_change_before_detected_perfection' | 'not_found_in_window'
export interface PerfectionCheck {
  planets: SevenPlanet[]
  status: PerfectionStatus
  /** Instant of exact angular perfection. */
  jd?: number
  residualDegrees?: number
  /** Sampling interval in which a sign change was seen first. */
  jdBracket?: [number, number]
  stations?: { planet: SevenPlanet; jdBracket: [number, number] }[]
  windowDays?: number
  sampleStepDays?: number
}
export type QualificationStatus = 'radda_counteracted_by_duttota' | 'competing_modifiers_need_review' | 'adverse_modification' | 'reinforced_candidate' | 'base_candidate' | 'angular_perfection_not_established'
export interface QualifiedIthasala {
  planets: SevenPlanet[]
  adverseModifiers: TajakaYogaName[]
  supportingModifiers: TajakaYogaName[]
  explicitOverride: 'Duttota over Radda' | null
  status: QualificationStatus
  perfection: PerfectionCheck | null
}
export interface TajakaYogas {
  /** Structural candidates per yoga name (all 16 keys present). */
  configurations: Record<TajakaYogaName, TajakaYogaHit[]>
  /** Applying pairs within one degree of the mutual orb (Bhavishya Ithasala candidates). */
  futureIthasala: TajakaYogaHit[]
  /** Conditions that need data the evaluation did not have. */
  pending: PendingYoga[]
  /** Next sign ingress of fast planets at 29+ degrees, used for Thambira / Gairi-Kamboola. */
  ingressChecks: Partial<Record<SevenPlanet, Ingress>>
  /** Ephemeris check of every Ithasala pair, in Ithasala order. */
  perfection: PerfectionCheck[]
  /** Each Ithasala with its modifying yogas (tajaka_yogas.qualify). */
  qualification: QualifiedIthasala[]
  profiles: { nakta: 'pvr_applying_both'; duhphali: 'historical_slower_strong'; durupha: 'pvr_literal' }
}

type Tri = boolean | null
const all3 = (v: Tri[]): Tri => (v.includes(false) ? false : v.includes(null) ? null : true)
const any3 = (v: Tri[]): Tri => (v.includes(true) ? true : v.includes(null) ? null : false)

function combust(p: SevenPlanet, longitude: number, sun: number, speed: number): boolean {
  const base = COMBUSTION[p]
  if (base === undefined) return false
  const limit = p === 'Mercury' && speed < 0 ? 12 : p === 'Venus' && speed < 0 ? 8 : base
  return Math.abs(pyMod(longitude - sun + 180, 360) - 180) < limit
}

/**
 * The 16 named configurations as structural candidates, with the toolkit's default profiles
 * (Nakta: faster planet applying to both; Duhphali: slower planet strong; Durupha: literal).
 * `future` maps a planet to the chart just after its next ingress (Thambira, Gairi-Kamboola).
 */
export function evaluateTajakaYogas(l: Longitudes, speeds: Speeds, pancha: Record<SevenPlanet, PanchaVargeeya>, future: Partial<Record<SevenPlanet, FuturePositions>> = {}): Pick<TajakaYogas, 'configurations' | 'futureIthasala' | 'pending' | 'profiles'> {
  const s = signsOf(l)
  const house = (p: SevenPlanet) => houseFrom(s.Asc, s[p])
  const dignified = (p: SevenPlanet) => lord(s[p]) === p || s[p] === EXALT[p]
  const weakDignity = (p: SevenPlanet) => s[p] === DEBIL[p] || (lord(s[p]) !== p && !tajikaFriend(p, lord(s[p])))
  const strong = (p: SevenPlanet) => any3([dignified(p), pancha[p].total >= 10])
  const weak = (p: SevenPlanet) => any3([weakDignity(p), pancha[p].total < 5])
  const impaired = (p: SevenPlanet) => s[p] === DEBIL[p] || speeds[p] < 0 || combust(p, l[p], l.Sun, speeds[p])
  const details = (p: SevenPlanet, q: SevenPlanet, v: Longitudes = l, w: Speeds = speeds) => tajakaAspect(p, v[p], q, v[q], w[p], w[q])
  const applies = (p: SevenPlanet, q: SevenPlanet, v: Longitudes = l, w: Speeds = speeds) => !!details(p, q, v, w).candidateIthasala
  const separates = (p: SevenPlanet, q: SevenPlanet) => !!details(p, q).candidateEesarpha
  const found = Object.fromEntries(TAJAKA_YOGA_NAMES.map((n) => [n, []])) as unknown as Record<TajakaYogaName, TajakaYogaHit[]>
  const pending: PendingYoga[] = [], futureIthasala: TajakaYogaHit[] = []
  const record = (name: TajakaYogaName, planets: readonly SevenPlanet[], value: Tri, conditions: Conditions) => {
    if (value === true) found[name].push({ planets: [...planets], conditions })
    else if (value === null) pending.push({ name, planets: [...planets], conditions })
  }
  record('Ishkavala', SEVEN, SEVEN.every((p) => ![3, 6, 9, 12].includes(house(p))), { cadentHousesEmpty: true })
  record('Induvara', SEVEN, SEVEN.every((p) => [3, 6, 9, 12].includes(house(p))), { onlyCadentHouses: true })
  for (let i = 0; i < SEVEN.length; i++) {
    for (let j = i + 1; j < SEVEN.length; j++) {
      const p = SEVEN[i], q = SEVEN[j]
      const detail = details(p, q), app = applies(p, q), sep = separates(p, q)
      if (app) detail.ithasalaType = detail.withinOneDegree ? 'poorna' : 'vartamaana'
      else if (detail.locallyApplying && (detail.degreeDifference ?? 99) - (detail.mutualOrb ?? 0) <= 1) {
        detail.bhavishyaCandidate = true
        futureIthasala.push({ planets: [p, q], conditions: { ...detail } })
      }
      const fast = Math.abs(speeds[q]) > Math.abs(speeds[p]) ? q : p, slow = fast === p ? q : p
      record('Ithasala', [p, q], app, detail)
      record('Eesarpha', [p, q], sep, detail)
      // Nakta/Yamaya require that the pair has no direct aspect of its own.
      if (!app && !sep) {
        for (const r of SEVEN) {
          if (r === p || r === q) continue
          if (Math.abs(speeds[r]) > Math.max(Math.abs(speeds[p]), Math.abs(speeds[q]))) {
            record('Nakta', [p, q, r], applies(r, p) && applies(r, q), { mode: 'pvr_applying_both', fasterIntermediary: true })
          }
          if (Math.abs(speeds[r]) < Math.min(Math.abs(speeds[p]), Math.abs(speeds[q]))) {
            record('Yamaya', [p, q, r], applies(p, r) && applies(q, r), { slowerIntermediary: true })
          }
        }
      }
      if (app) {
        for (const r of ['Mars', 'Saturn'] as const) {
          record('Manahoo', [p, q, r], r !== p && r !== q && s[r] === s[fast] && Math.abs(within(l[r]) - within(l[fast])) <= TAJAKA_ORBS[fast], { conjunctionOnly: true })
        }
        record('Kamboola', [p, q, 'Moon'], p !== 'Moon' && q !== 'Moon' && (applies('Moon', p) || applies('Moon', q)), { lunarApplication: true })
        record('Radda', [p, q], any3([impaired(p), impaired(q), weak(p), weak(q)]), { impairmentP: impaired(p), impairmentQ: impaired(q), weakP: weak(p), weakQ: weak(q) })
        const [big, small] = [slow, fast]
        record('Duhphali-Kutta', [p, q], all3([strong(big), !dignified(small), weak(small)]), { mode: 'historical_slower_strong', strongPlanet: big, weakPlanet: small })
        for (const r of SEVEN) {
          if (r !== p && r !== q) {
            record('Duttota', [p, q, r], all3([weak(p), weak(q), strong(r), applies(r, p) || applies(r, q)]), { bothWeak: all3([weak(p), weak(q)]), strongHelper: strong(r) })
          }
        }
        // The definition needs dusthana placement and impairment; the book's example drops the houses.
        const dusthana = (x: SevenPlanet) => [6, 8, 12].includes(house(x))
        record('Durupha', [p, q], impaired(p) && impaired(q) && dusthana(p) && dusthana(q), { mode: 'pvr_literal' })
        if (p !== 'Moon' && q !== 'Moon' && within(l.Moon) >= 29) {
          const moonEligible = s.Moon !== EXALT.Moon && s.Moon !== DEBIL.Moon && [3, 9].every((n) => lord(vargaSign(l.Moon, n)) !== 'Moon') && haddaLord(l.Moon) !== 'Moon'
          if (moonEligible) {
            const f = future.Moon
            let futureOk: Tri = null, helper: Tri = null
            if (f) {
              futureOk = applies('Moon', p, f.longitudes, f.speeds) || applies('Moon', q, f.longitudes, f.speeds)
              const fs = signsOf(f.longitudes)
              const futureStrong = (r: SevenPlanet) => any3([lord(fs[r]) === r || fs[r] === EXALT[r], f.pancha[r].total >= 10])
              helper = any3(SEVEN.filter((r) => r !== 'Moon').map((r) => all3([futureStrong(r), applies('Moon', r, f.longitudes, f.speeds)])))
            }
            record('Gairi-Kamboola', [p, q, 'Moon'], all3([futureOk, helper]), { postIngressApplication: futureOk, strongHelperAfterIngress: helper })
          }
        }
      }
      for (const [moving, other] of [[p, q], [q, p]] as const) {
        if (within(l[moving]) >= 29 && speeds[moving] > 0 && Math.abs(speeds[moving]) > Math.abs(speeds[other]) && !app) {
          const f = future[moving]
          const value = f ? applies(moving, other, f.longitudes, f.speeds) : null
          record('Thambira', [moving, other], value, { postIngressApplication: value })
        }
      }
      for (const [occupant, source] of [[p, q], [q, p]] as const) {
        record('Kutta', [occupant, source], house(occupant) === 1 && dignified(source) && ![3, 6, 9, 12].includes(house(source)) && detail.kind !== null, { dignifiedSourceAspectBySign: true })
      }
    }
  }
  const lagnaLord = lord(s.Asc)
  for (const x of SEVEN) {
    if (x === 'Moon' || x === lagnaLord) continue
    // Three consecutive signs in zodiacal order with the lagna lord in the middle (PVR's example).
    const middle = pyMod(s[lagnaLord] - s.Moon, 12) === 1 && pyMod(s[x] - s[lagnaLord], 12) === 1
    record('Khallasara', ['Moon', lagnaLord, x], middle && !applies(lagnaLord, 'Moon') && !applies(lagnaLord, x), { betweenPolicy: 'consecutive signs in zodiacal order' })
  }
  return { configurations: found, futureIthasala, pending, profiles: { nakta: 'pvr_applying_both', duhphali: 'historical_slower_strong', durupha: 'pvr_literal' } }
}

const body = (jd: number, p: SevenPlanet, settings: Settings) => planetLongitude(jd, p, settings)

/** Next sign change of `planet` within `maxDays` (tajaka.next_ingress), or null. */
export function nextIngress(jd: number, planet: SevenPlanet, settings: Settings, maxDays = 60, stepDays = 0.125): Ingress | null {
  const signAt = (t: number) => signOf(body(t, planet, settings).longitude)
  const initial = signAt(jd)
  let a = jd
  for (let i = 1; i <= Math.trunc(maxDays / stepDays) + 1; i++) {
    const b = Math.min(jd + i * stepDays, jd + maxDays)
    if (signAt(b) !== initial) {
      let lo = a, hi = b
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2
        if (signAt(mid) === initial) lo = mid
        else hi = mid
      }
      return { jd: (lo + hi) / 2, fromSign: initial, toSign: signAt(hi + 1e-7) }
    }
    if (b >= jd + maxDays) break
    a = b
  }
  return null
}

/**
 * Whether a sign-based aspect perfects in exact degrees before either planet changes sign
 * (tajaka.track_perfection). Real ephemeris motion, stations included; a finite sampled search.
 */
export function trackPerfection(jd: number, p: SevenPlanet, q: SevenPlanet, settings: Settings, maxDays = 60, stepDays = 0.125): PerfectionCheck {
  const pair = (t: number) => [body(t, p, settings), body(t, q, settings)] as const
  const signs = (x: ReturnType<typeof pair>) => [signOf(x[0].longitude), signOf(x[1].longitude)]
  let cur = pair(jd)
  const s0 = signs(cur)
  const planets = [p, q]
  if (tajakaAspect(p, cur[0].longitude, q, cur[1].longitude, cur[0].speed, cur[1].speed).kind === null) return { planets, status: 'no_initial_aspect' }
  const target = pyMod((s0[1] - s0[0]) * 30, 360)
  const residual = (x: ReturnType<typeof pair>) => pyMod(x[1].longitude - x[0].longitude - target + 180, 360) - 180
  const sameSigns = (x: ReturnType<typeof pair>) => { const s = signs(x); return s[0] === s0[0] && s[1] === s0[1] }
  let prev = jd, r0 = residual(cur)
  const stations: NonNullable<PerfectionCheck['stations']> = []
  let last = [cur[0].speed, cur[1].speed]
  if (Math.abs(r0) < 1e-9) return { planets, status: 'perfect_at_start', jd }
  for (let i = 1; i <= Math.trunc(maxDays / stepDays) + 1; i++) {
    const t = Math.min(jd + maxDays, jd + i * stepDays)
    cur = pair(t)
    const r = residual(cur)
    const now = [cur[0].speed, cur[1].speed]
    for (let k = 0; k < 2; k++) {
      if (last[k] * now[k] < 0 || (last[k] !== 0 && now[k] === 0)) stations.push({ planet: planets[k], jdBracket: [prev, t] })
    }
    const changed = !sameSigns(cur)
    if (r * r0 <= 0 && Math.abs(r - r0) < 180) {
      let lo = prev, hi = t
      for (let k = 0; k < 40; k++) {
        const mid = (lo + hi) / 2
        if (residual(pair(mid)) * r0 > 0) lo = mid
        else hi = mid
      }
      const root = (lo + hi) / 2, at = pair(root)
      if (sameSigns(at)) return { planets, status: 'perfects_before_sign_change', jd: root, residualDegrees: residual(at), stations }
    }
    if (changed) return { planets, status: 'sign_change_before_detected_perfection', jdBracket: [prev, t], stations }
    if (t >= jd + maxDays) break
    prev = t; r0 = r; last = now
  }
  return { planets, status: 'not_found_in_window', windowDays: maxDays, sampleStepDays: stepDays, stations }
}

/** Each Ithasala with its modifiers; only the book's explicit override (Duttota over Radda) resolves conflicts. */
export function qualifyIthasala(configurations: Record<TajakaYogaName, TajakaYogaHit[]>, perfection: readonly PerfectionCheck[] = []): QualifiedIthasala[] {
  const key = (planets: readonly string[]) => [...planets].sort().join('|')
  const tracking = new Map(perfection.map((x) => [key(x.planets), x]))
  const adverse: TajakaYogaName[] = ['Manahoo', 'Radda', 'Durupha']
  const helpful: TajakaYogaName[] = ['Kamboola', 'Gairi-Kamboola', 'Duhphali-Kutta', 'Duttota']
  return configurations.Ithasala.map((base) => {
    const pair = key(base.planets)
    const hits = (names: TajakaYogaName[]) => names.filter((n) => configurations[n].some((x) => key(x.planets.slice(0, 2)) === pair))
    const bad = hits(adverse), good = hits(helpful)
    const restored = bad.includes('Radda') && good.includes('Duttota') && !bad.includes('Manahoo') && !bad.includes('Durupha')
    let status: QualificationStatus = restored ? 'radda_counteracted_by_duttota' : bad.length && good.length ? 'competing_modifiers_need_review'
      : bad.length ? 'adverse_modification' : good.length ? 'reinforced_candidate' : 'base_candidate'
    const motion = tracking.get(pair) ?? null
    if (motion && (motion.status === 'sign_change_before_detected_perfection' || motion.status === 'not_found_in_window')) status = 'angular_perfection_not_established'
    return { planets: base.planets, adverseModifiers: bad, supportingModifiers: good, explicitOverride: restored ? 'Duttota over Radda' : null, status, perfection: motion }
  })
}

// ---------------------------------------------------------------------------------------------
// Annual dasas (PDF 356-359)

export interface AnnualPeriod {
  /** Patyayini includes the ascendant as a period ruler. */
  lord: Body
  /** Offsets from the solar return in annual years, as the toolkit's start_year/end_year. */
  startYear: number
  endYear: number
  startJd: number
  endJd: number
  children?: AnnualPeriod[]
}

/** A period in annual years from the return, before dating. */
export interface RelativePeriod { lord: Body; start: number; end: number; duration: number; children?: RelativePeriod[] }

function periods(sequence: readonly Body[], lengths: readonly number[], start = 0): RelativePeriod[] {
  let t = start
  return sequence.map((lord, i) => {
    const p = { lord, start: t, end: t + lengths[i], duration: lengths[i] }
    t += lengths[i]
    return p
  })
}

function weightedChildren(parent: RelativePeriod, order: readonly Body[], weights: Readonly<Partial<Record<Body, number>>>): RelativePeriod[] {
  const i = order.indexOf(parent.lord)
  const seq = [...order.slice(i), ...order.slice(0, i)]
  const den = order.reduce((a, p) => a + weights[p]!, 0)
  return periods(seq, seq.map((p) => (parent.duration * weights[p]!) / den), parent.start)
}

/**
 * Mudda dasa (tajaka.mudda): Vimsottari from the natal Moon advanced one nakshatra per
 * completed year, compressed 120:1 into one solar-arc year; the next first-lord period is
 * kept so the whole year is covered.
 */
export function muddaPeriods(natalMoon: number, completedYears: number): RelativePeriod[] {
  if (!Number.isInteger(completedYears) || completedYears < 0) throw new Error('Integer completed years required')
  const moon = pyMod(pyMod(natalMoon, 360) + (completedYears * 40) / 3, 360)
  const idx = Math.floor((moon * 3) / 40)
  const fraction = (moon * 3 - 40 * idx) / 40
  const first = VIM_ORDER[idx % 9]
  const i0 = VIM_ORDER.indexOf(first)
  const seq = [...VIM_ORDER.slice(i0), ...VIM_ORDER.slice(0, i0)]
  const twice = [...seq, ...seq]
  const out: RelativePeriod[] = []
  for (const p of periods(twice, twice.map((x) => VIM_YEARS[x]), -fraction * VIM_YEARS[first])) {
    if (p.start / 120 >= 1) break
    const scale = (x: RelativePeriod) => ({ lord: x.lord, start: x.start / 120, end: x.end / 120, duration: x.duration / 120 })
    out.push({ ...scale(p), children: weightedChildren(p, VIM_ORDER, VIM_YEARS).map(scale) })
  }
  return out
}

/**
 * Patyayini dasa (tajaka.patyayini, PDF 358 Table 75): planets and lagna ordered by degree
 * in sign; each period is the gap to the previous degree, over a 365.2425-day year.
 * Returns null when two degrees are equal (the book gives no tie rule).
 */
export function patyayiniPeriods(l: Longitudes): RelativePeriod[] | null {
  const bodies = [...SEVEN, 'Asc'] as Body[]
  const values = Object.fromEntries(bodies.map((p) => [p, within(l[p])])) as Record<Body, number>
  if (new Set(bodies.map((p) => values[p])).size !== bodies.length) return null
  const order = [...bodies].sort((a, b) => values[a] - values[b])
  const weights: Partial<Record<Body, number>> = {}
  order.forEach((p, i) => { weights[p] = values[p] - (i ? values[order[i - 1]] : 0) })
  const total = order.reduce((a, p) => a + weights[p]!, 0)
  if (total === 0) return null
  return periods(order, order.map((p) => weights[p]! / total)).map((p) => ({ ...p, children: weightedChildren(p, order, weights) }))
}

function dated(rows: RelativePeriod[], when: (years: number) => number): AnnualPeriod[] {
  return rows.map((p) => ({
    lord: p.lord, startYear: p.start, endYear: p.end, startJd: when(p.start), endJd: when(p.end),
    ...(p.children ? { children: dated(p.children, when) } : {}),
  }))
}

// ---------------------------------------------------------------------------------------------
// The annual chart

export interface AnnualChart {
  completedYears: number
  natalJd: number
  /** Exact instant the Sun returns to its natal sidereal longitude (JD UT1); the year starts here. */
  returnJd: number
  /** The following return, where this Tajaka year ends. */
  nextReturnJd: number
  solarArcDegrees: number
  /** Sun's distance from the target at the return, degrees (bisection residual). */
  residualDegrees: number
  /** The annual (varsha) chart cast for the birthplace at the return instant. */
  chart: Chart
  /** null in polar day or night; the day/night-dependent results below are then null too. */
  isDay: boolean | null
  munthaSign: SignIndex
  /** Muntha's house from the annual ascendant. */
  munthaHouse: number
  harshaBala: Record<SevenPlanet, HarshaBala> | null
  panchaVargeeya: Record<SevenPlanet, PanchaVargeeya>
  dwadasaVargeeya: Record<SevenPlanet, DwadasaVargeeya>
  yearLordCandidates: SevenPlanet[] | null
  yearLord: YearLordSelection | null
  sahams: Record<SahamName, number> | null
  yogas: TajakaYogas
  mudda: AnnualPeriod[]
  /** null when two Krisamsas are equal (no tie rule in the book). */
  patyayini: AnnualPeriod[] | null
  warnings: string[]
}

/**
 * The Tajaka annual chart for the year after `completedYears` completed solar years, as
 * analysis.solar_return (year 0 is the birth year). Throws BirthInputError for bad input.
 */
export function annualChart(birth: BirthInput, settings: Settings, completedYears: number): AnnualChart {
  if (!Number.isInteger(completedYears) || completedYears < 0 || completedYears > 150) throw new Error('Completed years must be a whole number from 0 to 150')
  const natal = castChart(birth, settings)
  const birthSun = sunAt(natal.jd, settings)
  const event = solarArcDate(natal.jd, completedYears, settings, birthSun)
  const nextReturnJd = solarArcDate(natal.jd, completedYears + 1, settings, birthSun)
  const chart = chartAt(roundTripJd(event), natal)
  const l = Object.fromEntries(BODIES.map((b) => [b, chart.positions[b].longitude])) as Record<Body, number>
  const speeds = Object.fromEntries(BODIES.map((b) => [b, chart.positions[b].speed])) as Record<Body, number>
  const natalAsc = natal.positions.Asc.longitude
  const isDay = chart.solarDay ? chart.solarDay.isDay : null
  const m = muntha(natalAsc, completedYears)
  const pancha = panchaVargeeya(l)
  const candidates = isDay === null ? null : yearLordCandidates(natalAsc, l, completedYears, isDay)

  // Fast planets at 29+ degrees: the chart just after their next ingress (Thambira, Gairi-Kamboola).
  const future: Partial<Record<SevenPlanet, FuturePositions>> = {}
  const ingressChecks: Partial<Record<SevenPlanet, Ingress>> = {}
  for (const p of SEVEN) {
    if (within(l[p]) < 29 || !(speeds[p] > 0)) continue
    const ingress = nextIngress(event, p, settings)
    if (!ingress || ingress.toSign !== (signOf(l[p]) + 1) % 12) continue
    const fp = positionsWithAscendant(ingress.jd + 1e-7, birth.latitude, birth.longitude, settings)
    const fl = Object.fromEntries(BODIES.map((b) => [b, fp[b].longitude])) as Record<Body, number>
    future[p] = { longitudes: fl, speeds: Object.fromEntries(BODIES.map((b) => [b, fp[b].speed])) as Record<Body, number>, pancha: panchaVargeeya(fl) }
    ingressChecks[p] = ingress
  }
  const structural = evaluateTajakaYogas(l, speeds, pancha, future)
  const perfection = structural.configurations.Ithasala.map((row) => trackPerfection(event, row.planets[0], row.planets[1], settings))
  const yogas: TajakaYogas = { ...structural, ingressChecks, perfection, qualification: qualifyIthasala(structural.configurations, perfection) }

  // Mudda runs on solar-arc years from the return; Patyayini on 365.2425-day years.
  const eventSun = sunAt(event, settings)
  const cache = new Map<number, number>()
  const arc = (y: number) => {
    let jd = cache.get(y)
    if (jd === undefined) cache.set(y, (jd = solarArcDate(event, y, settings, eventSun)))
    return jd
  }
  const paty = patyayiniPeriods(l)
  const warnings = [...chart.warnings]
  if (!paty) warnings.push('Two Patyayini degrees are equal and the book gives no tie rule, so the Patyayini dasa is not shown.')
  return {
    completedYears, natalJd: natal.jd, returnJd: event, nextReturnJd, solarArcDegrees: completedYears * 360,
    residualDegrees: pyMod(sunAt(event, settings) - birthSun - completedYears * 360 + 180, 360) - 180,
    chart, isDay, munthaSign: m, munthaHouse: houseFrom(chart.positions.Asc.sign, m),
    harshaBala: isDay === null ? null : harshaBala(l, isDay),
    panchaVargeeya: pancha, dwadasaVargeeya: dwadasaVargeeya(l),
    yearLordCandidates: candidates, yearLord: candidates ? selectYearLord(candidates, l, pancha) : null,
    sahams: isDay === null ? null : sahams(l, isDay), yogas,
    mudda: dated(muddaPeriods(natal.positions.Moon.longitude, completedYears), arc),
    patyayini: paty ? dated(paty, (y) => event + y * 365.2425) : null,
    warnings,
  }
}
