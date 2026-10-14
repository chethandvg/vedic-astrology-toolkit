// Kundli matching texts: what each koota and porutham looks at, what its result suggests, the
// Manglik notes, the score bands and the method notes. Original wording, kept calm and practical:
// matching is one traditional input among many, never a verdict on two people.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { NAKSHATRA_NAMES, SIGN_NAMES } from '@/engine/core'
import type { DoshaException, KootaKey, ManglikCancellation, ManglikOutcome, PoruthamKey, PoruthamStatus, ScoreBand } from '@/engine/matching'
import type { Planet, SignIndex } from '@/engine/types'
import { ordinal } from './format'

export interface OutcomeText {
  /** What the check looks at, in one line. */
  about: string
  /** Full, partial and no agreement. */
  full: string
  some: string
  none: string
}

export const KOOTA_TEXT: Readonly<Record<KootaKey, OutcomeText>> = {
  varna: {
    about: 'Compares the temperament tradition gives each Moon sign, a hint about shared values and how each of you approaches duty.',
    full: 'Your outlooks on work and values sit comfortably together.',
    some: 'Your outlooks overlap in part.',
    none: 'You may approach duty and ambition differently; talking openly about priorities helps.',
  },
  vashya: {
    about: 'Looks at the natural pull between the two Moon signs: who tends to lead and who tends to adapt.',
    full: 'A natural, balanced pull towards each other.',
    some: 'Some give and take, with room to agree on who leads where.',
    none: 'Neither naturally yields, so shared decisions work best when made deliberately.',
  },
  tara: {
    about: 'Counts the birth stars from each partner to the other, a traditional reading of how your fortunes support each other.',
    full: 'Both counts land on supportive stars.',
    some: 'One count is supportive and the other asks for patience.',
    none: 'Both counts fall on harder stars; steady mutual support matters more here.',
  },
  yoni: {
    about: 'Pairs the animal symbol of each birth star, a traditional gauge of physical and instinctive ease together.',
    full: 'Instinctively at ease with each other.',
    some: 'A workable instinctive fit that grows with familiarity.',
    none: 'Instincts may clash at first; patience and affection smooth the way.',
  },
  maitri: {
    about: 'Checks whether the planets ruling your Moon signs are friends, a reading of mental wavelength and easy conversation.',
    full: 'Your minds tend to meet easily.',
    some: 'Good understanding in some areas, with others needing effort.',
    none: 'You may think quite differently; curiosity about the other view helps.',
  },
  gana: {
    about: 'Compares the nature of the birth stars (gentle, human or intense), a reading of day-to-day temperament.',
    full: 'Similar temperaments that settle into shared rhythms.',
    some: 'Temperaments differ a little and usually complement each other.',
    none: 'Different temperaments; agreeing on household rhythms early helps.',
  },
  bhakoot: {
    about: 'Measures how far apart the two Moon signs sit, traditionally linked to prosperity, family life and wellbeing.',
    full: 'The Moon signs sit in a supportive relationship.',
    some: 'A mixed relationship between the Moon signs.',
    none: 'The Moon signs sit in a pattern the tradition counts as a dosha; see the notes on exceptions below.',
  },
  nadi: {
    about: 'Compares the constitution type of the birth stars; the tradition prefers two different types and gives this the most weight.',
    full: 'Different constitution types, as the tradition prefers.',
    some: 'Partly matched constitution types.',
    none: 'The same constitution type, which the tradition counts as Nadi dosha; see the notes on exceptions below.',
  },
}

/** Outcome sentence for a koota from its points. */
export function kootaOutcome(key: KootaKey, points: number, max: number): string {
  const t = KOOTA_TEXT[key]
  return points >= max ? t.full : points <= 0 ? t.none : points / max >= 0.5 ? t.some : t.none
}

