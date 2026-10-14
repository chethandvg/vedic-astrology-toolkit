// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { SE, swe } from '@/engine/swe'
import { loadSwe } from './helpers/swe'

// Values from the Python toolkit for book Example 118 (Lahiri, Moshier).
const JD = 2439558.0069444445
const PY = { sun: 323.8340407269424, moon: 294.1716905017833, meanNode: 16.4024980708, asc: 130.78595798835113 }

describe('Swiss Ephemeris WebAssembly build', () => {
  beforeAll(async () => {
    await loadSwe()
  })
  it('is version 2.10.03', () => expect(swe().version()).toBe('2.10.03'))
  it('reproduces Python sidereal longitudes', () => {
    swe().setSiderealMode(SE.SIDM_LAHIRI)
    const flags = SE.FLG_SPEED | SE.FLG_SIDEREAL
    expect(swe().calcUt(JD, SE.SUN, flags).longitude).toBeCloseTo(PY.sun, 9)
    expect(swe().calcUt(JD, SE.MOON, flags).longitude).toBeCloseTo(PY.moon, 9)
    expect(swe().calcUt(JD, SE.MEAN_NODE, flags).longitude).toBeCloseTo(PY.meanNode, 9)
    expect(swe().housesEx(JD, SE.FLG_SIDEREAL, 26.3, 73.06666666666666).ascendant).toBeCloseTo(PY.asc, 9)
  })
  it('round-trips UTC and JD UT1', () => {
    const { ut1 } = swe().utcToJd(1967, 3, 8, 12, 10, 0)
    const back = swe().jdut1ToUtc(ut1)
    expect([back.year, back.month, back.day, back.hour, back.minute]).toEqual([1967, 3, 8, 12, 10])
  })
  it('finds a sunrise', () => {
    expect(swe().riseTrans(JD - 1, SE.SUN, SE.CALC_RISE, 73.06666666666666, 26.3)).not.toBeNull()
  })
})
