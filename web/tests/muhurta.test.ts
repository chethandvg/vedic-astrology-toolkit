// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  CHALDEAN_ORDER, CHOGHADIYA, DURMUHURTA, GULIKA_KALAM_PART, RAHU_KALAM_PART, WEEKDAY_LORDS, YAMAGANDA_PART,
  activeAt, dayTimings, dayTimingsAt,
} from '@/engine/muhurta'
import { addDays, jdToLocal, localToJd } from '@/engine/time'
import type { DayTimings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

const SECOND = 1 / 86400

const PLACES = [
  { name: 'New Delhi', lat: 28.635556, lon: 77.224444, zone: 'Asia/Kolkata' },
  { name: 'Bengaluru', lat: 12.971667, lon: 77.593611, zone: 'Asia/Kolkata' },
  { name: 'New York', lat: 40.7128, lon: -74.006, zone: 'America/New_York' },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093, zone: 'Australia/Sydney' },
  { name: 'Reykjavik', lat: 64.1466, lon: -21.9426, zone: 'Atlantic/Reykjavik' },
]
// Spans the US and Australian clock changes of 2026 and both solstices.
const START_DATES = ['2026-03-05', '2026-06-18', '2026-10-01', '2026-10-30', '2026-12-18']

function allTimings(): DayTimings[] {
  const out: DayTimings[] = []
  for (const p of PLACES) for (const start of START_DATES) for (let i = 0; i < 7; i++) {
    const t = dayTimings(addDays(start, i), p.lat, p.lon, p.zone)
    expect(t, `${p.name} ${addDays(start, i)}`).not.toBeNull()
    out.push(t!)
  }
  return out
}

