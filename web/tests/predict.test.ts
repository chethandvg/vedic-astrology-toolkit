// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import fixtures from './fixtures/charts.json'
import { advanceSign, nakshatra, panchanga, signOf } from '@/engine/core'
import { moonLongitude, planetPositions, sunLongitude } from '@/engine/ephem'
import { gochara } from '@/engine/gochara'
import { chandrashtamaWindows } from '@/engine/moon'
import {
  balanceFactor, CHALLENGING_AT, CHANDRA_BALA_GOOD, contextFor, COVER_LIMIT, createContext, DAY_CACHE_LIMIT, DAY_WEIGHTS, dayRating, FAVOURABLE_AT, forecastDay,
  forecastMonth, forecastWeek, forecastYear, FUNCTIONAL_TILT, functionalTilt, GOCHARA_MAX_BALANCE, GOCHARA_SHARES, GOCHARA_WEIGHTS, gocharaAt, gocharaBalance, INFORMATIONAL_FACTORS, munthaForYear,
  ratingFor, scoreReasons, STRENGTH_FACTOR, vedicDateAt, type PredictContext,
} from '@/engine/predict'
import { castChart } from '@/engine/chart'
import { dashaChainAt, vimsottari } from '@/engine/dasha'
import { analyseNatal, chainPromise, placementValue, PROMISE_THRESHOLD } from '@/engine/promise'
import { solarDayForDate } from '@/engine/sunrise'
import { addDays, daysInMonth, localToJd } from '@/engine/time'
import { PLANETS, PRESETS, type BirthInput, type Forecast, type Rating, type Reason } from '@/engine/types'
import { CAUTION_PHRASE, lordOutlook, SUPPORT_PHRASE } from '@/content'
import { loadSwe } from './helpers/swe'

type Fixture = { id: string; input: { datetime: string; timezone?: string; latitude: number; longitude: number } }

/** Book Example 118 (Rao): 8 Mar 1967, 17:40 IST, 26N18, 73E04. */
function bookExample118(): BirthInput {
  const f = (fixtures as unknown as { charts: Fixture[] }).charts.find((c) => c.id === 'book_example_118')!
  const [date, time] = f.input.datetime.split('T')
  return { date, time: time.slice(0, 5), timeZone: f.input.timezone!, latitude: f.input.latitude, longitude: f.input.longitude }
}

const BENGALURU = { latitude: 12.9716, longitude: 77.5946, timeZone: 'Asia/Kolkata' }
const BIRTH = bookExample118()
/** A synthetic December birth in New York (DST zone, Moon in Cancer). */
const NEW_YORK = { latitude: 40.7128, longitude: -74.006, timeZone: 'America/New_York' }
const NY_BIRTH: BirthInput = { date: '1985-12-02', time: '23:10', ...NEW_YORK }
/** The e2e profile, born in Bengaluru. */
const ASHA: BirthInput = { date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937 }
const MINUTE = 1 / 1440

const fresh = () => createContext(BIRTH, PRESETS.popular, BENGALURU)

function checkReasons(f: Forecast) {
  for (const r of f.reasons) {
    expect([-1, 0, 1]).toContain(r.effect)
    expect(r.weight).toBeGreaterThan(0)
    expect(r.title.trim()).not.toBe('')
    expect(r.text.trim()).not.toBe('')
    expect(r.source.trim()).not.toBe('')
    expect(`${r.title} ${r.text}`).not.toMatch(/undefined|NaN|null/)
  }
  expect(f.headline).toMatch(/^[A-Z].*\.$/)
  expect(f.headline).not.toMatch(/undefined/)
  expect(f.score).toBeGreaterThanOrEqual(-1)
  expect(f.score).toBeLessThanOrEqual(1)
  // A day ruled by Chandrashtama is capped (dayRating); every other rating follows the score.
  const ruled = f.horizon === 'day' && f.reasons.some((r) => r.factor === 'chandrashtama' && r.weight === DAY_WEIGHTS.chandrashtama)
  expect(f.rating).toBe(dayRating(f.score, ruled))
}

const byFactor = (f: Forecast, factor: string) => f.reasons.filter((r) => r.factor === factor)

describe('forecast scoring rules', () => {
  it('rates with the exported thresholds', () => {
    expect([FAVOURABLE_AT, CHALLENGING_AT]).toEqual([0.15, -0.15])
    expect(ratingFor(0.15)).toBe('favourable')
    expect(ratingFor(0.149)).toBe('mixed')
    expect(ratingFor(0)).toBe('mixed')
    expect(ratingFor(-0.149)).toBe('mixed')
    expect(ratingFor(-0.15)).toBe('challenging')
  })

  it('scores Σ effect·weight / Σ weight and ignores informational reasons', () => {
    const r = (factor: string, effect: -1 | 0 | 1, weight: number): Reason => ({ factor, effect, weight, title: 't', text: 't', source: 's' })
    expect(scoreReasons([r('a', 1, 3), r('b', -1, 1)])).toBe(0.5)
    expect(scoreReasons([r('a', 1, 1), r('b', 0, 1)])).toBe(0.5)
    expect(scoreReasons([r('a', -1, 2), ...INFORMATIONAL_FACTORS.map((f) => r(f, 0, 5))])).toBe(-1)
    expect(scoreReasons([])).toBe(0)
  })

  it('balances cyclic factors so that each averages zero over its cycle', () => {
    for (const [good, bad] of [[3 / 12, 9 / 12], [4 / 12, 8 / 12], [9 / 12, 3 / 12], [5 / 9, 3 / 9]]) {
      const plus = balanceFactor(good, bad, 1)
      const minus = balanceFactor(good, bad, -1)
      expect(good * plus - bad * minus).toBeCloseTo(0, 12)
      expect(good * plus + bad * minus + (1 - good - bad)).toBeCloseTo(1, 12)
    }
    expect([balanceFactor(0.25, 0.75, 1), balanceFactor(0.25, 0.75, -1), balanceFactor(0.25, 0.75, 0)]).toEqual([2, 2 / 3, 1])
  })

  it('bounds each planet\'s gochara weight by Chandra bala while keeping its zero mean', () => {
    expect(GOCHARA_MAX_BALANCE).toBe(1.2)
    for (const p of PLANETS) {
      const [good, bad] = GOCHARA_SHARES[p]
      const [plus, minus] = [gocharaBalance(p, 1), gocharaBalance(p, -1)]
      expect(good * plus - bad * minus, p).toBeCloseTo(0, 12)
      expect(Math.max(plus, minus), p).toBeLessThanOrEqual(GOCHARA_MAX_BALANCE + 1e-12)
      // No transit outweighs Chandra bala in a bad sign, however strong its ashtakavarga.
      expect(GOCHARA_WEIGHTS[p] * Math.max(plus, minus) * STRENGTH_FACTOR.strong, p).toBeLessThanOrEqual(DAY_WEIGHTS.chandraBala + 1e-12)
    }
    // Mercury's outcomes are nearly even, so it keeps the plain balancing.
    expect(gocharaBalance('Mercury', 1)).toBe(balanceFactor(...GOCHARA_SHARES.Mercury, 1))
    expect(gocharaBalance('Saturn', 0)).toBe(1)
  })

  it('balances the Moon\'s sign cycle: six good signs against five bad ones and Chandrashtama', () => {
    expect(CHANDRA_BALA_GOOD).toBe(1.75)
    expect(6 * CHANDRA_BALA_GOOD).toBe(5 * DAY_WEIGHTS.chandraBala + DAY_WEIGHTS.chandrashtama)
  })
})

