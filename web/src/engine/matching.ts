// Kundli matching: North Indian Ashtakoota (36 gunas), South Indian Dasa Porutham (10 checks)
// and Manglik (Kuja) dosha for each partner. This is not in the Python toolkit, so every table
// was checked against at least two independent published sources (named at each table); where
// published sources disagree, the choice made here is stated. Pure: reads the two charts only.
//
// Direction: the classical tables are directional (groom and bride). matchCharts(a, b) reads `a`
// in the groom's role and `b` in the bride's; the UI lets people swap the roles.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '../content/active'
import { degreeInSign, houseFrom, SIGN_LORDS, SIGN_NAMES, signOf } from './core'
import type { Chart, Planet, SignIndex } from './types'

type Graha = Exclude<Planet, 'Rahu' | 'Ketu'>

// ---------------------------------------------------------------------------------------------
// Moon facts

export const VARNAS = ['Brahmin', 'Kshatriya', 'Vaishya', 'Shudra'] as const
export type Varna = (typeof VARNAS)[number]
export const VASHYAS = ['Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Keeta'] as const
export type Vashya = (typeof VASHYAS)[number]
export const YONIS = ['Horse', 'Elephant', 'Sheep', 'Serpent', 'Dog', 'Cat', 'Rat', 'Cow', 'Buffalo', 'Tiger', 'Deer', 'Monkey', 'Mongoose', 'Lion'] as const
export type Yoni = (typeof YONIS)[number]
export const GANAS = ['Deva', 'Manushya', 'Rakshasa'] as const
export type Gana = (typeof GANAS)[number]
export const NADIS = ['Adi', 'Madhya', 'Antya'] as const
export type Nadi = (typeof NADIS)[number]
export const RAJJUS = ['Pada', 'Kati', 'Nabhi', 'Kantha', 'Siro'] as const
export type Rajju = (typeof RAJJUS)[number]
/** Same spellings as engine/moon.ts TARA_NAMES (not imported: that module pulls in the ephemeris). */
export const TARAS = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Saadhana', 'Naidhana', 'Mitra', 'Parama Mitra'] as const

/**
 * Varna by Moon sign, Aries..Pisces: water signs Brahmin, fire Kshatriya, earth Vaishya, air
 * Shudra (Drik Panchang varna-kuta tutorial; OnlineJyotish "Varna Kootam").
 */
const SIGN_VARNA: readonly number[] = [1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 0]

/**
 * Vashya group from the Moon's sign and half-sign: Sagittarius 0-15° human, 15-30° quadruped;
 * Capricorn 0-15° quadruped, 15-30° aquatic (Drik Panchang vashya-kuta tutorial; OnlineJyotish
 * "Vashya Kootam"; Astroyogi "Vasya Koota").
 */
export function vashyaOf(longitude: number): Vashya {
  const s = signOf(longitude)
  const firstHalf = degreeInSign(longitude) < 15
  if (s === 8) return firstHalf ? 'Manava' : 'Chatushpada'
  if (s === 9) return firstHalf ? 'Chatushpada' : 'Jalachara'
  return SIGN_VASHYA[s]!
}
/** Whole-sign groups; null for Sagittarius and Capricorn, which split at 15°. */
const SIGN_VASHYA: readonly (Vashya | null)[] = ['Chatushpada', 'Chatushpada', 'Manava', 'Jalachara', 'Vanachara', 'Manava', 'Manava', 'Keeta', null, null, 'Manava', 'Jalachara']

/**
 * Yoni (index into YONIS) of nakshatras 1..27: PyJHora yoni_mappings (identical) and the BPHS
 * male/female star list repeated by findyourfate and jagannathhora; OnlineJyotish "Yoni Kootam"
 * names the same 14 animals.
 */