export const PORUTHAM_TEXT: Readonly<Record<PoruthamKey, OutcomeText>> = {
  dina: {
    about: 'Counts from the bride\'s star to the groom\'s, traditionally for health and day-to-day wellbeing.',
    full: 'A supportive count.', some: 'Accepted by some almanacs and not others.', none: 'The count falls on a harder star.',
  },
  gana: {
    about: 'Compares the nature of the two birth stars.',
    full: 'Matching temperaments.', some: 'Close enough to complement each other.', none: 'Temperaments pull in different directions.',
  },
  mahendra: {
    about: 'Looks for the groom\'s star at every third place from the bride\'s, linked to growth and family.',
    full: 'The count lands on a Mahendra place.', some: 'Partly supportive.', none: 'Not on a Mahendra place; many almanacs treat this as minor.',
  },
  stree_deergha: {
    about: 'Asks that the groom\'s star sit well ahead of the bride\'s, traditionally for her lasting comfort.',
    full: 'The stars are far enough apart.', some: 'Close to the preferred distance.', none: 'The stars sit close together.',
  },
  yoni: {
    about: 'Pairs the animal symbols of the two birth stars.',
    full: 'Friendly animal symbols.', some: 'Neutral animal symbols.', none: 'The symbols are traditional opposites.',
  },
  rasi: {
    about: 'Counts from the bride\'s Moon sign to the groom\'s, linked to family harmony.',
    full: 'A supportive sign relationship.', some: 'Accepted with care, often because the sign lords are friendly.', none: 'A sign relationship the almanacs avoid.',
  },
  rasyadhipati: {
    about: 'Checks the friendship of the planets that rule the two Moon signs.',
    full: 'The ruling planets are friends.', some: 'The ruling planets are neutral to each other.', none: 'The ruling planets do not get along.',
  },
  vasya: {
    about: 'Checks whether one Moon sign is naturally drawn to the other.',
    full: 'A natural attraction between the signs.', some: 'A partial attraction.', none: 'No special pull between the signs.',
  },
  rajju: {
    about: 'Groups the stars by part of the body; the tradition wants the two stars in different groups and weighs this heavily.',
    full: 'Different groups, as preferred.', some: 'Partly clear.', none: 'Both stars share a group, which almanacs weigh heavily.',
  },
  vedha: {
    about: 'Checks for star pairs said to obstruct each other.',
    full: 'No obstruction between the stars.', some: 'A mild obstruction.', none: 'The two stars form an obstructing pair.',
  },
}

export function poruthamOutcome(key: PoruthamKey, status: PoruthamStatus): string {
  const t = PORUTHAM_TEXT[key]
  return status === 'match' ? t.full : status === 'partial' ? t.some : t.none
}

export const BAND_META: Readonly<Record<ScoreBand, { label: string; text: string }>> = {
  excellent: { label: 'Excellent', text: 'A rare, very strong traditional match. Keep looking at the whole picture, as no score says everything.' },
  good: { label: 'Good', text: 'A comfortable traditional match, well above the usual minimum of 18.' },
  average: { label: 'Average', text: 'Above the usual minimum of 18. Families often look at the doshas and the full charts before deciding.' },
  low: { label: 'Not recommended', text: 'Below the usual minimum of 18 gunas. Many families would ask an astrologer to read both full charts.' },
}

export const DOSHA_EXCEPTION_TEXT: Readonly<Record<DoshaException, string>> = {
  same_sign_other_star: 'Both Moons are in the same sign but in different stars, a widely accepted exception.',
  same_star_other_sign: 'Both Moons are in the same star but in different signs, a widely accepted exception.',
  same_star_other_pada: 'Same star and sign but different quarters (padas); some traditions accept this as an exception.',
  same_lord: 'Both Moon signs share the same ruling planet, which mainstream calculators treat as cancelling it.',
  friendly_lords: 'The planets ruling the two Moon signs are friends of each other, which mainstream calculators treat as cancelling it.',
}

export const DOSHA_TEXT = {
  nadiPresent: 'Both birth stars share one Nadi, so this koota scores 0.',
  bhakootPresent: 'The Moon signs sit 2/12, 5/9 or 6/8 from each other, so this koota scores 0.',
  noException: 'None of the common exceptions applies.',
  rawScore: 'The score above stays as calculated; exceptions are shown separately.',
  adjusted: (total: string) => `Some calculators restore the points of a cancelled dosha, which would read ${total} of 36.`,
} as const

