// Functional benefics, malefics, neutrals and yogakarakas for each rising sign,
// ported from functional_nature in vedic_toolkit/interpretation.py, which
// transcribes Table 30 of Rao's book (PDF 152-153). The Moon's role for Aries,
// Libra and Capricorn rising depends on its phase; the nodes get no role.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Planet, SignIndex } from './types'

export type FunctionalRole = 'benefic' | 'neutral' | 'malefic' | 'unclassified'

export interface FunctionalNature {
  ascendant: SignIndex
  benefics: Planet[]
  neutrals: Planet[]
  malefics: Planet[]
  /** Also listed among the benefics or neutrals, as in the source table. */
  yogakarakas: Planet[]
  /** Rahu and Ketu always; the Moon too when its phase was not given for Ar/Li/Cp rising. */
  unclassified: Planet[]
}

type Row = readonly [benefics: Planet[], neutrals: Planet[], malefics: Planet[], yogakarakas: Planet[]]

/** Table 30, Aries..Pisces rising (interpretation._FUNCTIONAL). */
const TABLE: readonly Row[] = [
  [['Sun', 'Mars', 'Jupiter'], [], ['Mercury', 'Venus', 'Saturn'], []],
  [['Sun', 'Mercury', 'Saturn'], ['Mars'], ['Moon', 'Jupiter', 'Venus'], ['Saturn']],
  [['Venus'], ['Moon', 'Mercury', 'Saturn'], ['Sun', 'Mars', 'Jupiter'], []],
  [['Moon', 'Mars', 'Jupiter'], ['Sun', 'Saturn'], ['Mercury', 'Venus'], ['Mars']],
  [['Sun', 'Mars', 'Jupiter'], ['Moon'], ['Mercury', 'Venus', 'Saturn'], ['Mars']],
  [['Mercury', 'Venus'], ['Sun', 'Saturn'], ['Moon', 'Mars', 'Jupiter'], []],
  [['Mercury', 'Venus', 'Saturn'], [], ['Sun', 'Mars', 'Jupiter'], ['Saturn']],
  [['Moon', 'Jupiter'], ['Sun', 'Mars'], ['Mercury', 'Venus', 'Saturn'], []],
  [['Sun', 'Mars'], ['Moon', 'Mercury', 'Jupiter'], ['Venus', 'Saturn'], []],
  [['Venus', 'Mercury', 'Saturn'], ['Sun'], ['Mars', 'Jupiter'], ['Venus']],
  [['Venus', 'Saturn'], ['Sun', 'Mercury'], ['Moon', 'Mars', 'Jupiter'], ['Venus']],
  [['Moon', 'Mars'], ['Jupiter'], ['Sun', 'Mercury', 'Venus', 'Saturn'], []],
]

/**
 * Functional nature for a rising sign. `moonWaxing` (Moon 0-180 degrees ahead
 * of the Sun) decides the Moon for Aries, Libra and Capricorn: malefic when
 * waxing, neutral when waning, unclassified when null.
 */
export function functionalNature(ascendant: SignIndex, moonWaxing: boolean | null): FunctionalNature {
  const [good, neutral, bad, karaka] = TABLE[ascendant].map((list) => [...list])
  const pending: Planet[] = []
  if (ascendant === 0 || ascendant === 6 || ascendant === 9) {
    if (moonWaxing === null) pending.push('Moon')
    else if (moonWaxing) bad.push('Moon')
    else neutral.push('Moon')
  }
  return { ascendant, benefics: good, neutrals: neutral, malefics: bad, yogakarakas: karaka, unclassified: [...pending, 'Rahu', 'Ketu'] }
}

/** Role of one planet (benefic first, as electional.py reads the table). */
export function functionalRole(nature: FunctionalNature, planet: Planet): FunctionalRole {
  if (nature.benefics.includes(planet)) return 'benefic'
  if (nature.neutrals.includes(planet)) return 'neutral'
  if (nature.malefics.includes(planet)) return 'malefic'
  return 'unclassified'
}
