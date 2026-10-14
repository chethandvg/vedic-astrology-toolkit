// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import times from './fixtures/time.json'
import {
  addDays, addMonths, birthToJd, browserTimeZone, daysInMonth, epochMsToJd, fixedOffsetMinutes, formatJd, isValidTimeZone,
  jdToEpochMs, jdToLocal, localToJd, localToUtc, offsetMinutesAt, todayIn, weekdayOf,
} from '@/engine/time'
import { loadSwe } from './helpers/swe'

const MS = 1 / 86400e3
// localToJd treats UTC as UT1 (pure arithmetic); birthToJd uses the exact UT1 like the toolkit. They differ by |UT1-UTC| < 0.9 s.
const UT1_UTC = 1 / 86400
const minutes = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i)
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const lmt = (times as { cases: { id: string; jd?: number }[] }).cases.find((c) => c.id === 'lmt_offset')!

beforeAll(async () => {
  await loadSwe()
})

describe('fixed UTC offsets', () => {
  it('parses offsets with seconds, prefixes and compact forms', () => {
    expect(fixedOffsetMinutes('+05:10:20')).toBeCloseTo(310 + 20 / 60, 12)
    expect(fixedOffsetMinutes('-03:25:52')).toBeCloseTo(-(205 + 52 / 60), 12)
    expect(fixedOffsetMinutes('UTC-04:00')).toBe(-240)
    expect(fixedOffsetMinutes('GMT+0530')).toBe(330)
    expect(fixedOffsetMinutes('+0545')).toBe(345)
    expect(fixedOffsetMinutes('UTC+5:30')).toBe(330)
    expect(fixedOffsetMinutes(' +05:30 ')).toBe(330)
    expect(fixedOffsetMinutes('-00:30')).toBe(-30)
    for (const z of ['Z', 'z', 'UTC', 'GMT', 'utc']) expect(fixedOffsetMinutes(z), z).toBe(0)
  })

  it('leaves zone names to the time-zone database', () => {
    for (const z of ['Asia/Kolkata', 'Etc/GMT-5', 'EST', 'America/Argentina/Buenos_Aires']) expect(fixedOffsetMinutes(z), z).toBeNull()
  })

  it('rejects impossible offsets', () => {
    for (const z of ['+24:00', '+05:60', '+05:30:60']) expect(() => fixedOffsetMinutes(z), z).toThrow(/Invalid UTC offset/)
  })

  it('validates zones', () => {
    for (const z of ['Asia/Kolkata', 'asia/kolkata', '+05:10:20', 'UTC-04:00', 'Z', 'Pacific/Kiritimati']) expect(isValidTimeZone(z), z).toBe(true)
    for (const z of ['', 'Mars/Olympus', '+24:00', 'UTC+5', 'IST+1']) expect(isValidTimeZone(z), z).toBe(false)
  })

  it('converts local mean time with seconds like the toolkit', () => {
    const r = localToUtc({ date: '1901-02-03', time: '06:15:00', timeZone: '+05:10:20' })
    expect(r.offsetMinutes).toBeCloseTo(310 + 20 / 60, 12)
    expect(r.epochMs).toBeCloseTo(Date.UTC(1901, 1, 3, 1, 4, 40), 6)
    expect(Math.abs(birthToJd({ date: '1901-02-03', time: '06:15:00', timeZone: '+05:10:20' }).jd - lmt.jd!)).toBeLessThan(MS)
  })

  it('treats Z, UTC and +00:00 alike and ignores fold', () => {
    const z = birthToJd({ date: '2000-01-01', time: '12:00', timeZone: 'Z' })
    expect(z.utc).toBe('2000-01-01T12:00:00.000Z')
    expect(birthToJd({ date: '2000-01-01', time: '12:00', timeZone: 'UTC', fold: 1 }).jd).toBe(z.jd)
    expect(birthToJd({ date: '2000-01-01', time: '12:00', timeZone: '+00:00' }).jd).toBe(z.jd)
    // J2000.0 is JD 2451545.0 in TT; UT1 then differed from UTC by under a second.
    expect(Math.abs(z.jd - 2451545)).toBeLessThan(1 / 86400)
    expect(birthToJd({ date: '2000-04-28', time: '05:50', timeZone: 'UTC-04:00' }).utc).toBe('2000-04-28T09:50:00.000Z')
  })
})

