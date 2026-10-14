// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import charts from './fixtures/charts.json'
import times from './fixtures/time.json'
import { nakshatra, panchanga, vargaSign } from '@/engine/core'
import { positionsWithAscendant } from '@/engine/ephem'
import { birthToJd } from '@/engine/time'
import { BODIES, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

type TimeCase = { id: string; input: { datetime: string; timezone?: string; fold?: 0 | 1 }; jd?: number; utc_offset_minutes?: number; error: string | null }

/** Split a toolkit ISO input into the web BirthInput fields. */
export function toBirth(input: { datetime: string; timezone?: string; fold?: 0 | 1 }) {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(.*)$/.exec(input.datetime)!
  return { date: m[1], time: m[2], timeZone: m[3] || input.timezone!, fold: input.fold }
}

describe('foundation parity with the Python toolkit', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('converts civil time to JD UT1 like local_time + to_jd', () => {
    for (const c of (times as { cases: TimeCase[] }).cases) {
      const b = toBirth(c.input)
      if (c.error) {
        expect(() => birthToJd(b), c.id).toThrow(/Nonexistent/)
        continue
      }
      const r = birthToJd(b)
      expect(r.offsetMinutes, c.id).toBeCloseTo(c.utc_offset_minutes!, 6)
      expect(Math.abs(r.jd - c.jd!) * 86400, c.id).toBeLessThan(1e-3)
    }
  })

  it('reproduces positions, nakshatras, panchanga and all 20 vargas', () => {
    for (const c of charts.charts) {
      const s = c.settings as unknown as Settings
      const pos = positionsWithAscendant(c.jd, c.input.latitude, c.input.longitude, { ...s, yearModel: 'solar' })
      for (const b of BODIES) {
        const py = (c.positions as Record<string, { longitude: number }>)[b]
        expect(Math.abs(pos[b].longitude - py.longitude), `${c.id} ${b}`).toBeLessThan(1e-8) // 36 micro-arcseconds; true node differs ~1e-9 across platforms
        expect(nakshatra(pos[b].longitude).index, `${c.id} ${b}`).toBe((c.positions as Record<string, { nakshatra: { index: number } }>)[b].nakshatra.index)
        for (const [name, signs] of Object.entries(c.vargas as Record<string, Record<string, number>>)) {
          expect(vargaSign(pos[b].longitude, Number(name.slice(1))), `${c.id} ${b} ${name}`).toBe(signs[b])
        }
      }
      const p = panchanga(pos.Sun.longitude, pos.Moon.longitude)
      expect([p.tithi, p.yogaIndex, p.karana], c.id).toEqual([c.panchanga.tithi, c.panchanga.yoga_index, c.panchanga.karana])
    }
  })
})

describe('sunrise parity', () => {
  beforeAll(async () => {
    await loadSwe()
  })
  it('matches sunrise_context for every fixture', async () => {
    const { solarDayAt } = await import('@/engine/sunrise')
    for (const c of charts.charts) {
      const ctx = c.sunrise_context as null | { sunrise_jd: number; sunset_jd: number; next_sunrise_jd: number; weekday_sunday0: number; is_day: boolean }
      const zone = toBirth(c.input as { datetime: string; timezone?: string }).timeZone.replace(/^UTC(?=[+-])/, '')
      const d = solarDayAt(c.jd, c.input.latitude, c.input.longitude, zone)
      if (!ctx) { expect(d, c.id).toBeNull(); continue }
      expect(d, c.id).not.toBeNull()
      expect(Math.abs(d!.sunriseJd - ctx.sunrise_jd) * 86400, c.id).toBeLessThan(0.01)
      expect(Math.abs(d!.sunsetJd - ctx.sunset_jd) * 86400, c.id).toBeLessThan(0.01)
      expect(Math.abs(d!.nextSunriseJd - ctx.next_sunrise_jd) * 86400, c.id).toBeLessThan(0.01)
      expect([d!.weekday, d!.isDay], c.id).toEqual([ctx.weekday_sunday0, ctx.is_day])
    }
  })
})