export const MANGLIK_CANCELLATION_TEXT: Readonly<Record<ManglikCancellation, string>> = {
  own_or_exalted: 'Mars is in its own sign or exalted, which tradition says calms it.',
  jupiter: 'Jupiter joins or aspects Mars, a widely accepted softening influence.',
  lagna: 'For a Cancer or Leo ascendant Mars is a helpful planet, so the dosha is not counted.',
}

export const MANGLIK_TEXT = {
  about: 'Manglik (Kuja) dosha looks at Mars in the 1st, 2nd, 4th, 7th, 8th or 12th house from the ascendant, the Moon and Venus.',
  clear: 'Mars is not in a Manglik house from the ascendant, the Moon or Venus.',
  active: 'Mars sits in a Manglik house and no common exception clears it.',
  cleared: 'Mars sits in a Manglik house, but a common exception clears it.',
  houseException: 'The sign Mars occupies here is a listed exception for this house.',
} as const

export const MANGLIK_OUTCOME_TEXT: Readonly<Record<ManglikOutcome, string>> = {
  none: 'Neither of you has an active Manglik dosha, so there is nothing to balance.',
  mutual: 'Both of you have Manglik dosha, which the tradition reads as balancing each other out.',
  groom: 'Only the groom has an active Manglik dosha. Families often ask an astrologer to look at the full charts.',
  bride: 'Only the bride has an active Manglik dosha. Families often ask an astrologer to look at the full charts.',
}

export const PORUTHAM_SUMMARY = {
  essentialsOk: 'Rajju and Vedha both agree, the two checks most almanacs treat as essential.',
  essentialsNot: 'Rajju or Vedha does not agree, and most almanacs give these two the most weight.',
} as const

/**
 * The facts behind each porutham and the Tara koota values (engine/matching.ts). Arguments are the
 * engine's English names (planets, signs, nakshatras, ganas, yonis, rajjus, taras).
 */
export const MATCH_BASIS = {
  sameStar: 'Both share the same birth star',
  starCount: (n: number): string => `Groom's star is ${ordinal(n)} from the bride's`,
  sameSign: 'Both Moons in the same sign',
  signCount: (n: number): string => `Groom's Moon sign is ${ordinal(n)} from the bride's`,
  /** Gana, yoni or rajju of each partner. */
  pair: (groom: string, bride: string): string => `Groom ${groom}, bride ${bride}`,
  sameRajju: (rajju: string): string => `Both in ${rajju} rajju`,
  /** Sign lords, signs or nakshatras of the two Moons. */
  lords: (groom: Planet, bride: Planet): string => `${groom} and ${bride}`,
  signs: (groom: SignIndex, bride: SignIndex): string => `${SIGN_NAMES[groom]} and ${SIGN_NAMES[bride]}`,
  stars: (groom: number, bride: number): string => `${NAKSHATRA_NAMES[groom - 1]} and ${NAKSHATRA_NAMES[bride - 1]}`,
  /** "10th · Janma": a star's count from the partner's and the tara it gives. */
  tara: (count: number, tara: string): string => `${ordinal(count)} · ${tara}`,
}

export const MATCH_DISCLAIMER =
  'Matching is one traditional input, worked out from the Moon, Mars and a few other positions. It is not a verdict on a relationship: care, respect and shared values matter far more.'

/** How the matching is worked out, with the sources each table was checked against. */
export const MATCH_METHOD: readonly string[] = [
  'Ashtakoota reads both Moons in the sidereal zodiac of your settings. The groom-and-bride tables are directional, so swapping the roles can change Varna, Vashya and Gana.',
  'Tables follow Drik Panchang, OnlineJyotish, Astroyogi, findyourfate and the PyJHora project. Where they differ, as for some Vashya and Yoni cells, the version that two or more of them share is used.',
  'Score bands: below 18 not recommended, 18 to 24.5 average, 25 to 32.5 good, 33 and above excellent, following AstroMedha and GrahaGuru.',
  'Ten poruthams follow the South Indian almanac rules as summarised by findyourfate and Hindutone. Rules vary by region, so a partial result marks a point where almanacs disagree.',
  'Manglik dosha uses the 1st, 2nd, 4th, 7th, 8th and 12th houses from the ascendant, the Moon and Venus, with exceptions found in at least two published lists.',
]