const NAK_YONI: readonly number[] = [0, 1, 2, 3, 3, 4, 5, 2, 5, 6, 6, 7, 8, 9, 8, 9, 10, 10, 4, 11, 12, 11, 13, 0, 13, 7, 1]
/** Gana (index into GANAS) of nakshatras 1..27 (OnlineJyotish "Gana Kootam"; PyJHora). */
const NAK_GANA: readonly number[] = [0, 1, 2, 1, 0, 1, 0, 0, 2, 2, 1, 1, 0, 2, 0, 2, 0, 2, 2, 1, 1, 0, 2, 2, 1, 1, 0]
/** Nadi zig-zags through the stars in sixes: Adi, Madhya, Antya, Antya, Madhya, Adi (OnlineJyotish "Nadi Kootam"; PyJHora). */
const NADI_CYCLE: readonly number[] = [0, 1, 2, 2, 1, 0]
/** Rajju runs foot to head and back in nines (findyourfate 10 Porutham; hindutone; PyJHora). */
const RAJJU_CYCLE: readonly number[] = [0, 1, 2, 3, 4, 3, 2, 1, 0]

export interface MoonFacts {
  longitude: number
  sign: SignIndex
  /** 1..27 */
  nakshatra: number
  pada: 1 | 2 | 3 | 4
  signLord: Graha
  varna: Varna
  vashya: Vashya
  yoni: Yoni
  gana: Gana
  nadi: Nadi
  rajju: Rajju
}

export function moonFacts(chart: Chart): MoonFacts {
  const moon = chart.positions.Moon
  const n = moon.nakshatra.index
  return {
    longitude: moon.longitude,
    sign: moon.sign,
    nakshatra: n,
    pada: moon.nakshatra.pada,
    signLord: SIGN_LORDS[moon.sign] as Graha,
    varna: VARNAS[SIGN_VARNA[moon.sign]],
    vashya: vashyaOf(moon.longitude),
    yoni: YONIS[NAK_YONI[n - 1]],
    gana: GANAS[NAK_GANA[n - 1]],
    nadi: NADIS[NADI_CYCLE[(n - 1) % 6]],
    rajju: RAJJUS[RAJJU_CYCLE[(n - 1) % 9]],
  }
}

/** Stars counted from `from` to `to`, inclusive (same star = 1, the next = 2 ... 27). */
export const starCount = (from: number, to: number): number => ((((to - from) % 27) + 27) % 27) + 1

// ---------------------------------------------------------------------------------------------
// Planetary friendship (natural, Parashara), as vedic_toolkit/core.py FRIENDS and ENEMIES.

const FRIENDS: Readonly<Record<Graha, readonly Graha[]>> = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
}
const ENEMIES: Readonly<Record<Graha, readonly Graha[]>> = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'], Saturn: ['Sun', 'Moon', 'Mars'],
}
export type Relation = 'friend' | 'neutral' | 'enemy'
export const relation = (planet: Graha, other: Graha): Relation =>
  FRIENDS[planet].includes(other) ? 'friend' : ENEMIES[planet].includes(other) ? 'enemy' : 'neutral'

/**
 * Graha Maitri points of two Moon-sign lords: same lord or mutual friends 5, friend and neutral 4,
 * both neutral 3, friend and enemy 1, neutral and enemy 0.5, mutual enemies 0. Reproduces the 7x7
 * table published by OnlineJyotish and used by PyJHora (checked cell by cell in the tests).
 */
export function maitriPoints(a: Graha, b: Graha): number {
  if (a === b) return 5
  const r = [relation(a, b), relation(b, a)].sort().join('+')
  return { 'friend+friend': 5, 'friend+neutral': 4, 'neutral+neutral': 3, 'enemy+friend': 1, 'enemy+neutral': 0.5, 'enemy+enemy': 0 }[r]!
}

// ---------------------------------------------------------------------------------------------
// Ashtakoota

/**
 * Vashya points [bride group][groom group], groups in VASHYAS order: Astroyogi "Vasya Koota"
 * (bride rows) and PyJHora VasiyaArray_AstroYogi (indexed [girl][boy]) are identical; Drik
 * Panchang names the same value set (2, 1.5, 1, 0). OnlineJyotish prints a variant with 0.5 for
 * Manava-Jalachara and 0 for Chatushpada bride with Vanachara groom, among other cells.
 */
