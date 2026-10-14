// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { engineApi } from '@/engine/api'
import { localToJd } from '@/engine/time'
import { PRESETS, type BirthInput, type TimedEvent } from '@/engine/types'
import { moonMoves } from './moonMoves'

const ZONE = 'Asia/Kolkata'
const at = (time: string, seconds = 0) => localToJd('2026-01-06', ZONE, time) + seconds / 86400

describe('moonMoves', () => {
  it('merges a sign and a star change at the same minute into one row', () => {
    const jd = at('12:18', 10)
    const events: TimedEvent[] = [
      { jd, kind: 'moon_nakshatra', body: 'Moon', nakshatra: 10, title: 'Moon enters Magha' },
      { jd, kind: 'moon_sign', body: 'Moon', sign: 4, title: 'Moon enters Leo' },
      { jd: at('20:05'), kind: 'moon_nakshatra', body: 'Moon', nakshatra: 11, title: 'Moon enters Purva Phalguni' },
    ]
    const rows = moonMoves(events, ZONE)
    expect(rows.map((r) => r.label)).toEqual(['Into Leo and Magha nakshatra', 'Into Purva Phalguni nakshatra'])
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length)
  })

  it('marks Chandrashtama on the sign change it shares an instant with', () => {
    const begin = at('09:40')
    const end = at('23:59', 30)
    const events: TimedEvent[] = [
      { jd: begin, kind: 'moon_sign', body: 'Moon', sign: 7, title: 'Moon enters Scorpio' },
      { jd: begin, kind: 'chandrashtama', body: 'Moon', sign: 7, title: 'Chandrashtama begins' },
      { jd: end, kind: 'chandrashtama', body: 'Moon', title: 'Chandrashtama ends' },
    ]
    const rows = moonMoves(events, ZONE)
    expect(rows).toMatchObject([{ label: 'Into Scorpio', chandrashtama: 'begins' }, { label: 'Chandrashtama ends', date: '2026-01-07' }])
    expect(rows[1].chandrashtama).toBeUndefined()
  })

  it('ignores other events', () => {
    expect(moonMoves([{ jd: at('10:00'), kind: 'ingress', body: 'Mars', sign: 3, title: 'Mars enters Cancer' }], ZONE)).toEqual([])
  })
})

describe('moonMoves on real days', () => {
  beforeAll(() => engineApi.init())

  it('gives every row its own key through 2026 for the e2e profile', () => {
    const place = { latitude: 12.9719, longitude: 77.5937, timeZone: ZONE }
    const birth: BirthInput = { date: '1990-05-12', time: '06:00', ...place }
    let merged = 0
    for (let month = 1; month <= 12; month++) {
      const { forecast } = engineApi.forecast(birth, PRESETS.popular, place, 'month', `2026-${String(month).padStart(2, '0')}-01`)
      for (const day of forecast.parts ?? []) {
        const rows = moonMoves(day.events, ZONE)
        expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length)
        merged += rows.filter((r) => r.label.includes(' and ')).length
      }
    }
    // Sign and star boundaries meet every 30 degrees, several times a month.
    expect(merged).toBeGreaterThan(10)
  })
})
