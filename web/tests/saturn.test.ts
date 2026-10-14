// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { sadeSatiSummary, saturnPhases } from '@/engine/saturn'
import { PRESETS } from '@/engine/types'
import { loadSwe } from './helpers/swe'

const SETTINGS = PRESETS.popular
const CAPRICORN = 9
const SECOND = 1 / 86400
/** 00:00 UTC on 2020-01-01 and 2029-01-01 (JD UT1). */
const Y2020 = 2458849.500001
const Y2029 = 2462137.500004
/**
 * Saturn's sign changes from the Python toolkit's Ephemeris (Lahiri, mean node, Moshier), bisected
 * to 1e-9 day; the same reference as tests/events.test.ts.
 */
const SAT = {
  sgFirst: 2457780.0840866, // 2017-01-26 enters Sagittarius
  scBack: 2457925.4637885, // 2017-06-20 back into Scorpio
  sgAgain: 2458052.9155650, // 2017-10-26 Sagittarius again
  cp: 2458872.6852708, // 2020-01-24 Capricorn
  aq: 2459698.5996828, // 2022-04-29 Aquarius
  cpBack: 2459772.8870449, // 2022-07-12 back into Capricorn
  aqAgain: 2459962.0239484, // 2023-01-17 Aquarius again
  pi: 2460764.1768617, // 2025-03-29 Pisces
  ar: 2461559.4987800, // 2027-06-02 Aries
  piBack: 2461698.5709932, // 2027-10-20 back into Pisces
  arAgain: 2461825.0793307, // 2028-02-23 Aries again
  ta: 2462356.7945430, // 2029-08-08 Taurus
}

describe('Saturn phases from the Moon sign', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('lists Sade Sati and Ardhashtama for a Capricorn Moon, 2020-2028, split at retrograde returns', () => {
    const got = saturnPhases(CAPRICORN, Y2020, Y2029, SETTINGS)
    const want = [
      ['sade_sati_rising', 12, 8, SAT.sgAgain, SAT.cp],
      ['sade_sati_peak', 1, 9, SAT.cp, SAT.aq],
      ['sade_sati_setting', 2, 10, SAT.aq, SAT.cpBack],
      ['sade_sati_peak', 1, 9, SAT.cpBack, SAT.aqAgain],
      ['sade_sati_setting', 2, 10, SAT.aqAgain, SAT.pi],
      ['ardhashtama', 4, 0, SAT.ar, SAT.piBack],
      ['ardhashtama', 4, 0, SAT.arAgain, SAT.ta],
    ] as const
    expect(got.map((p) => [p.phase, p.house, p.sign])).toEqual(want.map((w) => [w[0], w[1], w[2]]))
    got.forEach((p, i) => {
      expect(Math.abs(p.startJd - want[i][3]), `#${i} start`).toBeLessThan(SECOND)
      expect(Math.abs(p.endJd - want[i][4]), `#${i} end`).toBeLessThan(SECOND)
    })
  })

  it('finds Ashtama Shani for a Leo-8th Moon (Saturn in Pisces is 8th from Leo)', () => {
    const got = saturnPhases(4, Y2020, Y2029, SETTINGS)
    const ashtama = got.filter((p) => p.phase === 'ashtama')
    expect(ashtama).toHaveLength(2) // split by the 2027 retrograde return to Pisces
    expect(Math.abs(ashtama[0].startJd - SAT.pi)).toBeLessThan(SECOND)
    expect(Math.abs(ashtama[0].endJd - SAT.ar)).toBeLessThan(SECOND)
    expect(Math.abs(ashtama[1].startJd - SAT.piBack)).toBeLessThan(SECOND)
  })

  it('summarises the whole Sade Sati, bridging retrograde dips, with previous and next', () => {
    const t0 = performance.now()
    const mid = sadeSatiSummary(CAPRICORN, 2460000, SETTINGS) // 2023-02-24
    console.info(`sadeSatiSummary: ${(performance.now() - t0).toFixed(0)} ms`)
    expect(mid.phase).toBe('sade_sati_setting')
    expect(mid.house).toBe(2)
    expect(Math.abs(mid.current!.startJd - SAT.aqAgain)).toBeLessThan(SECOND)
    expect(Math.abs(mid.sadeSati!.startJd - SAT.sgFirst)).toBeLessThan(SECOND)
    expect(Math.abs(mid.sadeSati!.endJd - SAT.pi)).toBeLessThan(SECOND)
    expect(mid.sadeSati!.periods.map((p) => p.house)).toEqual([12, 12, 1, 2, 1, 2])
    expect(mid.previous!.endJd).toBeLessThan(SAT.sgFirst - 20 * 365)
    expect(mid.next!.startJd).toBeGreaterThan(SAT.pi + 20 * 365)
    expect(mid.next!.periods[0].house).toBe(12)

    // During the 2017 retrograde dip back into Scorpio (11th) the Sade Sati is still under way.
    const dip = sadeSatiSummary(CAPRICORN, (SAT.scBack + SAT.sgAgain) / 2, SETTINGS)
    expect([dip.house, dip.phase, dip.current]).toEqual([11, null, null])
    expect(Math.abs(dip.sadeSati!.startJd - SAT.sgFirst)).toBeLessThan(SECOND)

    const after = sadeSatiSummary(CAPRICORN, SAT.pi + 10, SETTINGS)
    expect(after.sadeSati).toBeNull()
    expect(after.house).toBe(3)
    expect(Math.abs(after.previous!.endJd - SAT.pi)).toBeLessThan(SECOND)
    expect(Math.abs(after.next!.startJd - mid.next!.startJd)).toBeLessThan(SECOND)
  })
})
