// Daily factors of the transiting Moon measured from the natal Moon: Tara Bala
// (nakshatra count), Chandra Bala (sign count) and Chandrashtama (8th sign).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { advanceSign, houseFrom, nakshatra, norm, signOf } from './core'
import { moonLongitude } from './ephem'
import { bisectInstant } from './search'
import type { Nakshatra, Settings, SignIndex, TimeWindow } from './types'

export const TARA_NAMES = ['Janma', 'Sampat', 'Vipat', 'Kshema', 'Pratyak', 'Saadhana', 'Naidhana', 'Mitra', 'Parama Mitra'] as const
export type TaraName = (typeof TARA_NAMES)[number]
export type TaraClass = 'good' | 'mixed' | 'adverse'

export interface TaraBala {
  /** Nakshatras from the natal one to the transit one, both inclusive: 1..27. */
  count: number
  /** 1..9 */
  number: number
  name: TaraName
  good: boolean
  classification: TaraClass
}

/**
 * Tara Bala, as electional.tara_assessment (Rao, Table 64, PDF 315): count from the natal
 * nakshatra to the transit one and reduce to 1..9. Janma (1) is mixed, Vipat, Pratyak and
 * Naidhana (3, 5, 7) are adverse, the rest good. The "good Tarabalam" lists of Drik Panchang
 * and Prokerala use the same split (Janma excluded). Indices are 1..27 (Ashwini = 1).
 */
export function taraBala(natalNakshatraIndex: number, transitNakshatraIndex: number): TaraBala {
  for (const i of [natalNakshatraIndex, transitNakshatraIndex]) {
    if (!Number.isInteger(i) || i < 1 || i > 27) throw new RangeError(`Nakshatra index must be 1..27, got ${i}`)
  }
  const count = ((transitNakshatraIndex - natalNakshatraIndex + 27) % 27) + 1
  const number = ((count - 1) % 9) + 1
  const classification: TaraClass = number === 1 ? 'mixed' : number === 3 || number === 5 || number === 7 ? 'adverse' : 'good'
  return { count, number, name: TARA_NAMES[number - 1], good: classification === 'good', classification }
}

/**
 * Houses from the natal Moon sign in which the transiting Moon is favourable: the classical
 * gochara result for the Moon (Phaladeepika ch. 26), used for Chandra Bala by Drik Panchang,
 * Prokerala and Bhaktibharat. Some muhurta manuals also accept 2, 5 and 9 during the bright
 * fortnight (Sukla paksha), and Drik Panchang's table marks those three "Puja needed" rather
 * than bad; we use the strict set.
 */
export const CHANDRA_BALA_HOUSES: readonly number[] = [1, 3, 6, 7, 10, 11]

export interface ChandraBala {
  /** House of the transit Moon sign counted from the natal Moon sign, 1..12. */
  house: number
  good: boolean
}

export function chandraBala(natalMoonSign: SignIndex, transitMoonSign: SignIndex): ChandraBala {
  const house = houseFrom(natalMoonSign, transitMoonSign)
  return { house, good: CHANDRA_BALA_HOUSES.includes(house) }
}

/** Moon is never retrograde and covers a sign in 1.9 to 2.6 days, so a grid cell holds at most one sign change... */
const SIGN_STEP_DAYS = 0.25
/** ...and this margin brackets the entry and exit of any stay that overlaps the requested range. */
const SIGN_MARGIN_DAYS = 3

const CHANDRASHTAMA_NOTE = 'The Moon passes through the 8th sign from your natal Moon; traditionally a time to go slow, avoid new ventures and stay careful with health and travel.'

/**
 * Instants at which the Moon enters a new sign, found on a fixed absolute grid of JD multiples of
 * SIGN_STEP_DAYS (exact in binary) so that every query bisects the same cell and returns
 * bit-identical instants, whatever range it was asked for (day, week and month views agree).
 */
function moonSignChanges(from: number, to: number, settings: Settings): { jd: number; sign: SignIndex }[] {
  const sign = (jd: number) => signOf(moonLongitude(jd, settings))
  const out: { jd: number; sign: SignIndex }[] = []
  let lo = Math.floor(from / SIGN_STEP_DAYS) * SIGN_STEP_DAYS
  let before = sign(lo)
  while (lo < to) {
    const hi = lo + SIGN_STEP_DAYS
    const after = sign(hi)
    if (after !== before) {
      const prev = before
      out.push({ jd: bisectInstant((x) => sign(x) !== prev, lo, hi), sign: after })
    }
    lo = hi
    before = after
  }
  return out
}

/**
 * Chandrashtama: the transit Moon in the 8th sign from the natal Moon sign, as in the published
 * Chandrashtama calendars (Hindupad, PanchangBodh). Returns every complete stay that overlaps
 * [startJd, endJd], with entry and exit to about 0.1 s.
 */
export function chandrashtamaWindows(natalMoonSign: SignIndex, startJd: number, endJd: number, settings: Settings): TimeWindow[] {
  if (!(endJd >= startJd)) throw new RangeError('endJd must not precede startJd')
  const target = advanceSign(natalMoonSign, 8)
  const changes = moonSignChanges(startJd - SIGN_MARGIN_DAYS, endJd + SIGN_MARGIN_DAYS, settings)
  const out: TimeWindow[] = []
  changes.forEach((entry, i) => {
    const exit = changes[i + 1]
    if (entry.sign !== target || !exit || exit.jd <= startJd || entry.jd > endJd) return
    out.push({ name: 'Chandrashtama', startJd: entry.jd, endJd: exit.jd, quality: 'avoid', note: CHANDRASHTAMA_NOTE })
  })
  return out
}

export interface MoonDay {
  /** Sidereal longitude of the transit Moon. */
  longitude: number
  sign: SignIndex
  nakshatra: Nakshatra
  tara: TaraBala
  chandraBala: ChandraBala
  chandrashtama: boolean
}

/** The transit Moon at `jd` judged from the natal Moon. */
export function moonDay(natal: { moonLongitude: number }, jd: number, settings: Settings): MoonDay {
  const longitude = norm(moonLongitude(jd, settings))
  const sign = signOf(longitude)
  const nak = nakshatra(longitude)
  const bala = chandraBala(signOf(natal.moonLongitude), sign)
  return {
    longitude,
    sign,
    nakshatra: nak,
    tara: taraBala(nakshatra(natal.moonLongitude).index, nak.index),
    chandraBala: bala,
    chandrashtama: bala.house === 8,
  }
}