const VASHYA_POINTS: readonly (readonly number[])[] = [
  [2, 1, 1, 1.5, 1],
  [1, 2, 1.5, 0, 1],
  [1, 1.5, 2, 1, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
]

/**
 * Yoni points, symmetric, animals in YONIS order. Every cell agrees with PyJHora's YoniArray and
 * with the friendly 3 / neutral 2 / unfriendly 1 / sworn enemy 0 lists of findyourfate's
 * yoni-kuta lesson (checked cell by cell in the tests), with two split cells: Horse-Deer is 3
 * as in findyourfate's Horse list and aaps.space, where its Deer list and PyJHora give 1; Lion-
 * Buffalo is 1 as in PyJHora and findyourfate's Buffalo list, where its Lion list gives 2. The
 * seven sworn-enemy pairs score 0 (OnlineJyotish; findyourfate). The Maitreya-derived grid that
 * findyourfate also prints differs in five cells (Cat, Rat and Tiger with Lion; Rat and Monkey
 * with Mongoose); the lesson's own lists side with this grid.
 */
export const YONI_POINTS: readonly (readonly number[])[] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
]

/**
 * Gana points [bride gana][groom gana]: OnlineJyotish "Gana Kootam" (bride rows), Astroyogi (its
 * worked case: Deva groom with Manushya bride 5) and PyJHora gana_array ([girl][boy]) agree.
 * InstaAstro swaps the 1 and 0 of the Deva-Rakshasa cells; AstroMedha gives Manushya-Rakshasa 1.
 */
const GANA_POINTS: readonly (readonly number[])[] = [
  [6, 6, 0],
  [5, 6, 0],
  [1, 0, 6],
]

export type KootaKey = 'varna' | 'vashya' | 'tara' | 'yoni' | 'maitri' | 'gana' | 'bhakoot' | 'nadi'

export interface KootaResult {
  key: KootaKey
  name: string
  points: number
  max: number
  /** What the koota compares, for each partner ("Kshatriya", "Kshema (4th)", "Mars"...). */
  groom: string
  bride: string
}

export type DoshaException = 'same_sign_other_star' | 'same_star_other_sign' | 'same_star_other_pada' | 'same_lord' | 'friendly_lords'

export interface DoshaCheck {
  /** The koota scored 0. */
  present: boolean
  /** Mainstream cancellation conditions that hold; shown beside the raw score, never added to it. */
  exceptions: DoshaException[]
  cancelled: boolean
}

export type ScoreBand = 'excellent' | 'good' | 'average' | 'low'

/**
 * Bands of the 36-point total: below 18 not recommended, 18-24.5 average, 25-32.5 good, 33+
 * excellent (AstroMedha "minimum gunas for marriage"; GrahaGuru matchmaking; 18 as the floor is
 * the most widely repeated figure). Drik Panchang uses slightly lower cut-offs (17-20 middling).
 */
export function scoreBand(total: number): ScoreBand {
  return total >= 33 ? 'excellent' : total >= 25 ? 'good' : total >= 18 ? 'average' : 'low'
}

export interface Ashtakoota {
  kootas: KootaResult[]
  /** The raw sum of the eight kootas. */
  total: number
  max: 36
  band: ScoreBand
  nadiDosha: DoshaCheck
  bhakootDosha: DoshaCheck
  /**
   * The total with the points of a cancelled Nadi or Bhakoot dosha restored, as several online
   * calculators report it (e.g. AstroMedha's worked example). Shown beside the raw total only.
   */
  adjustedTotal: number
}

/** Tara of `to` counted from `from` (1..9) and whether it is one of the three hard taras (3, 5, 7). */
export function taraFrom(from: number, to: number): { tara: number; good: boolean } {
  const tara = ((starCount(from, to) - 1) % 9) + 1
  return { tara, good: tara !== 3 && tara !== 5 && tara !== 7 }
}

/** "10th · Janma": the star's count from the other partner's and the tara it gives. */
const taraLabel = (from: number, to: number) => T.MATCH_BASIS.tara(starCount(from, to), T.names.tara[TARAS[taraFrom(from, to).tara - 1]])

/** Sign distance pairs that make Bhakoot dosha: 2/12, 5/9 and 6/8 (all sources). */
export const isBhakootDosha = (a: SignIndex, b: SignIndex): boolean => [2, 5, 6, 8, 9, 12].includes(houseFrom(a, b))