describe('daylight-saving gaps and overlaps', () => {
  const ny = { timeZone: 'America/New_York' }

  it('rejects wall times skipped by a clock change', () => {
    for (const time of ['02:00', '02:30', '02:59:59']) {
      expect(() => localToUtc({ ...ny, date: '2021-03-14', time }), time).toThrow(/Nonexistent/)
    }
    expect(() => localToUtc({ date: '2021-03-28', time: '01:30', timeZone: 'Europe/London' })).toThrow(/Nonexistent/)
    expect(localToUtc({ ...ny, date: '2021-03-14', time: '01:59:59' }).offsetMinutes).toBe(-300)
    expect(localToUtc({ ...ny, date: '2021-03-14', time: '03:00' }).offsetMinutes).toBe(-240)
    // A fixed offset has no gaps.
    expect(localToUtc({ date: '2021-03-14', time: '02:30', timeZone: '-05:00' }).offsetMinutes).toBe(-300)
  })

  it('requires fold for a repeated wall time and honours it', () => {
    expect(() => localToUtc({ ...ny, date: '2021-11-07', time: '01:30' })).toThrow(/Ambiguous/)
    const first = birthToJd({ ...ny, date: '2021-11-07', time: '01:30', fold: 0 })
    const second = birthToJd({ ...ny, date: '2021-11-07', time: '01:30', fold: 1 })
    expect([first.offsetMinutes, second.offsetMinutes]).toEqual([-240, -300])
    expect([first.utc, second.utc]).toEqual(['2021-11-07T05:30:00.000Z', '2021-11-07T06:30:00.000Z'])
    expect(Math.abs(second.jd - first.jd - 1 / 24)).toBeLessThan(MS)
    expect(localToUtc({ ...ny, date: '2021-11-07', time: '00:59' }).offsetMinutes).toBe(-240)
    expect(localToUtc({ ...ny, date: '2021-11-07', time: '02:00' }).offsetMinutes).toBe(-300)
  })

  it('ignores fold when the wall time is not repeated', () => {
    const plain = localToUtc({ ...ny, date: '2021-07-01', time: '12:00' })
    expect(localToUtc({ ...ny, date: '2021-07-01', time: '12:00', fold: 1 })).toEqual(plain)
  })

  it('handles southern-hemisphere and half-hour clock changes', () => {
    const sydney = { date: '2021-04-04', time: '02:30', timeZone: 'Australia/Sydney' }
    expect(() => localToUtc(sydney)).toThrow(/Ambiguous/)
    expect([0, 1].map((fold) => localToUtc({ ...sydney, fold: fold as 0 | 1 }).offsetMinutes)).toEqual([660, 600])
    const lordHowe = { date: '2021-04-04', time: '01:45', timeZone: 'Australia/Lord_Howe' }
    expect([0, 1].map((fold) => localToUtc({ ...lordHowe, fold: fold as 0 | 1 }).offsetMinutes)).toEqual([660, 630])
    expect(() => localToUtc({ date: '2021-10-03', time: '02:15', timeZone: 'Australia/Lord_Howe' })).toThrow(/Nonexistent/)
  })

  it('uses historical offsets such as Indian war time', () => {
    expect(localToUtc({ date: '1943-06-15', time: '09:00', timeZone: 'Asia/Kolkata' }).offsetMinutes).toBe(390)
    expect(localToUtc({ date: '1900-06-15', time: '09:00', timeZone: 'Asia/Kolkata' }).offsetMinutes).toBeCloseTo(321 + 10 / 60, 9)
  })
})

