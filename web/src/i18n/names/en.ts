// Names of the astrological terms in English (the transliterations the app has always shown),
// and the shape every language's names follow. Shared by the UI and by the interpretation packs
// the engine worker uses, so a sign or a nakshatra reads the same on the chart and in a forecast.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { NAKSHATRA_NAMES, SIGN_NAMES, SIGN_SANSKRIT, SIGN_SHORT, TITHI_NAMES, YOGA_NAMES } from '@/engine/core'
import type { ChoghadiyaName } from '@/engine/muhurta'
import type { KootaKey, PoruthamKey } from '@/engine/matching'
import type { TaraName } from '@/engine/moon'
import type { Body } from '@/engine/types'

/** The day windows of engine/muhurta.ts, keyed by the engine's own names. */
export type WindowName = 'Rahu Kalam' | 'Yamaganda' | 'Gulika Kalam' | 'Durmuhurta' | 'Abhijit Muhurta' | 'Chandrashtama'

export interface Names {
  /** Planets and the ascendant as written in running text. */
  body: Readonly<Record<Body, string>>
  /** Labels inside the chart drawings (two letters in English, one syllable in Indian scripts). */
  bodyShort: Readonly<Record<Body, string>>
  /** A second name under a planet's name: Sanskrit in English, the English name elsewhere ('' for none). */
  bodyAlt: Readonly<Record<Body, string>>
  /** Aries..Pisces. */
  sign: readonly string[]
  /** A second name under a sign: Sanskrit in English, the English name elsewhere. */
  signAlt: readonly string[]
  /** Very short sign labels for narrow bands. */
  signShort: readonly string[]
  /** Ashwini..Revati. */
  nakshatra: readonly string[]
  /** Tithis 1..14 of a paksha (Pratipada..Chaturdashi). */
  tithi: readonly string[]
  purnima: string
  amavasya: string
  paksha: Readonly<Record<'Sukla' | 'Krishna', string>>
  tara: Readonly<Record<TaraName, string>>
  /** The 27 panchanga yogas. */
  yoga: readonly string[]
  /** Karanas keyed by the engine's names (Bava, ..., Kimstughna). */
  karana: Readonly<Record<string, string>>
  /** Weekday names in the Vedic form (Ravivara...), Sunday first. */
  vara: readonly string[]
  choghadiya: Readonly<Record<ChoghadiyaName, string>>
  window: Readonly<Record<WindowName, string>>
  /** Divisional charts by their number (Rasi, Navamsa...). */
  varga: Readonly<Record<number, string>>
  koota: Readonly<Record<KootaKey, string>>
  porutham: Readonly<Record<PoruthamKey, string>>
  /** Matching values (varna, vashya, yoni, gana, nadi, rajju), keyed by the engine's English words. */
  term: Readonly<Record<string, string>>
  /** Mahadasha, Antardasha, Pratyantardasha, and their short forms. */
  dashaLevel: readonly [string, string, string]
  dashaLevelShort: readonly [string, string, string]
  /** 1 -> "1st". */
  ordinal(n: number): string
  /** "a, b and c". */
  list(items: readonly string[]): string
}

const ordinal = (n: number): string => {
  const teen = n % 100 >= 11 && n % 100 <= 13
  return `${n}${teen ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`
}

const list = (items: readonly string[]): string =>
  items.length <= 1 ? items[0] ?? '' : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`

const same = <K extends string>(keys: readonly K[]): Record<K, string> => Object.fromEntries(keys.map((k) => [k, k as string])) as Record<K, string>

export const EN_NAMES: Names = {
  body: { Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant' },
  bodyShort: { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Asc: 'Asc' },
  bodyAlt: { Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangala', Mercury: 'Budha', Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Lagna' },
  sign: SIGN_NAMES,
  signAlt: SIGN_SANSKRIT,
  signShort: SIGN_SHORT,
  nakshatra: NAKSHATRA_NAMES,
  tithi: TITHI_NAMES,
  purnima: 'Purnima',
  amavasya: 'Amavasya',
  paksha: { Sukla: 'Sukla', Krishna: 'Krishna' },
  tara: same(['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Saadhana', 'Naidhana', 'Mitra', 'Parama Mitra'] as const),
  yoga: YOGA_NAMES,
  karana: same(['Bava', 'Balava', 'Kaulava', 'Taitula', 'Garija', 'Vanija', 'Vishti', 'Sakuna', 'Chatushpada', 'Naga', 'Kimstughna'] as const),
  vara: ['Ravivara', 'Somavara', 'Mangalavara', 'Budhavara', 'Guruvara', 'Shukravara', 'Shanivara'],
  choghadiya: same(['Udveg', 'Amrit', 'Rog', 'Labh', 'Shubh', 'Char', 'Kaal'] as const),
  window: same(['Rahu Kalam', 'Yamaganda', 'Gulika Kalam', 'Durmuhurta', 'Abhijit Muhurta', 'Chandrashtama'] as const),
  varga: {
    1: 'Rasi', 2: 'Hora', 3: 'Drekkana', 4: 'Chaturthamsa', 5: 'Panchamsa', 6: 'Shashthamsa', 7: 'Saptamsa', 8: 'Ashtamsa', 9: 'Navamsa', 10: 'Dasamsa',
    11: 'Rudramsa', 12: 'Dwadasamsa', 16: 'Shodasamsa', 20: 'Vimsamsa', 24: 'Chaturvimsamsa', 27: 'Nakshatramsa', 30: 'Trimsamsa', 40: 'Khavedamsa',
    45: 'Akshavedamsa', 60: 'Shashtyamsa',
  },
  koota: { varna: 'Varna', vashya: 'Vashya', tara: 'Tara', yoni: 'Yoni', maitri: 'Graha Maitri', gana: 'Gana', bhakoot: 'Bhakoot', nadi: 'Nadi' },
  porutham: {
    dina: 'Dina', gana: 'Gana', mahendra: 'Mahendra', stree_deergha: 'Stree Deergha', yoni: 'Yoni', rasi: 'Rasi', rasyadhipati: 'Rasyadhipati',
    vasya: 'Vasya', rajju: 'Rajju', vedha: 'Vedha',
  },
  term: {},
  dashaLevel: ['Mahadasha', 'Antardasha', 'Pratyantardasha'],
  dashaLevelShort: ['Maha', 'Antar', 'Pratyantar'],
  ordinal,
  list,
}
