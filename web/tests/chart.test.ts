// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import fixtures from './fixtures/charts.json'
import { ENGINE_VERSION, engineApi } from '@/engine/api'
import { BirthInputError, castChart, formatUtcOffset, POLAR_WARNING, validateBirthInput } from '@/engine/chart'
import { SIGN_NAMES, VARGAS } from '@/engine/core'
import { ascendant } from '@/engine/ephem'
import { jdToLocal } from '@/engine/time'
import { BODIES, PRESETS, type BirthInput, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

type PyNakshatra = { index: number; pada: number; lord: string; elapsed_fraction: number }
type PyPosition = { longitude: number; speed: number; retrograde: boolean; nakshatra: PyNakshatra }
type PySunrise = { sunrise_jd: number; sunset_jd: number; next_sunrise_jd: number; weekday_sunday0: number; is_day: boolean }
type Fixture = {
  id: string
  input: { datetime: string; timezone?: string; fold?: 0 | 1; latitude: number; longitude: number }
  settings: { ayanamsa: Settings['ayanamsa']; node: Settings['node'] }
  jd: number
  local_datetime: string
  ayanamsa_degrees: number
  positions: Record<string, PyPosition>
  panchanga: { tithi: number; paksha: string; tithi_in_paksha: number; elongation: number; yoga_index: number; yoga: string; karana: string }
  vargas: Record<string, Record<string, number>>
  sunrise_context: PySunrise | null
  nakshatra: PyNakshatra
}

const FIXTURES = fixtures as unknown as { meta: { count: number }; charts: Fixture[] }
const CASES = FIXTURES.charts

/** Toolkit spec ("datetime" with optional ISO offset, "timezone") to the web BirthInput. */
function toBirth(f: Fixture): BirthInput {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(.*)$/.exec(f.input.datetime)!
  return { date: m[1], time: m[2], timeZone: m[3] || f.input.timezone!, fold: f.input.fold, latitude: f.input.latitude, longitude: f.input.longitude }
}

/** Offset east of UTC in minutes from an ISO suffix like "+05:30" or "+05:10:20". */
function isoOffsetMinutes(iso: string): number {
  const m = /([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(iso)!
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3]) + Number(m[4] ?? 0) / 60)
}

const BASE: BirthInput = { date: '1990-06-15', time: '10:30', timeZone: 'Asia/Kolkata', latitude: 12.97, longitude: 77.59 }
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
const issueFields = (input: Partial<BirthInput>) => validateBirthInput({ ...BASE, ...input }).map((i) => i.field)