describe('date-line zones', () => {
  it('rejects the day Kiritimati skipped and joins the days either side', () => {
    const zone = 'Pacific/Kiritimati'
    for (const time of ['00:00', '12:00', '23:59']) expect(() => localToUtc({ date: '1994-12-31', time, timeZone: zone }), time).toThrow(/Nonexistent/)
    const before = birthToJd({ date: '1994-12-30', time: '23:59', timeZone: zone })
    const after = birthToJd({ date: '1995-01-01', time: '00:00', timeZone: zone })
    expect([before.offsetMinutes, after.offsetMinutes]).toEqual([-600, 840])
    expect(Math.abs(after.jd - before.jd - 1 / 1440)).toBeLessThan(MS)
    const p = jdToLocal(after.jd + 30 / 86400, zone)
    expect([p.date, p.time, p.weekday, p.offsetMinutes]).toEqual(['1995-01-01', '00:00', 0, 840])
    expect(formatJd(before.jd + 30 / 86400, zone, 'weekday-date')).toBe('Fri 30 Dec')
  })

  it('rejects the day Samoa skipped in 2011', () => {
    expect(() => localToUtc({ date: '2011-12-30', time: '12:00', timeZone: 'Pacific/Apia' })).toThrow(/Nonexistent/)
    const before = birthToJd({ date: '2011-12-29', time: '23:59', timeZone: 'Pacific/Apia' })
    const after = birthToJd({ date: '2011-12-31', time: '00:00', timeZone: 'Pacific/Apia' })
    expect(Math.abs(after.jd - before.jd - 1 / 1440)).toBeLessThan(MS)
  })
})

describe('JD UT1 <-> UTC', () => {
  it('round-trips epoch milliseconds to well under a millisecond', () => {
    for (let year = 1900; year <= 2100; year += 7) {
      for (const ms of [Date.UTC(year, 0, 1), Date.UTC(year, 5, 30, 23, 59, 59, 999), Date.UTC(year, 9, 14, 7, 42, 13, 250) + 0.5]) {
        expect(Math.abs(jdToEpochMs(epochMsToJd(ms)) - ms), new Date(ms).toISOString()).toBeLessThan(0.05)
      }
    }
  })

  it('reports zone offsets at instants either side of a change', () => {
    expect(offsetMinutesAt('America/New_York', Date.UTC(2021, 2, 14, 6, 59, 59, 999))).toBe(-300)
    expect(offsetMinutesAt('America/New_York', Date.UTC(2021, 2, 14, 7))).toBe(-240)
    expect(offsetMinutesAt('+05:10:20', 0)).toBeCloseTo(310 + 20 / 60, 12)
  })
})

describe('jdToLocal and formatJd across clock changes', () => {
  const zone = 'America/New_York'
  // Half a minute past each wall minute keeps these checks clear of the rounding issue tested below.
  const roundTrip = (date: string, minute: number) => jdToLocal(localToJd(date, zone, `${hhmm(minute)}:30`), zone)

  it('round-trips every wall minute of the spring-forward day', () => {
    for (const m of minutes(0, 1440)) {
      const p = roundTrip('2021-03-14', m)
      if (m >= 120 && m < 180) {
        // Skipped times resolve forward by the length of the gap.
        expect([p.date, p.time, p.offsetMinutes], hhmm(m)).toEqual(['2021-03-14', hhmm(m + 60), -240])
      } else {
        expect([p.date, p.time, p.offsetMinutes], hhmm(m)).toEqual(['2021-03-14', hhmm(m), m < 120 ? -300 : -240])
      }
    }
  })

  it('round-trips every wall minute of the fall-back day, the repeated hour to its first occurrence', () => {
    for (const m of minutes(0, 1440)) {
      const p = roundTrip('2021-11-07', m)
      expect([p.date, p.time, p.offsetMinutes], hhmm(m)).toEqual(['2021-11-07', hhmm(m), m < 120 ? -240 : -300])
    }
  })

  it('shows the second occurrence of a repeated time with the later offset', () => {
    const { jd } = birthToJd({ date: '2021-11-07', time: '01:30:30', timeZone: zone, fold: 1 })
    const p = jdToLocal(jd, zone)
    expect([p.time, p.offsetMinutes, p.weekday]).toEqual(['01:30', -300, 0])
  })

  it('formats in each style', () => {
    const jd = localToJd('2021-11-07', zone, '13:05:30')
    expect(formatJd(jd, zone, 'time')).toBe('13:05')
    expect(formatJd(jd, zone, 'date')).toBe('7 Nov 2021')
    expect(formatJd(jd, zone, 'datetime')).toBe('7 Nov 2021, 13:05')
    expect(formatJd(jd, zone)).toBe('7 Nov 2021, 13:05')
    expect(formatJd(jd, zone, 'weekday-date')).toBe('Sun 7 Nov')
    expect(formatJd(jd, 'Asia/Kolkata', 'datetime')).toBe('7 Nov 2021, 23:35')
  })

  it('round-trips fixed offsets with seconds', () => {
    const { jd } = birthToJd({ date: '1901-02-03', time: '06:15:30', timeZone: '+05:10:20' })
    const p = jdToLocal(jd, '+05:10:20')
    expect([p.date, p.time, p.second]).toEqual(['1901-02-03', '06:15', 30])
  })

  // FOUNDATION BUG (time.ts jdToLocal): JD doubles carry ~0.05 ms of noise, and
  // `new Date(epochMs + offset)` truncates it, so an exact wall time can come back
  // as hh:mm-1:59.99. Local midnight then lands on the previous date (New York in
  // summer, Sydney in summer). Fix: round to the millisecond, e.g.
  // `const epochMs = Math.round(jdToEpochMs(jd))` in jdToLocal.
  it('round-trips exact wall-clock minutes and local midnights', () => {
    for (const [date, zone2] of [['2026-03-09', 'America/New_York'], ['2026-01-01', 'Australia/Sydney'], ['2026-07-01', 'America/New_York']]) {
      expect(jdToLocal(localToJd(date, zone2), zone2).date, `${date} ${zone2}`).toBe(date)
    }
    for (const m of minutes(0, 60)) {
      expect(jdToLocal(localToJd('2021-03-14', 'UTC', hhmm(m)), 'UTC').time, hhmm(m)).toBe(hhmm(m))
    }
  })
})

