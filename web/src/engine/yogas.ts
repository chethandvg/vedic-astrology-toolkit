// Structural yoga rule checks for chapter 11 of P. V. R. Narasimha Rao, "Vedic Astrology: An
// Integrated Approach" (PDF pages 107-132), ported rule for rule from vedic_toolkit/yogas.py
// evaluate() and _advanced(): 170 whole-sign D1 rules with three-valued conditions.
// Conventions kept from the toolkit:
// - true/false/null per condition; null (unknown) never masquerades as true or false. A rule is
//   met when every condition is true, not met when any is false, otherwise pending.
// - Benefics follow Rao PDF 34-35: waxing Moon (elongation in (0, 180)) is benefic; Mercury is
//   malefic when malefic companions in its sign outnumber benefic ones. An equal non-zero count
//   is unresolved: both readings are evaluated, and any status/condition that differs becomes
//   pending/null.
// - "Strong" is a caller-declared planet -> boolean map (the toolkit uses Shadbala >= Raman/
//   Sripati minimum). Without it, strength conditions stay null.
// - Friendship is the compound (natural + temporary) relation in the rasi chart.
// - Hora/Ghati lagnas (PDF 48-52) need sunrise; in polar day/night they are unknown.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { advanceSign, houseFrom, norm, signOf, SIGN_LORDS, SIGN_SHORT, vargaSign } from './core'
import { sunLongitude } from './ephem'
import type { Body, Chart, Planet, SignIndex } from './types'
import { PLANETS } from './types'

export type Tri = boolean | null
export type YogaStatus = 'conditions_met' | 'conditions_not_met' | 'conditions_pending'
export type YogaCategory =
  | 'luminary' | 'popular' | 'lunar' | 'mahapurusha' | 'nabhasa' | 'sankhya' | 'raaja' | 'dhana'
  | 'advanced_raaja' | 'raaja_sambandha' | 'daridra'

export interface YogaResult {
  /** Toolkit rule id, e.g. "Gaja-Kesari", "Dhana_Le_asc", "advanced_raaja_07". */
  name: string
  /** Page of the book's PDF edition. */
  pdfPage: number
  category: YogaCategory
  status: YogaStatus
  /** Condition id (toolkit spelling) -> true / false / null (unknown). */
  conditions: Record<string, Tri>
  /** Planets the rule names (empty when the rule names none). */
  participants: Planet[]
  /** Extra qualifiers that do not decide the status (Maalaa, Sarpa, Vasumati). */
  qualifications?: Record<string, Tri>
  /** Set when the toolkit records the rule as impossible under its selected conventions. */
  notice?: string
}

export interface YogaInputs {
  /** Sidereal longitudes of the nine planets and the ascendant. */
  longitudes: Record<Body, number>
  /** Degrees per day (only the sign matters, for Mercury/Venus combustion limits). */
  speeds?: Partial<Record<Planet, number>>
  /** Declared strength, e.g. Shadbala ratio >= 1. Missing planets stay unknown. */
  strong?: Partial<Record<Planet, boolean>>
  /** Hora lagna and Ghati lagna longitudes; missing means unknown. */
  points?: { HL?: number; GL?: number }
}

export interface YogaOptions {
  /** Tolerance in degrees for "deep exaltation" (Vidyut, Jaya). Toolkit default 0. */
  deepExaltationOrb?: number
  /** How an equal benefic/malefic count around Mercury is read; 'unresolved' evaluates both. */
  mercuryTie?: 'unresolved' | 'benefic' | 'malefic'
}