export function ashtakoota(groom: MoonFacts, bride: MoonFacts): Ashtakoota {
  // Varna: 1 when the groom's varna is the same as or above the bride's (Drik Panchang; OnlineJyotish grid).
  const varna = VARNAS.indexOf(groom.varna) <= VARNAS.indexOf(bride.varna) ? 1 : 0
  const vashya = VASHYA_POINTS[VASHYAS.indexOf(bride.vashya)][VASHYAS.indexOf(groom.vashya)]
  // Tara: 1.5 for each direction whose count does not land on Vipat, Pratyak or Naidhana.
  const toGroom = taraFrom(bride.nakshatra, groom.nakshatra)
  const toBride = taraFrom(groom.nakshatra, bride.nakshatra)
  const tara = (toGroom.good ? 1.5 : 0) + (toBride.good ? 1.5 : 0)
  const yoni = YONI_POINTS[YONIS.indexOf(groom.yoni)][YONIS.indexOf(bride.yoni)]
  const maitri = maitriPoints(groom.signLord, bride.signLord)
  const gana = GANA_POINTS[GANAS.indexOf(bride.gana)][GANAS.indexOf(groom.gana)]
  const bhakoot = isBhakootDosha(bride.sign, groom.sign) ? 0 : 7
  const nadi = groom.nadi === bride.nadi ? 0 : 8
  const kootas: KootaResult[] = [
    { key: 'varna', name: 'Varna', points: varna, max: 1, groom: groom.varna, bride: bride.varna },
    { key: 'vashya', name: 'Vashya', points: vashya, max: 2, groom: groom.vashya, bride: bride.vashya },
    { key: 'tara', name: 'Tara', points: tara, max: 3, groom: taraLabel(bride.nakshatra, groom.nakshatra), bride: taraLabel(groom.nakshatra, bride.nakshatra) },
    { key: 'yoni', name: 'Yoni', points: yoni, max: 4, groom: groom.yoni, bride: bride.yoni },
    { key: 'maitri', name: 'Graha Maitri', points: maitri, max: 5, groom: groom.signLord, bride: bride.signLord },
    { key: 'gana', name: 'Gana', points: gana, max: 6, groom: groom.gana, bride: bride.gana },
    { key: 'bhakoot', name: 'Bhakoot', points: bhakoot, max: 7, groom: SIGN_NAMES[groom.sign], bride: SIGN_NAMES[bride.sign] },
    { key: 'nadi', name: 'Nadi', points: nadi, max: 8, groom: groom.nadi, bride: bride.nadi },
  ]
  const total = kootas.reduce((sum, k) => sum + k.points, 0)

  // Nadi dosha exceptions (Jyotirnibandha as quoted by OnlineJyotish; aaps.space; AstroSight):
  // same Moon sign with different stars, or the same star in different signs. The same star and
  // sign in different padas is accepted by some traditions only, and is flagged as such.
  const nadiExceptions: DoshaException[] = []
  if (nadi === 0) {
    const sameStar = groom.nakshatra === bride.nakshatra
    const sameSign = groom.sign === bride.sign
    if (sameSign && !sameStar) nadiExceptions.push('same_sign_other_star')
    if (sameStar && !sameSign) nadiExceptions.push('same_star_other_sign')
    if (sameStar && sameSign && groom.pada !== bride.pada) nadiExceptions.push('same_star_other_pada')
  }
  // Bhakoot dosha exceptions (OnlineJyotish "Bhakoota Kootam"; AstroSight; aaps.space): the two
  // Moon signs share a lord, or their lords are natural friends of each other.
  const bhakootExceptions: DoshaException[] = []
  if (bhakoot === 0) {
    if (groom.signLord === bride.signLord) bhakootExceptions.push('same_lord')
    else if (maitri === 5) bhakootExceptions.push('friendly_lords')
  }
  const check = (present: boolean, exceptions: DoshaException[]): DoshaCheck => ({ present, exceptions, cancelled: present && exceptions.length > 0 })
  const nadiDosha = check(nadi === 0, nadiExceptions)
  const bhakootDosha = check(bhakoot === 0, bhakootExceptions)
  const adjustedTotal = total + (nadiDosha.cancelled ? 8 : 0) + (bhakootDosha.cancelled ? 7 : 0)
  return { kootas, total, max: 36, band: scoreBand(total), nadiDosha, bhakootDosha, adjustedTotal }
}