describe('localToJd', () => {
  it('defaults to local midnight', () => {
    expect(localToJd('2021-07-01', 'Asia/Kolkata')).toBe(localToJd('2021-07-01', 'Asia/Kolkata', '00:00'))
    expect(Math.abs(localToJd('2021-07-01', 'Asia/Kolkata') - birthToJd({ date: '2021-06-30', time: '18:30', timeZone: 'UTC' }).jd)).toBeLessThan(UT1_UTC)
  })

  it('resolves gaps forward and overlaps to the first occurrence', () => {
    const zone = 'America/New_York'
    expect(Math.abs(localToJd('2021-03-14', zone, '02:30') - birthToJd({ date: '2021-03-14', time: '03:30', timeZone: zone }).jd)).toBeLessThan(UT1_UTC)
    expect(Math.abs(localToJd('2021-11-07', zone, '01:30') - birthToJd({ date: '2021-11-07', time: '01:30', timeZone: zone, fold: 0 }).jd)).toBeLessThan(UT1_UTC)
    expect(Math.abs(localToJd('1994-12-31', 'Pacific/Kiritimati') - localToJd('1995-01-01', 'Pacific/Kiritimati'))).toBeLessThan(MS)
  })

  it('agrees with birthToJd for fixed offsets', () => {
    expect(localToJd('1901-02-03', '+05:10:20', '06:15')).toBe(birthToJd({ date: '1901-02-03', time: '06:15', timeZone: '+05:10:20' }).jd)
  })
})

describe('civil-date helpers', () => {
  it('adds days and months on the calendar', () => {
    expect(addDays('2024-02-28', 1)).toBe('2024-02-29')
    expect(addDays('2023-12-31', 1)).toBe('2024-01-01')
    expect(addDays('2024-03-01', -1)).toBe('2024-02-29')
    expect(addDays('2021-03-13', 1)).toBe('2021-03-14')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2023-01-31', 1)).toBe('2023-02-28')
    expect(addMonths('2024-11-15', 3)).toBe('2025-02-15')
  })

  it('gives weekdays from Sunday = 0 and month lengths', () => {
    expect(weekdayOf('2026-10-14')).toBe(3)
    expect(weekdayOf('1995-01-01')).toBe(0)
    expect(weekdayOf('2000-01-01')).toBe(6)
    expect([daysInMonth(2024, 2), daysInMonth(2100, 2), daysInMonth(2000, 2), daysInMonth(2026, 4)]).toEqual([29, 28, 29, 30])
  })

  it('reads today in any zone', () => {
    const iso = /^\d{4}-\d{2}-\d{2}$/
    for (const z of ['Asia/Kolkata', '+14:00', '-12:00', 'UTC']) expect(todayIn(z), z).toMatch(iso)
    const ahead = Date.parse(todayIn('+14:00')), behind = Date.parse(todayIn('-12:00'))
    expect([1, 2]).toContain((ahead - behind) / 86400e3)
    expect(isValidTimeZone(browserTimeZone())).toBe(true)
  })
})
