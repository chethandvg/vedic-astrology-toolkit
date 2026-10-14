// Classical transit (gochara) results counted from the natal Moon sign, with vedha (obstruction),
// vipareeta vedha (relief) and the transiting planet's own ashtakavarga bindus as a strength modifier.
// Tables: Phaladeepika ch. 26 in V. Subrahmanya Sastri's translation, as summarised verse by verse
// in C. R. Rajah, "Prediction of Dinaphala by Referring Gochara", IJSR 3(4), 2014; cross-checked
// with jagannathhora.com/gochara, nikhilworld.com "How to use transits" and Ernst Wilhelm's
// "Gocara: results of transits from the Moon" (vedic-astrology.net), whose tables give every pair
// below, the vipareeta pairs and both father-son exemptions; Rao, Vedic Astrology: An Integrated
// Approach, ch. 25.2 and 26.3 (PDF 282-287, 314).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { isSevenPlanet, SEVEN, type Ashtakavarga } from './ashtakavarga'
import { houseFrom } from './core'
import { PLANETS, type BodyPosition, type Effect, type Planet, type SignIndex } from './types'

export interface GocharaRule {
  /** Houses from the natal Moon sign in which the transit gives good results. */
  favourable: readonly number[]
  /** Favourable house -> the house from the natal Moon whose occupant obstructs it (vedha). */
  vedha: Readonly<Record<number, number>>
}

/**
 * Saturn's rule. Rahu and Ketu follow it, the common modern convention (Jagannatha Hora's gochara
 * notes, nikhilworld) and the old maxim that Rahu acts like Saturn. Phaladeepika 26 instead likens
 * the nodes to the Sun, which would add the 10th house; we keep the narrower, more widely used set.
 */
const SATURN_RULE: GocharaRule = { favourable: [3, 6, 11], vedha: { 3: 12, 6: 9, 11: 5 } }

/**
 * Favourable houses and vedha pairs. All sources agree except on two Venus pairs: Phaladeepika
 * lists Venus's good houses as 1, 2, 3, 4, 5, 8, 9, 12, 11 with vedha 8, 7, 1, 10, 9, 5, 11, 6, 3
 * "respectively" (Rajah 2014), i.e. 12 <-> 6 and 11 <-> 3, as nikhilworld also gives; tables that
 * print the good houses in ascending order without re-pairing show 11 <-> 6 and 12 <-> 3.
 */
export const GOCHARA_RULES: Readonly<Record<Planet, GocharaRule>> = {
  Sun: { favourable: [3, 6, 10, 11], vedha: { 3: 9, 6: 12, 10: 4, 11: 5 } },
  Moon: { favourable: [1, 3, 6, 7, 10, 11], vedha: { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 } },
  Mars: { favourable: [3, 6, 11], vedha: { 3: 12, 6: 9, 11: 5 } },
  Mercury: { favourable: [2, 4, 6, 8, 10, 11], vedha: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12 } },
  Jupiter: { favourable: [2, 5, 7, 9, 11], vedha: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 } },
  Venus: { favourable: [1, 2, 3, 4, 5, 8, 9, 11, 12], vedha: { 1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 3, 12: 6 } },
  Saturn: SATURN_RULE,
  Rahu: SATURN_RULE,
  Ketu: SATURN_RULE,
}

/**
 * Vipareeta vedha: unfavourable house -> the house whose occupant cancels the bad result. It is
 * each vedha pair read backwards, kept only where the reversed house is itself unfavourable (so
 * Mercury's 10/8 pair gives none, 8 being good for Mercury); this reproduces nikhilworld's table.
 */
export const VIPAREETA_VEDHA: Readonly<Record<Planet, Readonly<Record<number, number>>>> = Object.fromEntries(
  PLANETS.map((p) => {
    const { favourable, vedha } = GOCHARA_RULES[p]
    const reverse = Object.entries(vedha)
      .filter(([, bad]) => !favourable.includes(bad))
      .map(([good, bad]) => [bad, Number(good)])
    return [p, Object.fromEntries(reverse)]
  }),
) as Record<Planet, Record<number, number>>

/**
 * Who can obstruct: the seven grahas. The nodes receive vedha (as Saturn) but cast none: Jagannatha
 * Hora notes that the nodes are generally left outside the vedha scheme, and Ketu, always 7th from
 * Rahu, would otherwise block Rahu's 11th permanently.
 */
export const VEDHA_CASTERS: readonly Planet[] = SEVEN