// ---------------------------------------------------------------------------------------------
// Dasa Porutham (South Indian ten checks). Counts run from the bride's star or sign to the groom's.

export type PoruthamKey = 'dina' | 'gana' | 'mahendra' | 'stree_deergha' | 'yoni' | 'rasi' | 'rasyadhipati' | 'vasya' | 'rajju' | 'vedha'
export type PoruthamStatus = 'match' | 'partial' | 'no'

export interface PoruthamResult {
  key: PoruthamKey
  name: string
  status: PoruthamStatus
  /** The fact the check rests on, e.g. "Groom's star is 12th from the bride's". */
  basis: string
}

export interface DasaPorutham {
  items: PoruthamResult[]
  /** Matches count 1, partial matches 0.5. */
  agreed: number
  max: 10
  /** Rajju and Vedha, which most South Indian almanacs treat as essential, both agree. */
  essentialsAgree: boolean
}

/** Mutually obstructing stars (Vedha), as pairs of nakshatra numbers (findyourfate 10 Porutham; hindutone). */
const VEDHA_PAIRS: readonly (readonly [number, number])[] = [
  [1, 18], [2, 17], [3, 16], [4, 15], [6, 22], [7, 21], [8, 20], [9, 19], [10, 27], [11, 26], [12, 25], [13, 24], [5, 14], [5, 23], [14, 23],
]
export const isVedha = (a: number, b: number): boolean => VEDHA_PAIRS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))

/**
 * Vasya signs of each Moon sign, Aries..Pisces (PyJHora south table; findyourfate 10 Porutham).
 * The porutham holds when either partner's sign is vasya to the other's (hindutone).
 */
export const VASYA_SIGNS: readonly (readonly SignIndex[])[] = [[4, 7], [3, 6], [5], [7, 8], [6], [2, 11], [5, 9], [3], [11], [0, 10], [0], [9]]

const MAHENDRA = [4, 7, 10, 13, 16, 19, 22, 25]