describe('castChart parity with analysis.chart', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('covers every generated fixture', () => {
    expect(CASES).toHaveLength(FIXTURES.meta.count)
  })

  it.each(CASES.map((f) => [f.id, f] as const))('%s', (_, f) => {
    const chart = castChart(toBirth(f), { ...f.settings, yearModel: 'solar' })
    expect(Math.abs(chart.jd - f.jd) * 86400e3).toBeLessThan(1)
    expect(chart.utcOffsetMinutes).toBeCloseTo(isoOffsetMinutes(f.local_datetime), 9)
    expect(Math.abs(chart.ayanamsaDegrees - f.ayanamsa_degrees)).toBeLessThan(1e-9)

    for (const b of BODIES) {
      const py = f.positions[b]
      const web = chart.positions[b]
      expect(Math.abs(web.longitude - py.longitude), b).toBeLessThan(1e-8)
      // Speeds come from Swiss Ephemeris' numerical differentiation; wasm and native builds differ by ~1e-8 deg/day.
      expect(Math.abs(web.speed - py.speed), b).toBeLessThan(1e-7)
      expect(web.retrograde, b).toBe(py.retrograde)
      expect(web.sign, b).toBe(Math.floor(py.longitude / 30))
      expect(Math.abs(web.degree - (py.longitude % 30)), b).toBeLessThan(1e-8)
      expect([web.nakshatra.index, web.nakshatra.pada, web.nakshatra.lord], b).toEqual([py.nakshatra.index, py.nakshatra.pada, py.nakshatra.lord])
      expect(Math.abs(web.nakshatra.elapsed - py.nakshatra.elapsed_fraction), b).toBeLessThan(1e-8)
    }

    expect(Object.keys(chart.vargas).map(Number)).toEqual([...VARGAS])
    for (const [name, signs] of Object.entries(f.vargas)) {
      expect(chart.vargas[Number(name.slice(1))], name).toEqual(signs)
    }

    const p = chart.panchanga
    const py = f.panchanga
    expect([p.tithi, p.paksha, p.tithiInPaksha, p.yogaIndex, p.yoga, p.karana]).toEqual([py.tithi, py.paksha, py.tithi_in_paksha, py.yoga_index, py.yoga, py.karana])
    expect(Math.abs(p.elongation - py.elongation)).toBeLessThan(1e-8)
    expect([p.nakshatra.index, p.nakshatra.pada, p.nakshatra.lord]).toEqual([f.nakshatra.index, f.nakshatra.pada, f.nakshatra.lord])
    expect(Math.abs(p.nakshatra.elapsed - f.nakshatra.elapsed_fraction)).toBeLessThan(1e-8)

    const ctx = f.sunrise_context
    if (!ctx) {
      expect(chart.solarDay).toBeNull()
    } else {
      const d = chart.solarDay!
      expect(Math.abs(d.sunriseJd - ctx.sunrise_jd) * 86400).toBeLessThan(0.01)
      expect(Math.abs(d.sunsetJd - ctx.sunset_jd) * 86400).toBeLessThan(0.01)
      expect(Math.abs(d.nextSunriseJd - ctx.next_sunrise_jd) * 86400).toBeLessThan(0.01)
      expect([d.weekday, d.isDay]).toEqual([ctx.weekday_sunday0, ctx.is_day])
    }
  })
})