describe('dayTimings structure', () => {
  let days: DayTimings[]
  beforeAll(async () => {
    await loadSwe()
    days = allTimings()
  })

  it('covers every weekday', () => {
    expect(new Set(days.map((d) => d.solarDay.weekday)).size).toBe(7)
  })

  it('places Rahu Kalam, Yamaganda and Gulika Kalam in the weekday eighth of daytime', () => {
    for (const d of days) {
      const { sunriseJd: sr, sunsetJd: ss, weekday: w } = d.solarDay
      const eighth = (ss - sr) / 8
      const checks = [[d.rahuKalam, RAHU_KALAM_PART[w]], [d.yamaganda, YAMAGANDA_PART[w]], [d.gulikaKalam, GULIKA_KALAM_PART[w]]] as const
      for (const [win, n] of checks) {
        expect(Math.abs(win.startJd - (sr + (n - 1) * eighth)), `${d.date} ${win.name}`).toBeLessThan(1e-9)
        expect(Math.abs(win.endJd - win.startJd - eighth)).toBeLessThan(1e-9)
        expect(win.startJd).toBeGreaterThanOrEqual(sr)
        expect(win.endJd).toBeLessThanOrEqual(ss)
        expect(win.quality).toBe('avoid')
        expect(win.note).toBeTruthy()
      }
    }
  })

  it('uses the published weekday tables', () => {
    expect(RAHU_KALAM_PART).toEqual([8, 2, 7, 5, 6, 4, 3])
    expect(YAMAGANDA_PART).toEqual([5, 4, 3, 2, 1, 7, 6])
    expect(GULIKA_KALAM_PART).toEqual([7, 6, 5, 4, 3, 2, 1])
  })

  it('centres Abhijit on the midpoint of sunrise and sunset, with none on Wednesday', () => {
    for (const d of days) {
      const { sunriseJd: sr, sunsetJd: ss, weekday } = d.solarDay
      if (weekday === 3) {
        expect(d.abhijit).toBeNull()
        continue
      }
      const a = d.abhijit!
      expect(Math.abs((a.startJd + a.endJd) / 2 - (sr + ss) / 2)).toBeLessThan(1e-9)
      expect(Math.abs(a.endJd - a.startJd - (ss - sr) / 15)).toBeLessThan(1e-9)
      expect(a.quality).toBe('good')
    }
  })

  it('places durmuhurtas on fifteenths of the day or night', () => {
    for (const d of days) {
      const { sunriseJd: sr, sunsetJd: ss, nextSunriseJd: nx, weekday } = d.solarDay
      const t = DURMUHURTA[weekday]
      expect(d.durmuhurta).toHaveLength(t.day.length + t.night.length)
      for (const w of d.durmuhurta) {
        const inDay = w.endJd <= ss
        const [from, to] = inDay ? [sr, ss] : [ss, nx]
        const k = ((w.startJd - from) / (to - from)) * 15
        expect(Math.abs(k - Math.round(k))).toBeLessThan(1e-6)
        expect((inDay ? t.day : t.night)).toContain(Math.round(k) + 1)
        expect(Math.abs(w.endJd - w.startJd - (to - from) / 15)).toBeLessThan(1e-9)
        expect(w.startJd).toBeGreaterThanOrEqual(sr)
        expect(w.endJd).toBeLessThanOrEqual(nx)
      }
      const starts = d.durmuhurta.map((w) => w.startJd)
      expect(starts).toEqual([...starts].sort((a, b) => a - b))
    }
  })

  it('has 16 contiguous choghadiyas from sunrise to the next sunrise', () => {
    for (const d of days) {
      const { sunriseJd: sr, sunsetJd: ss, nextSunriseJd: nx } = d.solarDay
      const c = d.choghadiya
      expect(c).toHaveLength(16)
      expect(c[0].startJd).toBe(sr)
      expect(c[7].endJd).toBe(ss)
      expect(c[8].startJd).toBe(ss)
      expect(c[15].endJd).toBe(nx)
      for (let i = 1; i < 16; i++) expect(c[i].startJd).toBe(c[i - 1].endJd)
      // The 8th day and night segments repeat the first ones.
      expect(c[7].name).toBe(c[0].name)
      expect(c[15].name).toBe(c[8].name)
      for (const w of c) {
        const quality = { Amrit: 'good', Shubh: 'good', Labh: 'good', Char: 'neutral', Udveg: 'avoid', Rog: 'avoid', Kaal: 'avoid' }[w.name]
        expect(w.quality, w.name).toBe(quality)
      }
    }
  })

  it('follows the published day and night choghadiya sequences of every weekday', () => {
    // Drik Panchang's choghadiya tutorial tables, Sunday first; Prokerala's Wednesday matches.
    const DAY = [
      'Udveg Char Labh Amrit Kaal Shubh Rog Udveg', 'Amrit Kaal Shubh Rog Udveg Char Labh Amrit',
      'Rog Udveg Char Labh Amrit Kaal Shubh Rog', 'Labh Amrit Kaal Shubh Rog Udveg Char Labh',
      'Shubh Rog Udveg Char Labh Amrit Kaal Shubh', 'Char Labh Amrit Kaal Shubh Rog Udveg Char',
      'Kaal Shubh Rog Udveg Char Labh Amrit Kaal',
    ]
    const NIGHT = [
      'Shubh Amrit Char Rog Kaal Labh Udveg Shubh', 'Char Rog Kaal Labh Udveg Shubh Amrit Char',
      'Kaal Labh Udveg Shubh Amrit Char Rog Kaal', 'Udveg Shubh Amrit Char Rog Kaal Labh Udveg',
      'Amrit Char Rog Kaal Labh Udveg Shubh Amrit', 'Rog Kaal Labh Udveg Shubh Amrit Char Rog',
      'Labh Udveg Shubh Amrit Char Rog Kaal Labh',
    ]
    for (const d of days) {
      const names = d.choghadiya.map((c) => c.name)
      expect(names.slice(0, 8).join(' ')).toBe(DAY[d.solarDay.weekday])
      expect(names.slice(8).join(' ')).toBe(NIGHT[d.solarDay.weekday])
    }
    expect(CHOGHADIYA.map((c) => c.name)).toEqual(DAY.map((s) => s.split(' ')[0]))
  })

  it('has 24 contiguous horas in Chaldean order starting with the weekday lord', () => {
    for (const d of days) {
      const { sunriseJd: sr, sunsetJd: ss, nextSunriseJd: nx, weekday } = d.solarDay
      const h = d.horas
      expect(h).toHaveLength(24)
      expect(h[0].startJd).toBe(sr)
      expect(h[11].endJd).toBe(ss)
      expect(h[12].startJd).toBe(ss)
      expect(h[23].endJd).toBe(nx)
      expect(h[0].lord).toBe(WEEKDAY_LORDS[weekday])
      for (let i = 1; i < 24; i++) {
        expect(h[i].startJd).toBe(h[i - 1].endJd)
        expect(h[i].lord).toBe(CHALDEAN_ORDER[(CHALDEAN_ORDER.indexOf(h[i - 1].lord) + 1) % 7])
      }
      // The hora after the 24th belongs to the next weekday's lord.
      expect(CHALDEAN_ORDER[(CHALDEAN_ORDER.indexOf(h[23].lord) + 1) % 7]).toBe(WEEKDAY_LORDS[(weekday + 1) % 7])
      expect(Math.abs(h[3].endJd - h[3].startJd - (ss - sr) / 12)).toBeLessThan(1e-9)
      expect(Math.abs(h[20].endJd - h[20].startJd - (nx - ss) / 12)).toBeLessThan(1e-9)
    }
  })
})