/** Pairs that never obstruct each other: the Sun and Saturn, the Moon and Mercury (father and son). */
const NO_VEDHA: readonly (readonly [Planet, Planet])[] = [['Sun', 'Saturn'], ['Moon', 'Mercury']]

const exempt = (a: Planet, b: Planet) => NO_VEDHA.some(([x, y]) => (a === x && b === y) || (a === y && b === x))

/**
 * Ashtakavarga thresholds on the transiting planet's own BAV bindus (0..8) in the sign it occupies:
 * 4 is the middle; 5 or more makes good results stronger and bad ones milder, 3 or fewer the
 * reverse. Rao, ch. 25.5 (PDF 298-301); BPHS on ashtakavarga results; Jagannatha Hora's gochara notes.
 */
export const BINDU_STRONG = 5
export const BINDU_WEAK = 3

export type GocharaStrength = 'strong' | 'normal' | 'weak'

export interface GocharaRow {
  planet: Planet
  sign: SignIndex
  houseFromMoon: number
  /** House from the natal ascendant sign, when it was given. */
  houseFromLagna?: number
  /** The classical table marks this house as good for the planet. */
  favourable: boolean
  /** Planets in the vedha house that cancel a favourable result. */
  vedhaBy?: Planet[]
  /** Planets in the vipareeta vedha house that cancel an unfavourable result. */
  vipareetaVedhaBy?: Planet[]
  /** The planet's own natal BAV bindus in this sign (seven grahas only, when a BAV was given). */
  bindus?: number
  /** +1 favourable, -1 unfavourable, 0 when vedha or vipareeta vedha cancels the result. */
  effect: Effect
  /** How strongly the effect is felt, from the bindus: 'strong' sharpens either sign of effect. */
  strength: GocharaStrength
}

export interface GocharaOptions {
  /** Natal bhinnashtakavarga, for the bindu modifier. */
  bav?: Ashtakavarga['bav']
  /** Natal ascendant sign, to report houseFromLagna as well. */
  natalAscSign?: SignIndex
  /** Planets allowed to obstruct (default VEDHA_CASTERS); pass only slow planets for long periods. */
  casters?: readonly Planet[]
}

function strengthOf(effect: Effect, bindus: number | undefined): GocharaStrength {
  if (bindus === undefined || effect === 0) return 'normal'
  if (bindus >= BINDU_STRONG) return effect > 0 ? 'strong' : 'weak'
  if (bindus <= BINDU_WEAK) return effect > 0 ? 'weak' : 'strong'
  return 'normal'
}

/**
 * Gochara of every planet present in `transit`, in PLANETS order. Planets missing from `transit`
 * are skipped and cannot obstruct. A favourable transit obstructed by vedha, or an unfavourable one
 * relieved by vipareeta vedha, becomes neutral (effect 0): the texts say the result is "not given",
 * not that it turns into its opposite.
 */
export function gochara(
  natalMoonSign: SignIndex,
  transit: Readonly<Partial<Record<Planet, Pick<BodyPosition, 'sign'>>>>,
  options: GocharaOptions = {},
): GocharaRow[] {
  const house = (p: Planet) => houseFrom(natalMoonSign, transit[p]!.sign)
  const casters = (options.casters ?? VEDHA_CASTERS).filter((p) => transit[p])
  const occupants = (target: number | undefined, self: Planet) =>
    target === undefined ? [] : casters.filter((c) => c !== self && !exempt(self, c) && house(c) === target)
  const rows: GocharaRow[] = []
  for (const planet of PLANETS) {
    const pos = transit[planet]
    if (!pos) continue
    const h = house(planet)
    const rule = GOCHARA_RULES[planet]
    const favourable = rule.favourable.includes(h)
    const vedhaBy = favourable ? occupants(rule.vedha[h], planet) : []
    const vipareetaVedhaBy = favourable ? [] : occupants(VIPAREETA_VEDHA[planet][h], planet)
    const effect: Effect = vedhaBy.length || vipareetaVedhaBy.length ? 0 : favourable ? 1 : -1
    const bindus = options.bav && isSevenPlanet(planet) ? options.bav[planet][pos.sign] : undefined
    const row: GocharaRow = { planet, sign: pos.sign, houseFromMoon: h, favourable, effect, strength: strengthOf(effect, bindus) }
    if (options.natalAscSign !== undefined) row.houseFromLagna = houseFrom(options.natalAscSign, pos.sign)
    if (vedhaBy.length) row.vedhaBy = vedhaBy
    if (vipareetaVedhaBy.length) row.vipareetaVedhaBy = vipareetaVedhaBy
    if (bindus !== undefined) row.bindus = bindus
    rows.push(row)
  }
  return rows
}
