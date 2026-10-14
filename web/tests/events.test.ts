// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { nakshatra, signOf } from '@/engine/core'
import { planetLongitude } from '@/engine/ephem'
import { cellChanges, eventsBetween, ingresses, moonNakshatraChanges, moonSignChanges, stations } from '@/engine/events'
import { PLANETS, PRESETS, type Planet, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

/**
 * Reference instants (JD UT1) from the Python toolkit: Ephemeris(Settings()) (Lahiri, mean node,
 * Moshier) sampled every 0.1-1 day, each change bisected to 1e-9 day on Ephemeris.body longitudes
 * (or the sign of the speed for stations). Window bounds are 00:00 UTC via to_jd(local_time()).
 * Each entry is [jd, value after the change]; signs 0 = Aries, nakshatras 0 = Ashwini.
 */
const JD = {
  y2016: 2457388.500000945, y2025: 2460676.5000021323, y2026: 2461041.500003289, jul2026: 2461222.500003948,
  oct2026: 2461314.5000042273, nov2026: 2461345.5000043083, y2027: 2461406.5000044447, y2028: 2461771.5000044447, y2031: 2462867.4999961373,
}
const REF = {
  saturn: [[2457780.0840866, 8], [2457925.4637885, 7], [2458052.9155650, 8], [2458872.6852708, 9], [2459698.5996828, 10], [2459772.8870449, 9], [2459962.0239484, 10], [2460764.1768617, 11], [2461559.4987800, 0], [2461698.5709932, 11], [2461825.0793307, 0], [2462356.7945430, 1], [2462414.9727365, 0], [2462608.6518276, 1]],
  jupiter: [[2460810.2127539, 2], [2460967.0957439, 3], [2461014.9971266, 2], [2461193.3472392, 3], [2461344.7723416, 4], [2461430.3345335, 3], [2461582.4923333, 4], [2461736.0521332, 5]],
  sun: [[2461054.9009235, 9], [2461084.4437378, 10], [2461114.3146351, 11], [2461144.6685133, 0], [2461175.5361317, 1], [2461206.8076463, 2], [2461238.2565158, 3], [2461269.6033074, 4], [2461300.5992758, 5], [2461331.0984049, 6], [2461361.0925106, 7], [2461390.7048922, 8]],
  mercuryStations: [[2461097.7830360, 1], [2461120.3146107, 0], [2461221.2323457, 1], [2461245.4575020, 0], [2461337.8005232, 1], [2461358.1628199, 0]],
  mercury: [[2461057.7042276, 9], [2461075.1819731, 10], [2461141.3236959, 11], [2461160.5573412, 0], [2461175.2931029, 1], [2461189.7374403, 2], [2461213.9171399, 3], [2461228.7197050, 2], [2461258.1001918, 3], [2461275.0846257, 4], [2461290.8353686, 5], [2461309.7976200, 6], [2461376.9982836, 7], [2461396.5900726, 8]],
  venusStations: [[2460736.5250159, 1], [2460778.5436129, 0], [2461316.8008709, 1], [2461358.5207059, 0]],
  mars: [[2461056.4573432, 9], [2461094.7641693, 10], [2461132.9164279, 11], [2461171.7977165, 0], [2461212.2705578, 1], [2461255.2232602, 2], [2461301.9622423, 3], [2461357.1170718, 4], [2461474.2801215, 3], [2461521.7619684, 4], [2461591.4615780, 5], [2461641.6817453, 6], [2461686.3325674, 7], [2461727.6360336, 8], [2461766.8160124, 9]],
  rahuMean: [[2460814.0864974, 10], [2461380.2098396, 9]],
  rahuTrue: [[2460825.3098060, 10]],
  moonSign: [[2461315.9240821, 2], [2461318.0430756, 3], [2461320.1998349, 4], [2461322.4085464, 5], [2461324.6904650, 6], [2461327.0712512, 7], [2461329.5540381, 8], [2461332.0856110, 9], [2461334.5628758, 10], [2461336.8986729, 11], [2461339.0779814, 0], [2461341.1505373, 1], [2461343.1922041, 2], [2461345.2714521, 3]],
  moonNakshatra: [[2461314.5228753, 3], [2461315.4565568, 4], [2461316.3925285, 5], [2461317.3332819, 6], [2461318.2805947, 7], [2461319.2357498, 8], [2461320.1998349, 9], [2461321.1740583, 10], [2461322.1599993, 11], [2461323.1597138, 12], [2461324.1756364, 13], [2461325.2102571, 14], [2461326.2655885, 15], [2461327.3424739, 16], [2461328.4398336, 17], [2461329.5540381, 18], [2461330.6786752, 19], [2461331.8049566, 20], [2461332.9228158, 21], [2461334.0224661, 22], [2461335.0959730, 23], [2461336.1383709, 24], [2461337.1480668, 25], [2461338.1265961, 26], [2461339.0779814, 0], [2461340.0079535, 1], [2461340.9232033, 2], [2461341.8307339, 3], [2461342.7373214, 4], [2461343.6490630, 5], [2461344.5710053, 6]],
} as const

const SETTINGS = PRESETS.popular
/** One second, far inside the 1-minute requirement; the reference values are rounded to 1e-7 day. */
const SECOND = 1 / 86400

function expectMatches(ours: { jd: number; value: number }[], ref: readonly (readonly number[])[], label: string) {
  expect(ours.map((e) => e.value), label).toEqual(ref.map((r) => r[1]))
  ours.forEach((e, i) => expect(Math.abs(e.jd - ref[i][0]), `${label} #${i}`).toBeLessThan(SECOND))
}

describe('transit events vs the Python toolkit ephemeris', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('times Saturn sign changes 2016-2030, including retrograde re-entries', () => {
    const ev = ingresses('Saturn', JD.y2016, JD.y2031, SETTINGS)
    expectMatches(ev.map((e) => ({ jd: e.jd, value: e.sign! })), REF.saturn, 'Saturn')
    expect(ev.every((e) => e.kind === 'ingress' && e.body === 'Saturn')).toBe(true)
    expect(ev[0].title).toBe('Saturn enters Sagittarius')
    expect(ev[1].title).toBe('Saturn moves back into Scorpio (retrograde)')
  })

  it('times Jupiter 2025-2027 and Mars 2026-2027 sign changes', () => {
    expectMatches(ingresses('Jupiter', JD.y2025, JD.y2028, SETTINGS).map((e) => ({ jd: e.jd, value: e.sign! })), REF.jupiter, 'Jupiter')
    expectMatches(ingresses('Mars', JD.y2026, JD.y2028, SETTINGS).map((e) => ({ jd: e.jd, value: e.sign! })), REF.mars, 'Mars')
  })

  it('times the 2026 sankrantis', () => {
    const ev = ingresses('Sun', JD.y2026, JD.y2027, SETTINGS)
    expectMatches(ev.map((e) => ({ jd: e.jd, value: e.sign! })), REF.sun, 'Sun')
    expect(ev.every((e) => e.kind === 'sankranti')).toBe(true)
    expect(ev[10].title).toBe('Sun enters Scorpio (Vrischika Sankranti)')
    expect(ev[0].title).toBe('Sun enters Capricorn (Makara Sankranti)')
  })

  it('times Mercury and Venus stations and Mercury’s retrograde re-entry', () => {
    const merc = stations('Mercury', JD.y2026, JD.y2027, SETTINGS)
    expectMatches(merc.map((e) => ({ jd: e.jd, value: e.kind === 'retrograde' ? 1 : 0 })), REF.mercuryStations, 'Mercury stations')
    expect(merc[0].title).toBe(`Mercury turns retrograde in ${['Aquarius', 'Pisces'][merc[0].sign! - 10]}`)
    const venus = stations('Venus', JD.y2025, JD.y2027, SETTINGS)
    expectMatches(venus.map((e) => ({ jd: e.jd, value: e.kind === 'retrograde' ? 1 : 0 })), REF.venusStations, 'Venus stations')
    expectMatches(ingresses('Mercury', JD.y2026, JD.y2027, SETTINGS).map((e) => ({ jd: e.jd, value: e.sign! })), REF.mercury, 'Mercury')
    for (const p of ['Sun', 'Moon', 'Rahu', 'Ketu'] as Planet[]) expect(stations(p, JD.y2026, JD.y2027, SETTINGS)).toEqual([])
  })

  it('times node ingresses for the mean and the true node', () => {
    const rahu = ingresses('Rahu', JD.y2025, JD.y2028, SETTINGS)
    expectMatches(rahu.map((e) => ({ jd: e.jd, value: e.sign! })), REF.rahuMean, 'mean Rahu')
    expect(rahu[0].title).toBe('Rahu enters Aquarius')
    const ketu = ingresses('Ketu', JD.y2025, JD.y2028, SETTINGS)
    expect(ketu.map((e) => [e.jd, e.sign])).toEqual(rahu.map((e) => [e.jd, (e.sign! + 6) % 12]))
    const trueNode: Settings = { ...SETTINGS, node: 'true' }
    const t = ingresses('Rahu', JD.y2025, JD.jul2026, trueNode)
    expectMatches(t.map((e) => ({ jd: e.jd, value: e.sign! })), REF.rahuTrue, 'true Rahu')
  })

  it('times the Moon’s sign and nakshatra changes in October 2026', () => {
    const signs = moonSignChanges(JD.oct2026, JD.nov2026, SETTINGS)
    expectMatches(signs.map((e) => ({ jd: e.jd, value: e.sign! })), REF.moonSign, 'Moon sign')
    expect(signs.every((e) => e.kind === 'moon_sign' && e.title === `Moon enters ${['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][e.sign!]}`)).toBe(true)
    const naks = moonNakshatraChanges(JD.oct2026, JD.nov2026, SETTINGS)
    expectMatches(naks.map((e) => ({ jd: e.jd, value: e.nakshatra - 1 })), REF.moonNakshatra, 'Moon nakshatra')
    expect(naks[0].title).toBe('Moon enters Rohini nakshatra')
  })
})

