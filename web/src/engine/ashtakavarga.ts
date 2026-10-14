// Ashtakavarga (Parasara's scheme), ported from calculate() in
// vedic_toolkit/ashtakavarga.py, Tables 19-26 of P. V. R. Narasimha Rao's book (PDF 134-138).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { advanceSign } from './core'
import type { Body, Planet, SignIndex } from './types'

/** The seven grahas that own an ashtakavarga; the nodes have none in Parasara's scheme. */
export const SEVEN = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const
export type SevenPlanet = (typeof SEVEN)[number]

/** Contributors of bindus: the seven grahas and the ascendant. */
const REFERENCES = [...SEVEN, 'Asc'] as const

/**
 * For each planet's chart: rows are houses 1..12 counted from a contributor, columns are the
 * contributors in REFERENCES order; '1' means that contributor gives a bindu there.
 * Transcribed in the toolkit from the book's Tables 19-26 (Parasara's BPHS scheme); the bindu
 * counts total the classical 48 (Sun), 49 (Moon), 39 (Mars), 54 (Mercury), 56 (Jupiter), 52 (Venus), 39 (Saturn).
 * These are also Jagannatha Hora's cells (PyJHora const.ashtaka_varga_dict is identical). Many
 * popular tables differ in four cells with the same totals: in the Moon's chart the 9th from Mars
 * instead of from the Moon and the 12th from Jupiter instead of the 2nd; in Venus's chart the 5th
 * from Mars instead of the 4th.
 */
const ROWS: Record<SevenPlanet, readonly string[]> = {
  Sun: ['10100010', '10100010', '01010001', '10100011', '00011000', '01011101', '10100110', '10100010', '10111010', '11110011', '11111011', '00010101'],
  Moon: ['01011000', '00101000', '11110111', '00011100', '00110110', '11100011', '11011100', '10011000', '01000100', '11111101', '11111111', '00000000'],
  Mars: ['00100011', '00100000', '11010001', '00100010', '10010000', '11011101', '00100010', '00100110', '00000010', '10101011', '11111111', '00001100'],
  Mercury: ['00110111', '01100111', '00010100', '01100111', '10010100', '11011001', '00100010', '01101111', '10110110', '01110011', '11111111', '10011000'],
  Jupiter: ['10111001', '11111101', '10001010', '10111001', '01010111', '00010111', '11101001', '10101000', '11010101', '10111101', '11111101', '00000010'],
  Venus: ['01000101', '01000101', '01110111', '01100111', '01011111', '00110000', '00000000', '11001111', '01111111', '00001110', '11111111', '11100000'],
  Saturn: ['10000001', '10000000', '01100011', '10000001', '00101010', '01111111', '10000000', '10010000', '00010000', '10110001', '11111111', '00111100'],
}

export interface Ashtakavarga {
  /** Bhinnashtakavarga: bindus (0..8) per sign Aries..Pisces in each planet's own chart. */
  bav: Record<SevenPlanet, number[]>
  /** Sarvashtakavarga: sum of the seven BAVs per sign (total 337). */
  sav: number[]
}

/** BAV of one planet from natal D1 signs (as ashtakavarga.bhinna). */
export function bhinnashtakavarga(planet: SevenPlanet, signs: Readonly<Record<Body, SignIndex>>): number[] {
  const out = Array<number>(12).fill(0)
  ROWS[planet].forEach((row, h) => {
    REFERENCES.forEach((ref, j) => {
      if (row[j] === '1') out[advanceSign(signs[ref], h + 1)] += 1
    })
  })
  return out
}

/** BAV of the seven planets and the SAV from natal D1 signs (chart.vargas[1]). */
export function ashtakavarga(signs: Readonly<Record<Body, SignIndex>>): Ashtakavarga {
  const bav = Object.fromEntries(SEVEN.map((p) => [p, bhinnashtakavarga(p, signs)])) as Record<SevenPlanet, number[]>
  const sav = Array.from({ length: 12 }, (_, s) => SEVEN.reduce((sum, p) => sum + bav[p][s], 0))
  return { bav, sav }
}

export const isSevenPlanet = (planet: Planet): planet is SevenPlanet => (SEVEN as readonly Planet[]).includes(planet)

/**
 * Bindus a transiting planet finds in the sign it occupies, read from its own natal BAV.
 * Classical gochara refinement (BPHS and Phaladeepika on ashtakavarga): the more bindus, the better
 * that transit works out, with 4 of 8 as the middle.
 */
export function transitBindus(bav: Ashtakavarga['bav'], planet: SevenPlanet, transitSign: SignIndex): number {
  return bav[planet][transitSign]
}
