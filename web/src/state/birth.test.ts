// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import { checkBirth, formatOffset, lmtOffset, parseCoordinate, typedFixedOffset, type BirthDraft } from './birth'
import { birthFileName, parseToolkitBirth, toToolkitBirth } from './birthJson'

const mysuru: BirthDraft = {
  name: 'Test', date: '1990-04-28', time: '05:50', timeZone: 'Asia/Kolkata', latitude: 12.2979, longitude: 76.6393, place: 'Mysuru, Karnataka, India',
}

describe('checkBirth', () => {
  it('accepts a complete draft and resolves the offset at birth', () => {
    const r = checkBirth(mysuru)
    expect(r.errors).toEqual({})
    expect(r.offsetMinutes).toBe(330)
    expect(r.utc).toBe('1990-04-28T00:20:00.000Z')
    expect(r.birth).toMatchObject({ name: 'Test', timeZone: 'Asia/Kolkata', place: 'Mysuru, Karnataka, India' })
    expect(r.birth?.fold).toBeUndefined()
  })

  it('reports each missing field', () => {
    const r = checkBirth({ name: ' ', date: '', time: '', timeZone: '', latitude: null, longitude: null })
    expect(Object.keys(r.errors).sort()).toEqual(['date', 'name', 'place', 'time'])
    expect(r.birth).toBeNull()
  })

  it('rejects impossible dates, times and coordinates', () => {
    const r = checkBirth({ ...mysuru, date: '1990-02-30', time: '24:10', latitude: 90, longitude: 181, timeZone: 'Mars/Olympus' })
    expect(Object.keys(r.errors).sort()).toEqual(['date', 'latitude', 'longitude', 'time', 'timeZone'])
    expect(checkBirth({ ...mysuru, date: '1700-01-01' }).errors.date).toMatch(/between 1800/)
  })

  it('rejects a wall time skipped by a spring-forward change', () => {
    const r = checkBirth({ ...mysuru, date: '2021-03-14', time: '02:30', timeZone: 'America/New_York', latitude: 40.71, longitude: -74.01 })
    expect(r.errors.time).toMatch(/never happened/)
  })

  it('asks for a fold choice when a wall time repeats, then honours it', () => {
    const base = { ...mysuru, date: '2021-11-07', time: '01:30', timeZone: 'America/New_York', latitude: 40.71, longitude: -74.01 }
    const unresolved = checkBirth(base)
    expect(unresolved.errors.fold).toBeTruthy()
    expect(unresolved.foldOptions).toMatchObject([{ fold: 0, offsetMinutes: -240 }, { fold: 1, offsetMinutes: -300 }])
    const second = checkBirth({ ...base, fold: 1 })
    expect(second.errors).toEqual({})
    expect(second.offsetMinutes).toBe(-300)
    expect(second.birth?.fold).toBe(1)
  })

  it('drops a fold that does not matter and notes pre-1970 zones', () => {
    const r = checkBirth({ ...mysuru, date: '1943-06-01', fold: 1 })
    expect(r.offsetMinutes).toBe(390) // Indian war time, UTC+06:30
    expect(r.birth?.fold).toBeUndefined()
    expect(r.notes.join(' ')).toMatch(/before 1970/)
    expect(checkBirth({ ...mysuru, date: '1943-06-01', timeZone: '+05:30' }).notes).toEqual([])
  })

  it('accepts fixed and local mean time offsets', () => {
    expect(checkBirth({ ...mysuru, timeZone: lmtOffset(76.6393) }).offsetMinutes).toBeCloseTo(306 + 33 / 60, 6)
    expect(checkBirth({ ...mysuru, date: '1890-06-01', timeZone: '+05:10:20' }).utc).toBe('1890-06-01T00:39:40.000Z')
  })

  it('gives each reading of a repeated hour its UTC instant', () => {
    const r = checkBirth({ ...mysuru, date: '2021-11-07', time: '01:30', timeZone: 'America/New_York', latitude: 40.71, longitude: -74.01 })
    expect(r.foldOptions?.map((o) => o.utc)).toEqual(['2021-11-07T05:30:00.000Z', '2021-11-07T06:30:00.000Z'])
  })

  it('treats an out-of-range offset being typed as an unknown zone, not a crash', () => {
    for (const zone of ['+05:60', '+25:00', '+0599']) {
      expect(typedFixedOffset(zone)).toBeNull()
      const r = checkBirth({ ...mysuru, date: '1950-01-01', timeZone: zone })
      expect(r.errors.timeZone, zone).toMatch(/Unknown time zone/)
      expect(r.notes).toEqual([])
    }
    expect(typedFixedOffset('+05:10:20')).toBeCloseTo(310 + 20 / 60, 9)
  })

  it('saves zone names in IANA spelling whatever the case typed', () => {
    expect(checkBirth({ ...mysuru, timeZone: ' asia/kolkata ' }).birth?.timeZone).toBe('Asia/Kolkata')
    expect(checkBirth({ ...mysuru, timeZone: '+05:30' }).birth?.timeZone).toBe('+05:30')
  })

  it('explains unreadable coordinates separately from out-of-range ones', () => {
    expect(checkBirth({ ...mysuru, latitude: NaN }).errors.latitude).toMatch(/decimal degrees/)
    expect(checkBirth({ ...mysuru, longitude: 200 }).errors.longitude).toMatch(/between -180 and 180/)
  })
})