describe('gochara outcome shares', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('match a coarse re-measurement over 1900-2100 (vedha and vipareeta vedha included)', () => {
    const tally = Object.fromEntries(PLANETS.map((p) => [p, [0, 0]])) as Record<string, number[]>
    let n = 0
    for (let jd = 2415020.5; jd < 2488069.5; jd += 30.7) {
      const pos = planetPositions(jd, PRESETS.popular)
      for (let moon = 0; moon < 12; moon++) {
        for (const r of gochara(moon, pos)) if (r.effect) tally[r.planet][r.effect > 0 ? 0 : 1]++
      }
      n += 12
    }
    for (const p of PLANETS) {
      expect(tally[p][0] / n, p).toBeCloseTo(GOCHARA_SHARES[p][0], 1)
      expect(tally[p][1] / n, p).toBeCloseTo(GOCHARA_SHARES[p][1], 1)
    }
  })
})

describe('forecasts for book Example 118 in Bengaluru', () => {
  let ctx: PredictContext
  beforeAll(async () => {
    await loadSwe()
    ctx = fresh()
  })

  it('explains 20 Oct 2026 deterministically', () => {
    const day = forecastDay(ctx, '2026-10-20')
    checkReasons(day)
    expect(day).toMatchObject({ horizon: 'day', start: '2026-10-20', end: '2026-10-20', rating: 'favourable', score: 0.343 })
    expect(day.headline).toBe('A well-placed Moon lifts the day, but handle relationships with extra tact.')
    expect(forecastDay(ctx, '2026-10-19').headline).toMatch(/^A good day, helped by /)
    // Weights are nominal x balance (GOCHARA_SHARES, capped at GOCHARA_MAX_BALANCE) x ashtakavarga
    // strength x functional tilt for the Leo lagna (FUNCTIONAL_TILT), e.g. Saturn, a functional
    // malefic in a good house: 1 x 1.2 x 0.75 x 0.85. The Moon's own factors lead.
    expect(day.reasons.map((r) => [r.factor, r.effect, r.weight])).toEqual([
      ['chandra_bala', 1, 1.75], // Moon in Capricorn, the natal Moon sign
      ['tara_bala', 1, 1.6], // Parama Mitra
      ['gochara_Sun', 1, 1.5], // 10th, 6 bindus (strong); the lagna lord, already at the cap
      ['gochara_Venus', -1, 1.38], // 10th; Venus rules the 3rd and 10th for Leo (functional malefic)
      ['gochara_Mercury', 1, 1.11], // 10th, 6 bindus; Mercury rules the 2nd and 11th (functional malefic)
      ['dasha_promise', -1, 1.05], // Mercury dasha: malefic lordship, combust (see below)
      ['gochara_Jupiter', 0, 1], // 7th, obstructed by Saturn in the 3rd
      ['gochara_Saturn', 1, 0.76], // 3rd from the Moon, an upachaya, with 3 bindus (weak)
      ['dasha_transit', 1, 0.56], // Mercury antardasha, Mercury in the 10th (half weight)
      ['gochara_Mars', -1, 0.32], // 7th, 3 bindus; Mars is the yogakaraka for Leo, so it eases
      ['tithi', -1, 0.28], // Sukla Navami until 12:51, about half the daytime
      ['gochara_Rahu', -1, 0.14],
      ['gochara_Ketu', -1, 0.14],
      ['moon_change', 0, 1],
      ['dasha', 0, 1],
    ])
    // The dasha is read from the chart: Mercury rules the 2nd and 11th from Leo and sits combust in the 7th.
    expect(byFactor(day, 'dasha_promise')[0]).toMatchObject({ title: 'Mercury sub-period: asks for patience in your chart' })
    expect(byFactor(day, 'dasha_promise')[0].text).toMatch(/^Mercury rules your 2nd and 11th and sits in your 7th\. It sits close to the Sun, so this sub-period tends to ask for patience around family finances and gains/)
    expect(byFactor(day, 'dasha')[0].text).toMatch(/^The Mercury period frames these years: Mercury rules your 2nd and 11th/)
    expect(byFactor(day, 'gochara_Mars')[0].text).toMatch(/As a helpful planet for your ascendant, it tends to soften the strain\.$/)
    // Vijayadashami: Navami gives way to Dashami at midday, so the Rikta caution is timed, not for the whole day.
    expect(byFactor(day, 'tithi')[0].title).toBe('Sukla Navami (Rikta tithi) until 12:51')
    expect(byFactor(day, 'tithi')[0].text).toMatch(/Today it runs until 12:51, then Sukla Dashami begins\.$/)
    expect(byFactor(day, 'tara_bala')[0].title).toBe('Parama Mitra tara: Moon in Shravana')
    expect(byFactor(day, 'gochara_Jupiter')[0].text).toMatch(/held back by Saturn in your 3rd \(vedha\)/)
    expect(byFactor(day, 'moon_change')[0].text).toMatch(/^The Moon moves into Dhanishtha nakshatra at 18:02\./)
    expect(day.dasha.map((p) => p.lord)).toEqual(['Mercury', 'Mercury', 'Mercury'])
    expect(day.dasha.every((p) => p.children === undefined)).toBe(true)
    expect(day.events.map((e) => [e.kind, e.title])).toEqual([['moon_nakshatra', 'Moon enters Dhanishtha nakshatra']])
    expect(day.events[0].detail).toMatch(/^Janma tara/)
    expect(day.timings).toMatchObject({ date: '2026-10-20', timeZone: 'Asia/Kolkata' })
    expect(scoreReasons(day.reasons)).toBe(day.score)
  })

  it('uses the Moon that rules most of the daytime, flags every Chandrashtama day and the panchanga cautions', () => {
    const eighth = advanceSign(ctx.chart.positions.Moon.sign, 8)
    const settings = PRESETS.popular
    const start = localToJd('2026-10-01', BENGALURU.timeZone)
    const windows = chandrashtamaWindows(ctx.chart.positions.Moon.sign, start, start + 62, settings)
    let flagged = 0
    for (let i = 0; i < 61; i++) {
      const date = addDays('2026-10-01', i)
      const sd = solarDayForDate(date, BENGALURU.latitude, BENGALURU.longitude, BENGALURU.timeZone)!
      const middle = (sd.sunriseJd + sd.sunsetJd) / 2
      const moon = moonLongitude(middle, settings)
      const day = forecastDay(ctx, date)
      checkReasons(day)
      const tara = byFactor(day, 'tara_bala')[0]
      expect(tara.title.endsWith(nakshatra(moon).name), date).toBe(true)
      // A Rikta tithi or Amavasya is flagged for the part of the daytime it holds (an hour at least),
      // weighted by that share; here sampled every 10 minutes.
      const held = new Map<number, number>()
      for (let jd = sd.sunriseJd; jd < sd.sunsetJd; jd += 10 * MINUTE) {
        const p = panchanga(sunLongitude(jd, settings), moonLongitude(jd, settings))
        if (p.tithi === 30 || (p.tithi !== 15 && [4, 9, 14].includes(p.tithiInPaksha))) held.set(p.tithi, (held.get(p.tithi) ?? 0) + 10 * MINUTE)
      }
      const tithis = byFactor(day, 'tithi')
      expect(tithis.length, date).toBeGreaterThanOrEqual([...held.values()].filter((d) => d >= 70 * MINUTE).length)
      expect(tithis.length, date).toBeLessThanOrEqual([...held.values()].filter((d) => d >= 50 * MINUTE).length)
      for (const t of tithis) {
        expect(t.title, date).toMatch(/^(Amavasya \(New Moon\)|(Sukla|Krishna) \w+ \(Rikta tithi\)) (until \d\d:\d\d|from \d\d:\d\d|through the daytime)/)
        if (tithis.length === 1) expect(t.weight, date).toBeCloseTo((0.5 * [...held.values()][0]) / (sd.sunsetJd - sd.sunriseJd), 1)
      }
      const sunrise = panchanga(sunLongitude(sd.sunriseJd, settings), moonLongitude(sd.sunriseJd, settings))
      if (sunrise.karana === 'Vishti') expect(byFactor(day, 'vishti')[0]?.title, date).toMatch(/^Vishti \(Bhadra\) karana (until|through)/)
      const stay = windows.find((w) => w.startJd < sd.nextSunriseJd && w.endJd > sd.sunriseJd)
      const reason = byFactor(day, 'chandrashtama')[0]
      if (stay) {
        flagged++
        expect(reason, date).toMatchObject({ effect: -1 })
        if (signOf(moon) === eighth) {
          expect(reason.weight).toBe(3)
          expect(byFactor(day, 'chandra_bala'), date).toEqual([])
          expect(day.score).toBeLessThan(scoreReasons(day.reasons.filter((r) => r !== reason)))
        }
      } else {
        expect(reason, date).toBeUndefined()
        expect(byFactor(day, 'chandra_bala'), date).toHaveLength(1)
      }
    }
    // Two 8th-sign stays in 61 days, each touching three or four Vedic days.
    expect(flagged).toBeGreaterThanOrEqual(6)
  })

  it('builds a week of 7 consecutive days whose mean is the week score', () => {
    const week = forecastWeek(ctx, '2026-10-19')
    checkReasons(week)
    expect(week).toMatchObject({ horizon: 'week', start: '2026-10-19', end: '2026-10-25' })
    expect(week.parts!.map((p) => p.start)).toEqual(Array.from({ length: 7 }, (_, i) => addDays('2026-10-19', i)))
    expect(week.score).toBeCloseTo(week.parts!.reduce((s, p) => s + p.score, 0) / 7, 3)
    // Parts are the cached days, so the day view and the week view always agree.
    expect(week.parts![1]).toBe(forecastDay(ctx, '2026-10-20'))
    expect(week.events.some((e) => e.kind === 'moon_nakshatra')).toBe(false)
    expect(week.events.some((e) => e.kind === 'retrograde' && e.body === 'Mercury')).toBe(true)
    expect(week.reasons.map((r) => r.factor)).toEqual(expect.arrayContaining(['best_days', 'gochara_Jupiter', 'gochara_Saturn', 'station_Mercury', 'dasha']))
    const sorted = [...week.events].sort((a, b) => a.jd - b.jd)
    expect(week.events).toEqual(sorted)
  })

  it('builds a month with one light part per day', () => {
    for (const [y, m] of [[2026, 10], [2027, 2]] as const) {
      const month = forecastMonth(ctx, y, m)
      checkReasons(month)
      expect(month.parts).toHaveLength(daysInMonth(y, m))
      expect(month.parts!.every((p) => p.timings === undefined && p.horizon === 'day')).toBe(true)
      expect(month.score).toBeCloseTo(month.parts!.reduce((s, p) => s + p.score, 0) / month.parts!.length, 3)
      expect(month.events.some((e) => e.kind === 'moon_sign' || e.kind === 'moon_nakshatra')).toBe(false)
    }
    const october = forecastMonth(ctx, 2026, 10)
    const factors = october.reasons.map((r) => r.factor)
    expect(factors).toEqual(expect.arrayContaining(['gochara_Sun', 'careful_days', 'gochara_Jupiter', 'retrograde_Mercury', 'retrograde_Venus', 'best_days']))
    // The slow planets are listed for the whole month, with the same vedha as the days show.
    const titled = (t: string) => october.reasons.find((r) => r.title === t)
    expect(titled('Saturn in your 3rd from the Moon (Pisces) all month')).toMatchObject({ effect: 1 })
    expect(titled('Jupiter in your 7th from the Moon (Cancer) until 31 Oct 2026')?.text).toMatch(/held back by Saturn in your 3rd \(vedha\)/)
    expect(titled('Jupiter in your 8th from the Moon (Leo) from 31 Oct 2026')).toMatchObject({ effect: -1 })
    expect(factors.some((f) => f.startsWith('ingress_'))).toBe(false)
    expect(october.events.filter((e) => e.kind === 'chandrashtama').map((e) => e.title)).toEqual(['Chandrashtama begins', 'Chandrashtama ends'])
    expect(october.events.find((e) => e.kind === 'ingress' && e.body === 'Jupiter')).toMatchObject({ title: 'Jupiter enters Leo', effect: -1 })
  })

  it('builds a year of 12 months with slow transits, Saturn, dashas and Muntha', () => {
    const year = forecastYear(ctx, 2026)
    checkReasons(year)
    expect(year).toMatchObject({ horizon: 'year', start: '2026-01-01', end: '2026-12-31' })
    expect(year.parts!.map((p) => [p.horizon, p.start])).toEqual(Array.from({ length: 12 }, (_, i) => ['month', `2026-${String(i + 1).padStart(2, '0')}-01`]))
    expect(year.parts!.every((p) => p.parts === undefined)).toBe(true)
    expect(year.score).toBeCloseTo(year.parts!.reduce((s, p) => s + p.score, 0) / 12, 3)
    const titles = year.reasons.map((r) => r.title)
    expect(titles).toEqual(expect.arrayContaining([
      'Saturn in your 3rd from the Moon (Pisces) all year',
      'Jupiter in your 7th from the Moon (Cancer) 2 Jun 2026 – 31 Oct 2026',
      'Muntha in your 12th (Gemini) until 8 Mar 2026',
      'Muntha in your 11th (Cancer) from 8 Mar 2026',
      'No Sade Sati this year',
    ]))
    // Saturn in the 3rd obstructs Jupiter in the 7th all through that stretch, as on each of its days.
    const jupiter7 = year.reasons.find((r) => r.title.startsWith('Jupiter in your 7th'))!
    expect(jupiter7).toMatchObject({ effect: 0 })
    expect(jupiter7.text).toMatch(/held back by Saturn in your 3rd \(vedha\)/)
    expect(byFactor(forecastDay(ctx, '2026-08-01'), 'gochara_Jupiter')[0].effect).toBe(0)
    expect(byFactor(year, 'muntha').map((r) => r.text.split('. ').at(-1))).toEqual([
      'This Tajaka (solar) year runs from 8 Mar 2026 to 9 Mar 2027.', 'This Tajaka (solar) year runs from 8 Mar 2025 to 8 Mar 2026.',
    ])
    expect(byFactor(year, 'dasha_change')[0].title).toBe('Mahadasha of Mercury begins · 28 Sep')
    expect(year.events.map((e) => e.title)).toEqual([
      'Jupiter turns direct in Gemini', 'Jupiter enters Cancer', 'Saturn turns retrograde in Pisces', 'Mahadasha of Mercury begins',
      'Jupiter enters Leo', 'Rahu enters Capricorn', 'Ketu enters Cancer', 'Saturn turns direct in Pisces', 'Jupiter turns retrograde in Leo',
    ])
  })

  it('reports Sade Sati phases and their boundaries when they fall in the year', () => {
    const year = forecastYear(ctx, 2020)
    const sade = byFactor(year, 'sade_sati')
    // The peak phase weighs more than the rising one, so it is listed first.
    expect(sade.map((r) => r.title)).toEqual(['Sade Sati, peak phase from 24 Jan 2020', 'Sade Sati, rising phase until 24 Jan 2020'])
    expect(sade.some((r) => /This Sade Sati runs from .* to .*\./.test(r.text))).toBe(true)
    expect(year.events.filter((e) => e.kind === 'sade_sati').map((e) => e.title)).toEqual(['Sade Sati, rising phase ends', 'Sade Sati, peak phase begins'])
    // Saturn's stay in the 12th and 1st is told by the phases, not repeated as a gochara reason.
    expect(byFactor(year, 'gochara_Saturn')).toEqual([])
  })

  it('reports Ardhashtama Shani on its own (Saturn in Aries, the 4th from Capricorn, 2028)', () => {
    // Saturn is back in Pisces (3rd, no phase) from Oct 2027 until it re-enters Aries.
    const year = forecastYear(ctx, 2028)
    const sade = byFactor(year, 'ashtama_shani')
    expect(byFactor(year, 'sade_sati')).toEqual([])
    expect(sade.map((r) => r.title)).toEqual(['Ardhashtama Shani from 23 Feb 2028'])
    expect(sade.every((r) => r.effect === -1 && !/Sade Sati runs/.test(r.text))).toBe(true)
  })
})