describe('event consistency and speed', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('chains every change and puts each instant just inside the new cell', () => {
    for (const p of PLANETS) {
      for (const grid of ['sign', 'nakshatra'] as const) {
        if (grid === 'nakshatra' && p !== 'Moon' && p !== 'Sun') continue
        const changes = cellChanges(p, grid, JD.y2026, JD.y2027, SETTINGS)
        const cell = (jd: number) => {
          const lon = planetLongitude(jd, p, SETTINGS).longitude
          return grid === 'sign' ? signOf(lon) : nakshatra(lon).index - 1
        }
        changes.forEach((c, i) => {
          if (i) expect(c.from, `${p} ${grid} #${i}`).toBe(changes[i - 1].to)
          expect(cell(c.jd), `${p} ${grid} #${i}`).toBe(c.to)
          expect(cell(c.jd - 2e-6), `${p} ${grid} #${i}`).toBe(c.from)
        })
      }
    }
  })

  it('gives every event to exactly one of two adjacent windows, even when split at its own instant', () => {
    for (const s of [SETTINGS, { ...SETTINGS, node: 'true' } as Settings]) {
      const all = eventsBetween(JD.oct2026, JD.y2027, s)
      expect(all.some((e) => e.kind === 'retrograde' || e.kind === 'direct')).toBe(true)
      // Cut at every event instant, or a hair either side of it, alternately.
      const cuts = [JD.oct2026, ...all.map((e, i) => e.jd + [0, 3e-7, -3e-7][i % 3]), JD.y2027].sort((a, b) => a - b)
      const parts = cuts.slice(1).flatMap((end, i) => eventsBetween(cuts[i], end, s))
      expect(parts, s.node).toEqual(all)
    }
  })

  it('aggregates a full year sorted by time, quickly', () => {
    eventsBetween(JD.y2026, JD.y2026 + 30, SETTINGS) // warm up the WebAssembly JIT
    const t0 = performance.now()
    const all = eventsBetween(JD.y2026, JD.y2027, SETTINGS)
    const ms = performance.now() - t0
    console.info(`eventsBetween over 2026: ${all.length} events in ${ms.toFixed(0)} ms`)
    expect(ms).toBeLessThan(1000) // ~60 ms locally; loose for slow CI machines
    expect(all.map((e) => e.jd)).toEqual([...all.map((e) => e.jd)].sort((a, b) => a - b))
    const count = (k: string) => all.filter((e) => e.kind === k).length
    expect(count('sankranti')).toBe(12)
    expect(count('moon_nakshatra')).toBeGreaterThan(350)
    expect(count('moon_sign')).toBeGreaterThan(160)
    expect(count('retrograde') + count('direct')).toBeGreaterThan(8)
    expect(all.every((e) => e.jd >= JD.y2026 && e.jd < JD.y2027)).toBe(true)
    const subset = eventsBetween(JD.y2026, JD.y2027, SETTINGS, { ingresses: ['Jupiter'], stations: [], moonNakshatras: false })
    expect(subset.map((e) => e.title)).toEqual(['Jupiter enters Cancer', 'Jupiter enters Leo'])
  })
})