type P = Planet
const SEVEN: readonly P[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']
const isSeven = (p: P) => SEVEN.includes(p)
/** core.py EXALT / DEBIL / MOOLA (nodes: Gemini/Sagittarius exaltation, Virgo/Pisces moolatrikona). */
const EXALT: Record<P, SignIndex> = { Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6, Rahu: 2, Ketu: 8 }
const DEBIL = Object.fromEntries(PLANETS.map((p) => [p, (EXALT[p] + 6) % 12])) as Record<P, SignIndex>
const MOOLA: Record<P, SignIndex> = { Sun: 4, Moon: 1, Mars: 0, Mercury: 5, Jupiter: 8, Venus: 6, Saturn: 10, Rahu: 5, Ketu: 11 }
/** tajaka.py DEEP_EXALT, degrees of deepest exaltation. */
const DEEP_EXALT: Partial<Record<P, number>> = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200 }
/** core.py natural FRIENDS/ENEMIES (Table 7). */
const FRIENDS: Partial<Record<P, readonly P[]>> = {
  Sun: ['Moon', 'Mars', 'Jupiter'], Moon: ['Sun', 'Mercury'], Mars: ['Sun', 'Moon', 'Jupiter'], Mercury: ['Sun', 'Venus'],
  Jupiter: ['Sun', 'Moon', 'Mars'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mercury', 'Venus'],
}
const ENEMIES: Partial<Record<P, readonly P[]>> = {
  Sun: ['Venus', 'Saturn'], Moon: [], Mars: ['Mercury'], Mercury: ['Moon'], Jupiter: ['Mercury', 'Venus'], Venus: ['Sun', 'Moon'],
  Saturn: ['Sun', 'Moon', 'Mars'],
}
/** strengths.py COMBUSTION_LIMITS; retrograde Mercury 12, retrograde Venus 8. */
const COMBUSTION: Partial<Record<P, number>> = { Moon: 12, Mars: 17, Mercury: 14, Jupiter: 11, Venus: 10, Saturn: 16 }

type Relation = 'own' | 'great_friend' | 'friend' | 'neutral' | 'enemy' | 'great_enemy'
type Signs = Record<Body, SignIndex>

const all3 = (vs: Tri[]): Tri => (vs.some((v) => v === false) ? false : vs.some((v) => v === null) ? null : true)
const any3 = (vs: Tri[]): Tri => (vs.some((v) => v === true) ? true : vs.some((v) => v === null) ? null : false)
const mod12 = (x: number) => ((x % 12) + 12) % 12
const angularDistance = (a: number, b: number) => Math.abs((((a - b + 180) % 360) + 360) % 360 - 180)
const within = (lon: number) => norm(lon) % 30

/** core.planetary_aspects: full graha drishti targets of a planet in sign s. */
function aspects(p: P, s: SignIndex): SignIndex[] {
  const houses = p === 'Mars' ? [4, 7, 8] : p === 'Jupiter' ? [5, 7, 9] : p === 'Saturn' ? [3, 7, 10] : [7]
  return houses.map((h) => advanceSign(s, h))
}

/** core.rasi_aspects: movable signs aspect fixed (but not the adjacent one), and vice versa; duals aspect duals. */
function rasiAspects(s: SignIndex): SignIndex[] {
  const mode = s % 3
  const out: SignIndex[] = []
  if (mode === 2) {
    for (let i = 0; i < 12; i++) if (i % 3 === 2 && i !== s) out.push(i)
    return out
  }
  const target = mode === 0 ? 1 : 0
  const adjacent = mode === 0 ? (s + 1) % 12 : mod12(s - 1)
  for (let i = 0; i < 12; i++) if (i % 3 === target && i !== adjacent) out.push(i)
  return out
}

/** core.compound_relation for two of the seven grahas, temporary relation from `signs`. */
function compoundRelation(p: P, other: P, signs: Signs): Relation {
  if (p === other) return 'own'
  const nat = FRIENDS[p]!.includes(other) ? 1 : ENEMIES[p]!.includes(other) ? -1 : 0
  const temp = [2, 3, 4, 10, 11, 12].includes(houseFrom(signs[p], signs[other])) ? 1 : -1
  return (['great_enemy', 'enemy', 'neutral', 'friend', 'great_friend'] as const)[nat + temp + 2]
}

/** core.chara_karakas: AK..DK by advancement in sign (Rahu reversed, Ketu omitted); exact ties share a rank. */
function karakaRoles(lon: Record<Body, number>): Partial<Record<'AK' | 'PK' | 'AmK', P>> {
  const labels = ['AK', 'AmK', 'BK', 'MK', 'PiK', 'PK', 'GK', 'DK']
  const eight = PLANETS.slice(0, 8)
  const val = (p: P) => (p === 'Rahu' ? 30 - within(lon[p]) : within(lon[p]))
  const ordered = [...eight].sort((a, b) => val(b) - val(a)) // stable, like Python's sorted
  const label = new Map<P, string>()
  let last: number | null = null
  let rank = 0
  ordered.forEach((p, i) => {
    if (val(p) !== last) rank = i
    label.set(p, labels[rank])
    last = val(p)
  })
  const roles: Partial<Record<'AK' | 'PK' | 'AmK', P>> = {}
  for (const role of ['AK', 'PK', 'AmK'] as const) {
    const holders = eight.filter((p) => label.get(p) === role)
    if (holders.length === 1) roles[role] = holders[0] // tied karakas are left unknown
  }
  return roles
}

/** core.stronger_colord (purpose 'arudha') for Scorpio (Mars/Ketu) and Aquarius (Saturn/Rahu). */
function strongerColord(s: SignIndex, signs: Signs, lon: Record<Body, number>): P {
  if (s !== 7 && s !== 10) return SIGN_LORDS[s]
  const [a, b]: [P, P] = s === 7 ? ['Mars', 'Ketu'] : ['Saturn', 'Rahu']
  if ((signs[a] === s) !== (signs[b] === s)) return signs[a] === s ? b : a
  const influence = (t: SignIndex, lords: P[]) =>
    (['Jupiter', 'Mercury', ...lords] as P[]).filter((p) => signs[p] === t || rasiAspects(signs[p]).includes(t)).length
  const adv = (p: P) => (p === 'Rahu' || p === 'Ketu' ? 30 - within(lon[p]) : within(lon[p]))
  const key = (p: P) => {
    const t = signs[p]
    return [PLANETS.filter((x) => signs[x] === t).length, influence(t, [SIGN_LORDS[t]]), Number(t === EXALT[p]), t % 3, adv(p)]
  }
  const ka = key(a)
  const kb = key(b)
  for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i] > kb[i] ? a : b
  throw new RangeError(`Unresolved co-lord tie in ${SIGN_SHORT[s]}`)
}

/** core.arudhas: AL, A2..A11, UL; throws on an unresolved co-lord tie (the toolkit then has none). */
function arudhas(signs: Signs, lon: Record<Body, number>): Record<string, SignIndex> {
  const lords = SIGN_LORDS.map((l, i) => (i === 7 || i === 10 ? strongerColord(i, signs, lon) : l))
  const out: Record<string, SignIndex> = {}
  for (let h = 1; h <= 12; h++) {
    const s = advanceSign(signs.Asc, h)
    let a = mod12(2 * signs[lords[s]] - s)
    if ([0, 6].includes(mod12(a - s))) a = (a + 9) % 12 // 1st/7th exception, PDF 82-84
    out[h === 1 ? 'AL' : h === 12 ? 'UL' : `A${h}`] = a
  }
  return out
}

/** strengths.benefic_classification with the 'waxing' Moon and 'majority' Mercury policies. */
function classify(lon: Record<Body, number>, s: Signs, tie: 'unresolved' | 'benefic' | 'malefic') {
  const elong = norm(lon.Moon - lon.Sun)
  const bad = new Set<P>(['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'])
  if (!(elong > 0 && elong < 180)) bad.add('Moon')
  const companions = PLANETS.filter((p) => p !== 'Mercury' && s[p] === s.Mercury)
  const nbad = companions.filter((p) => bad.has(p)).length
  const ngood = companions.length - nbad
  let mercuryBad = nbad > ngood
  let unknown = false
  if (nbad === ngood && nbad) {
    mercuryBad = tie === 'malefic'
    unknown = tie === 'unresolved'
  }
  if (mercuryBad) bad.add('Mercury')
  return {
    good: new Set(PLANETS.filter((p) => !bad.has(p) && !(unknown && p === 'Mercury'))),
    bad,
    unknown,
  }
}

const QUADS = [1, 4, 7, 10]