describe('castChart output', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('reports the UTC instant and offset, and copies its inputs', () => {
    const input = { ...BASE, name: 'Test' }
    const chart = castChart(input, PRESETS.book)
    expect(chart.utc).toBe('1990-06-15T05:00:00.000Z')
    expect(chart.utcOffsetMinutes).toBe(330)
    expect(chart.input).toEqual(input)
    expect(chart.input).not.toBe(input)
    expect(chart.settings).toEqual(PRESETS.book)
  })

  it('stores a normalised time zone that later modules can use', () => {
    for (const timeZone of [' Asia/Kolkata ', 'asia/kolkata', 'ASIA/KOLKATA']) {
      const chart = castChart({ ...BASE, timeZone }, PRESETS.popular)
      expect(chart.utcOffsetMinutes, timeZone).toBe(330)
      expect(chart.input.timeZone, timeZone).toBe('Asia/Kolkata')
      expect(jdToLocal(chart.jd, chart.input.timeZone).date, timeZone).toBe(BASE.date)
    }
    expect(castChart({ ...BASE, timeZone: ' UTC+05:30 ' }, PRESETS.popular).input.timeZone).toBe('UTC+05:30')
  })

  it('casts charts at the edges of the accepted input', () => {
    const edges: Partial<BirthInput>[] = [
      { date: '2024-02-29', time: '00:00' },
      { date: '1900-01-01', time: '00:00' },
      { date: '2100-12-31', time: '23:59:59' },
      { date: '1600-01-01', time: '00:00', timeZone: '+14:00' },
      { date: '2400-12-31', time: '23:59:59', timeZone: '-12:00' },
      { latitude: 89.9 },
      { latitude: -89.9 },
      { longitude: 180, timeZone: 'Pacific/Fiji' },
      { longitude: -180, timeZone: '-12:00' },
    ]
    for (const edge of edges) {
      const chart = castChart({ ...BASE, ...edge }, PRESETS.popular)
      for (const b of BODIES) {
        const lon = chart.positions[b].longitude
        expect(lon >= 0 && lon < 360, `${JSON.stringify(edge)} ${b}`).toBe(true)
      }
    }
    expect(castChart({ ...BASE, date: '2024-02-29', time: '00:00' }, PRESETS.popular).utc).toBe('2024-02-28T18:30:00.000Z')
    expect(castChart({ ...BASE, date: '2400-12-31', time: '23:59:59', timeZone: '-12:00' }, PRESETS.popular).utc).toBe('2401-01-01T11:59:59.000Z')
    expect(castChart({ ...BASE, latitude: 89.9 }, PRESETS.popular).warnings).toContain(POLAR_WARNING)
    // +180 and -180 are the same meridian.
    const east = castChart({ ...BASE, timeZone: 'UTC', longitude: 180 }, PRESETS.popular)
    const west = castChart({ ...BASE, timeZone: 'UTC', longitude: -180 }, PRESETS.popular)
    expect(Math.abs(east.positions.Asc.longitude - west.positions.Asc.longitude)).toBeLessThan(1e-9)
  })

  it('is plain data that survives structured cloning (the worker boundary)', () => {
    const chart = castChart(BASE, PRESETS.popular)
    expect(structuredClone(chart)).toEqual(chart)
  })

  it('warns about polar day instead of failing', () => {
    // Tromso at midsummer: the Sun does not set (the toolkit's sunrise_context raises here).
    const chart = castChart({ ...BASE, date: '2020-06-21', time: '12:00', timeZone: 'Europe/Oslo', latitude: 69.65, longitude: 18.96 }, PRESETS.popular)
    expect(chart.solarDay).toBeNull()
    expect(chart.warnings).toContain(POLAR_WARNING)
  })

  it('warns about polar night too', () => {
    const chart = castChart({ ...BASE, date: '2020-12-21', time: '12:00', timeZone: 'Europe/Oslo', latitude: 69.65, longitude: 18.96 }, PRESETS.popular)
    expect(chart.solarDay).toBeNull()
    expect(chart.warnings).toContain(POLAR_WARNING)
  })

  it('notes dates outside 1900-2100 and pre-1970 time zones', () => {
    const old = castChart({ ...BASE, date: '1890-01-01' }, PRESETS.popular)
    expect(old.warnings.some((w) => w.startsWith('1890 is outside 1900-2100'))).toBe(true)
    expect(old.warnings.some((w) => w.includes('UTC+05:21:10') && w.includes('Asia/Kolkata'))).toBe(true)
    const war = castChart({ ...BASE, date: '1943-06-15' }, PRESETS.popular)
    expect(war.warnings.some((w) => w.startsWith('Check the historical time zone') && w.includes('UTC+06:30'))).toBe(true)
    const fixed = castChart({ ...BASE, date: '1960-01-01', timeZone: '+05:30' }, PRESETS.popular)
    expect(fixed.warnings.some((w) => w.includes('confirm that UTC+05:30'))).toBe(true)
    const modern = castChart({ ...BASE, date: '2000-06-15' }, PRESETS.popular)
    expect(modern.warnings).toEqual([])
    expect(castChart({ ...BASE, date: '2150-03-01' }, PRESETS.popular).warnings.some((w) => w.startsWith('2150 is outside'))).toBe(true)
  })

  it('warns when the rising sign changes within five minutes, also inside the polar circle', () => {
    // Bengaluru, and Tromso (69.65 N) in winter, where the ascendant stalls, runs backwards and jumps to the opposite sign.
    const places: BirthInput[] = [
      { ...BASE, date: '2000-06-15' },
      { ...BASE, date: '2020-01-15', timeZone: 'Europe/Oslo', latitude: 69.65, longitude: 18.96 },
    ]
    const STEP = 5 // seconds between brute-force samples
    for (const place of places) {
      let warned = 0, opposite = 0
      for (let minute = 0; minute < 24 * 60; minute += 3) {
        const chart = castChart({ ...place, time: hhmm(minute) }, PRESETS.popular)
        const sign = chart.positions.Asc.sign
        const signAt = (seconds: number) => ascendant(chart.jd + seconds / 86400, place.latitude, place.longitude, PRESETS.popular).sign
        // Nearest sampled change on one side within five minutes: [seconds away, the other sign].
        const nearest = (dir: 1 | -1): [number, number] | null => {
          for (let s = STEP; s <= 300; s += STEP) if (signAt(dir * s) !== sign) return [s, signAt(dir * s)]
          return null
        }
        const after = nearest(1), before = nearest(-1)
        const warning = chart.warnings.find((w) => w.startsWith('The rising sign'))
        const label = `${place.latitude} ${hhmm(minute)}`
        if (!after && !before) {
          expect(warning, label).toBeUndefined()
          continue
        }
        const m = /^The rising sign (changes to|was) (\w+) (?:until )?(less than a minute|about (\d+) min) (after|before) the given time\./.exec(warning ?? '')
        expect(m, label).not.toBeNull()
        warned++
        // Changes on both sides within one sampling step of each other may be reported either way.
        if (after && before && Math.abs(after[0] - before[0]) <= STEP) continue
        const useAfter = after !== null && (before === null || after[0] < before[0])
        const [seconds, other] = useAfter ? after : before!
        expect([m![1], m![2], m![5]], label).toEqual(useAfter ? ['changes to', SIGN_NAMES[other], 'after'] : ['was', SIGN_NAMES[other], 'before'])
        const minutes = m![4] === undefined ? 0.5 : Number(m![4])
        expect(Math.abs(minutes - seconds / 60), label).toBeLessThanOrEqual(0.5 + STEP / 60)
        if ((other - sign + 12) % 12 === 6) opposite++
      }
      expect(warned, String(place.latitude)).toBeGreaterThan(10)
      if (place.latitude > 66.6) expect(opposite, 'ascendant jumps to the opposite sign').toBeGreaterThan(0)
    }
  })

  it('formats UTC offsets', () => {
    expect([formatUtcOffset(330), formatUtcOffset(-240), formatUtcOffset(310 + 20 / 60), formatUtcOffset(0), formatUtcOffset(-570)])
      .toEqual(['UTC+05:30', 'UTC-04:00', 'UTC+05:10:20', 'UTC+00:00', 'UTC-09:30'])
  })

  it('rejects unknown settings', () => {
    expect(() => castChart(BASE, { ...PRESETS.popular, ayanamsa: 'fagan' as Settings['ayanamsa'] })).toThrow(/Unknown ayanamsa/)
    expect(() => castChart(BASE, { ...PRESETS.popular, ayanamsa: 'toString' as Settings['ayanamsa'] })).toThrow(/Unknown ayanamsa/)
    expect(() => castChart(BASE, { ...PRESETS.popular, node: 'osculating' as Settings['node'] })).toThrow(/Unknown node/)
    expect(() => castChart(BASE, { ...PRESETS.popular, yearModel: 'lunar' as Settings['yearModel'] })).toThrow(/Unknown dasha year model/)
  })
})