describe('Chandrashtama days and period highlights', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  const ruledBy = (d: Forecast) => byFactor(d, 'chandrashtama').some((r) => r.weight === DAY_WEIGHTS.chandrashtama)

  /** The summary, its reasons and Forecast.highlights name the same days, and never a favourable day as careful. */
  function checkHighlights(period: Forecast) {
    const h = period.highlights!
    const parts = new Map(period.parts!.map((p) => [p.start, p]))
    for (const d of h.careful) expect(parts.get(d)!.rating, d).toBe('challenging')
    for (const d of h.best) {
      expect(parts.get(d)!.score, d).toBeGreaterThan(0)
      expect(byFactor(parts.get(d)!, 'chandrashtama').every((r) => r.weight < DAY_WEIGHTS.chandrashtamaPartial), d).toBe(true)
    }
    for (const dates of [h.best, h.careful]) expect(dates).toEqual([...dates].sort())
    const label = (factor: string) => byFactor(period, factor)[0]?.title.split(': ')[1]
    expect(label('best_days') !== undefined).toBe(h.best.length > 0)
    expect(label('careful_days') !== undefined).toBe(h.careful.length > 0)
    for (const factor of ['best_days', 'careful_days']) if (label(factor)) expect(period.headline).toContain(label(factor))
    const a = localToJd(period.start, BENGALURU.timeZone)
    const b = localToJd(addDays(period.end, 2), BENGALURU.timeZone)
    expect(h.chandrashtama.every((w) => w.startJd < b && w.endJd > a)).toBe(true)
    expect(byFactor(period, 'chandrashtama')).toHaveLength(h.chandrashtama.length)
  }

  it('never rates a day ruled by Chandrashtama favourable, over 2026-2027 for three charts', () => {
    let ruled = 0
    let touched = 0
    for (const birth of [BIRTH, ASHA, NY_BIRTH]) {
      const ctx = createContext(birth, PRESETS.popular, BENGALURU)
      for (let y = 2026; y <= 2027; y++) {
        for (let m = 1; m <= 12; m++) {
          const month = forecastMonth(ctx, y, m)
          checkHighlights(month)
          for (const d of month.parts!.filter(ruledBy)) {
            ruled++
            expect(d.rating, d.start).toBe(d.score >= FAVOURABLE_AT ? 'mixed' : 'challenging')
            expect(d.headline.toLowerCase(), d.start).toContain(CAUTION_PHRASE.chandrashtama.toLowerCase())
          }
          // A day the stay only touches gives its time, and never pairs it with "a well-placed Moon".
          for (const d of month.parts!.filter((p) => byFactor(p, 'chandrashtama').length && !ruledBy(p))) {
            touched++
            expect(d.headline, d.start).not.toContain(CAUTION_PHRASE.chandrashtama)
            expect(d.headline, d.start).not.toContain(SUPPORT_PHRASE.chandra_bala)
            if (d.headline.includes('your 8th')) expect(d.headline, d.start).toMatch(/go gently (from|until) \d\d:\d\d( tomorrow)?, (as|when) the Moon (enters|leaves) your 8th/)
          }
        }
      }
    }
    expect(ruled).toBeGreaterThan(150)
    expect(touched).toBeGreaterThan(60)
    expect(dayRating(0.5, true)).toBe('mixed')
    expect(dayRating(0.1, true)).toBe('challenging')
    expect(dayRating(0.1, false)).toBe('mixed')
  })

  it('keeps the score but caps the rating: the 8th-sign Moon leads the headline', () => {
    const ny = createContext(NY_BIRTH, PRESETS.popular, NEW_YORK)
    expect(forecastDay(ny, '2027-08-17')).toMatchObject({
      rating: 'mixed', score: 0.225, headline: 'A steady day at best: go gently while the Moon crosses your 8th, with a favourable Moon star on your side.',
    })
    // Saturn in the 6th (once weighted 3.12) used to outvote Chandrashtama here; its weight is now capped.
    expect(forecastDay(createContext(ASHA, PRESETS.popular, BENGALURU), '2027-09-23')).toMatchObject({ rating: 'challenging', score: 0.075 })
    expect(forecastDay(fresh(), '2026-10-07')).toMatchObject({ rating: 'challenging', score: -0.222 })
  })

  it('times the caution on a day the 8th-sign Moon only touches', () => {
    const asha = createContext(ASHA, PRESETS.popular, BENGALURU)
    // The Moon is in the 7th (a good sign) until 15:41, then enters the 8th.
    expect(forecastDay(asha, '2026-10-02')).toMatchObject({
      rating: 'favourable', headline: 'A favourable Moon star lifts the day, but go gently from 15:41, as the Moon enters your 8th.',
    })
  })

  it('names the same best and careful days in the month summary and its highlights, with Chandrashtama by its times', () => {
    const asha = createContext(ASHA, PRESETS.popular, BENGALURU)
    const october = forecastMonth(asha, 2026, 10)
    checkHighlights(october)
    expect(october.highlights).toMatchObject({ best: ['2026-10-07', '2026-10-09', '2026-10-14'], careful: ['2026-10-18', '2026-10-22', '2026-10-30'] })
    expect(october.headline).toBe('A mixed month: best around 7 Oct, 9 Oct and 14 Oct, go gently around 18 Oct, 22 Oct and 30 Oct.')
    // 2 Oct is rated favourable until the Moon enters the 8th at 15:41, so it is not a careful day.
    expect(october.parts![1]).toMatchObject({ start: '2026-10-02', rating: 'favourable' })
    expect(byFactor(october, 'chandrashtama').map((r) => r.title)).toEqual([
      'Moon in your 8th: 2 Oct 15:41 – 4 Oct 18:32', 'Moon in your 8th: 29 Oct 22:07 – 1 Nov 00:01',
    ])
    const week = forecastWeek(asha, '2026-10-11')
    checkHighlights(week)
    expect(week.highlights).toEqual({ best: ['2026-10-14', '2026-10-15'], careful: ['2026-10-12', '2026-10-17'], chandrashtama: [] })
    expect(week.headline).toBe('A mixed week: best on Wed 14 – Thu 15 Oct, go gently on Mon 12 Oct and Sat 17 Oct.')
  })
})