function evaluateOnce(inp: YogaInputs, orb: number, tie: 'unresolved' | 'benefic' | 'malefic') {
  const lon = inp.longitudes
  const speeds = inp.speeds ?? {}
  const strongMap = inp.strong ?? {}
  const strong = (p: P | undefined): Tri => (p && typeof strongMap[p] === 'boolean' ? strongMap[p]! : null)
  const bodies = [...PLANETS, 'Asc'] as Body[]
  const s = Object.fromEntries(bodies.map((b) => [b, signOf(lon[b])])) as Signs
  const sn = Object.fromEntries(bodies.map((b) => [b, vargaSign(lon[b], 9)])) as Signs
  const planets = PLANETS as readonly P[]
  const nature = classify(lon, s, tie)
  const good = nature.good
  const bad = nature.bad
  const asc = s.Asc
  const lord = (h: number): P => SIGN_LORDS[(asc + h - 1) % 12]
  const h = (p: P) => houseFrom(asc, s[p])
  const relative = (p: P, q: P) => houseFrom(s[q], s[p]) // house of p counted from q
  const joint = (p: P, q: P) => p !== q && s[p] === s[q]
  const hit = (p: P, sign: SignIndex) => aspects(p, s[p]).includes(sign)
  const aspect = (p: P, q: P) => p !== q && hit(p, s[q])
  const influence = (p: P, q: P) => joint(p, q) || aspect(p, q)
  const occupy = (hs: number[], ps: Iterable<P> = planets, ref: SignIndex = asc) => {
    const list = [...ps]
    return hs.every((hh) => list.some((p) => houseFrom(ref, s[p]) === hh))
  }
  const own = (p: P) => SIGN_LORDS[s[p]] === p
  const ex = (p: P) => s[p] === EXALT[p]
  const deb = (p: P) => s[p] === DEBIL[p]
  const oe = (p: P) => own(p) || ex(p)
  const relation = (p: P): Relation | null => (isSeven(p) ? compoundRelation(p, SIGN_LORDS[s[p]], s) : null)
  const friend = (p: P) => ['friend', 'great_friend'].includes(relation(p) ?? '')
  const enemy = (p: P) => ['enemy', 'great_enemy'].includes(relation(p) ?? '')
  const comb = (p: P) => {
    const base = COMBUSTION[p]
    if (base === undefined) return false
    const sp = speeds[p] ?? 0
    const limit = p === 'Mercury' && sp < 0 ? 12 : p === 'Venus' && sp < 0 ? 8 : base
    return angularDistance(lon[p], lon.Sun) < limit
  }
  const kendra = (p: P) => QUADS.includes(h(p))
  const trikona = (p: P) => [1, 5, 9].includes(h(p))
  const exchange = (a: number, b: number) => lord(a) !== lord(b) && h(lord(a)) === b && h(lord(b)) === a
  const mutual = (p: P, q: P) => aspect(p, q) && aspect(q, p)
  const association = (p: P, q: P) => p !== q && (joint(p, q) || mutual(p, q) || (SIGN_LORDS[s[p]] === q && SIGN_LORDS[s[q]] === p))
  const nd = (p: P) => SIGN_LORDS[sn[p]] // navamsa dispositor
  const deep = (p: P) => angularDistance(lon[p], DEEP_EXALT[p]!) <= orb
  const without = (set: Set<P>, ...xs: P[]) => [...set].filter((p) => !xs.includes(p))
  const uniq = (...ps: P[]): P[] => [...new Set(ps)]

  const rows: YogaResult[] = []
  const add = (name: string, page: number, conditions: Record<string, Tri>, category: YogaCategory = 'popular', participants: P[] = []) => {
    const v = all3(Object.values(conditions))
    rows.push({
      name, pdfPage: page, category,
      status: v === true ? 'conditions_met' : v === false ? 'conditions_not_met' : 'conditions_pending',
      conditions, participants: [...participants],
    })
  }

  // Solar and lunar combinations (PDF 107-108); luminaries never count as companions.
  for (const [ref, names, page] of [['Sun', ['Vesi', 'Vosi', 'Ubhayachara'], 107], ['Moon', ['Sunaphaa', 'Anaphaa', 'Duradhara'], 108]] as const) {
    const other = planets.filter((p) => p !== 'Sun' && p !== 'Moon')
    const a = occupy([2], other, s[ref])
    const b = occupy([12], other, s[ref])
    ;[a, b, a && b].forEach((c, i) => add(names[i], page, { placement: c }, 'luminary'))
  }
  add('Budha-Aaditya', 107, { conjunction: joint('Sun', 'Mercury') }, 'popular', ['Sun', 'Mercury'])
  add('Kemadruma', 109, {
    no_lunar_companions: !planets.some((p) => p !== 'Sun' && p !== 'Moon' && [1, 2, 12].includes(relative(p, 'Moon'))),
    no_angular_planets_other_than_moon: !planets.some((p) => p !== 'Moon' && kendra(p)),
  }, 'lunar', ['Moon'])
  add('Chandra-Mangala', 109, { conjunction: joint('Moon', 'Mars') }, 'popular', ['Moon', 'Mars'])
  add('Adhi', 109, { benefics_in_each_of_6_7_8: occupy([6, 7, 8], without(good, 'Moon'), s.Moon) })
  for (const [p, name] of [['Mars', 'Ruchaka'], ['Mercury', 'Bhadra'], ['Saturn', 'Sasa'], ['Venus', 'Maalavya'], ['Jupiter', 'Hamsa']] as const) {
    add(name, ['Mars', 'Mercury', 'Saturn'].includes(p) ? 110 : 111, { angular: kendra(p), own_or_exalted: oe(p) }, 'mahapurusha', [p])
  }

  // Nabhasa geometry (PDF 112-115) uses exactly the seven classical bodies.
  const occupied = new Set(SEVEN.map(h))
  const signset = new Set(SEVEN.map((p) => s[p]))
  ;['Rajju', 'Musala', 'Nala'].forEach((name, i) => add(name, 112, { all_same_modality: [...signset].every((x) => x % 3 === i) }, 'nabhasa'))
  // Book convention (PDF 112): natural malefics include the nodes; its Sarpa example is Mars, Rahu
  // and Ketu in angles. BPHS-based tools count only Sun, Mars and Saturn (noted in content/yogas.ts).
  add('Maalaa', 112, { benefics_in_at_least_three_quadrants: QUADS.filter((q) => [...good].some((p) => h(p) === q)).length >= 3 }, 'nabhasa')
  rows[rows.length - 1].qualifications = { no_angular_malefic: ![...bad].some(kendra) }
  add('Sarpa', 112, { malefics_in_at_least_three_quadrants: QUADS.filter((q) => [...bad].some((p) => h(p) === q)).length >= 3 }, 'nabhasa')
  rows[rows.length - 1].qualifications = { no_angular_benefic: ![...good].some(kendra) }
  const sameSet = (g: number[]) => g.length === new Set(g).size && occupied.size === g.length && g.every((x) => occupied.has(x))
  const shape = (name: string, groups: number[][], page: number) => add(name, page, { occupied_house_set: groups.some(sameSet) }, 'nabhasa')
  const run = (start: number, n: number) => Array.from({ length: n }, (_, i) => ((start - 1 + i) % 12) + 1)
  shape('Gadaa', QUADS.map((a) => [a, ((a + 2) % 12) + 1]), 112)
  shape('Sakata', [[1, 7]], 113)
  shape('Vihanga', [[4, 10]], 113)
  shape('Sringaataka', [[1, 5, 9]], 113)
  shape('Hala', [[2, 6, 10], [3, 7, 11], [4, 8, 12]], 113)
  for (const [name, gh, bh] of [['Vajra', [1, 7], [4, 10]], ['Yava', [4, 10], [1, 7]]] as [string, number[], number[]][]) {
    add(name, 113, {
      benefic_positions: [...good].filter(isSeven).every((p) => gh.includes(h(p))) && occupy(gh, good),
      malefic_positions: [...bad].filter(isSeven).every((p) => bh.includes(h(p))) && occupy(bh, bad),
    }, 'nabhasa')
  }
  shape('Kamala', [[1, 4, 7, 10]], 113)
  shape('Vaapi', [[2, 5, 8, 11], [3, 6, 9, 12]], 113)
  for (const [name, start] of [['Yoopa', 1], ['Sara', 4], ['Sakti', 7], ['Danda', 10]] as const) shape(name, [run(start, 4)], 114)
  for (const [name, start] of [['Naukaa', 1], ['Koota', 4], ['Chatra', 7], ['Chaapa', 10]] as const) shape(name, [run(start, 7)], 114)
  shape('Ardha Chandra', [2, 3, 5, 6, 8, 9, 11, 12].map((start) => run(start, 7)), 114)
  shape('Chakra', [[1, 3, 5, 7, 9, 11]], 114)
  shape('Samudra', [[2, 4, 6, 8, 10, 12]], 115)
  // Sankhya yogas apply only when no other Nabhasa yoga forms (PDF 115).
  const higher = rows.some((r) => r.category === 'nabhasa' && r.status === 'conditions_met')
  ;['Gola', 'Yuga', 'Soola', 'Kedaara', 'Paasa', 'Daama', 'Veenaa'].forEach((name, i) =>
    add(name, 115, { distinct_sign_count: signset.size === i + 1, no_other_nabhasa: !higher }, 'sankhya'))

  add('Subha', 116, { benefic_in_lagna_or_flanks: occupy([1], good) || occupy([2, 12], good) })
  add('Asubha', 116, { malefic_in_lagna_or_flanks: occupy([1], bad) || occupy([2, 12], bad) })
  add('Gaja-Kesari', 116, {
    jupiter_angular_from_moon: QUADS.includes(relative('Jupiter', 'Moon')),
    other_benefic_influence: without(good, 'Jupiter').some((p) => influence(p, 'Jupiter')),
    not_debilitated_combust_or_inimical: !(deb('Jupiter') || comb('Jupiter') || enemy('Jupiter')),
  }, 'popular', ['Jupiter', 'Moon'])
  add('Guru-Mangala', 116, { conjunction_or_opposition: [1, 7].includes(relative('Mars', 'Jupiter')) }, 'popular', ['Jupiter', 'Mars'])
  const amala = (['Asc', 'Moon'] as const).some((ref) => occupy([10], good, s[ref]) && !occupy([10], bad, s[ref]))
  add('Amala', 117, { tenth_only_benefics: amala })
  add('Parvata', 117, {
    angular_benefic: [...good].some(kendra),
    no_angular_malefic: ![...bad].some(kendra),
    no_malefic_in_7_8: ![...bad].some((p) => [7, 8].includes(h(p))),
  })
  add('Kaahala', 117, {
    either_definition: any3([all3([QUADS.includes(relative(lord(4), 'Jupiter')), strong(lord(1))]), oe(lord(4)) && joint(lord(4), lord(10))]),
  })
  add('Chaamara', 117, {
    either_definition: (ex(lord(1)) && kendra(lord(1)) && aspect('Jupiter', lord(1))) || [7, 9, 10].some((hh) => [...good].filter((p) => h(p) === hh).length >= 2),
  })
  add('Sankha', 117, {
    either_definition: any3([
      all3([strong(lord(1)), QUADS.includes(relative(lord(5), lord(6)))]),
      all3([joint(lord(1), lord(10)), s[lord(1)] % 3 === 0, strong(lord(9))]),
    ]),
  })
  add('Bheri', 117, {
    ninth_lord_strong: strong(lord(9)),
    placement: occupy([1, 2, 7, 12]) || (QUADS.includes(relative('Jupiter', lord(1))) && QUADS.includes(relative('Venus', lord(1)))),
  })
  add('Mridanga', 117, { lagna_lord_strong: strong(lord(1)), dignified_angular_or_trinal_planet: SEVEN.some((p) => oe(p) && (kendra(p) || trikona(p))) })
  add('Sreenaatha', 118, { seventh_lord_exalted_in_10: ex(lord(7)) && h(lord(7)) === 10, ninth_tenth_conjunction: joint(lord(9), lord(10)) })
  add('Matsya', 118, { benefics_1_9: occupy([1, 9], good), planet_5: occupy([5]), malefics_4_8: occupy([4, 8], bad) })
  add('Koorma', 118, {
    benefics_5_6_7_dignified: occupy([5, 6, 7], [...good].filter((p) => isSeven(p) && (oe(p) || friend(p)))),
    malefics_1_3_11_dignified: occupy([1, 3, 11], [...bad].filter(oe)),
  })
  add('Khadga', 118, { exchange_2_9: exchange(2, 9), lagna_lord_angular_or_trinal: kendra(lord(1)) || trikona(lord(1)) }, 'popular', uniq(lord(2), lord(9), lord(1)))
  add('Kusuma', 118, {
    fixed_asc: asc % 3 === 1,
    angular_venus: kendra('Venus'),
    moon_trinal_with_benefic: trikona('Moon') && without(good, 'Moon').some((p) => joint('Moon', p)),
    saturn_10: h('Saturn') === 10,
  })
  add('Kalaanidhi', 118, { jupiter_2_or_5: [2, 5].includes(h('Jupiter')), mercury_venus_influence: (['Mercury', 'Venus'] as const).every((p) => influence(p, 'Jupiter')) })
  {
    const a = lord(1)
    const b = SIGN_LORDS[s[a]]
    const chain: P[] = [a, b, SIGN_LORDS[s[b]], nd(b)]
    add('Kalpadruma', 118, { four_dignified_or_angular_trinal: chain.every((p) => kendra(p) || trikona(p) || ex(p)) }, 'popular', chain)
  }
  const targets = [...good].filter((p) => [7, 8].includes(h(p)))
  add('Lagnaadhi', 120, { benefics_7_8: occupy([7, 8], good), unafflicted: !targets.some((p) => [...bad].some((q) => influence(q, p))) })
  for (const [name, ref, hs] of [['Hari', lord(2), [2, 12, 8]], ['Hara', lord(7), [4, 9, 8]], ['Brahma', lord(1), [4, 10, 11]]] as const) {
    add(name, 120, { benefic_placements: occupy([...hs], good, s[ref]) })
  }
  add('Brahma_alternative', 120, {
    jupiter_from_9lord: QUADS.includes(relative('Jupiter', lord(9))),
    venus_from_11lord: QUADS.includes(relative('Venus', lord(11))),
    mercury_from_1_or_10lord: [1, 10].some((x) => QUADS.includes(relative('Mercury', lord(x)))),
  })
  add('Vishnu', 121, { three_planets_in_2: [lord(9), lord(10), nd(lord(9))].every((p) => h(p) === 2) })
  add('Siva', 121, { cyclic_lords: h(lord(5)) === 9 && h(lord(9)) === 10 && h(lord(10)) === 5 })
  add('Trilochana', 121, {
    three_distinct_trines: new Set((['Sun', 'Moon', 'Mars'] as const).map((p) => s[p])).size === 3 && (['Moon', 'Mars'] as const).every((p) => [1, 5, 9].includes(relative(p, 'Sun'))),
  })
  {
    const g = nd(lord(10))
    add('Gouri', 121, { navamsa_dispositor_exalted_in_10: ex(g) && h(g) === 10, lagna_lord_joining: joint(lord(1), g) })
  }
  add('Chandikaa', 121, {
    fixed_asc: asc % 3 === 1,
    sixth_lord_aspects_asc: hit(lord(6), asc),
    sun_joins_dispositors: [6, 9].every((x) => joint('Sun', nd(lord(x)))),
  })
  add('Lakshmi', 121, { ninth_lord_angular_dignified: kendra(lord(9)) && oe(lord(9)), lagna_lord_strong: strong(lord(1)) })
  add('Saarada', 121, {
    tenth_lord_5: h(lord(10)) === 5,
    angular_mercury: kendra('Mercury'),
    sun_leo: s.Sun === 4,
    sun_strong: strong('Sun'),
    mercury_or_jupiter_trinal_moon: (['Mercury', 'Jupiter'] as const).some((p) => [1, 5, 9].includes(relative(p, 'Moon'))),
    mars_11: h('Mars') === 11,
  })
  add('Bhaarathi', 121, { exalted_dispositor_joins_9lord: [2, 5, 11].some((x) => ex(nd(lord(x))) && joint(nd(lord(x)), lord(9))) })
  add('Saraswathi', 122, {
    three_benefic_placements: (['Mercury', 'Jupiter', 'Venus'] as const).every((p) => [1, 2, 4, 5, 7, 9, 10].includes(h(p))),
    jupiter_dignity: oe('Jupiter') || friend('Jupiter'),
  })
  add('Amsaavatara', 122, { angular_jupiter_venus_saturn: (['Jupiter', 'Venus', 'Saturn'] as const).every(kendra), saturn_exalted: ex('Saturn') })
  add('Devendra', 122, { fixed_asc: asc % 3 === 1, exchange_2_10: exchange(2, 10), exchange_1_11: exchange(1, 11) }, 'popular', uniq(lord(2), lord(10), lord(1), lord(11)))
  add('Indra', 122, { exchange_5_11: exchange(5, 11), moon_5: h('Moon') === 5 }, 'popular', uniq(lord(5), lord(11), 'Moon'))
  add('Ravi', 122, { sun_10: h('Sun') === 10, tenth_lord_saturn_3: h(lord(10)) === 3 && h('Saturn') === 3 })
  add('Bhaaskara', 122, {
    moon_12_from_sun: relative('Moon', 'Sun') === 12,
    mercury_2_from_sun: relative('Mercury', 'Sun') === 2,
    jupiter_trinal_moon: [5, 9].includes(relative('Jupiter', 'Moon')),
  })
  add('Kulavardhana', 122, {
    all_planets_fifth_from_any_reference: planets.every((p) => (['Asc', 'Moon', 'Sun'] as const).some((ref) => houseFrom(s[ref], s[p]) === 5)),
  })
  const up = [3, 6, 10, 11]
  add('Vasumati', 122, { benefics_upachaya: good.size > 0 && [...good].every((p) => up.includes(h(p))) })
  rows[rows.length - 1].qualifications = { no_malefic_upachaya: ![...bad].some((p) => up.includes(h(p))), benefics_strong: all3([...good].map(strong)) }
  add('Gandharva', 123, {
    tenth_lord_trinal_7: [3, 7, 11].includes(h(lord(10))),
    jupiter_influences_lagna_lord: influence('Jupiter', lord(1)),
    sun_exalted: ex('Sun'),
    sun_strong: strong('Sun'),
    moon_9: h('Moon') === 9,
  })
  add('Go', 123, { jupiter_moola: s.Jupiter === MOOLA.Jupiter, jupiter_strong: strong('Jupiter'), second_lord_joins_jupiter: joint(lord(2), 'Jupiter'), lagna_lord_exalted: ex(lord(1)) })
  add('Vidyut', 123, {
    eleventh_lord_deep_exaltation: deep(lord(11)),
    joins_venus: joint(lord(11), 'Venus'),
    angular_from_lagna_lord: QUADS.includes(relative(lord(11), lord(1))),
  })
  add('Chapa', 123, { exchange_4_10: exchange(4, 10), lagna_lord_exalted: ex(lord(1)) }, 'popular', uniq(lord(4), lord(10), lord(1)))
  {
    const md = SIGN_LORDS[s.Moon]
    add('Pushkala', 123, {
      lagna_lord_joins_moon: joint(lord(1), 'Moon'),
      moon_dispositor_angular_or_great_friend: kendra(md) || relation(md) === 'great_friend',
      moon_dispositor_aspects_asc: hit(md, asc),
      planet_in_asc: occupy([1]),
    })
  }
  add('Makuta', 123, { jupiter_ninth_from_9lord: relative('Jupiter', lord(9)) === 9, benefic_ninth_from_jupiter: occupy([9], good, s.Jupiter), saturn_10: h('Saturn') === 10 })
  add('Jaya', 123, { tenth_lord_deep_exaltation: deep(lord(10)), sixth_lord_debilitated: deb(lord(6)) })
  for (const [name, house] of [['Harsha', 6], ['Sarala', 8], ['Vimala', 12]] as const) add(name, 123, { lord_in_own_house: h(lord(house)) === house }, 'popular', [lord(house)])

  // Raja relationships (PDF 124): evidence of magnitude, never deterministic outcomes.
  // Participants: the lords that form the yoga (toolkit order: PLANETS for the raja pairs, else 6/8/12).
  const raajaLords = new Set<P>()
  for (const a of QUADS) for (const b of [1, 5, 9]) if (lord(a) !== lord(b) && association(lord(a), lord(b))) raajaLords.add(lord(a)).add(lord(b))
  add('Basic_Raaja', 124, { quadrant_trine_lord_association: raajaLords.size > 0 }, 'raaja', planets.filter((p) => raajaLords.has(p)))
  add('Dharma_Karmadhipati', 124, { ninth_tenth_lord_association: association(lord(9), lord(10)) }, 'raaja', uniq(lord(9), lord(10)))
  const dustlords = uniq(lord(6), lord(8), lord(12))
  const inDusthana = dustlords.filter((p) => [6, 8, 12].includes(h(p)))
  add('Vipareeta_Raaja_base', 124, { dusthana_lord_in_dusthana: inDusthana.length > 0 }, 'raaja', inDusthana)
  add('Vipareeta_Raaja_ideal', 124, {
    three_lords_together: new Set(dustlords.map((p) => s[p])).size === 1,
    allowed_house: [3, 6, 8, 11, 12].includes(h(lord(6))),
    no_other_planet: !planets.some((p) => !dustlords.includes(p) && s[p] === s[lord(6)]),
  }, 'raaja', dustlords)

  // Twelve ascendant-specific wealth combinations (PDF 130-131); Pisces' missing Saturn repaired from BPHS 41.8.
  const fifth: [P, P[]][] = [
    ['Sun', ['Saturn', 'Moon', 'Jupiter']], ['Mercury', ['Moon', 'Mars', 'Jupiter']], ['Venus', ['Mars']], ['Mars', ['Venus']],
    ['Jupiter', ['Mercury']], ['Saturn', ['Sun', 'Moon']], ['Saturn', ['Sun', 'Moon']], ['Jupiter', ['Mercury']],
    ['Mars', ['Venus']], ['Venus', ['Mars']], ['Mercury', ['Moon', 'Mars', 'Jupiter']], ['Moon', ['Saturn']],
  ]
  const influencers: Partial<Record<P, P[]>> = {
    Sun: ['Mars', 'Jupiter'], Moon: ['Mercury', 'Jupiter'], Mars: ['Mercury', 'Venus', 'Saturn'], Mercury: ['Jupiter', 'Saturn'],
    Jupiter: ['Mars', 'Mercury'], Venus: ['Mercury', 'Saturn'], Saturn: ['Mars', 'Jupiter'],
  }
  for (let a = 0; a < 12; a++) {
    const [p, others] = fifth[a]
    const l = SIGN_LORDS[a]
    const page = a < 9 ? 130 : 131
    add(`Dhana_${SIGN_SHORT[a]}_5_11`, page, { ascendant: asc === a, fifth_planet: h(p) === 5, eleventh_planets: others.every((q) => h(q) === 11) }, 'dhana')
    add(`Dhana_${SIGN_SHORT[a]}_asc`, page, { ascendant: asc === a, own_lord_in_asc: h(l) === 1, all_required_influences: influencers[l]!.every((q) => influence(q, l)) }, 'dhana')
  }

  // ---- Numbered combinations of sections 11.7.3, 11.8 and 11.10 (toolkit _advanced). ----
  const roles = karakaRoles(lon)
  const ak = roles.AK
  const pk = roles.PK
  const amk = roles.AmK
  let ar: Record<string, SignIndex> = {}
  try {
    ar = arudhas(s, lon)
  } catch {
    ar = {}
  }
  const benefAspect = (p: P) => [...good].some((q) => q !== p && aspect(q, p))
  const occ = (hs: number[], ps: Iterable<P>, ref: SignIndex) => occupy(hs, ps, ref)
  const hl = inp.points?.HL
  const gl = inp.points?.GL
  const hasPts = typeof hl === 'number' && typeof gl === 'number'
  const vs = (b: Body, n: number) => vargaSign(lon[b], n)
  const addN = (cat: YogaCategory, n: number, conditions: Record<string, Tri>, page: number) => add(`${cat}_${String(n).padStart(2, '0')}`, page, conditions, cat)
  const malefic36 = (ref: SignIndex) => [3, 6].every((hh) => [...bad].some((q) => s[q] === advanceSign(ref, hh) || hit(q, advanceSign(ref, hh))))

  const adv: Record<string, Tri>[] = [
    { AK_PK_conjunction: ak && pk ? joint(ak, pk) : null, lagna_fifth_conjunction: joint(lord(1), lord(5)) },
    {
      exchange_1_5: h(lord(1)) === 5 && h(lord(5)) === 1,
      karakas_in_1_5: ak && pk ? [ak, pk].every((p) => [1, 5].includes(h(p))) : null,
      participating_dignities: ak && pk ? [...new Set([lord(1), lord(5), ak, pk])].every((p) => oe(p) || nd(p) === p || benefAspect(p)) : null,
    },
    {
      ninth_lord_and_AK_1_5_7: ak ? [1, 5, 7].includes(h(lord(9))) && [1, 5, 7].includes(h(ak)) : null,
      both_benefic_aspected: ak ? benefAspect(lord(9)) && benefAspect(ak) : null,
    },
    { benefics_2_4_5_from_both: ak ? [lord(1), ak].every((p) => occ([2, 4, 5], good, s[p])) : null },
    { malefics_3_6_from_both: ak ? [lord(1), ak].every((p) => malefic36(s[p])) : null },
    {
      same_planet_joins_or_aspects_Asc_HL_GL: hasPts
        ? planets.some((p) => [asc, signOf(hl), signOf(gl)].every((t) => s[p] === t || hit(p, t)))
        : null,
    },
    { same_planet_aspects_six_ascendants: planets.some((p) => [1, 2, 3, 9, 12, 30].every((n) => aspects(p, vs(p, n)).includes(vs('Asc', n)))) },
    {
      dignified_occupants_Asc_HL_GL: hasPts
        ? [asc, signOf(hl), signOf(gl)].every((t) => planets.some((p) => s[p] === t && oe(p)))
        : null,
    },
    {
      dignified_lagna_occupants_D1_D9_D3: [1, 9, 3].every((n) =>
        planets.some((p) => vs(p, n) === vs('Asc', n) && (SIGN_LORDS[vs(p, n)] === p || vs(p, n) === EXALT[p]))),
    },
    {
      one_or_two_debilitated_in_3_6_8: ((k) => k >= 1 && k <= 2)(planets.filter((p) => [3, 6, 8].includes(h(p)) && deb(p)).length),
      lagna_lord_dignified_aspecting_asc: oe(lord(1)) && hit(lord(1), asc),
    },
    {
      all_dusthana_lords_impaired: [6, 8, 12].every((x) => deb(lord(x)) || comb(lord(x)) || enemy(lord(x))),
      lagna_lord_dignified_aspecting_asc: oe(lord(1)) && hit(lord(1), asc),
    },
    { fifth_ninth_conjunction_or_mutual_aspect: joint(lord(5), lord(9)) || (aspect(lord(5), lord(9)) && aspect(lord(9), lord(5))) },
    {
      exchange_4_10: h(lord(4)) === 10 && h(lord(10)) === 4,
      both_aspected_by_5_or_9lord: [5, 9].some((x) => [4, 10].every((y) => aspect(lord(x), lord(y)))),
    },
    { fifth_lord_1_4_10: [1, 4, 10].includes(h(lord(5))), joins_1_or_9lord: [1, 9].some((x) => joint(lord(x), lord(5))) },
    {
      moon_strong: strong('Moon'),
      moon_vargottama: s.Moon === sn.Moon,
      four_aspecting_planets: planets.filter((p) => p !== 'Moon' && aspect(p, 'Moon')).length >= 4,
    },
    { four_moola_or_exalted: planets.filter((p) => s[p] === MOOLA[p] || s[p] === EXALT[p]).length >= 4 },
    { benefics_angular: good.size > 0 && [...good].every((p) => QUADS.includes(h(p))), malefics_3_6_11: [...bad].every((p) => [3, 6, 11].includes(h(p))) },
    { AL_A7_support: 'AL' in ar && 'A7' in ar ? ![2, 12, 6, 8].includes(houseFrom(ar.AL, ar.A7)) : null },
  ]
  adv.forEach((c, i) => addN('advanced_raaja', i + 1, c, i + 1 <= 6 ? 127 : 128))

  const withBenefic = (p: P) => [...good].some((q) => q !== p && joint(p, q))
  const sambandha: Record<string, Tri>[] = [
    { AmK_or_dispositor_influences_10lord: amk ? [amk, SIGN_LORDS[s[amk]]].some((p) => influence(p, lord(10))) : null },
    {
      '11lord_aspects_11': hit(lord(11), advanceSign(asc, 11)),
      '10_11_no_malefics': ![...bad].some((p) => [10, 11].some((hh) => s[p] === advanceSign(asc, hh) || hit(p, advanceSign(asc, hh)))),
    },
    { AK_AmK_conjoin: ak && amk ? joint(ak, amk) : null },
    { AmK_dignified: amk ? oe(amk) : null, AmK_strong: strong(amk) },
    { AmK_trinal: amk ? [1, 5, 9].includes(h(amk)) : null },
    { AmK_angular_or_trinal_AK: ak && amk ? [1, 4, 5, 7, 9, 10].includes(relative(amk, ak)) : null },
    { malefics_3_6_from_Asc_AL_AK: ak && 'AL' in ar ? [asc, ar.AL, s[ak]].every((r) => occ([3, 6], bad, r)) : null },
    {
      AK_dignified_angular_or_trinal: ak ? oe(ak) && [1, 4, 5, 7, 9, 10].includes(h(ak)) : null,
      AK_influences_9lord: ak ? influence(ak, lord(9)) : null,
    },
    { AK_moon_dispositor_in_asc_with_benefic: ak ? ak === SIGN_LORDS[s.Moon] && h(ak) === 1 && withBenefic(ak) : null },
    { AK_5_7_9_10_with_benefic: ak ? [5, 7, 9, 10].includes(h(ak)) && withBenefic(ak) : null },
    { A9_in_asc_or_AK_9: any3(['A9' in ar ? ar.A9 === asc : null, ak ? h(ak) === 9 : null]) },
    {
      '11lord_11_unafflicted': h(lord(11)) === 11 && ![...bad].some((p) => aspect(p, lord(11))),
      AK_with_benefic: ak ? withBenefic(ak) : null,
    },
    { exchange_1_10: h(lord(1)) === 10 && h(lord(10)) === 1 },
    { moon_venus_fourth_AK: ak ? (['Moon', 'Venus'] as const).every((p) => relative(p, ak) === 4) : null },
    {
      '1lord_or_AK_joins_5lord_angular_trinal': all3([
        [1, 4, 5, 7, 9, 10].includes(h(lord(5))),
        any3([joint(lord(1), lord(5)), ak ? joint(ak, lord(5)) : null]),
      ]),
    },
  ]
  sambandha.forEach((c, i) => addN('raaja_sambandha', i + 1, c, 129))

  // Maraka (2nd/7th) lords plus malefics in or influencing them (PDF 131-132).
  const maraka = new Set<P>([lord(2), lord(7)])
  for (const p of bad) if ([2, 7].includes(h(p)) || [2, 7].some((x) => influence(p, lord(x)) || influence(lord(x), p))) maraka.add(p)
  const mi = (p: P) => [...maraka].some((q) => q !== p && influence(q, p))
  const dispos = [6, 8, 12].map((x) => SIGN_LORDS[s[lord(x)]])
  const dnMoon = SIGN_LORDS[sn.Moon]
  const dnAsc = SIGN_LORDS[sn.Asc]
  const daridra: Record<string, Tri>[] = [
    { exchange_1_12: h(lord(1)) === 12 && h(lord(12)) === 1, both_maraka_influenced: mi(lord(1)) && mi(lord(12)) },
    { exchange_1_6: h(lord(1)) === 6 && h(lord(6)) === 1, both_maraka_influenced: mi(lord(1)) && mi(lord(6)) },
    { ketu_with_asc_or_moon: [asc, s.Moon].includes(s.Ketu), lagna_lord_8: h(lord(1)) === 8, maraka_influence: mi(lord(1)) },
    {
      lagna_lord_in_dusthana_with_malefic: [6, 8, 12].includes(h(lord(1))) && [...bad].some((p) => p !== lord(1) && joint(lord(1), p)),
      second_lord_impaired: deb(lord(2)) || enemy(lord(2)),
    },
    {
      fifth_lord_6_ninth_lord_12: h(lord(5)) === 6 && h(lord(9)) === 12,
      maraka_aspects: [5, 9].every((x) => [...maraka].some((p) => aspect(p, lord(x)))),
    },
    {
      malefic_asc_without_9_10lords: [...bad].some((p) => h(p) === 1) && [9, 10].every((x) => h(lord(x)) !== 1),
      maraka_influence_on_asc_malefic: [...bad].some((p) => h(p) === 1 && mi(p)),
    },
    {
      dusthana_dispositors_in_dusthanas: dispos.every((p) => [6, 8, 12].includes(h(p))),
      all_malefic_influenced: dispos.every((p) => [...bad].some((q) => q !== p && influence(q, p))),
    },
    { moon_D9_dispositor_maraka_condition: [2, 7].includes(h(dnMoon)) || [...maraka].some((p) => p !== dnMoon && joint(dnMoon, p)) },
    { D1_D9_lagna_lords_maraka_influenced: mi(lord(1)) && mi(dnAsc) },
    {
      benefics_in_malefic_owned_signs: good.size > 0 && [...good].every((p) => bad.has(SIGN_LORDS[s[p]])),
      malefics_in_benefic_owned_signs: [...bad].every((p) => good.has(SIGN_LORDS[s[p]])),
    },
    {
      planet_joins_dusthana_lord_without_trinal_relief: planets.some((p) =>
        [6, 8, 12].some((x) => joint(p, lord(x))) && ![1, 5, 9].some((x) => influence(lord(x), p))),
    },
    { mars_saturn_2: h('Mars') === 2 && h('Saturn') === 2, no_mercury_aspect_to_either: !(['Mars', 'Saturn'] as const).some((p) => aspect('Mercury', p)) },
    { sun_2: h('Sun') === 2, saturn_aspects_sun: aspect('Saturn', 'Sun') },
  ]
  daridra.forEach((c, i) => addN('daridra', i + 1, c, i + 1 <= 11 ? 131 : 132))

  // Rules the toolkit records as impossible under its selected conventions (profile_conflicts.json).
  const notices: Record<string, string> = {
    Gola: 'Seven-body Ashraya plus literal all-Nabhasa precedence suppresses every one-sign Gola arrangement.',
    advanced_raaja_07: 'The selected two-sign D2 makes the required full aspect in all six charts impossible.',
    advanced_raaja_13: 'The same-lord reading requires one full-aspect set to reach opposite signs, which none does.',
    Kulavardhana: 'Opposite nodes cannot both occupy the resulting trine-set targets.',
    advanced_raaja_17: 'Opposite nodes cannot both occupy houses 3,6,11.',
  }
  for (const r of rows) if (notices[r.name]) r.notice = notices[r.name]
  return { rows, unknown: nature.unknown }
}