export function dasaPorutham(groom: MoonFacts, bride: MoonFacts): DasaPorutham {
  const count = starCount(bride.nakshatra, groom.nakshatra)
  const signCount = houseFrom(bride.sign, groom.sign)
  const starText = count === 1 ? T.MATCH_BASIS.sameStar : T.MATCH_BASIS.starCount(count)
  const lordsFriendly = groom.signLord === bride.signLord || maitriPoints(groom.signLord, bride.signLord) === 5
  const items: PoruthamResult[] = []
  const add = (key: PoruthamKey, name: string, status: PoruthamStatus, basis: string) => items.push({ key, name, status, basis })

  // Dina: a count whose remainder by 9 is 2, 4, 6, 8 or 0 agrees (hindutone; findyourfate; PyJHora).
  // findyourfate and PyJHora's list leave out 17, 22 and 27 from the third round: partial here.
  // The same star is judged star by star in the almanacs: partial here.
  const r = count % 9
  add('dina', 'Dina', count === 1 ? 'partial' : [0, 2, 4, 6, 8].includes(r) ? ([17, 22, 27].includes(count) ? 'partial' : 'match') : 'no', starText)

  // Gana: the same gana agrees; Deva with Manushya partly; Rakshasa with either other no
  // (findyourfate; hindutone). Two Rakshasa stars split the almanacs: partial.
  const g = [groom.gana, bride.gana]
  add('gana', 'Gana', groom.gana === bride.gana ? (groom.gana === 'Rakshasa' ? 'partial' : 'match') : g.includes('Rakshasa') ? 'no' : 'partial',
    T.MATCH_BASIS.pair(groom.gana, bride.gana))

  // Mahendra: counts 4, 7, 10 ... 25 (hindutone; PyJHora; findyourfate).
  add('mahendra', 'Mahendra', MAHENDRA.includes(count) ? 'match' : 'no', starText)

  // Stree Deergha: the groom's star well ahead of the bride's, more than 13 (findyourfate;
  // hindutone), with 10-13 accepted as moderate by some (hindutone).
  add('stree_deergha', 'Stree Deergha', count > 13 ? 'match' : count > 9 ? 'partial' : 'no', starText)

  // Yoni: same or friendly animals agree, sworn enemies do not, the rest partly (findyourfate; hindutone).
  const yoniPoints = YONI_POINTS[YONIS.indexOf(groom.yoni)][YONIS.indexOf(bride.yoni)]
  add('yoni', 'Yoni', yoniPoints >= 3 ? 'match' : yoniPoints === 0 ? 'no' : 'partial', T.MATCH_BASIS.pair(groom.yoni, bride.yoni))

  // Rasi: counted from the bride's sign, 1, 7, 9, 10 and 11 agree; 2-6 and 8 do not; 12 is
  // partial. Hindutone favours the same sign or beyond the 6th, avoids 6/8, is wary of 2/12;
  // PyJHora's south rule accepts counts above 6; findyourfate rejects 2, 4, 6, 8 and 12. Same or
  // friendly sign lords soften a disagreement to partial (hindutone; OnlineJyotish).
  const rasi: PoruthamStatus = [1, 7, 9, 10, 11].includes(signCount) ? 'match' : signCount === 12 ? 'partial' : lordsFriendly ? 'partial' : 'no'
  add('rasi', 'Rasi', rasi, signCount === 1 ? T.MATCH_BASIS.sameSign : T.MATCH_BASIS.signCount(signCount))

  // Rasyadhipati: lords the same or mutual friends agree, neutral partly, any enmity no (hindutone; findyourfate).
  const maitri = maitriPoints(groom.signLord, bride.signLord)
  add('rasyadhipati', 'Rasyadhipati', maitri === 5 ? 'match' : maitri >= 3 ? 'partial' : 'no', T.MATCH_BASIS.lords(groom.signLord, bride.signLord))

  const vasya = VASYA_SIGNS[bride.sign].includes(groom.sign) || VASYA_SIGNS[groom.sign].includes(bride.sign)
  add('vasya', 'Vasya', vasya ? 'match' : 'no', T.MATCH_BASIS.signs(groom.sign, bride.sign))

  const rajju = groom.rajju !== bride.rajju
  add('rajju', 'Rajju', rajju ? 'match' : 'no', rajju ? T.MATCH_BASIS.pair(groom.rajju, bride.rajju) : T.MATCH_BASIS.sameRajju(groom.rajju))

  const vedha = !isVedha(groom.nakshatra, bride.nakshatra)
  add('vedha', 'Vedha', vedha ? 'match' : 'no', T.MATCH_BASIS.stars(groom.nakshatra, bride.nakshatra))

  const agreed = items.reduce((sum, p) => sum + (p.status === 'match' ? 1 : p.status === 'partial' ? 0.5 : 0), 0)
  return { items, agreed, max: 10, essentialsAgree: rajju && vedha }
}

// ---------------------------------------------------------------------------------------------
// Manglik (Kuja) dosha

/**
 * Houses from the reference that give the dosha. The reckoning with the 2nd house (Drik Panchang
 * Mangal Dosha calculator; aaps.space; OnlineJyotish lists 2 as "some traditions") is used, from
 * the Lagna, the Moon and Venus (Drik Panchang; OnlineJyotish).
 */
export const MANGLIK_HOUSES = [1, 2, 4, 7, 8, 12] as const
export type ManglikReference = 'Lagna' | 'Moon' | 'Venus'

/**
 * House-and-sign exceptions: Mars in the 2nd in Mercury's signs, the 4th in its own signs, the 7th
 * in Cancer or Capricorn, the 8th in Jupiter's signs, the 12th in Venus's signs (AstroSight
 * "Mangal dosha cancellation rules"; Astrojagriti and AstroMedha for the 2nd, 8th and 12th;
 * OnlineJyotish "Kuja Dosha Nivarana" for the 4th and 7th, where it also allows the other two of
 * Aries, Scorpio, Cancer and Capricorn). Applied to every reference alike.
 */