describe('dayTimingsAt and activeAt', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('assigns the hours before sunrise to the previous civil date', () => {
    const { lat, lon, zone } = PLACES[0]
    const early = localToJd('2026-10-14', zone, '04:00')
    const t = dayTimingsAt(early, lat, lon, zone)!
    expect(t.date).toBe('2026-10-13')
    expect(t.solarDay.weekday).toBe(2)
    expect(activeAt(t.horas, early)).toBeDefined()
    expect(activeAt(t.choghadiya, early)!.startJd).toBeGreaterThanOrEqual(t.solarDay.sunsetJd)
    const noon = localToJd('2026-10-14', zone, '12:00')
    expect(dayTimingsAt(noon, lat, lon, zone)!.date).toBe('2026-10-14')
    expect(activeAt(t.horas, t.solarDay.nextSunriseJd)).toBeUndefined()
  })

  it('returns null in polar day and polar night', () => {
    expect(dayTimings('2026-06-21', 69.6492, 18.9553, 'Europe/Oslo')).toBeNull()
    expect(dayTimings('2026-12-21', 69.6492, 18.9553, 'Europe/Oslo')).toBeNull()
  })

  it('handles the edges of the midnight sun and very short days at Tromsø', () => {
    const [lat, lon, zone] = [69.6492, 18.9553, 'Europe/Oslo']
    // 17 May: sunset after local midnight, then a 28-minute night before the next sunrise.
    const may = dayTimings('2026-05-17', lat, lon, zone)!
    expect(jdToLocal(may.solarDay.sunsetJd, zone).date).toBe('2026-05-18')
    expect((may.solarDay.nextSunriseJd - may.solarDay.sunsetJd) * 1440).toBeLessThan(40)
    expect(may.choghadiya[15].endJd).toBe(may.solarDay.nextSunriseJd)
    // 18 May has a sunrise but no sunset until late July: no sunrise-to-sunrise day.
    expect(dayTimings('2026-05-18', lat, lon, zone)).toBeNull()
    // 26 Nov: under an hour and a quarter of daylight, still divided proportionally.
    const nov = dayTimings('2026-11-26', lat, lon, zone)!
    expect((nov.solarDay.sunsetJd - nov.solarDay.sunriseJd) * 24).toBeLessThan(1.25)
    expect(nov.rahuKalam.endJd).toBeLessThanOrEqual(nov.solarDay.sunsetJd)
    expect(dayTimings('2026-11-27', lat, lon, zone)).toBeNull()
  })

  it('keeps the weekday of the local civil date across the date line', () => {
    // Kiritimati (UTC+14) and Honolulu (UTC-10) share a meridian but are a calendar day apart.
    const jd = localToJd('2026-10-14', 'Pacific/Kiritimati', '12:00')
    const kiri = dayTimingsAt(jd, 1.87, -157.4, 'Pacific/Kiritimati')!
    const hnl = dayTimingsAt(jd, 21.3069, -157.8583, 'Pacific/Honolulu')!
    expect([kiri.date, kiri.solarDay.weekday]).toEqual(['2026-10-14', 3])
    expect([hnl.date, hnl.solarDay.weekday]).toEqual(['2026-10-13', 2])
    expect(kiri.abhijit).toBeNull()
    expect(hnl.horas[0].lord).toBe('Mars')
    // Samoa skipped 30 Dec 2011: no Vedic day starts on it, the previous one runs to the 31st.
    expect(dayTimings('2011-12-30', -13.83, -171.76, 'Pacific/Apia')).toBeNull()
    const before = dayTimings('2011-12-29', -13.83, -171.76, 'Pacific/Apia')!
    expect(jdToLocal(before.solarDay.nextSunriseJd, 'Pacific/Apia').date).toBe('2011-12-31')
  })
})