/**
 * Evaluate all 170 D1 rules from explicit inputs (toolkit yogas.evaluate with varga=1,
 * include_nodes=True, mercury_policy='majority').
 */
export function evaluateYogaRules(inputs: YogaInputs, options: YogaOptions = {}): YogaResult[] {
  const orb = options.deepExaltationOrb ?? 0
  if (!(orb >= 0)) throw new RangeError('Nonnegative deep-exaltation tolerance required')
  const tie = options.mercuryTie ?? 'unresolved'
  const first = evaluateOnce(inputs, orb, tie)
  if (!first.unknown) return first.rows
  // Mercury's nature is undecided: evaluate both readings; differences become unknown.
  const a = evaluateOnce(inputs, orb, 'benefic').rows
  const b = evaluateOnce(inputs, orb, 'malefic').rows
  a.forEach((ra, i) => {
    const rb = b[i]
    if (ra.status !== rb.status) ra.status = 'conditions_pending'
    for (const field of ['conditions', 'qualifications'] as const) {
      const fa = ra[field]
      const fb = rb[field]
      if (!fa || !fb) continue
      for (const k of Object.keys(fa)) if (fa[k] !== fb[k]) fa[k] = null
    }
  })
  return a
}

/** Hora lagna and Ghati lagna (PDF 48-52) from the Sun at the last sunrise; null without sunrise. */
export function horaGhatiLagnas(chart: Chart): { HL: number; GL: number } | null {
  if (!chart.solarDay) return null
  const t = (chart.jd - chart.solarDay.sunriseJd) * 1440
  if (t < 0) return null
  const sun = sunLongitude(chart.solarDay.sunriseJd, chart.settings)
  return { HL: norm(sun + t / 2), GL: norm(sun + (t * 5) / 4) }
}

/**
 * Evaluate all 170 chapter-11 rules for a natal chart. Pass `strong` (e.g. Shadbala ratio >= 1 per
 * planet) to settle strength conditions; without it they stay unknown and such rules may be pending.
 */
export function evaluateYogas(chart: Chart, options: YogaOptions & { strong?: YogaInputs['strong'] } = {}): YogaResult[] {
  const longitudes = Object.fromEntries(Object.entries(chart.positions).map(([b, v]) => [b, v.longitude])) as Record<Body, number>
  const speeds = Object.fromEntries(PLANETS.map((p) => [p, chart.positions[p].speed])) as Record<Planet, number>
  return evaluateYogaRules({ longitudes, speeds, strong: options.strong, points: horaGhatiLagnas(chart) ?? undefined }, options)
}
