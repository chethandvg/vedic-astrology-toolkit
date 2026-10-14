// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import tara from './fixtures/tara.json'
import { NAKSHATRA_NAMES, SIGN_SANSKRIT, advanceSign, nakshatra, signOf } from '@/engine/core'
import { moonLongitude } from '@/engine/ephem'
import { CHANDRA_BALA_HOUSES, chandraBala, chandrashtamaWindows, moonDay, taraBala } from '@/engine/moon'
import { localToJd } from '@/engine/time'
import { DEFAULT_SETTINGS } from '@/engine/types'
import { loadSwe } from './helpers/swe'

const S = DEFAULT_SETTINGS
const IST = 'Asia/Kolkata'
const moonSign = (jd: number) => signOf(moonLongitude(jd, S))

describe('taraBala', () => {
  it('matches electional.tara_assessment on every fixture', () => {
    expect(tara.cases.length).toBeGreaterThan(50)
    for (const c of tara.cases) {
      const t = taraBala(nakshatra(c.natal_moon).index, nakshatra(c.moon).index)
      expect([t.count, t.number, t.name, t.classification, t.good]).toEqual([c.count_from_natal, c.number, c.name, c.classification, c.good])
    }
  })

  it('reproduces Drik Panchang\'s good Tarabalam lists (New Delhi, 14 Oct 2026)', () => {
    const goodFor = (transit: string) =>
      NAKSHATRA_NAMES.filter((_, i) => taraBala(i + 1, NAKSHATRA_NAMES.indexOf(transit as never) + 1).good)
    expect(goodFor('Anuradha')).toEqual(['Ashwini', 'Krittika', 'Mrigashira', 'Punarvasu', 'Ashlesha', 'Magha', 'Uttara Phalguni',
      'Chitra', 'Vishakha', 'Jyeshtha', 'Mula', 'Uttara Ashadha', 'Dhanishtha', 'Purva Bhadrapada', 'Revati'])
    expect(goodFor('Jyeshtha')).toEqual(['Ashwini', 'Bharani', 'Rohini', 'Ardra', 'Pushya', 'Magha', 'Purva Phalguni', 'Hasta',
      'Swati', 'Anuradha', 'Mula', 'Purva Ashadha', 'Shravana', 'Shatabhisha', 'Uttara Bhadrapada'])
  })

  it('wraps around Revati and rejects bad indices', () => {
    expect(taraBala(27, 1)).toMatchObject({ count: 2, number: 2, name: 'Sampat', good: true })
    expect(taraBala(5, 5)).toMatchObject({ count: 1, name: 'Janma', classification: 'mixed', good: false })
    expect(taraBala(1, 25)).toMatchObject({ count: 25, number: 7, name: 'Naidhana', classification: 'adverse' })
    expect(() => taraBala(0, 3)).toThrow(RangeError)
    expect(() => taraBala(3, 28)).toThrow(RangeError)
  })
})

describe('chandraBala', () => {
  it('is good in houses 1, 3, 6, 7, 10 and 11 from the natal Moon', () => {
    for (let natal = 0; natal < 12; natal++) {
      for (let house = 1; house <= 12; house++) {
        const r = chandraBala(natal, advanceSign(natal, house))
        expect(r).toEqual({ house, good: CHANDRA_BALA_HOUSES.includes(house) })
      }
    }
  })

  it('reproduces Drik Panchang\'s Chandrabalam lists (New Delhi, 11-17 Oct 2026)', () => {
    const goodFor = (transit: number) => SIGN_SANSKRIT.filter((_, natal) => chandraBala(natal, transit).good)
    expect(goodFor(5)).toEqual(['Mesha', 'Karka', 'Kanya', 'Vrischika', 'Dhanu', 'Meena'])
    expect(goodFor(6)).toEqual(['Mesha', 'Vrishabha', 'Simha', 'Tula', 'Dhanu', 'Makara'])
    expect(goodFor(7)).toEqual(['Vrishabha', 'Mithuna', 'Kanya', 'Vrischika', 'Makara', 'Kumbha'])
    expect(goodFor(8)).toEqual(['Mithuna', 'Karka', 'Tula', 'Dhanu', 'Kumbha', 'Meena'])
  })
})