describe('parseCoordinate', () => {
  it('reads signed decimals, decimal commas and hemisphere letters', () => {
    expect(parseCoordinate('  ', 'latitude')).toBeNull()
    expect(parseCoordinate('12.2979', 'latitude')).toBe(12.2979)
    expect(parseCoordinate('-74.006', 'longitude')).toBe(-74.006)
    expect(parseCoordinate('12,2979', 'latitude')).toBe(12.2979)
    expect(parseCoordinate('33.87 S', 'latitude')).toBe(-33.87)
    expect(parseCoordinate('74.006W', 'longitude')).toBe(-74.006)
    expect(parseCoordinate('76.64° e', 'longitude')).toBe(76.64)
  })

  it('rejects text it cannot read unambiguously', () => {
    for (const [text, axis] of [['12.3 E', 'latitude'], ['74 N', 'longitude'], ['-33 S', 'latitude'], ['12°58′', 'latitude'], ['abc', 'latitude']] as const) {
      expect(parseCoordinate(text, axis), text).toBeNaN()
    }
  })
})

describe('offset formatting', () => {
  it('formats offsets and local mean time', () => {
    expect(formatOffset(330)).toBe('UTC+05:30')
    expect(formatOffset(-240)).toBe('UTC-04:00')
    expect(formatOffset(321 + 10 / 60)).toBe('UTC+05:21:10')
    expect(lmtOffset(77.5937)).toBe('+05:10:22')
    expect(lmtOffset(-74.006)).toBe('-04:56:01')
  })
})

describe('toolkit birth JSON', () => {
  it('round-trips an IANA-zone profile', () => {
    const birth = checkBirth(mysuru).birth!
    const json = toToolkitBirth(birth, { ayanamsa: 'lahiri', node: 'mean', yearModel: 'solar' })
    expect(json).toEqual({
      label: 'Test', datetime: '1990-04-28T05:50:00', timezone: 'Asia/Kolkata', latitude: 12.2979, longitude: 76.6393,
      place: 'Mysuru, Karnataka, India', settings: { ayanamsa: 'lahiri', node: 'mean', engine: 'moshier' },
    })
    expect(parseToolkitBirth(JSON.parse(JSON.stringify(json)))).toEqual({ ...birth, time: '05:50:00' })
  })

  it('writes fixed offsets into the datetime and omits unsupported settings', () => {
    const json = toToolkitBirth({ date: '1967-03-08', time: '17:40', timeZone: 'UTC+05:30', latitude: 26.3, longitude: 73.0667 },
      { ayanamsa: 'true_pushya', node: 'true', yearModel: 'savana' })
    expect(json).toEqual({ label: 'Birth chart', datetime: '1967-03-08T17:40:00+05:30', latitude: 26.3, longitude: 73.0667 })
    expect(toToolkitBirth({ ...checkBirth(mysuru).birth!, timeZone: '+05:06:34' }).datetime).toBe('1990-04-28T05:50:00+05:06:34')
  })

  it('reads the book example and offset-only datetimes', () => {
    expect(parseToolkitBirth({ label: 'Book Example 118', datetime: '1967-03-08T17:40:00', timezone: 'UTC+05:30', latitude: 26.3, longitude: 73.06666666666666 }))
      .toEqual({ name: 'Book Example 118', date: '1967-03-08', time: '17:40:00', timeZone: 'UTC+05:30', latitude: 26.3, longitude: 73.06666666666666 })
    expect(parseToolkitBirth({ datetime: '2000-01-01T12:00:00Z', latitude: '51.5', longitude: '-0.12' }))
      .toMatchObject({ timeZone: 'UTC', latitude: 51.5, longitude: -0.12 })
  })

  it('uses the written offset to settle a repeated wall time', () => {
    const r = parseToolkitBirth({ datetime: '2021-11-07T01:30:00-05:00', timezone: 'America/New_York', latitude: 40.7, longitude: -74 })
    expect(r.fold).toBe(1)
  })

  it('rejects invalid files with readable messages', () => {
    expect(() => parseToolkitBirth([])).toThrow(/JSON object/)
    expect(() => parseToolkitBirth({ datetime: '2000-01-01T12:00:00', latitude: 1, longitude: 2 })).toThrow(/timezone/)
    expect(() => parseToolkitBirth({ datetime: '2000-01-01T12:00:00+05:30', timezone: 'Europe/London', latitude: 1, longitude: 2 })).toThrow(/disagrees/)
    expect(() => parseToolkitBirth({ datetime: '2021-11-07T01:30:00', timezone: 'America/New_York', latitude: 1, longitude: 2 })).toThrow(/Ambiguous/)
    expect(() => parseToolkitBirth({ datetime: '2021-03-14T02:30:00', timezone: 'America/New_York', latitude: 1, longitude: 2 })).toThrow(/Nonexistent/)
    expect(() => parseToolkitBirth({ datetime: '2000-01-01T12:00:00', timezone: 'UTC', latitude: 95, longitude: 2 })).toThrow(/Latitude/)
  })

  it('names export files after the profile', () => {
    expect(birthFileName({ ...mysuru, name: 'Ravi Kumār' } as never)).toBe('ravi-kumar.birth.json')
  })
})