describe('ratings across a year', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  const shares = (ctx: PredictContext, year: number) => {
    const count: Record<Rating, number> = { favourable: 0, mixed: 0, challenging: 0 }
    for (let m = 1; m <= 12; m++) for (const d of forecastMonth(ctx, year, m).parts!) count[d.rating]++
    const total = count.favourable + count.mixed + count.challenging
    return { favourable: count.favourable / total, mixed: count.mixed / total, challenging: count.challenging / total }
  }

  it('vary from day to day, in an ordinary year and in one whose slow transits all fall badly', () => {
    const ex118 = shares(fresh(), 2026)
    for (const r of ['favourable', 'mixed', 'challenging'] as const) expect(ex118[r], r).toBeGreaterThan(0.2)
    // New York 2026: Saturn 9th, Jupiter 12th then 1st, Rahu 8th, Ketu 2nd, Rahu antardasha.
    const ny = shares(createContext(NY_BIRTH, PRESETS.popular, NEW_YORK), 2026)
    expect(ny.challenging).toBeLessThan(0.6)
    expect(ny.favourable).toBeGreaterThan(0.1)
  })
})

describe('Muntha', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('matches the toolkit\'s annual charts for Example 118 (solar_return at the birthplace)', () => {
    const ctx = fresh()
    // analysis.solar_return(spec, 33) and (spec, 59): JD UT1, annual ascendant, muntha_sign.
    const m2000 = munthaForYear(ctx, 2000)!
    expect(m2000).toMatchObject({ completedYears: 33, sign: 1, annualAscSign: 9, house: 5, favourable: true })
    expect(Math.abs(m2000.returnJd - 2451611.4661142514)).toBeLessThan(MINUTE)
    const m2026 = munthaForYear(ctx, 2026)!
    expect(m2026).toMatchObject({ completedYears: 59, sign: 3, annualAscSign: 5, house: 11, favourable: true })
    expect(Math.abs(m2026.returnJd - 2461108.1394090154)).toBeLessThan(MINUTE)
    expect(munthaForYear(ctx, 1966)).toBeNull()
    // A December birthday: the Tajaka year running since December 2025 covers most of 2026 and leads.
    const ny = forecastYear(createContext(NY_BIRTH, PRESETS.popular, NEW_YORK), 2026)
    expect(byFactor(ny, 'muntha').map((r) => [r.title, r.weight])).toEqual([
      ['Muntha in your 3rd (Sagittarius) until 3 Dec 2026', 1.38], ['Muntha in your 1st (Capricorn) from 3 Dec 2026', 0.3],
    ])
    expect(munthaForYear(ctx, 1967)).toMatchObject({ completedYears: 0, house: 1, returnJd: ctx.chart.jd })
  })
})

