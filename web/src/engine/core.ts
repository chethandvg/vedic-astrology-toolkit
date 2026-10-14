// Pure zodiac arithmetic, ported from vedic_toolkit/core.py (PDF page refs are the book's).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Nakshatra, Panchanga, Planet, SignIndex } from './types'

export const SIGN_NAMES = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'] as const
export const SIGN_SANSKRIT = ['Mesha', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrischika', 'Dhanu', 'Makara', 'Kumbha', 'Meena'] as const
export const SIGN_SHORT = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'] as const
/** Sign lords, Aries..Pisces (core.LORDS). */
export const SIGN_LORDS: readonly Planet[] = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter']

/** Common modern spellings; parity tests compare indices, not names. */
export const NAKSHATRA_NAMES = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha', 'Jyeshtha',
  'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishtha', 'Shatabhisha', 'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
] as const

export const VIM_ORDER: readonly Planet[] = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']
export const VIM_YEARS: Readonly<Record<Planet, number>> = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 }

export const NAKSHATRA_SPAN = 40 / 3

export const TITHI_NAMES = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami', 'Shashthi', 'Saptami', 'Ashtami',
  'Navami', 'Dashami', 'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi',
] as const

export const YOGA_NAMES = [
  'Vishkambha', 'Preeti', 'Aayushmaan', 'Saubhaagya', 'Sobhana', 'Atiganda', 'Sukarman', 'Dhriti', 'Shoola',
  'Ganda', 'Vriddhi', 'Dhruva', 'Vyaaghaata', 'Harshana', 'Vajra', 'Siddhi', 'Vyatipaata', 'Variyan',
  'Parigha', 'Shiva', 'Siddha', 'Saadhya', 'Subha', 'Sukla', 'Brahma', 'Indra', 'Vaidhriti',
] as const

const MOVABLE_KARANAS = ['Bava', 'Balava', 'Kaulava', 'Taitula', 'Garija', 'Vanija', 'Vishti'] as const
const FIXED_KARANAS = ['Sakuna', 'Chatushpada', 'Naga'] as const

export const norm = (longitude: number): number => ((longitude % 360) + 360) % 360
export const signOf = (longitude: number): SignIndex => Math.floor(norm(longitude) / 30)
export const degreeInSign = (longitude: number): number => norm(longitude) % 30

/** House number (1..12) of `sign` counted from `reference`, as core.count. */
export const houseFrom = (reference: SignIndex, sign: SignIndex): number => ((((sign - reference) % 12) + 12) % 12) + 1
/** The sign `houses` places from `reference` (house 1 = reference), as core.advance. */
export const advanceSign = (reference: SignIndex, houses: number): SignIndex => ((((reference + houses - 1) % 12) + 12) % 12)

export function nakshatra(longitude: number): Nakshatra {
  const x = norm(longitude)
  const n = Math.min(26, Math.floor(x / NAKSHATRA_SPAN))
  const f = (x - n * NAKSHATRA_SPAN) / NAKSHATRA_SPAN
  return { index: n + 1, name: NAKSHATRA_NAMES[n], pada: (Math.min(3, Math.floor(f * 4)) + 1) as 1 | 2 | 3 | 4, lord: VIM_ORDER[n % 9], elapsed: f }
}

/** Angular panchanga limbs (PDF 19-26), as core.panchanga. Weekday needs sunrise. */
export function panchanga(sun: number, moon: number): Panchanga {
  const delta = norm(norm(moon) - norm(sun))
  const tithi = Math.floor(delta / 12) + 1
  const half = Math.floor(delta / 6)
  const karana = half === 0 ? 'Kimstughna' : half <= 56 ? MOVABLE_KARANAS[(half - 1) % 7] : FIXED_KARANAS[half - 57]
  const yi = Math.floor(norm(norm(sun) + norm(moon)) / NAKSHATRA_SPAN)
  const inPaksha = ((tithi - 1) % 15) + 1
  const tithiName = tithi === 15 ? 'Purnima' : tithi === 30 ? 'Amavasya' : TITHI_NAMES[inPaksha - 1]
  return {
    tithi, paksha: tithi <= 15 ? 'Sukla' : 'Krishna', tithiInPaksha: inPaksha, tithiName,
    elongation: delta, nakshatra: nakshatra(moon), yogaIndex: yi + 1, yoga: YOGA_NAMES[yi], karana,
  }
}

export const VARGAS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 16, 20, 24, 27, 30, 40, 45, 60] as const

/** All 20 divisional mappings of chapter 6 (PDF 53-60), as core.varga_sign. D-30 is unequal. */
export function vargaSign(longitude: number, n: number): SignIndex {
  const s = signOf(longitude)
  const d = degreeInSign(longitude)
  const k = Math.floor((d * n) / 30)
  const odd = s % 2 === 0
  const mode = s % 3
  const element = s % 4
  const m12 = (x: number) => ((x % 12) + 12) % 12
  switch (n) {
    case 1: return s
    case 2: return odd ? (k === 0 ? 4 : 3) : (k === 0 ? 3 : 4)
    case 3: return m12(s + 4 * k)
    case 4: return m12(s + 3 * k)
    case 5: return (odd ? [0, 10, 8, 2, 6] : [1, 5, 11, 9, 7])[k]
    case 6: return m12((odd ? 0 : 6) + k)
    case 7: return m12(s + (odd ? 0 : 6) + k)
    case 8: return m12([0, 8, 4][mode] + k)
    case 9: return m12([0, 9, 6, 3][element] + k)
    case 10: return m12(s + (odd ? 0 : 8) + k)
    case 11: return m12(-s + k)
    case 12: case 60: return m12(s + k)
    case 16: case 45: return m12([0, 4, 8][mode] + k)
    case 20: return m12([0, 8, 4][mode] + k)
    case 24: return m12((odd ? 4 : 3) + k)
    case 27: return m12([0, 3, 6, 9][element] + k)
    case 30: {
      const ends = odd ? [5, 10, 18, 25, 30] : [5, 12, 20, 25, 30]
      const signs = odd ? [0, 10, 8, 2, 6] : [1, 5, 11, 9, 7]
      return signs[ends.findIndex((end) => d < end)]
    }
    case 40: return m12((odd ? 0 : 6) + k)
    default: throw new Error(`Unsupported division D-${n}`)
  }
}

export const formatDegree = (longitude: number): string => {
  const d = degreeInSign(longitude)
  const deg = Math.floor(d)
  const min = Math.floor((d - deg) * 60)
  return `${deg}°${String(min).padStart(2, '0')}′`
}
