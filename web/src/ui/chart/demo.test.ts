// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import fixtures from '../../../tests/fixtures/charts.json'
import { VARGAS } from '@/engine/core'
import { BODIES, type Body, type DashaPeriod } from '@/engine/types'
import { crowdedDemoChart, crowdedLagnaDemoChart, demoChart, demoDashas } from './demo'

const fx = fixtures.charts.find((c) => c.id === 'book_example_118')!

interface FixturePeriod { lord: string; start_jd: number; end_jd: number; children?: FixturePeriod[] }

function expectPeriods(ours: readonly DashaPeriod[], rows: readonly FixturePeriod[], level: number) {
  expect(ours).toHaveLength(rows.length)
  rows.forEach((r, i) => {
    expect(ours[i]).toMatchObject({ lord: r.lord, level })
    expect(Math.abs(ours[i].startJd - r.start_jd)).toBeLessThan(1e-6)
    expect(Math.abs(ours[i].endJd - r.end_jd)).toBeLessThan(1e-6)
    if (r.children) expectPeriods(ours[i].children!, r.children, level + 1)
    else expect(ours[i].children).toBeUndefined()
  })
}

describe('demo data (book Example 118)', () => {
  it('embeds the fixture values and derives the rest of the Chart identically', () => {
    expect(demoChart.input).toMatchObject({ date: '1967-03-08', time: '17:40', timeZone: '+05:30', latitude: fx.input.latitude })
    expect(demoChart.input.longitude).toBeCloseTo(fx.input.longitude, 12)
    expect(demoChart.jd).toBe(fx.jd)
    expect(demoChart.ayanamsaDegrees).toBe(fx.ayanamsa_degrees)
    expect(demoChart.utc).toBe(new Date(fx.local_datetime).toISOString())
    expect(demoChart.utcOffsetMinutes).toBe(330)
    for (const b of BODIES) {
      const p = (fx.positions as Record<string, { longitude: number; speed: number; retrograde: boolean; nakshatra: { index: number; pada: number } }>)[b]
      expect(demoChart.positions[b].longitude, b).toBe(p.longitude)
      expect(demoChart.positions[b].speed, b).toBe(p.speed)
      expect(demoChart.positions[b].retrograde, b).toBe(p.retrograde)
      expect(demoChart.positions[b].nakshatra.index, b).toBe(p.nakshatra.index)
      expect(demoChart.positions[b].nakshatra.pada, b).toBe(p.nakshatra.pada)
    }
    const vargaFx = fx.vargas as Record<string, Record<Body, number>>
    for (const n of VARGAS) expect(demoChart.vargas[n], `D${n}`).toEqual(vargaFx[`D${n}`])
    expect([demoChart.panchanga.tithi, demoChart.panchanga.yogaIndex, demoChart.panchanga.karana]).toEqual([fx.panchanga.tithi, fx.panchanga.yoga_index, fx.panchanga.karana])
    const sr = fx.sunrise_context
    expect(demoChart.solarDay).toEqual({ sunriseJd: sr.sunrise_jd, sunsetJd: sr.sunset_jd, nextSunriseJd: sr.next_sunrise_jd, weekday: sr.weekday_sunday0, isDay: sr.is_day })
  })

  it('matches the book placements: Leo lagna, Moon Capricorn, Sun and Mercury Aquarius, ...', () => {
    const d1 = demoChart.vargas[1]
    expect(d1).toEqual({ Asc: 4, Moon: 9, Sun: 10, Mercury: 10, Venus: 11, Saturn: 11, Mars: 6, Ketu: 6, Jupiter: 3, Rahu: 0 })
    expect(demoChart.positions.Mercury.retrograde && demoChart.positions.Jupiter.retrograde).toBe(true)
  })

  it('derives the solar-year Vimsottari of the fixture to three levels', () => {
    expectPeriods(demoDashas, fx.vimsottari.solar as FixturePeriod[], 0)
    expect(demoDashas[0]).toMatchObject({ lord: 'Mars', level: 0 })
  })

  it('builds crowded stress charts', () => {
    const c = crowdedDemoChart()
    expect(BODIES.filter((b) => c.vargas[1][b] === 10)).toHaveLength(7)
    expect(c.vargas[1].Asc).toBe(8)
    const l = crowdedLagnaDemoChart()
    expect(BODIES.filter((b) => l.vargas[1][b] === 4)).toHaveLength(7)
    expect(l.vargas[1].Asc).toBe(4)
    // Vargas follow the moved positions, not the base chart's.
    expect(l.vargas[9].Asc).not.toBe(demoChart.vargas[9].Asc)
  })
})