describe('birth input validation', () => {
  it('accepts valid input, including fixed offsets with seconds', () => {
    expect(validateBirthInput(BASE)).toEqual([])
    expect(issueFields({ time: '10:30:15', timeZone: '+05:10:20' })).toEqual([])
    expect(issueFields({ timeZone: 'UTC-04:00' })).toEqual([])
    expect(issueFields({ timeZone: 'Z' })).toEqual([])
    expect(issueFields({ latitude: -89.99, longitude: -180 })).toEqual([])
  })

  it('rejects malformed or impossible dates and out-of-range years', () => {
    expect(issueFields({ date: '15-06-1990' })).toEqual(['date'])
    expect(issueFields({ date: '1990-6-15' })).toEqual(['date'])
    expect(issueFields({ date: '2023-02-29' })).toEqual(['date'])
    expect(issueFields({ date: '1990-13-01' })).toEqual(['date'])
    expect(issueFields({ date: '1500-01-01' })).toEqual(['date'])
    expect(issueFields({ date: '2401-01-01' })).toEqual(['date'])
    expect(issueFields({ date: '2024-02-29' })).toEqual([])
    expect(validateBirthInput({ ...BASE, date: '2023-02-29' })[0].message).toBe('2023-02-29 is not a real calendar date.')
  })

  it('rejects malformed times, explaining 24:00', () => {
    for (const time of ['9:30', '24:00', '24:00:00', '24:30', '10:60', '10:30:60', '10:30:00.5', '10.30', 'T10:30', ' 10:30', '']) {
      expect(issueFields({ time }), time).toEqual(['time'])
    }
    expect(validateBirthInput({ ...BASE, time: '24:00' })[0].message).toMatch(/^Midnight at the end of a day is 00:00 on the next date/)
    expect(validateBirthInput({ ...BASE, time: '24:30' })[0].message).toMatch(/^Enter the birth time as HH:mm/)
  })

  it('rejects unknown zones with a hint', () => {
    expect(issueFields({ timeZone: '' })).toEqual(['timeZone'])
    expect(issueFields({ timeZone: 'Mars/Olympus' })).toEqual(['timeZone'])
    expect(issueFields({ timeZone: '+25:00' })).toEqual(['timeZone'])
    expect(validateBirthInput({ ...BASE, timeZone: 'IST+1' })[0].message).toMatch(/Unknown time zone "IST\+1".*Asia\/Kolkata.*\+05:30/)
  })

  it('rejects out-of-range or non-numeric coordinates', () => {
    expect(issueFields({ latitude: 90 })).toEqual(['latitude'])
    expect(issueFields({ latitude: -90 })).toEqual(['latitude'])
    expect(issueFields({ latitude: Number.NaN })).toEqual(['latitude'])
    expect(issueFields({ latitude: '12' as unknown as number })).toEqual(['latitude'])
    expect(issueFields({ longitude: 180.01 })).toEqual(['longitude'])
    expect(issueFields({ longitude: Number.POSITIVE_INFINITY })).toEqual(['longitude'])
    expect(issueFields({ fold: 2 as 0 })).toEqual(['fold'])
  })

  it('collects every field problem at once', () => {
    expect(issueFields({ date: 'x', time: 'y', timeZone: 'Nowhere', latitude: 100, longitude: 200 })).toEqual(['date', 'time', 'timeZone', 'latitude', 'longitude'])
  })

  it('explains skipped and repeated clock times', () => {
    const gap = validateBirthInput({ ...BASE, date: '2021-03-14', time: '02:30', timeZone: 'America/New_York' })
    expect(gap.map((i) => i.field)).toEqual(['time'])
    expect(gap[0].message).toMatch(/02:30 never appeared on the clocks on 2021-03-14 in America\/New_York/)
    const overlap = validateBirthInput({ ...BASE, date: '2021-11-07', time: '01:30', timeZone: 'America/New_York' })
    expect(overlap.map((i) => i.field)).toEqual(['fold'])
    expect(overlap[0].message).toMatch(/happened twice .* first occurrence \(UTC-04:00\) or the second \(UTC-05:00\)/)
    expect(issueFields({ date: '2021-11-07', time: '01:30', timeZone: 'America/New_York', fold: 1 })).toEqual([])
    // Kiritimati skipped the whole of 31 December 1994 when it crossed the date line.
    expect(issueFields({ date: '1994-12-31', time: '12:00', timeZone: 'Pacific/Kiritimati' })).toEqual(['time'])
  })

  it('makes castChart throw a BirthInputError carrying the issues', () => {
    let error: unknown
    try {
      castChart({ ...BASE, latitude: 95 }, PRESETS.popular)
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(BirthInputError)
    expect((error as BirthInputError).name).toBe('BirthInputError')
    expect((error as BirthInputError).issues.map((i) => i.field)).toEqual(['latitude'])
    expect((error as Error).message).toMatch(/^Latitude must be/)
  })
})

describe('engineApi', () => {
  it('initialises once and exposes the chart functions', async () => {
    const version = await engineApi.init()
    expect(version).toEqual({ engine: ENGINE_VERSION, swisseph: '2.10.03' })
    expect(await engineApi.init()).toEqual(version)
    expect(engineApi.castChart(BASE, PRESETS.popular)).toEqual(castChart(BASE, PRESETS.popular))
    expect(engineApi.validateBirthInput({ ...BASE, latitude: 91 })).toHaveLength(1)
  })
})