const HOUSE_EXCEPTIONS: Readonly<Record<number, readonly SignIndex[]>> = { 2: [2, 5], 4: [0, 7], 7: [3, 9], 8: [8, 11], 12: [1, 6] }

export interface ManglikPlacement {
  from: ManglikReference
  /** Mars's house counted from the reference, 1..12. */
  house: number
  /** In one of MANGLIK_HOUSES. */
  inDoshaHouse: boolean
  /** The house-and-sign exception clears this placement. */
  excepted: boolean
}

export type ManglikCancellation = 'own_or_exalted' | 'jupiter' | 'lagna'

export interface ManglikReport {
  marsSign: SignIndex
  placements: ManglikPlacement[]
  /** Mars is in a dosha house from at least one reference, before any exception. */
  present: boolean
  /** References still afflicted after the house-and-sign exceptions (0..3). */
  afflicted: number
  /** Chart-wide cancellations that hold. */
  cancellations: ManglikCancellation[]
  /** Present and not cleared: what mainstream calculators report as Manglik. */
  active: boolean
}

export function manglik(chart: Chart): ManglikReport {
  const mars = chart.positions.Mars.sign
  const refs: Record<ManglikReference, SignIndex> = { Lagna: chart.positions.Asc.sign, Moon: chart.positions.Moon.sign, Venus: chart.positions.Venus.sign }
  const placements = (Object.keys(refs) as ManglikReference[]).map((from): ManglikPlacement => {
    const house = houseFrom(refs[from], mars)
    const inDoshaHouse = (MANGLIK_HOUSES as readonly number[]).includes(house)
    return { from, house, inDoshaHouse, excepted: inDoshaHouse && (HOUSE_EXCEPTIONS[house]?.includes(mars) ?? false) }
  })
  const cancellations: ManglikCancellation[] = []
  // Mars in Aries or Scorpio (own) or Capricorn (exalted) (aaps.space; AstroSight; OnlineJyotish).
  if (mars === 0 || mars === 7 || mars === 9) cancellations.push('own_or_exalted')
  // Jupiter with Mars or aspecting it by its 5th, 7th or 9th sign (aaps.space; OnlineJyotish; AstroSight).
  if ([1, 5, 7, 9].includes(houseFrom(chart.positions.Jupiter.sign, mars))) cancellations.push('jupiter')
  // Cancer and Leo ascendants, for which Mars is a yogakaraka (OnlineJyotish; AstroSight; aaps.space for Leo).
  if (refs.Lagna === 3 || refs.Lagna === 4) cancellations.push('lagna')
  const present = placements.some((p) => p.inDoshaHouse)
  const afflicted = placements.filter((p) => p.inDoshaHouse && !p.excepted).length
  return { marsSign: mars, placements, present, afflicted, cancellations, active: afflicted > 0 && cancellations.length === 0 }
}

/**
 * 'none': neither partner has an active dosha. 'mutual': both do, which the tradition reads as
 * cancelling each other (OnlineJyotish; AstroSight calls it the most commonly applied rule).
 * 'groom' or 'bride': only that partner has it.
 */
export type ManglikOutcome = 'none' | 'mutual' | 'groom' | 'bride'

export interface ManglikMatch {
  groom: ManglikReport
  bride: ManglikReport
  outcome: ManglikOutcome
}

// ---------------------------------------------------------------------------------------------

export interface MatchResult {
  groom: MoonFacts
  bride: MoonFacts
  ashtakoota: Ashtakoota
  porutham: DasaPorutham
  manglik: ManglikMatch
}

/** Match two charts: `a` read in the groom's role, `b` in the bride's. */
export function matchCharts(a: Chart, b: Chart): MatchResult {
  const groom = moonFacts(a)
  const bride = moonFacts(b)
  const mg = manglik(a)
  const mb = manglik(b)
  const outcome: ManglikOutcome = mg.active && mb.active ? 'mutual' : mg.active ? 'groom' : mb.active ? 'bride' : 'none'
  return { groom, bride, ashtakoota: ashtakoota(groom, bride), porutham: dasaPorutham(groom, bride), manglik: { groom: mg, bride: mb, outcome } }
}