describe('forecast plumbing', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('meets the performance targets on a cold context', () => {
    const time = (run: (c: PredictContext) => unknown) => {
      const c = fresh()
      const t = performance.now()
      run(c)
      return performance.now() - t
    }
    // Targets: day 60 ms, week 300 ms, month 1 s, year 2.5 s; asserted with a 2x margin for slow CI.
    expect(time((c) => forecastDay(c, '2026-10-20'))).toBeLessThan(120)
    expect(time((c) => forecastWeek(c, '2026-10-19'))).toBeLessThan(600)
    expect(time((c) => forecastMonth(c, 2026, 10))).toBeLessThan(2000)
    expect(time((c) => forecastYear(c, 2026))).toBeLessThan(5000)
  })

  it('keeps its caches bounded while stepping through the years', () => {
    const c = fresh()
    for (let y = 2026; y <= 2028; y++) forecastYear(c, y)
    expect(c.cache.days.size).toBeLessThanOrEqual(DAY_CACHE_LIMIT)
    expect(c.cache.spans.size).toBeLessThanOrEqual(DAY_CACHE_LIMIT)
    expect(c.cache.coverage!.end - c.cache.coverage!.start).toBeLessThanOrEqual(COVER_LIMIT)
    // The most recent days stay; an evicted one is simply computed again, the same as before.
    expect(c.cache.days.has('2028-12-31')).toBe(true)
    expect(c.cache.days.has('2026-01-01')).toBe(false)
    expect(forecastDay(c, '2026-01-01')).toEqual(forecastDay(fresh(), '2026-01-01'))
  })

  it('reuses cached days across views', () => {
    const c = fresh()
    forecastYear(c, 2026)
    const t = performance.now()
    forecastMonth(c, 2026, 10)
    forecastWeek(c, '2026-12-28')
    expect(performance.now() - t).toBeLessThan(100)
  })

  it('returns structured-clone friendly forecasts', () => {
    const c = fresh()
    for (const f of [forecastDay(c, '2026-10-20'), forecastWeek(c, '2026-10-19'), forecastMonth(c, 2026, 10), forecastYear(c, 2026)]) {
      expect(structuredClone(f)).toEqual(f)
      expect(JSON.parse(JSON.stringify(f))).toEqual(JSON.parse(JSON.stringify(structuredClone(f))))
    }
  })

  it('works through polar night and midnight sun, with days that neither overlap nor leave gaps', () => {
    const c = createContext(BIRTH, PRESETS.popular, { latitude: 69.65, longitude: 18.96, timeZone: 'Europe/Oslo' })
    const day = forecastDay(c, '2026-12-21')
    checkReasons(day)
    expect(day.timings).toBeUndefined()
    expect(byFactor(day, 'tara_bala')).toHaveLength(1)
    let without = 0
    for (let m = 1; m <= 12; m++) {
      for (const p of forecastMonth(c, 2026, m).parts!) {
        checkReasons(p)
        if (!forecastDay(c, p.start).timings) without++
      }
    }
    expect(without).toBeGreaterThan(100)
    for (let i = 0; i < 364; i++) {
      const date = addDays('2026-01-01', i)
      const [span, next] = [c.cache.spans.get(date)!, c.cache.spans.get(addDays(date, 1))!]
      expect(span.start < span.sunset && span.sunset < span.end, date).toBe(true)
      expect(next.start, date).toBeCloseTo(span.end, 6) // within 0.05 s: two searches for one sunrise
    }
  })

  it('labels a time after midnight with its own date, from one minute-rounded reading', () => {
    // The Moon enters Scorpio seconds before midnight; 00:00 belongs to Monday, not Sunday.
    const day = forecastDay(createContext(NY_BIRTH, PRESETS.popular, NEW_YORK), '2026-03-08')
    expect(byFactor(day, 'moon_change')[0].text).toMatch(/^The Moon moves into Scorpio at 00:00 on Mon 9 Mar and Anuradha nakshatra at 06:42 on Mon 9 Mar\./)
  })

  it('finds the Vedic day of an instant: before sunrise it is still the previous day', () => {
    const c = fresh()
    const sunrise = solarDayForDate('2026-10-20', BENGALURU.latitude, BENGALURU.longitude, BENGALURU.timeZone)!.sunriseJd
    expect(vedicDateAt(c, sunrise - MINUTE)).toBe('2026-10-19')
    expect(vedicDateAt(c, sunrise)).toBe('2026-10-20')
    expect(vedicDateAt(c, localToJd('2026-10-20', 'Asia/Kolkata', '23:59'))).toBe('2026-10-20')
  })

  it('memoises contexts for the worker API and rejects bad places', () => {
    expect(contextFor(BIRTH, PRESETS.popular, BENGALURU)).toBe(contextFor({ ...BIRTH }, { ...PRESETS.popular }, { ...BENGALURU }))
    expect(contextFor(BIRTH, PRESETS.book, BENGALURU)).not.toBe(contextFor(BIRTH, PRESETS.popular, BENGALURU))
    expect(() => createContext(BIRTH, PRESETS.popular, { ...BENGALURU, timeZone: 'Mars/Olympus' })).toThrow(/time zone/)
    expect(() => createContext(BIRTH, PRESETS.popular, { ...BENGALURU, latitude: 95 })).toThrow(/latitude/)
  })

  it('exposes the raw gochara table', () => {
    const c = fresh()
    const rows = gocharaAt(c, localToJd('2026-10-20', 'Asia/Kolkata', '06:10'))
    expect(rows).toHaveLength(9)
    expect(rows.find((r) => r.planet === 'Saturn')).toMatchObject({ houseFromMoon: 3, houseFromLagna: 8, bindus: 3 })
  })
})