describe('chandrashtamaWindows', () => {
  let START: number, END: number
  beforeAll(async () => {
    await loadSwe()
    START = localToJd('2026-01-01', IST)
    END = START + 120
  })

  const EPS = 1e-5 // about 0.9 s, above the 0.1 s search tolerance

  it('brackets every stay of the Moon in the 8th sign exactly', () => {
    for (let natal = 0; natal < 12; natal++) {
      const target = advanceSign(natal, 8)
      const windows = chandrashtamaWindows(natal, START, END, S)
      expect(windows.length, `natal ${natal}`).toBeGreaterThanOrEqual(4)
      for (const w of windows) {
        expect(moonSign((w.startJd + w.endJd) / 2)).toBe(target)
        expect(moonSign(w.startJd + EPS)).toBe(target)
        expect(moonSign(w.endJd - EPS)).toBe(target)
        expect(moonSign(w.startJd - EPS)).not.toBe(target)
        expect(moonSign(w.endJd + EPS)).not.toBe(target)
        expect(w.endJd - w.startJd).toBeGreaterThan(1.9)
        expect(w.endJd - w.startJd).toBeLessThan(2.6)
        expect(w.endJd > START && w.startJd <= END).toBe(true)
        expect(w).toMatchObject({ name: 'Chandrashtama', quality: 'avoid' })
      }
      for (let i = 1; i < windows.length; i++) {
        // One stay per sidereal month (27.32 days, varying with the Moon's speed).
        expect(windows[i].startJd - windows[i - 1].startJd).toBeGreaterThan(26)
        expect(windows[i].startJd - windows[i - 1].startJd).toBeLessThan(29)
      }
      // Hourly samples are inside a window exactly when the Moon is in the 8th sign.
      for (let jd = windows[0].startJd + 0.01; jd < windows[windows.length - 1].endJd; jd += 1 / 24) {
        const inside = windows.some((w) => w.startJd <= jd && jd < w.endJd)
        expect(inside, `natal ${natal} jd ${jd}`).toBe(moonSign(jd) === target)
      }
    }
  })

  it('returns whole windows that only partly overlap the range, and nothing between them', () => {
    const [w] = chandrashtamaWindows(3, START, START + 30, S)
    const mid = (w.startJd + w.endJd) / 2
    const inside = chandrashtamaWindows(3, mid, mid + 0.1, S)
    // Bit-identical instants whatever the range: the search grid is absolute, not range-relative.
    expect(inside).toEqual([w])
    expect(chandrashtamaWindows(3, w.startJd, w.startJd, S)).toEqual([w])
    expect(chandrashtamaWindows(3, w.endJd - 1e-9, w.endJd + 0.37, S)).toEqual([w])
    expect(chandrashtamaWindows(3, START - 17.3, START + 101.9, S)).toContainEqual(w)
    expect(chandrashtamaWindows(3, w.endJd, w.endJd + 20, S)).toEqual([])
    expect(() => chandrashtamaWindows(3, END, START, S)).toThrow(RangeError)
  })

  it('matches Drik Panchang across a clock change (New York, Oct-Nov 2026)', () => {
    // Moon enters Karka 31 Oct 14:30 EDT and Simha 2 Nov 17:16 EST; DST ends between them.
    const NY = 'America/New_York'
    const [w] = chandrashtamaWindows(8, localToJd('2026-11-01', NY, '12:00'), localToJd('2026-11-01', NY, '12:00'), S)
    expect(Math.abs(w.startJd - localToJd('2026-10-31', NY, '14:30')) * 1440).toBeLessThan(1)
    expect(Math.abs(w.endJd - localToJd('2026-11-02', NY, '17:16')) * 1440).toBeLessThan(1)
  })

  it('matches Drik Panchang\'s Moon sign changes (New Delhi, Lahiri, Oct 2026)', () => {
    // Moon enters Tula 11 Oct 10:04, Vrischika 13 Oct 19:12, Dhanu 16 Oct 06:47 (IST).
    const cases = [
      { natal: 11, from: ['2026-10-11', '10:04'], to: ['2026-10-13', '19:12'] },
      { natal: 0, from: ['2026-10-13', '19:12'], to: ['2026-10-16', '06:47'] },
    ]
    for (const c of cases) {
      const day = localToJd('2026-10-14', IST, '12:00') - (c.natal === 11 ? 2 : 0)
      const [w] = chandrashtamaWindows(c.natal, day, day, S)
      expect(Math.abs(w.startJd - localToJd(c.from[0], IST, c.from[1])) * 1440).toBeLessThan(1)
      expect(Math.abs(w.endJd - localToJd(c.to[0], IST, c.to[1])) * 1440).toBeLessThan(1)
    }
  })
})

describe('moonDay', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('combines sign, nakshatra, tara, chandra bala and the chandrashtama flag', () => {
    const jd = localToJd('2026-10-14', IST, '12:00')
    // Moon in Vrischika (Anuradha) that day; natal Moon in Mesha (Bharani) gives Chandrashtama.
    const d = moonDay({ moonLongitude: 20 }, jd, S)
    expect(d.sign).toBe(7)
    expect(d.nakshatra.name).toBe('Anuradha')
    expect(d.chandraBala).toEqual({ house: 8, good: false })
    expect(d.chandrashtama).toBe(true)
    expect(d.tara).toMatchObject({ count: 16, number: 7, name: 'Naidhana', good: false })
    for (let lon = 5; lon < 360; lon += 13) {
      const x = moonDay({ moonLongitude: lon }, jd, S)
      expect(x.chandrashtama).toBe(advanceSign(signOf(lon), 8) === x.sign)
      expect(x.tara).toEqual(taraBala(nakshatra(lon).index, x.nakshatra.index))
      expect(x.chandraBala).toEqual(chandraBala(signOf(lon), x.sign))
    }
  })
})