// Published timings from Drik Panchang (drikpanchang.com day panchang, choghadiya and hora
// pages, fetched 14 Oct 2026), which shows minutes only. Prokerala's Ujjain pages give the
// same weekday segments except Saturday's durmuhurta (see DURMUHURTA), with a sunrise a few
// minutes later. The New York and Sydney nights contain a clock change (DST ends / starts).
type Ref = {
  place: (typeof PLACES)[number]
  date: string
  rahu: string
  yama: string
  gulika: string
  abhijit: string | null
  dur: string[]
  choghadiya?: string
  horas?: string
}
const [DELHI, BLR, NYC, SYDNEY] = PLACES
const REFERENCE: Ref[] = [
  { place: DELHI, date: '2026-10-11', rahu: '16:29-17:56', yama: '12:08-13:35', gulika: '15:02-16:29', abhijit: '11:44-12:31', dur: ['16:23-17:09'] },
  { place: DELHI, date: '2026-10-12', rahu: '07:47-09:14', yama: '10:41-12:07', gulika: '13:34-15:01', abhijit: '11:44-12:31', dur: ['12:31-13:17', '14:50-15:36'] },
  { place: DELHI, date: '2026-10-13', rahu: '15:00-16:27', yama: '09:14-10:40', gulika: '12:07-13:34', abhijit: '11:44-12:30', dur: ['08:39-09:25', '22:53-23:43'] },
  {
    place: DELHI, date: '2026-10-14', rahu: '12:07-13:33', yama: '07:48-09:14', gulika: '10:40-12:07', abhijit: null, dur: ['11:44-12:30'],
    choghadiya: 'Labh 06:21, Amrit 07:48, Kaal 09:14, Shubh 10:40, Rog 12:07, Udveg 13:33, Char 15:00, Labh 16:26, '
      + 'Udveg 17:53, Shubh 19:26, Amrit 21:00, Char 22:34, Rog 00:07, Kaal 01:41, Labh 03:14, Udveg 04:48',
    horas: 'Mercury 06:21, Moon 07:19, Saturn 08:16, Jupiter 09:14, Mars 10:12, Sun 11:09, Venus 12:07, Mercury 13:05, '
      + 'Moon 14:02, Saturn 15:00, Jupiter 15:57, Mars 16:55, Sun 17:53, Venus 18:55, Mercury 19:58, Moon 21:00, '
      + 'Saturn 22:02, Jupiter 23:05, Mars 00:07, Sun 01:10, Venus 02:12, Mercury 03:14, Moon 04:17, Saturn 05:19',
  },
  { place: DELHI, date: '2026-10-15', rahu: '13:33-14:59', yama: '06:22-07:48', gulika: '09:14-10:40', abhijit: '11:44-12:30', dur: ['10:12-10:58', '14:48-15:34'] },
  { place: DELHI, date: '2026-10-16', rahu: '10:40-12:06', yama: '14:59-16:25', gulika: '07:48-09:14', abhijit: '11:43-12:29', dur: ['08:40-09:26', '12:29-13:15'] },
  { place: DELHI, date: '2026-10-17', rahu: '09:15-10:40', yama: '13:32-14:58', gulika: '06:23-07:49', abhijit: '11:43-12:29', dur: ['06:23-07:09', '07:09-07:54'] },
  {
    place: BLR, date: '2026-10-13', rahu: '15:04-16:33', yama: '09:08-10:37', gulika: '12:06-13:35', abhijit: '11:42-12:30', dur: ['08:32-09:20', '22:53-23:42'],
    choghadiya: 'Rog 06:10, Udveg 07:39, Char 09:08, Labh 10:37, Amrit 12:06, Kaal 13:35, Shubh 15:04, Rog 16:33, '
      + 'Kaal 18:02, Labh 19:33, Udveg 21:04, Shubh 22:35, Amrit 00:06, Char 01:37, Rog 03:08, Kaal 04:39',
    horas: 'Mars 06:10, Sun 07:09, Venus 08:08, Mercury 09:08, Moon 10:07, Saturn 11:06, Jupiter 12:06, Mars 13:05, '
      + 'Sun 14:04, Venus 15:04, Mercury 16:03, Moon 17:03, Saturn 18:02, Jupiter 19:03, Mars 20:03, Sun 21:04, '
      + 'Venus 22:05, Mercury 23:05, Moon 00:06, Saturn 01:06, Jupiter 02:07, Mars 03:08, Sun 04:08, Venus 05:09',
  },
  {
    place: BLR, date: '2026-10-18', rahu: '16:31-17:59', yama: '12:05-13:33', gulika: '15:02-16:31', abhijit: '11:41-12:28', dur: ['16:25-17:12'],
    horas: 'Sun 06:10, Venus 07:09, Mercury 08:08, Moon 09:07, Saturn 10:07, Jupiter 11:06, Mars 12:05, Sun 13:04, '
      + 'Venus 14:03, Mercury 15:02, Moon 16:01, Saturn 17:00, Jupiter 17:59, Mars 19:00, Sun 20:01, Venus 21:02, '
      + 'Mercury 22:03, Moon 23:04, Saturn 00:05, Jupiter 01:06, Mars 02:07, Sun 03:08, Venus 04:08, Mercury 05:09',
  },
  {
    place: NYC, date: '2026-10-31', rahu: '10:02-11:21', yama: '13:58-15:16', gulika: '07:25-08:44', abhijit: '12:18-13:00', dur: ['07:25-08:07', '08:07-08:49'],
    choghadiya: 'Kaal 07:25, Shubh 08:44, Rog 10:02, Udveg 11:21, Char 12:39, Labh 13:58, Amrit 15:16, Kaal 16:35, '
      + 'Labh 17:53, Udveg 19:35, Shubh 21:17, Amrit 22:58, Char 00:40, Rog 01:22, Kaal 03:03, Labh 04:45',
    horas: 'Saturn 07:25, Jupiter 08:18, Mars 09:10, Sun 10:02, Venus 10:55, Mercury 11:47, Moon 12:39, Saturn 13:32, '
      + 'Jupiter 14:24, Mars 15:16, Sun 16:09, Venus 17:01, Mercury 17:53, Moon 19:01, Saturn 20:09, Jupiter 21:17, '
      + 'Mars 22:24, Sun 23:32, Venus 00:40, Mercury 01:48, Moon 01:55, Saturn 03:03, Jupiter 04:11, Mars 05:19',
  },
  {
    place: NYC, date: '2026-11-01', rahu: '15:34-16:52', yama: '11:39-12:58', gulika: '14:16-15:34', abhijit: '11:18-12:00', dur: ['15:29-16:10'],
    choghadiya: 'Udveg 06:26, Char 07:45, Labh 09:03, Amrit 10:21, Kaal 11:39, Shubh 12:58, Rog 14:16, Udveg 15:34, '
      + 'Shubh 16:52, Amrit 18:34, Char 20:16, Rog 21:58, Kaal 23:40, Labh 01:22, Udveg 03:04, Shubh 04:46',
  },
  {
    place: SYDNEY, date: '2026-10-03', rahu: '08:37-10:11', yama: '13:18-14:52', gulika: '05:30-07:04', abhijit: '11:20-12:09', dur: ['05:30-06:20', '06:20-07:10'],
    choghadiya: 'Kaal 05:30, Shubh 07:04, Rog 08:37, Udveg 10:11, Char 11:44, Labh 13:18, Amrit 14:52, Kaal 16:25, '
      + 'Labh 17:59, Udveg 19:25, Shubh 20:51, Amrit 22:18, Char 23:44, Rog 01:10, Kaal 03:36, Labh 05:02',
  },
]