describe('natal promise', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('reads each planet from the lagna: lordship, placement, dignity, strength and Vipareeta (Example 118, Leo rising)', () => {
    const { promise } = analyseNatal(castChart(BIRTH, PRESETS.popular))
    // Rao Table 30 for Leo: Sun, Mars, Jupiter benefic, Mars the yogakaraka; Mercury, Venus, Saturn malefic.
    expect(promise.Mars).toMatchObject({ role: 'benefic', yogakaraka: true, rules: [4, 9], house: 3, effect: 1 })
    // Jupiter rules the 5th and 8th and sits exalted in the 12th: as the 5th (trine) lord it gets no
    // Vipareeta lift, so the exaltation and the hard house balance out.
    expect(promise.Jupiter).toMatchObject({ rules: [5, 8], house: 12, dignity: 'exalted', vipareeta: false, effect: 0 })
    expect(promise.Venus).toMatchObject({ role: 'malefic', rules: [3, 10], house: 8, effect: -1 })
    // Budha-Aaditya forms, but a combust Mercury takes no credit from it.
    expect(promise.Mercury).toMatchObject({ rules: [2, 11], house: 7, combust: true, supportiveYogas: [] })
    // The nodes own nothing and act for their sign lord.
    expect(promise.Rahu).toMatchObject({ role: 'unclassified', rules: [], dispositor: 'Mars', strengthRatio: null })
    for (const p of PLANETS) expect(Math.abs(promise[p].score), p).toBeLessThanOrEqual(1)
  })

  it('averages close to zero over the toolkit charts, with dashas of every kind', () => {
    const scores: number[] = []
    const effects = { 1: 0, 0: 0, '-1': 0 } as Record<string, number>
    const charts = (fixtures as unknown as { charts: { input: { datetime: string; timezone?: string; fold?: 0 | 1; latitude: number; longitude: number } }[] }).charts
    for (const f of charts.slice(0, 24)) {
      const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(f.input.datetime)!
      const chart = castChart({ date: m[1], time: m[2], timeZone: m[3] || f.input.timezone!, fold: f.input.fold, latitude: f.input.latitude, longitude: f.input.longitude }, PRESETS.popular)
      const { promise } = analyseNatal(chart)
      scores.push(...PLANETS.map((p) => promise[p].score))
      const dashas = vimsottari(chart.positions.Moon.longitude, chart.jd, 'solar', 2)
      for (let jd = chart.jd; jd < chart.jd + 80 * 365.25; jd += 61) {
        effects[chainPromise(promise, dashaChainAt(dashas, jd).map((p) => p.lord), chart.positions).effect]++
      }
    }
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length
    expect(Math.abs(mean)).toBeLessThan(0.06)
    const total = effects[1] + effects[0] + effects[-1]
    for (const e of ['1', '0', '-1']) expect(effects[e] / total, e).toBeGreaterThan(0.15)
    expect(PROMISE_THRESHOLD).toBe(0.15)
  })

  it('tilts transits modestly by functional nature, without lifting any above the gochara cap', () => {
    const { promise } = analyseNatal(castChart(BIRTH, PRESETS.popular))
    expect(functionalTilt(promise.Mars, 1)).toBe(1 + FUNCTIONAL_TILT) // yogakaraka, good transit
    expect(functionalTilt(promise.Mars, -1)).toBe(1 - FUNCTIONAL_TILT)
    expect(functionalTilt(promise.Venus, 1)).toBe(1 - FUNCTIONAL_TILT) // functional malefic
    expect(functionalTilt(promise.Venus, -1)).toBe(1 + FUNCTIONAL_TILT)
    expect(functionalTilt(promise.Rahu, -1)).toBe(1)
    expect(functionalTilt(promise.Jupiter, 0)).toBe(1)
    const ctx = fresh()
    for (let i = 0; i < 30; i++) {
      for (const r of forecastDay(ctx, addDays('2026-10-01', i)).reasons.filter((x) => x.factor.startsWith('gochara_'))) {
        expect(r.weight, r.factor).toBeLessThanOrEqual(DAY_WEIGHTS.chandraBala + 1e-9)
      }
    }
  })

  it('states the same outlook in the title, text and vote of the dasha reason, naming the main period when it decides', () => {
    const phrase = { 1: 'tends to support', 0: 'both openings and effort', '-1': 'ask for patience' } as Record<string, string>
    const lean = { 1: 'leans toward support', 0: 'comes out mixed', '-1': 'leans toward patience' } as Record<string, string>
    let named = 0
    for (const birth of [BIRTH, ASHA, NY_BIRTH]) {
      const ctx = createContext(birth, PRESETS.popular, BENGALURU)
      for (let i = 0; i < 400; i += 9) {
        const day = forecastDay(ctx, addDays('2026-01-01', i))
        const r = byFactor(day, 'dasha_promise')[0]
        const [md, ad] = day.dasha.map((p) => ctx.promise[p.lord])
        expect(r.title).toMatch(r.effect > 0 ? /well supported/ : r.effect < 0 ? /asks for patience/ : /mixed/)
        // The sub-lord's own outlook, then (only when the chain's differs) a clause with the chain's.
        expect(r.text, r.title).toContain(phrase[ad.effect])
        if (ad.effect === r.effect) expect(r.text).not.toMatch(/overall\.$/)
        else {
          expect(r.text, r.title).toMatch(new RegExp(`${lean[r.effect]} overall\\.$`))
          if (md.planet !== ad.planet && md.effect === r.effect) named++, expect(r.text).toContain(`Within the ${md.planet} period`)
        }
      }
    }
    expect(named).toBeGreaterThan(0)
    // Asha (the e2e profile) on 14 Oct 2026, Venus-Mercury-Saturn: Mercury alone is mixed; the Venus period tips it.
    const r = byFactor(forecastDay(createContext(ASHA, PRESETS.popular, BENGALURU), '2026-10-14'), 'dasha_promise')[0]
    expect(r).toMatchObject({ effect: -1, title: 'Mercury sub-period: asks for patience in your chart' })
    expect(r.text).toMatch(/Within the Venus period, which asks for patience in your chart, this sub-period leans toward patience overall\.$/)
  })

  it('never joins a lord\'s condition to an outlook that contradicts it, over every toolkit chart', () => {
    const charts = (fixtures as unknown as { charts: { input: { datetime: string; timezone?: string; fold?: 0 | 1; latitude: number; longitude: number } }[] }).charts
    let texts = 0
    for (const f of charts) {
      const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?(.*)$/.exec(f.input.datetime)!
      const { promise } = analyseNatal(castChart({ date: m[1], time: m[2], timeZone: m[3] || f.input.timezone!, fold: f.input.fold, latitude: f.input.latitude, longitude: f.input.longitude }, PRESETS.popular))
      for (const p of PLANETS) {
        const lp = promise[p]
        for (const t of [lordOutlook(lp, 'period'), ...([1, 0, -1] as const).map((e) => lordOutlook(lp, 'sub-period', e, promise.Saturn))]) {
          texts++
          expect(t).not.toMatch(/(exalted|own sign|is strong)[^.]*, so [^.]*ask for patience/)
          expect(t).not.toMatch(/debilitated[^.]*, so [^.]*support/)
          expect(t).not.toMatch(/debilitated and is strong|placed in another/)
        }
        // Upachaya: a natural malefic in the 3rd, 6th or 11th never counts as a hard placement.
        if (['Sun', 'Mars', 'Saturn', 'Rahu', 'Ketu'].includes(p) && [3, 6, 11].includes(lp.house)) expect(placementValue(p, lp.house, false)).toBe(0.5)
        // Vipareeta never lifts a lord of the lagna or a trine.
        if (lp.vipareeta) expect(lp.rules.some((h) => [1, 5, 9].includes(h)), p).toBe(false)
        // A combust planet takes no credit from a supportive yoga.
        if (lp.combust) expect(lp.supportiveYogas).toEqual([])
      }
    }
    expect(texts).toBe(64 * 9 * 4)
  })

  it('reads natural malefics in the 3rd, 6th and 11th as upachaya strengths', () => {
    expect([3, 6, 11].map((h) => placementValue('Saturn', h, false))).toEqual([0.5, 0.5, 0.5])
    expect([3, 6, 8, 12].map((h) => placementValue('Jupiter', h, false))).toEqual([0, -1, -1, -1])
    expect([8, 12].map((h) => placementValue('Mars', h, false))).toEqual([-1, -1])
  })

  it('gives two charts with the same Moon sign but different lagnas different dasha readings', () => {
    // The same instant in Bengaluru and New York: the same Moon (so the same dasha periods to the
    // second), but a different rising sign.
    const early = createContext(ASHA, PRESETS.popular, BENGALURU)
    const late = createContext({ date: '1990-05-11', time: '20:30', ...NEW_YORK }, PRESETS.popular, BENGALURU)
    expect(late.chart.jd).toBeCloseTo(early.chart.jd, 9)
    expect(late.natal.moonSign).toBe(early.natal.moonSign)
    expect(late.natal.moonNakshatra).toBe(early.natal.moonNakshatra)
    expect(late.natal.ascSign).not.toBe(early.natal.ascSign)
    const [a, b] = [forecastDay(early, '2026-10-20'), forecastDay(late, '2026-10-20')]
    expect(a.dasha.map((p) => p.lord)).toEqual(b.dasha.map((p) => p.lord))
    // The Moon-based factors agree; the dasha reasons do not.
    expect(byFactor(a, 'tara_bala')).toEqual(byFactor(b, 'tara_bala'))
    expect(byFactor(a, 'dasha_promise')[0].text).not.toBe(byFactor(b, 'dasha_promise')[0].text)
    expect(byFactor(a, 'dasha')[0].text).not.toBe(byFactor(b, 'dasha')[0].text)
    for (const d of [a, b]) expect(byFactor(d, 'dasha_promise')[0].text).toMatch(/^\w+(, your yogakaraka,)? (rules your|sits in your) /)
  })
})