/**
 * Published times are rounded to the minute (up to 0.5 min); our sunrise follows the toolkit
 * (upper limb, standard refraction) and agrees with Drik Panchang to within a few seconds.
 */
const TOLERANCE_MINUTES = 0.6

describe('reference panchang (Drik Panchang: New Delhi, Bengaluru, New York, Sydney; October 2026)', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  /** Signed minutes between the wall-clock time of `jd` in `zone` and a published "HH:MM" (DST-safe). */
  function minutesOff(jd: number, zone: string, hhmm: string): number {
    const p = jdToLocal(jd, zone)
    const [h, m] = hhmm.split(':').map(Number)
    return ((p.hour * 60 + p.minute + p.second / 60 - (h * 60 + m) + 720 + 1440) % 1440) - 720
  }

  function expectSpan(label: string, w: { startJd: number; endJd: number }, span: string, zone: string) {
    const [a, b] = span.split('-')
    expect(Math.abs(minutesOff(w.startJd, zone, a)), `${label} start`).toBeLessThanOrEqual(TOLERANCE_MINUTES)
    expect(Math.abs(minutesOff(w.endJd, zone, b)), `${label} end`).toBeLessThanOrEqual(TOLERANCE_MINUTES)
  }

  it.each(REFERENCE.map((r) => [`${r.place.name} ${r.date}`, r] as const))('%s', (_, r) => {
    const { lat, lon, zone } = r.place
    const t = dayTimings(r.date, lat, lon, zone)!
    expectSpan('rahu', t.rahuKalam, r.rahu, zone)
    expectSpan('yama', t.yamaganda, r.yama, zone)
    expectSpan('gulika', t.gulikaKalam, r.gulika, zone)
    if (r.abhijit === null) expect(t.abhijit).toBeNull()
    else expectSpan('abhijit', t.abhijit!, r.abhijit, zone)
    expect(t.durmuhurta).toHaveLength(r.dur.length)
    r.dur.forEach((span, i) => expectSpan(`dur ${i}`, t.durmuhurta[i], span, zone))
    if (r.choghadiya) {
      const rows = r.choghadiya.split(', ').map((x) => x.split(' '))
      expect(t.choghadiya.map((c) => c.name)).toEqual(rows.map(([name]) => name))
      rows.forEach(([, hhmm], i) => expect(Math.abs(minutesOff(t.choghadiya[i].startJd, zone, hhmm)), `choghadiya ${i}`).toBeLessThanOrEqual(TOLERANCE_MINUTES))
    }
    if (r.horas) {
      const rows = r.horas.split(', ').map((x) => x.split(' '))
      expect(t.horas.map((h) => h.lord)).toEqual(rows.map(([lord]) => lord))
      rows.forEach(([, hhmm], i) => expect(Math.abs(minutesOff(t.horas[i].startJd, zone, hhmm)), `hora ${i}`).toBeLessThanOrEqual(TOLERANCE_MINUTES))
    }
    // Night-time windows end after local midnight; the local date of the last one is the next day.
    expect(jdToLocal(t.solarDay.nextSunriseJd - SECOND, zone).date).toBe(addDays(r.date, 1))
  })
})
