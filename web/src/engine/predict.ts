// Explainable forecasts for a day, week, month and year. A day is the sunrise-to-sunrise Vedic day
// at the user's current place; it is scored from weighted, classical factors (Tara bala, Chandra
// bala, Chandrashtama, gochara with vedha and ashtakavarga, the running dasha and panchanga
// cautions), each returned as a Reason with original text and its source. The dasha and the
// transits are read against the birth chart's natal promise (promise.ts): the running lords by
// their lordship, placement and strength from the lagna, and each transit tilted a little by the
// planet's functional nature for the lagna. Longer periods average
// their days and add highlights. Every period is computed from one context that casts the chart
// once and caches sunrise days, transit events and daily results, so week, month and year views
// reuse the days they share.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { T } from '../content/active'
import { ashtakavarga, type Ashtakavarga } from './ashtakavarga'
import { castChart } from './chart'
import { advanceSign, houseFrom, norm, signOf } from './core'
import { dashaChainAt, dashaChanges, vimsottari } from './dasha'
import { ascendant, moonLongitude, planetLongitude, planetPositions, sunLongitude } from './ephem'
import { eventsBetween } from './events'
import { gochara, GOCHARA_RULES, VIPAREETA_VEDHA, type GocharaRow, type GocharaStrength } from './gochara'
import { chandraBala, chandrashtamaWindows, taraBala } from './moon'
import { timingsForSolarDay } from './muhurta'
import { sadeSatiSummary, saturnPhases, type SaturnPeriod } from './saturn'
import { bisectInstant } from './search'
import { analyseNatal, chainPromise, type LordPromise } from './promise'
import { nextSolarEvent, solarDayForDate } from './sunrise'
import { addDays, daysInMonth, isValidTimeZone, jdToLocal, localToJd } from './time'
import type {
  BirthInput, Chart, DashaPeriod, Effect, Forecast, PeriodHighlights, Planet, Rating, Reason, Settings, SignIndex, SolarDay, TimedEvent, TimeWindow,
} from './types'

// ---------------------------------------------------------------------------------------------
// Scoring constants

/** A score at or above this is 'favourable', at or below CHALLENGING_AT 'challenging', else 'mixed'. */
export const FAVOURABLE_AT = 0.15
export const CHALLENGING_AT = -0.15

/**
 * Weights of the day factors. The Moon's daily factors lead (Tara bala, then Chandra bala), as in
 * muhurta practice; Chandrashtama overrides Chandra bala; panchanga cautions only matter for new
 * beginnings. The slow planets (GOCHARA_WEIGHTS) weigh no more than the others: they are the same
 * on every day of a month, so they set its level while the Moon picks out the days within it. After
 * balancing (GOCHARA_MAX_BALANCE) no planet's transit weighs more than Chandra bala in a bad sign.
 */
export const DAY_WEIGHTS = {
  tara: 2,
  /** Chandra bala in a bad sign; a good sign weighs CHANDRA_BALA_GOOD. */
  chandraBala: 1.5,
  /** The Moon holds the 8th sign for most of the daytime. */
  chandrashtama: 3,
  /** The 8th-sign stay touches the daytime but does not rule it. */
  chandrashtamaPartial: 1.5,
  /** The 8th-sign stay falls only in the night part of the Vedic day. */
  chandrashtamaNight: 0.75,
  /**
   * The antardasha lord's transit, already scored as its gochara: transits tend to show most in the
   * running dasha (Rao ch. 25), but at weight 1 the repeat outweighed a node's own gochara (0.5).
   */
  dashaTransit: 0.5,
  /**
   * The running dasha chain read from the birth chart (natal promise, promise.ts). It holds for
   * weeks to years, so like the slow planets it sets a level rather than picking out days: at most
   * 1.5 when clearly supportive or hard, 0.5 when mixed (a heavy neutral vote would flatten every
   * day towards "mixed").
   */
  dashaPromise: 1,
  tithi: 0.5,
  vishti: 0.5,
  /** Informational reasons; they are shown but never scored. */
  info: 1,
} as const

/**
 * Gochara weights by planet. The Moon's own gochara is Chandra bala, so it has none here. With
 * Jupiter and Saturn at 1.5 and the nodes at 0.75, a year whose slow transits all fell badly rated
 * 70% of its days "challenging", leaving the Moon little room to pick out better days.
 */
export const GOCHARA_WEIGHTS: Readonly<Record<Planet, number>> = {
  Sun: 1, Moon: 0, Mars: 1, Mercury: 1, Jupiter: 1, Venus: 1, Saturn: 1, Rahu: 0.5, Ketu: 0.5,
}

/**
 * Chandra bala and Chandrashtama are one cycle of the Moon through the twelve signs: six good, five
 * bad and the 8th, which Chandrashtama scores instead. The good weight balances the cycle like the
 * other cyclic factors: 6·w = 5·1.5 + 3, so w = 1.75.
 */
export const CHANDRA_BALA_GOOD = (5 * DAY_WEIGHTS.chandraBala + DAY_WEIGHTS.chandrashtama) / 6

/**
 * How much a transit's weight leans on the planet's functional nature for the lagna (Rao Table 30):
 * a functional benefic's good transit counts 15% more and its hard one 15% less, the reverse for a
 * functional malefic. Kept small: gochara is judged from the Moon, lordship from the lagna.
 */
export const FUNCTIONAL_TILT = 0.15

/** Weight multiplier from the ashtakavarga strength of a transit (see gochara.ts). */
export const STRENGTH_FACTOR: Readonly<Record<GocharaStrength, number>> = { strong: 1.25, normal: 1, weak: 0.75 }

/**
 * Largest balance multiplier of a gochara outcome. Left unbounded, a planet's rare outcome weighed
 * up to 3.1 (Saturn or Mars in a good house with strong ashtakavarga), more than Tara bala, Chandra
 * bala and even Chandrashtama, so one transit could lead and colour the day for weeks on end. Both
 * outcomes of such a planet are scaled down together, which keeps its zero mean, so that a day's
 * gochara reason weighs at most 1 × 1.2 × 1.25 = 1.5, Chandra bala in a bad sign.
 */
export const GOCHARA_MAX_BALANCE = DAY_WEIGHTS.chandraBala / STRENGTH_FACTOR.strong

/**
 * Balancing of the cyclic factors. The classical tables call most houses unfavourable for the
 * malefics (Saturn, Mars and the nodes are good in 3 of 12, the Sun in 4), so plain ±1 votes make a
 * typical day score about -0.12 and half of all days "challenging". Instead each factor's weight
 * is split between its good and bad outcomes so that it averages zero over its full cycle while
 * its mean weight over those outcomes stays the nominal one: with shares g and b of good and bad
 * outcomes the good weight is w(g+b)/(2g) and the bad weight w(g+b)/(2b). For gochara both are
 * then scaled down when the larger exceeds GOCHARA_MAX_BALANCE (gocharaBalance). The score is still
 * exactly Σ effect·weight / Σ weight over the reasons as returned.
 */
export function balanceFactor(goodShare: number, badShare: number, effect: Effect): number {
  if (effect === 0) return 1
  const decided = goodShare + badShare
  return effect > 0 ? decided / (2 * goodShare) : decided / (2 * badShare)
}

/**
 * Long-run shares of good and bad gochara outcomes per planet, after vedha and vipareeta vedha by
 * the seven grahas (the rest of the time the result is neutralised). Measured with gochara() every
 * 3.7 days over 1900-2100 for all twelve natal Moon signs (tests/predict.test.ts re-checks them).
 * Balancing on the house counts alone left the score at about -0.09 on average, with 42% of days
 * "challenging": vedha cancels the few good houses of the malefics far more often than vipareeta
 * vedha relieves their many bad ones (Saturn is good 25% of the time by its table, 17% in effect).
 */
export const GOCHARA_SHARES: Readonly<Record<Planet, readonly [good: number, bad: number]>> = {
  Sun: [0.277, 0.61], Moon: [0.334, 0.334], Mars: [0.165, 0.665], Mercury: [0.318, 0.347], Jupiter: [0.265, 0.432],
  Venus: [0.527, 0.19], Saturn: [0.167, 0.667], Rahu: [0.147, 0.647], Ketu: [0.148, 0.648],
}

/** balanceFactor for a planet's gochara, with both outcomes scaled so that neither exceeds GOCHARA_MAX_BALANCE. */
export function gocharaBalance(planet: Planet, effect: Effect): number {
  if (effect === 0) return 1
  const [good, bad] = GOCHARA_SHARES[planet]
  const scale = Math.min(1, GOCHARA_MAX_BALANCE / Math.max(balanceFactor(good, bad, 1), balanceFactor(good, bad, -1)))
  return balanceFactor(good, bad, effect) * scale
}
/** Tara bala: 5 of the 9 taras are good, 3 adverse and Janma mixed. */
const TARA_BALANCE = (effect: Effect) => balanceFactor(5 / 9, 3 / 9, effect)

/** Reason factors that explain context but do not vote in the score. */
export const INFORMATIONAL_FACTORS: readonly string[] = ['dasha', 'moon_change']

/**
 * Over a week or more only Jupiter and Saturn count as obstructors: a faster planet's vedha lasts a
 * few days at most and is already reflected in the daily scores.
 */
const SLOW_CASTERS: readonly Planet[] = ['Jupiter', 'Saturn']
const SLOW_PLANETS: readonly Planet[] = ['Jupiter', 'Saturn', 'Rahu', 'Ketu']

/** Muntha houses (from the annual ascendant) counted as good; the rest (4, 6, 7, 8, 12) as difficult. */
export const MUNTHA_FAVOURABLE_HOUSES: readonly number[] = [1, 2, 3, 5, 9, 10, 11]

export const ratingFor = (score: number): Rating =>
  score >= FAVOURABLE_AT ? 'favourable' : score <= CHALLENGING_AT ? 'challenging' : 'mixed'

/**
 * Rating of a day. A day ruled by Chandrashtama (the Moon in the 8th sign from the birth Moon for
 * most of the daytime) is the classic day to go slow in panchang practice (PanchangBodh, Hindupad,
 * AstroVed Chandrashtama calendars), so however its other factors add up it is never
 * 'favourable', and it is 'challenging' unless they are clearly positive. The score is kept as
 * computed for the dial and the period averages.
 */
export const dayRating = (score: number, chandrashtama: boolean): Rating =>
  !chandrashtama ? ratingFor(score) : score >= FAVOURABLE_AT ? 'mixed' : 'challenging'

const round = (x: number, digits: number) => Math.round(x * 10 ** digits) / 10 ** digits + 0

/** Σ effect·weight / Σ weight over the scored reasons, in [-1, 1]; 0 when nothing is scored. */
export function scoreReasons(reasons: readonly Reason[]): number {
  let num = 0
  let den = 0
  for (const r of reasons) {
    if (INFORMATIONAL_FACTORS.includes(r.factor)) continue
    num += r.effect * r.weight
    den += r.weight
  }
  return den ? round(num / den, 3) : 0
}

const mean = (xs: readonly number[]) => (xs.length ? round(xs.reduce((a, b) => a + b, 0) / xs.length, 3) : 0)

// ---------------------------------------------------------------------------------------------
// Context and caches

/** Where the user is now: sunrise, Rahu Kalam and the day boundaries are local to it. */
export interface Place {
  latitude: number
  longitude: number
  timeZone: string
}

/** Bounds of one Vedic day at the context's place. */
export interface DaySpan {
  date: string
  /** Sunrise, sunset and next sunrise; 06:00, 18:00 and 06:00 local in polar day or night. */
  start: number
  sunset: number
  end: number
  solarDay: SolarDay | null
}

/** Transit events and Chandrashtama stays over one contiguous JD range. */
interface Coverage {
  start: number
  end: number
  events: TimedEvent[]
  chandrashtama: TimeWindow[]
}

export interface PredictContext {
  readonly birth: BirthInput
  readonly settings: Settings
  readonly place: Place
  readonly chart: Chart
  readonly natal: { readonly moonSign: SignIndex; readonly moonNakshatra: number; readonly ascSign: SignIndex }
  /** Vimsottari to pratyantardashas, two 120-year cycles. */
  readonly dashas: DashaPeriod[]
  readonly ashtakavarga: Ashtakavarga
  /** What each planet promises in this chart (lordship, placement, strength, yogas). */
  readonly promise: Readonly<Record<Planet, LordPromise>>
  /** Internal caches, filled lazily. */
  readonly cache: {
    spans: Map<string, DaySpan>
    days: Map<string, Forecast>
    saturn: Map<number, SaturnPeriod[]>
    coverage: Coverage | null
  }
}

/** Cast the chart once and prepare the caches. Throws for an invalid birth input or place. */
export function createContext(birth: BirthInput, settings: Settings, place: Place): PredictContext {
  const { latitude, longitude, timeZone } = place
  if (!Number.isFinite(latitude) || Math.abs(latitude) >= 90) throw new Error('Place latitude must be between -90 and 90')
  if (!Number.isFinite(longitude) || Math.abs(longitude) > 180) throw new Error('Place longitude must be between -180 and 180')
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown time zone "${timeZone}"`)
  const chart = castChart(birth, settings)
  const moon = chart.positions.Moon
  return {
    birth: { ...birth },
    settings: { ...settings },
    place: { latitude, longitude, timeZone },
    chart,
    natal: { moonSign: moon.sign, moonNakshatra: moon.nakshatra.index, ascSign: chart.positions.Asc.sign },
    dashas: vimsottari(moon.longitude, chart.jd, settings.yearModel, 2, 2),
    ashtakavarga: ashtakavarga(chart.vargas[1]),
    promise: analyseNatal(chart).promise,
    cache: { spans: new Map(), days: new Map(), saturn: new Map(), coverage: null },
  }
}

const CONTEXTS = new Map<string, PredictContext>()
const MAX_CONTEXTS = 4

/**
 * Days (and day spans) kept per context, about two years: a year view with its neighbouring weeks
 * stays cached, while stepping through many years in one session neither grows the worker's memory
 * without bound nor slows each new year down.
 */
export const DAY_CACHE_LIMIT = 800

/** Least-recently-used lookup: a hit moves the entry to the back, so the oldest is evicted first. */
function cacheGet<K, V>(map: Map<K, V>, key: K): V | undefined {
  const value = map.get(key)
  if (value !== undefined) {
    map.delete(key)
    map.set(key, value)
  }
  return value
}

function cacheSet<K, V>(map: Map<K, V>, key: K, value: V, limit = DAY_CACHE_LIMIT): void {
  map.set(key, value)
  while (map.size > limit) map.delete(map.keys().next().value!)
}

/**
 * A memoised context for the worker API, whose callers cannot hold a context across calls:
 * the same birth, settings and place reuse one context and its caches.
 */
export function contextFor(birth: BirthInput, settings: Settings, place: Place): PredictContext {
  const key = JSON.stringify([birth, settings, place])
  let ctx = CONTEXTS.get(key)
  if (ctx) CONTEXTS.delete(key)
  else ctx = createContext(birth, settings, place)
  CONTEXTS.set(key, ctx)
  if (CONTEXTS.size > MAX_CONTEXTS) CONTEXTS.delete(CONTEXTS.keys().next().value!)
  return ctx
}

/** Forget every memoised context: their cached days and events hold text in the language they were made in. */
export function resetForecastCaches(): void {
  CONTEXTS.clear()
}

/** The Sun's rising on civil `date`, if it rises that day (it can rise without setting near polar day). */
function sunriseOn(ctx: PredictContext, date: string): number | null {
  const { latitude, longitude, timeZone } = ctx.place
  const sr = nextSolarEvent(localToJd(date, timeZone, '00:00'), latitude, longitude)
  return sr !== null && jdToLocal(sr, timeZone).date === date ? sr : null
}

/** The Vedic day that begins on civil `date` (cached): the span every day forecast is judged over. */
export function daySpan(ctx: PredictContext, date: string): DaySpan {
  let span = cacheGet(ctx.cache.spans, date)
  if (!span) {
    const { latitude, longitude, timeZone } = ctx.place
    const sd = solarDayForDate(date, latitude, longitude, timeZone)
    if (sd) {
      span = { date, start: sd.sunriseJd, sunset: sd.sunsetJd, end: sd.nextSunriseJd, solarDay: sd }
    } else {
      // Polar day or night: 06:00 to 06:00, but meeting a real sunrise on either side so that
      // consecutive days neither overlap nor leave a gap where the Sun starts or stops rising.
      const next = addDays(date, 1)
      const start = sunriseOn(ctx, date) ?? localToJd(date, timeZone, '06:00')
      const end = sunriseOn(ctx, next) ?? localToJd(next, timeZone, '06:00')
      const evening = localToJd(date, timeZone, '18:00')
      span = { date, solarDay: null, start, end, sunset: evening > start && evening < end ? evening : (start + end) / 2 }
    }
    cacheSet(ctx.cache.spans, date, span)
  }
  return span
}

/**
 * The civil date whose Vedic day (sunrise to sunrise at the context's place) contains `jd`, the
 * date to pass to forecastDay for "now": before sunrise it is still the previous day.
 */
export function vedicDateAt(ctx: PredictContext, jd: number): string {
  const date = jdToLocal(jd, ctx.place.timeZone).date
  return jd < daySpan(ctx, date).start ? addDays(date, -1) : date
}

/** Days of margin around a request: longer than any stay of the Moon in one sign (about 2.7 days). */
const COVER_MARGIN = 3
/** A request farther than this from the cached range starts a new cache instead of filling the gap. */
const COVER_GAP = 800
/** Nor does the cached range grow past this many days (about three years): a longer one starts afresh. */
export const COVER_LIMIT = 1100

function computeCoverage(ctx: PredictContext, start: number, end: number): Coverage {
  return {
    start, end,
    events: eventsBetween(start, end, ctx.settings).map((e) => annotate(ctx, e)),
    chandrashtama: chandrashtamaWindows(ctx.natal.moonSign, start, end, ctx.settings),
  }
}

/**
 * Events and Chandrashtama stays covering [a, b], extending the cached range as needed. Both
 * sources sample fixed absolute grids, so adjacent ranges share boundary events exactly and a
 * stay found from both sides has bit-identical instants.
 */
function cover(ctx: PredictContext, a: number, b: number): Coverage {
  const from = Math.floor(a - COVER_MARGIN)
  const to = Math.ceil(b + COVER_MARGIN)
  const c = ctx.cache.coverage
  if (c && from >= c.start && to <= c.end) return c
  let next: Coverage
  if (!c || from > c.end + COVER_GAP || to < c.start - COVER_GAP || Math.max(to, c.end) - Math.min(from, c.start) > COVER_LIMIT) {
    next = computeCoverage(ctx, from, to)
  } else {
    const before = from < c.start ? computeCoverage(ctx, from, c.start) : null
    const after = to > c.end ? computeCoverage(ctx, c.end, to) : null
    const windows = new Map<number, TimeWindow>()
    for (const w of [...(before?.chandrashtama ?? []), ...c.chandrashtama, ...(after?.chandrashtama ?? [])]) windows.set(w.startJd, w)
    next = {
      start: Math.min(from, c.start),
      end: Math.max(to, c.end),
      events: [...(before?.events ?? []), ...c.events, ...(after?.events ?? [])],
      chandrashtama: [...windows.values()].sort((x, y) => x.startJd - y.startJd),
    }
  }
  ctx.cache.coverage = next
  return next
}

/** Index of the first event at or after `jd`; coverage events are sorted by time. */
function firstEventAt(events: readonly TimedEvent[], jd: number): number {
  let lo = 0
  let hi = events.length
  while (lo < hi) {
    const mid = (lo + hi) >>> 1
    if (events[mid].jd < jd) lo = mid + 1
    else hi = mid
  }
  return lo
}

/** The covered events in [a, b), by binary search rather than a scan of the whole range. */
const eventsIn = (cov: Coverage, a: number, b: number): TimedEvent[] => cov.events.slice(firstEventAt(cov.events, a), firstEventAt(cov.events, b))

/** Saturn's phases overlapping a calendar year (civil midnights in the place's zone; cached per year). */
export function saturnYear(ctx: PredictContext, year: number): SaturnPeriod[] {
  let periods = ctx.cache.saturn.get(year)
  if (!periods) {
    const zone = ctx.place.timeZone
    periods = saturnPhases(ctx.natal.moonSign, localToJd(`${year}-01-01`, zone), localToJd(`${year + 1}-01-01`, zone), ctx.settings)
    ctx.cache.saturn.set(year, periods)
  }
  return periods
}

// ---------------------------------------------------------------------------------------------
// Text helpers

// Every user-facing word comes from the active interpretation pack (content/active.ts), so a
// forecast reads in the language the worker was set to; dates go through the pack's formats.

/** "Tue 20 Oct" (or "20 Oct"). */
const dateLabel = (date: string, weekday = true): string => T.E.dateLabel(date, weekday)

/** Dates grouped into consecutive runs: "Tue 20 Oct and Sat 24 – Sun 25 Oct". */
const dateList = (dates: readonly string[], weekday = true): string => T.E.dateList(dates, weekday)

/**
 * Local clock time of `jd`, followed by the date when it falls outside the civil `date`
 * ("04:03 on Thu 15 Oct"). Time and date come from one minute-rounded reading, so 23:59:40
 * reads "00:00 on" the next day rather than 00:00 on the same day.
 */
function clock(ctx: PredictContext, jd: number, date: string): string {
  const p = jdToLocal(jd, ctx.place.timeZone, 'minute')
  return p.date === date ? p.time : T.E.clockOn(p)
}

/** "2 Jun 2027" in the place's zone. */
const fullDate = (ctx: PredictContext, jd: number) => T.E.fullDate(jdToLocal(jd, ctx.place.timeZone))

/** "until 2 Jun 2027", "from 2 Jun 2027", "2 Jun – 9 Oct 2027" or "all year" relative to [a, b). */
function spanLabel(ctx: PredictContext, startJd: number, endJd: number, a: number, b: number, whole: string): string {
  if (startJd <= a && endJd >= b) return whole
  if (startJd <= a) return T.E.until(fullDate(ctx, endJd))
  if (endJd >= b) return T.E.from(fullDate(ctx, startJd))
  return T.E.range(fullDate(ctx, startJd), fullDate(ctx, endJd))
}

const effectOfClass = (c: 'good' | 'mixed' | 'adverse'): Effect => (c === 'good' ? 1 : c === 'mixed' ? 0 : -1)

/** Adds a plain-language title, detail and effect to transit events, judged from the natal Moon. */
function annotate(ctx: PredictContext, e: TimedEvent): TimedEvent {
  const body = e.body
  if (!body) return e
  switch (e.kind) {
    case 'ingress':
    case 'sankranti': {
      const h = houseFrom(ctx.natal.moonSign, e.sign!)
      // events.ts titles a retrograde step back into the previous sign "moves back".
      const title = T.E.ingressTitle(body, e.sign!, e.title.includes('moves back'))
      return { ...e, title, detail: T.E.fromMoonDetail(h, T.GOCHARA_TEXT[body][h - 1]), effect: GOCHARA_RULES[body].favourable.includes(h) ? 1 : -1 }
    }
    case 'moon_sign': {
      const cb = chandraBala(ctx.natal.moonSign, e.sign!)
      return { ...e, title: T.E.ingressTitle('Moon', e.sign!, false), detail: T.E.fromMoonDetail(cb.house, cb.good ? T.CHANDRA_BALA_TEXT.good : T.CHANDRA_BALA_TEXT.bad), effect: cb.good ? 1 : -1 }
    }
    case 'moon_nakshatra': {
      const tara = taraBala(ctx.natal.moonNakshatra, e.nakshatra!)
      return { ...e, title: T.E.nakshatraTitle(e.nakshatra!), detail: T.E.taraDetail(T.names.tara[tara.name], T.TARA_TEXT[tara.name]), effect: effectOfClass(tara.classification) }
    }
    case 'retrograde':
    case 'direct':
      return { ...e, title: T.E.stationTitle(body, e.kind, e.sign!), detail: T.STATION_TEXT[e.kind](body, T.PLANET_THEMES[body].short), effect: 0 }
    default:
      return e
  }
}

/** Chandrashtama begins/ends events inside [a, b). */
function chandrashtamaEvents(ctx: PredictContext, cov: Coverage, a: number, b: number): TimedEvent[] {
  const sign = advanceSign(ctx.natal.moonSign, 8)
  const out: TimedEvent[] = []
  for (const w of cov.chandrashtama) {
    if (w.startJd >= a && w.startJd < b) {
      out.push({
        jd: w.startJd, kind: 'chandrashtama', body: 'Moon', sign, title: T.E.chandrashtamaBegins,
        detail: T.E.chandrashtamaEnterDetail(sign, T.E.dateTime(jdToLocal(w.endJd, ctx.place.timeZone, 'minute'))), effect: -1,
      })
    }
    if (w.endJd >= a && w.endJd < b) {
      out.push({ jd: w.endJd, kind: 'chandrashtama', body: 'Moon', title: T.E.chandrashtamaEnds, detail: T.E.chandrashtamaLeaveDetail, effect: 0 })
    }
  }
  return out
}

/** Dasha changes in [a, b) down to `level`, titled in the pack's words for the level that changes. */
function dashaEvents(ctx: PredictContext, a: number, b: number, level: 0 | 1 | 2): TimedEvent[] {
  return dashaChanges(ctx.dashas, a, b, level).map((e) => {
    const chain = dashaChainAt(ctx.dashas, e.jd)
    // The event is named after the highest level that starts at its instant.
    const at = Math.max(0, chain.findIndex((p) => p.startJd === e.jd))
    const p = chain[at]
    return p ? { ...e, ...T.E.dashaEvent(at, p.lord, chain.slice(0, at + 1).map((x) => x.lord), p.endJd - p.startJd) } : e
  })
}

/** Events in [a, b): transit events passing `keep`, dasha changes and optionally Chandrashtama boundaries. */
function periodEvents(
  ctx: PredictContext, a: number, b: number, keep: (e: TimedEvent) => boolean, dashaLevel: 0 | 1 | 2, withChandrashtama: boolean,
): TimedEvent[] {
  const cov = cover(ctx, a, b)
  const out = eventsIn(cov, a, b).filter(keep)
  if (withChandrashtama) out.push(...chandrashtamaEvents(ctx, cov, a, b))
  out.push(...dashaEvents(ctx, a, b, dashaLevel))
  return out.sort((x, y) => x.jd - y.jd)
}

/** The running dasha chain without its sub-period trees (they would bloat every forecast). */
const chainAt = (ctx: PredictContext, jd: number): DashaPeriod[] =>
  dashaChainAt(ctx.dashas, jd).map(({ lord, level, startJd, endJd }) => ({ lord, level, startJd, endJd }))

/** Multiplier of a transit's weight from the planet's functional nature for the lagna (FUNCTIONAL_TILT). */
export function functionalTilt(promise: LordPromise, effect: Effect): number {
  const friendly = promise.yogakaraka || promise.role === 'benefic'
  if (effect === 0 || (!friendly && promise.role !== 'malefic')) return 1
  return 1 + FUNCTIONAL_TILT * (friendly ? effect : -effect)
}

/**
 * A gochara outcome's weight: nominal x balance x ashtakavarga strength x functional tilt, never
 * above the untilted maximum, so no transit outweighs Chandra bala in a bad sign.
 */
function gocharaWeight(ctx: PredictContext, row: GocharaRow, baseWeight: number): number {
  const raw = baseWeight * gocharaBalance(row.planet, row.effect) * STRENGTH_FACTOR[row.strength] * functionalTilt(ctx.promise[row.planet], row.effect)
  return round(Math.min(raw, baseWeight * GOCHARA_MAX_BALANCE * STRENGTH_FACTOR.strong), 2)
}

function gocharaReason(ctx: PredictContext, row: GocharaRow, baseWeight: number, factor: string, title: string): Reason {
  const h = row.houseFromMoon
  const text = [T.GOCHARA_TEXT[row.planet][h - 1]]
  const sources: string[] = [T.SOURCES.gochara]
  if (row.vedhaBy) {
    text.push(T.vedhaNote(row.planet, row.vedhaBy, GOCHARA_RULES[row.planet].vedha[h]))
    sources.push(T.SOURCES.vedha)
  } else if (row.vipareetaVedhaBy) {
    text.push(T.vipareetaNote(row.vipareetaVedhaBy, VIPAREETA_VEDHA[row.planet][h]))
    sources.push(T.SOURCES.vedha)
  } else if (row.bindus !== undefined && row.strength !== 'normal') {
    text.push(T.binduNote(row.bindus, row.favourable))
    sources.push(T.SOURCES.ashtakavarga)
  }
  const promise = ctx.promise[row.planet]
  if (functionalTilt(promise, row.effect) !== 1 && text.length < 3) {
    text.push(T.functionalNote(promise.role, promise.yogakaraka, row.effect))
    sources.push(T.SOURCES.functional)
  }
  return { factor, effect: row.effect, weight: gocharaWeight(ctx, row, baseWeight), title, text: text.join(' '), source: sources.join('. ') }
}

const gocharaTitle = (row: GocharaRow, suffix = '') => T.E.gocharaTitle(row.planet, row.houseFromMoon, suffix)

/** Scored reasons first, heaviest first; informational ones last. */
function sortReasons(reasons: Reason[]): Reason[] {
  const info = (r: Reason) => INFORMATIONAL_FACTORS.includes(r.factor)
  return reasons.sort((x, y) => Number(info(x)) - Number(info(y)) || y.weight - x.weight)
}

/** Strongest scored reason with the given effect, by weight times `priority` (default 1). */
function strongest(reasons: readonly Reason[], effect: 1 | -1, priority: (r: Reason) => number = () => 1): Reason | undefined {
  let best: Reason | undefined
  let bestValue = 0
  for (const r of reasons) {
    const value = r.weight * priority(r)
    if (r.effect === effect && !INFORMATIONAL_FACTORS.includes(r.factor) && value > bestValue) {
      best = r
      bestValue = value
    }
  }
  return best
}

const DAILY_FACTORS: readonly string[] = ['tara_bala', 'chandra_bala', 'chandrashtama', 'tithi', 'vishti']

/**
 * A day's headline should say what is special about that day, so the Moon's daily factors lead
 * and the slow planets, which colour months and years alike, come last.
 */
const dayPriority = (r: Reason) =>
  DAILY_FACTORS.includes(r.factor) ? 1.5 : r.factor === 'dasha_promise' || SLOW_PLANETS.some((p) => r.factor === `gochara_${p}`) ? 0.5 : 1

// ---------------------------------------------------------------------------------------------
// Day

const RIKTA_TITHIS: readonly number[] = [4, 9, 14]
const TIME_TOLERANCE_DAYS = 1e-4 // about 9 seconds; times are shown to the minute
/** Sampling step for Vishti and tithis: far shorter than the 9.4 hours a karana lasts at the very least. */
const VISHTI_STEP_DAYS = 0.15
/** A Rikta tithi or Amavasya holding less of the daytime than this (an hour) is left out. */
const MIN_TITHI_DAYS = 1 / 24

const tithiAt = (jd: number, settings: Settings) => Math.floor(norm(moonLongitude(jd, settings) - sunLongitude(jd, settings)) / 12) + 1

/**
 * The tithis of [a, b], each with the part of it that it holds. A tithi lasts 19 hours or more, so
 * one sampling step holds at most one change.
 */
function tithiSpans(settings: Settings, a: number, b: number): { tithi: number; from: number; to: number }[] {
  const n = Math.max(2, Math.ceil((b - a) / VISHTI_STEP_DAYS))
  const t = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const ids = t.map((x) => tithiAt(x, settings))
  const out = [{ tithi: ids[0], from: a, to: b }]
  for (let i = 1; i <= n; i++) {
    if (ids[i] === ids[i - 1]) continue
    const before = ids[i - 1]
    const cut = bisectInstant((x) => tithiAt(x, settings) !== before, t[i - 1], t[i], TIME_TOLERANCE_DAYS)
    out.at(-1)!.to = cut
    out.push({ tithi: ids[i], from: cut, to: b })
  }
  return out
}

/** Name of tithi 1..30 within its fortnight ("Navami"), and its full label ("Sukla Navami", "Amavasya"). */
const tithiName = (tithi: number) => T.E.tithiName(tithi)
const tithiLabel = (tithi: number) => T.E.tithiLabel(tithi)

const isVishti = (jd: number, settings: Settings) => {
  const half = Math.floor(norm(moonLongitude(jd, settings) - sunLongitude(jd, settings)) / 6)
  return half >= 1 && half <= 56 && (half - 1) % 7 === 6
}

/** The part of [a, b] under Vishti karana, or null. A karana lasts 9 hours or more, so it recurs at most once. */
function vishtiSpan(settings: Settings, a: number, b: number): [number, number] | null {
  const n = Math.max(2, Math.ceil((b - a) / VISHTI_STEP_DAYS))
  const t = Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n)
  const flags = t.map((x) => isVishti(x, settings))
  const i0 = flags.indexOf(true)
  if (i0 < 0) return null
  const i1 = flags.lastIndexOf(true)
  const from = i0 === 0 ? a : bisectInstant((x) => isVishti(x, settings), t[i0 - 1], t[i0], TIME_TOLERANCE_DAYS)
  const to = i1 === n ? b : bisectInstant((x) => !isVishti(x, settings), t[i1], t[i1 + 1], TIME_TOLERANCE_DAYS)
  return [from, to]
}

/** Forecast for the Vedic day that begins at sunrise on civil `date` ("YYYY-MM-DD") at the context's place. */
export function forecastDay(ctx: PredictContext, date: string): Forecast {
  const cached = cacheGet(ctx.cache.days, date)
  if (cached) return cached
  const { settings, natal } = ctx
  const span = daySpan(ctx, date)
  const cov = cover(ctx, span.start, span.end)
  const pos = planetPositions(span.start, settings)
  const reasons: Reason[] = []
  const at = (jd: number) => clock(ctx, jd, date)

  // The Moon's sign and star are those it holds at the middle of the daytime, i.e. for most of it.
  const middle = (span.start + span.sunset) / 2
  const moonChanges = eventsIn(cov, span.start, span.end).filter((e) => e.kind === 'moon_sign' || e.kind === 'moon_nakshatra')
  let moonSign = pos.Moon.sign
  let moonStar = pos.Moon.nakshatra.index
  for (const e of moonChanges) {
    if (e.jd > middle) break
    if (e.kind === 'moon_sign') moonSign = e.sign!
    else moonStar = e.nakshatra!
  }
  if (moonChanges.length) {
    // Sign and star boundaries coincide every 30 degrees: "Leo and Magha nakshatra at 22:18".
    const moves: { names: string[]; time: string }[] = []
    for (const e of moonChanges) {
      const name = e.kind === 'moon_sign' ? T.E.moonSign(e.sign!) : T.E.moonStar(e.nakshatra!)
      const time = at(e.jd)
      if (moves.at(-1)?.time === time) moves.at(-1)!.names.push(name)
      else moves.push({ names: [name], time })
    }
    reasons.push({
      factor: 'moon_change', effect: 0, weight: DAY_WEIGHTS.info, title: T.E.moonChangeTitle,
      text: `${T.E.moonMoves(moves)} ${T.MOON_CHANGE_TEXT}`, source: T.SOURCES.moonChange,
    })
  }

  const tara = taraBala(natal.moonNakshatra, moonStar)
  const taraEffect = effectOfClass(tara.classification)
  reasons.push({
    factor: 'tara_bala', effect: taraEffect, weight: round(DAY_WEIGHTS.tara * TARA_BALANCE(taraEffect), 2),
    title: T.E.taraTitle(T.names.tara[tara.name], moonStar), text: T.TARA_TEXT[tara.name], source: T.SOURCES.tara,
  })

  const eighth = advanceSign(natal.moonSign, 8)
  const ruled = moonSign === eighth
  const stay = cov.chandrashtama.find((w) => w.startJd < span.end && w.endJd > span.start)
  /** On a day the stay only touches, the caution says when it begins or ends rather than "while the Moon crosses". */
  let stayCaution: string | undefined
  if (stay) {
    // A stay that begins after midnight begins "tomorrow" for the headline, which keeps it short.
    const short = (jd: number) => {
      const p = jdToLocal(jd, ctx.place.timeZone, 'minute')
      return p.date === date ? p.time : T.E.timeTomorrow(p.time)
    }
    stayCaution = ruled ? undefined : stay.startJd <= span.start ? T.chandrashtamaCaution({ until: short(stay.endJd) }) : T.chandrashtamaCaution({ from: short(stay.startJd) })
    const weight = ruled ? DAY_WEIGHTS.chandrashtama
      : stay.startJd < span.sunset && stay.endJd > span.start ? DAY_WEIGHTS.chandrashtamaPartial : DAY_WEIGHTS.chandrashtamaNight
    const when = stay.startJd <= span.start ? T.E.until(at(stay.endJd)) : stay.endJd < span.end ? T.E.fromTo(at(stay.startJd), at(stay.endJd)) : T.E.from(at(stay.startJd))
    reasons.push({
      factor: 'chandrashtama', effect: -1, weight, title: T.E.chandrashtamaTitle(when),
      text: T.CHANDRASHTAMA_TEXT, source: T.SOURCES.chandrashtama,
    })
  }
  // Chandrashtama already counts the 8th-house Moon; Chandra bala would count it twice.
  if (!ruled) {
    const cb = chandraBala(natal.moonSign, moonSign)
    reasons.push({
      factor: 'chandra_bala', effect: cb.good ? 1 : -1, weight: cb.good ? CHANDRA_BALA_GOOD : DAY_WEIGHTS.chandraBala,
      title: T.E.chandraBalaTitle(cb.house), text: T.GOCHARA_TEXT.Moon[cb.house - 1], source: T.SOURCES.chandraBala,
    })
  }

  // The Moon obstructs (and is obstructed) from the sign it holds for most of the daytime.
  const rows = gochara(natal.moonSign, { ...pos, Moon: { ...pos.Moon, sign: moonSign } }, { bav: ctx.ashtakavarga.bav, natalAscSign: natal.ascSign })
  for (const row of rows) {
    if (GOCHARA_WEIGHTS[row.planet] > 0) reasons.push(gocharaReason(ctx, row, GOCHARA_WEIGHTS[row.planet], `gochara_${row.planet}`, gocharaTitle(row)))
  }

  const chain = chainAt(ctx, span.start)
  if (chain.length >= 2) {
    const ad = chain[1]
    reasons.push(...dashaInfo(ctx, chain), ...dashaPromiseReasons(ctx, chain))
    const row = rows.find((r) => r.planet === ad.lord)!
    reasons.push({
      factor: 'dasha_transit', effect: row.effect, weight: gocharaWeight(ctx, row, DAY_WEIGHTS.dashaTransit),
      title: T.E.dashaTransitTitle(ad.lord, row.houseFromMoon), text: T.dashaTransitText(ad.lord, row.effect), source: T.SOURCES.dashaTransit,
    })
  }

  // Panchanga cautions for the daytime, when new things are begun: a Rikta tithi or Amavasya, weighted
  // by the share of the daytime it holds (a tithi often changes mid-morning, so the one at sunrise
  // alone can mislead), and Vishti karana, each with its times.
  const daytime = (from: number, to: number) => from <= span.start && to >= span.sunset ? T.E.throughDaytime
    : from <= span.start ? T.E.until(at(to)) : to >= span.sunset ? T.E.from(at(from)) : T.E.fromTo(at(from), at(to))
  const tithis = tithiSpans(settings, span.start, span.sunset)
  for (const [i, t] of tithis.entries()) {
    const amavasya = t.tithi === 30
    if ((!amavasya && !RIKTA_TITHIS.includes(((t.tithi - 1) % 15) + 1)) || t.to - t.from < MIN_TITHI_DAYS) continue
    const when = daytime(t.from, t.to)
    const next = tithis[i + 1] && tithiLabel(tithis[i + 1].tithi)
    const weight = round(DAY_WEIGHTS.tithi * Math.min(1, (t.to - t.from) / (span.sunset - span.start)), 2)
    reasons.push(amavasya
      ? { factor: 'tithi', effect: -1, weight, title: T.E.amavasyaTitle(when), text: T.PANCHANGA_TEXT.amavasya(when, next), source: T.SOURCES.tithi }
      : { factor: 'tithi', effect: -1, weight, title: T.E.riktaTitle(tithiLabel(t.tithi), when), text: T.PANCHANGA_TEXT.rikta(tithiName(t.tithi), when, next), source: T.SOURCES.tithi })
  }
  const vishti = vishtiSpan(settings, span.start, span.sunset)
  if (vishti) {
    const when = daytime(...vishti)
    reasons.push({ factor: 'vishti', effect: -1, weight: DAY_WEIGHTS.vishti, title: T.E.vishtiTitle(when), text: T.PANCHANGA_TEXT.vishti(when), source: T.SOURCES.vishti })
  }

  const score = scoreReasons(reasons)
  const rating = dayRating(score, ruled)
  const timings = span.solarDay ? timingsForSolarDay(span.solarDay, date, ctx.place.timeZone) : undefined
  // "A well-placed Moon" would read oddly beside the Moon's stay in the 8th, whatever part of the day it covers.
  const support = strongest(reasons, 1, stay ? (r) => (r.factor === 'chandra_bala' ? 0 : dayPriority(r)) : dayPriority)
  const supportPhrase = support && T.SUPPORT_PHRASE[support.factor]
  const caution = strongest(reasons, -1, dayPriority)
  const cautionPhrase = caution ? (caution.factor === 'chandrashtama' && stayCaution) || T.CAUTION_PHRASE[caution.factor] : timings && T.CAUTION_PHRASE.rahu_kalam
  const variant = Number(date.slice(8))
  const forecast: Forecast = {
    horizon: 'day', start: date, end: date, rating, score,
    // On a Chandrashtama day the 8th-sign Moon leads the headline, whatever else weighs more.
    headline: ruled ? T.chandrashtamaHeadline(rating, supportPhrase, variant) : T.dayHeadline(rating, supportPhrase, cautionPhrase, variant),
    reasons: sortReasons(reasons),
    events: periodEvents(ctx, span.start, span.end, () => true, 2, true),
    dasha: chain,
  }
  if (timings) forecast.timings = timings
  cacheSet(ctx.cache.days, date, forecast)
  return forecast
}

// ---------------------------------------------------------------------------------------------
// Week and month

const pad2 = (n: number) => String(n).padStart(2, '0')
const datesFrom = (start: string, count: number) => Array.from({ length: count }, (_, i) => addDays(start, i))

function withoutTimings(day: Forecast): Forecast {
  const light = { ...day }
  delete light.timings
  return light
}

/** "Fri 2 Oct 15:41" (or "2 Oct 15:41"): an instant to the minute in the place's zone. */
function instantLabel(ctx: PredictContext, jd: number, weekday: boolean): string {
  const p = jdToLocal(jd, ctx.place.timeZone, 'minute')
  return T.E.instant(p, weekday)
}

/** The Moon holds the 8th sign from the birth Moon for at least part of the daytime. */
const daytimeChandrashtama = (d: Forecast) => d.reasons.some((r) => r.factor === 'chandrashtama' && r.weight >= DAY_WEIGHTS.chandrashtamaPartial)

/**
 * The days a week or month summary names, as reasons, headline labels and dates, so that the
 * summary and the day lists agree. The best days are the highest-scoring favourable days (else the
 * best day above zero) clear of a daytime Chandrashtama; the careful days are the lowest-scoring
 * challenging days, so a day rated favourable is never among them. Chandrashtama is given as its
 * stays with their times rather than as days: a stay that begins in the evening leaves most of its
 * first day as rated.
 */
function dayHighlights(
  ctx: PredictContext, days: readonly Forecast[], a: number, b: number, max: number, weekday: boolean,
): { reasons: Reason[]; best?: string; careful?: string; highlights: PeriodHighlights } {
  const reasons: Reason[] = []
  const pick = (ranked: readonly Forecast[]) => ranked.slice(0, max).map((d) => d.start).sort()
  const ranked = days.filter((d) => !daytimeChandrashtama(d)).sort((x, y) => y.score - x.score)
  let best = pick(ranked.filter((d) => d.rating === 'favourable'))
  if (!best.length && ranked[0] && ranked[0].score > 0) best = [ranked[0].start]
  const bestLabel = best.length ? dateList(best, weekday) : undefined
  if (bestLabel) {
    reasons.push({ factor: 'best_days', effect: 1, weight: 1, title: T.E.bestDaysTitle(best.length, bestLabel), text: T.PERIOD_TEXT.bestDays(bestLabel), source: T.SOURCES.summary })
  }
  const careful = pick(days.filter((d) => d.rating === 'challenging').sort((x, y) => x.score - y.score))
  const carefulLabel = careful.length ? dateList(careful, weekday) : undefined
  if (carefulLabel) {
    reasons.push({ factor: 'careful_days', effect: -1, weight: 1, title: T.E.carefulDaysTitle(carefulLabel), text: T.PERIOD_TEXT.toughDays(carefulLabel), source: T.SOURCES.summary })
  }
  const stays = cover(ctx, a, b).chandrashtama.filter((w) => w.startJd < b && w.endJd > a)
  for (const w of stays) {
    const [from, to] = [instantLabel(ctx, w.startJd, weekday), instantLabel(ctx, w.endJd, weekday)]
    reasons.push({
      factor: 'chandrashtama', effect: -1, weight: 1.5, title: T.E.chandrashtamaStayTitle(from, to),
      text: T.PERIOD_TEXT.chandrashtamaStay(from, to), source: T.SOURCES.chandrashtama,
    })
  }
  return { reasons, best: bestLabel, careful: carefulLabel, highlights: { best, careful, chandrashtama: stays } }
}

/**
 * Gochara row of `planet` in `sign` with Jupiter and Saturn placed as at `jd`: over a week or more
 * only they can obstruct (SLOW_CASTERS), so long views agree with the daily ones on slow vedha.
 */
function slowRow(ctx: PredictContext, planet: Planet, sign: SignIndex, jd: number): GocharaRow {
  const pos = planetPositions(jd, ctx.settings)
  const transit = { Jupiter: pos.Jupiter, Saturn: pos.Saturn, [planet]: { sign } }
  return gochara(ctx.natal.moonSign, transit, { bav: ctx.ashtakavarga.bav, casters: SLOW_CASTERS }).find((r) => r.planet === planet)!
}

const isIngressOf = (e: TimedEvent, planets: readonly Planet[]) => (e.kind === 'ingress' || e.kind === 'sankranti') && !!e.body && planets.includes(e.body)

/**
 * One reason per stretch of [a, b) in which `planet` keeps its sign and its obstruction by
 * Jupiter or Saturn, weighted by its share of the period (at least a fifth).
 */
function stretchReasons(
  ctx: PredictContext, planet: Planet, events: readonly TimedEvent[], a: number, b: number, whole: string, weight: number, skip: (row: GocharaRow) => boolean,
): Reason[] {
  const others = SLOW_CASTERS.filter((p) => p !== planet)
  const cuts = [a, ...events.filter((e) => isIngressOf(e, [planet, ...others])).map((e) => e.jd), b]
  const stretches: { row: GocharaRow; from: number; to: number }[] = []
  for (let i = 0; i + 1 < cuts.length; i++) {
    if (cuts[i + 1] <= cuts[i]) continue
    const mid = (cuts[i] + cuts[i + 1]) / 2
    const row = slowRow(ctx, planet, signOf(planetLongitude(mid, planet, ctx.settings).longitude), mid)
    const last = stretches.at(-1)
    if (last && sameRow(last.row, row)) last.to = cuts[i + 1]
    else stretches.push({ row, from: cuts[i], to: cuts[i + 1] })
  }
  return stretches.filter(({ row }) => !skip(row)).map(({ row, from, to }) => {
    const suffix = T.E.stretchSuffix(row.sign, spanLabel(ctx, from, to, a, b, whole))
    return gocharaReason(ctx, row, weight * Math.max((to - from) / (b - a), 0.2), `gochara_${planet}`, gocharaTitle(row, suffix))
  })
}

const sameRow = (x: GocharaRow, y: GocharaRow) =>
  x.sign === y.sign && x.effect === y.effect && String(x.vedhaBy) === String(y.vedhaBy) && String(x.vipareetaVedhaBy) === String(y.vipareetaVedhaBy)

/** Houses from the Moon where Saturn has a named phase (Sade Sati, Ashtama, Ardhashtama). */
const SATURN_PHASE_HOUSES: readonly number[] = [12, 1, 2, 4, 8]

/**
 * The Sun (month only) and the slow planets through [a, b). Saturn's unrelieved stay in a sign
 * with a named phase is left to the phase's own reason, so it is not listed twice.
 */
function transitStretches(ctx: PredictContext, events: readonly TimedEvent[], a: number, b: number, whole: string, withSun: boolean): Reason[] {
  const planets: Planet[] = withSun ? ['Sun', ...SLOW_PLANETS] : [...SLOW_PLANETS]
  const inPhase = (row: GocharaRow) => row.planet === 'Saturn' && row.effect < 0 && SATURN_PHASE_HOUSES.includes(row.houseFromMoon)
  return planets.flatMap((p) => stretchReasons(ctx, p, events, a, b, whole, p === 'Sun' ? 1.5 : GOCHARA_WEIGHTS[p], inPhase))
}

/** Reasons for transit events in a period: sign changes judged from the Moon, stations as notes. */
function eventReasons(ctx: PredictContext, events: readonly TimedEvent[], weekday: boolean): Reason[] {
  const reasons: Reason[] = []
  for (const e of events) {
    const body = e.body
    if (!body || body === 'Moon') continue
    const on = `${dateLabel(jdToLocal(e.jd, ctx.place.timeZone).date, weekday)}`
    if (e.kind === 'ingress' || e.kind === 'sankranti') {
      const row = slowRow(ctx, body, e.sign!, e.jd)
      const weight = SLOW_PLANETS.includes(body) ? 1.5 : 0.75
      reasons.push(gocharaReason(ctx, row, weight, `ingress_${body}`, T.E.ingressReasonTitle(e.title, row.houseFromMoon, on)))
    } else if (e.kind === 'retrograde' || e.kind === 'direct') {
      reasons.push({ factor: `station_${body}`, effect: 0, weight: 0.5, title: `${e.title} · ${on}`, text: e.detail!, source: T.SOURCES.stations })
    }
  }
  return reasons
}

/** Dasha periods starting in the period, each read for this chart by the lord of the level that changes. */
function dashaChangeReasons(ctx: PredictContext, events: readonly TimedEvent[], weekday: boolean): Reason[] {
  return events.filter((e) => e.kind === 'dasha').map((e) => {
    const chain = dashaChainAt(ctx.dashas, e.jd).map((p) => p.lord)
    // The event is named after the highest level that changes, whose lord is e.body.
    const level = Math.max(0, chain.indexOf(e.body!))
    return {
      factor: 'dasha_change', effect: 0, weight: 0.75,
      title: `${e.title} · ${dateLabel(jdToLocal(e.jd, ctx.place.timeZone).date, weekday)}`,
      text: T.dashaChangePromiseText(chain.slice(0, level + 1), ctx.promise[e.body!]), source: `${T.SOURCES.dasha}. ${T.SOURCES.dashaPromise}`,
    }
  })
}

/** The running chain, read for this chart (informational: the scored part is dashaPromiseReasons). */
function dashaInfo(ctx: PredictContext, chain: readonly DashaPeriod[]): Reason[] {
  if (chain.length < 2) return []
  const [md, ad, pd] = chain.map((p) => ctx.promise[p.lord])
  const { fromMain } = chainPromise(ctx.promise, chain.map((p) => p.lord), ctx.chart.positions)
  return [{
    factor: 'dasha', effect: 0, weight: DAY_WEIGHTS.info, title: T.E.dashaTitle(chain.map((p) => p.lord)),
    text: T.dashaChainText(md, ad, pd, fromMain), source: `${T.SOURCES.dasha}. ${T.SOURCES.dashaPromise}`,
  }]
}

/**
 * The natal promise of the running chain as a scored reason (BPHS ch. 53; Rao ch. 16): the
 * antardasha lord's lordship, placement and strength lead, with the mahadasha and
 * pratyantardasha lords and the sub-lord's place from the main lord (promise.ts chainPromise).
 */
function dashaPromiseReasons(ctx: PredictContext, chain: readonly DashaPeriod[]): Reason[] {
  if (chain.length < 2) return []
  const lords = chain.map((p) => p.lord)
  const { score, effect } = chainPromise(ctx.promise, lords, ctx.chart.positions)
  const weight = effect === 0 ? DAY_WEIGHTS.dashaPromise / 2 : round(Math.min(1.5, DAY_WEIGHTS.dashaPromise * (0.75 + Math.abs(score))), 2)
  return [{
    factor: 'dasha_promise', effect, weight, title: T.dashaPromiseTitle(lords[1], effect),
    // The text gives the sub-lord's own outlook and, when the chain's differs, a clause naming where
    // that comes from, so it agrees with the title and the vote without blaming the sub-lord.
    text: T.lordOutlook(ctx.promise[lords[1]], 'sub-period', effect, ctx.promise[lords[0]]), source: T.SOURCES.dashaPromise,
  }]
}

/** Gochara of the slow planets at `jd`, obstructed only by other slow planets. */
function slowBackdrop(ctx: PredictContext, jd: number, suffix: string): Reason[] {
  const pos = planetPositions(jd, ctx.settings)
  return gochara(ctx.natal.moonSign, pos, { bav: ctx.ashtakavarga.bav, casters: SLOW_CASTERS })
    .filter((row) => SLOW_PLANETS.includes(row.planet))
    .map((row) => gocharaReason(ctx, row, GOCHARA_WEIGHTS[row.planet], `gochara_${row.planet}`, gocharaTitle(row, suffix)))
}

/** Forecast for the 7 Vedic days starting on civil `startDate`. */
export function forecastWeek(ctx: PredictContext, startDate: string): Forecast {
  const dates = datesFrom(startDate, 7)
  const a = daySpan(ctx, dates[0]).start
  const b = daySpan(ctx, dates[6]).end
  cover(ctx, a, b)
  const days = dates.map((d) => forecastDay(ctx, d))
  const score = mean(days.map((d) => d.score))
  const rating = ratingFor(score)
  const events = periodEvents(ctx, a, b, (e) => e.kind !== 'moon_nakshatra', 2, true)
  const highlights = dayHighlights(ctx, days, a, b, 2, true)
  const reasons = [
    ...highlights.reasons,
    ...slowBackdrop(ctx, (a + b) / 2, T.E.thisWeek),
    ...eventReasons(ctx, events, true),
    ...dashaChangeReasons(ctx, events, true),
    ...dashaInfo(ctx, days[0].dasha),
    ...dashaPromiseReasons(ctx, days[0].dasha),
  ]
  return {
    horizon: 'week', start: dates[0], end: dates[6], rating, score,
    headline: T.periodHeadline('week', rating, highlights.best, highlights.careful),
    reasons: sortReasons(reasons), events, parts: days, dasha: days[0].dasha, highlights: highlights.highlights,
  }
}

/** Mercury's and Venus's retrograde spells overlapping [a, b), from their stations and starting motion. */
function retrogradeReasons(ctx: PredictContext, events: readonly TimedEvent[], a: number, b: number): Reason[] {
  const reasons: Reason[] = []
  for (const planet of ['Mercury', 'Venus'] as const) {
    const turns = events.filter((e) => e.body === planet && (e.kind === 'retrograde' || e.kind === 'direct'))
    let from: number | null = planetLongitude(a, planet, ctx.settings).speed < 0 ? a : null
    const spells: [number, number][] = []
    for (const e of turns) {
      if (e.kind === 'retrograde') from = e.jd
      else if (from !== null) {
        spells.push([from, e.jd])
        from = null
      }
    }
    if (from !== null) spells.push([from, b])
    for (const [s, t] of spells) {
      reasons.push({
        factor: `retrograde_${planet}`, effect: 0, weight: 0.75,
        title: T.E.retrogradeTitle(planet, spanLabel(ctx, s, t, a, b, T.E.allMonth)),
        text: T.STATION_TEXT.retrograde(planet, T.PLANET_THEMES[planet].short), source: T.SOURCES.stations,
      })
    }
  }
  return reasons
}

const overlapping = (periods: readonly SaturnPeriod[], a: number, b: number) => periods.filter((p) => p.startJd < b && p.endJd > a)

/** One reason per Saturn phase period overlapping [a, b), in time order. */
function saturnReasons(ctx: PredictContext, periods: readonly SaturnPeriod[], a: number, b: number, whole: string): Reason[] {
  return overlapping(periods, a, b).map((p) => ({
    factor: p.phase.startsWith('sade_sati') ? 'sade_sati' : 'ashtama_shani', effect: -1 as const, weight: p.phase === 'sade_sati_peak' || p.phase === 'ashtama' ? 1.5 : 1,
    title: `${T.SATURN_PHASE_TITLE[p.phase]} ${spanLabel(ctx, p.startJd, p.endJd, a, b, whole)}`,
    text: T.SATURN_PHASE_TEXT[p.phase], source: T.SOURCES.sadeSati,
  }))
}

function monthForecast(ctx: PredictContext, year: number, month: number, withParts: boolean): Forecast {
  const first = `${year}-${pad2(month)}-01`
  const dates = datesFrom(first, daysInMonth(year, month))
  const a = daySpan(ctx, first).start
  const b = daySpan(ctx, dates.at(-1)!).end
  cover(ctx, a, b)
  const days = dates.map((d) => forecastDay(ctx, d))
  const score = mean(days.map((d) => d.score))
  const rating = ratingFor(score)
  const events = periodEvents(ctx, a, b, (e) => e.kind !== 'moon_sign' && e.kind !== 'moon_nakshatra', 2, true)
  const highlights = dayHighlights(ctx, days, a, b, 3, false)
  const isMvStation = (e: TimedEvent) => (e.body === 'Mercury' || e.body === 'Venus') && (e.kind === 'retrograde' || e.kind === 'direct')
  const reasons = [
    ...transitStretches(ctx, events, a, b, T.E.allMonth, true),
    ...highlights.reasons,
    // Sign changes of the Sun and the slow planets are already in their stretches.
    ...eventReasons(ctx, events.filter((e) => !isIngressOf(e, ['Sun', ...SLOW_PLANETS]) && !isMvStation(e)), false),
    ...retrogradeReasons(ctx, events, a, b),
    ...saturnReasons(ctx, saturnYear(ctx, year), a, b, T.E.allMonth),
    ...dashaChangeReasons(ctx, events, false),
    ...dashaInfo(ctx, days[0].dasha),
    ...dashaPromiseReasons(ctx, days[0].dasha),
  ]
  const forecast: Forecast = {
    horizon: 'month', start: first, end: dates.at(-1)!, rating, score,
    headline: T.periodHeadline('month', rating, highlights.best, highlights.careful),
    reasons: sortReasons(reasons), events, dasha: days[0].dasha, highlights: highlights.highlights,
  }
  if (withParts) forecast.parts = days.map(withoutTimings)
  return forecast
}

/** Forecast for a calendar month (1..12): one part per day, without day timings to stay light. */
export function forecastMonth(ctx: PredictContext, year: number, month: number): Forecast {
  return monthForecast(ctx, year, month, true)
}

// ---------------------------------------------------------------------------------------------
// Year

export interface Muntha {
  /** Completed years of life at the start of the Tajaka year. */
  completedYears: number
  /** Sidereal solar return that starts the Tajaka year (JD UT1). */
  returnJd: number
  /** Muntha sign: the natal ascendant sign advanced one sign per completed year. */
  sign: SignIndex
  /** Ascendant of the annual chart, cast for the birthplace as in the Python toolkit. */
  annualAscSign: SignIndex
  /** Muntha's house from the annual ascendant. */
  house: number
  favourable: boolean
}

const SIDEREAL_YEAR_DAYS = 365.256363
const wrap180 = (x: number) => x - 360 * Math.floor((x + 180) / 360)

/** The sidereal solar return closest to `guess` (the Sun moves about 1 degree a day). */
function solarReturn(ctx: PredictContext, guess: number): number {
  const natalSun = ctx.chart.positions.Sun.longitude
  return bisectInstant((jd) => wrap180(sunLongitude(jd, ctx.settings) - natalSun) >= 0, guess - 5, guess + 5)
}

/**
 * Muntha of the Tajaka year that begins in calendar `year` (Rao ch. 28.1, PDF 337; tajaka.muntha in
 * the toolkit): its sign is the natal ascendant sign advanced by the completed years, and it is
 * judged by its house from the annual ascendant. Null before birth.
 */
export function munthaForYear(ctx: PredictContext, year: number): Muntha | null {
  const zone = ctx.place.timeZone
  let completed = year - Number(ctx.birth.date.slice(0, 4))
  if (completed < 0) return null
  let returnJd = completed ? solarReturn(ctx, ctx.chart.jd + completed * SIDEREAL_YEAR_DAYS) : ctx.chart.jd
  // A birthday at the turn of the year can put the return in the neighbouring calendar year.
  const returnYear = jdToLocal(returnJd, zone).year
  if (returnYear !== year && completed + year - returnYear >= 0) {
    completed += year - returnYear
    returnJd = completed ? solarReturn(ctx, ctx.chart.jd + completed * SIDEREAL_YEAR_DAYS) : ctx.chart.jd
  }
  const { latitude, longitude } = ctx.birth
  const annualAscSign = ascendant(returnJd, latitude, longitude, ctx.settings).sign
  const sign = (ctx.natal.ascSign + completed) % 12
  const house = houseFrom(annualAscSign, sign)
  return { completedYears: completed, returnJd, sign, annualAscSign, house, favourable: MUNTHA_FAVOURABLE_HOUSES.includes(house) }
}

/** Forecast for a calendar year: 12 monthly parts whose scores average their days. */
export function forecastYear(ctx: PredictContext, year: number): Forecast {
  const first = `${year}-01-01`
  const last = `${year}-12-31`
  const a = daySpan(ctx, first).start
  const b = daySpan(ctx, last).end
  cover(ctx, a, b)
  const months = Array.from({ length: 12 }, (_, i) => monthForecast(ctx, year, i + 1, false))
  const score = mean(months.map((m) => m.score))
  const rating = ratingFor(score)
  const slow = (e: TimedEvent) => !!e.body && SLOW_PLANETS.includes(e.body) && (e.kind === 'ingress' || e.kind === 'retrograde' || e.kind === 'direct')
  const periods = saturnYear(ctx, year)
  const events = [...periodEvents(ctx, a, b, slow, 1, false), ...saturnEvents(periods, a, b)].sort((x, y) => x.jd - y.jd)

  const saturn = saturnReasons(ctx, periods, a, b, T.E.allYear)
  const reasons = [...transitStretches(ctx, events, a, b, T.E.allYear, false), ...saturn]
  // Whole Sade Sati dates go with its first phase in the year; a year without any phase says when the next one comes.
  const summary = sadeSatiSummary(ctx.natal.moonSign, a, ctx.settings)
  const firstSade = overlapping(periods, a, b).findIndex((p) => p.phase.startsWith('sade_sati'))
  const span = summary.sadeSati ?? summary.next
  if (firstSade >= 0 && span) {
    saturn[firstSade].text += ` ${T.PERIOD_TEXT.sadeSatiSpan(fullDate(ctx, span.startJd), fullDate(ctx, span.endJd))}`
  } else if (!saturn.length) {
    const start = summary.next && jdToLocal(summary.next.startJd, ctx.place.timeZone)
    const next = start ? ` ${T.PERIOD_TEXT.nextSadeSati(T.E.monthYear(start.year, start.month))}` : ''
    reasons.push({ factor: 'sade_sati', effect: 0, weight: 0.5, title: T.E.noSadeSatiTitle, text: `${T.NO_SADE_SATI_TEXT}${next}`, source: T.SOURCES.sadeSati })
  }
  reasons.push(...munthaReasons(ctx, year, a, b))
  reasons.push(...dashaChangeReasons(ctx, events, false), ...dashaInfo(ctx, months[0].dasha), ...dashaPromiseReasons(ctx, months[0].dasha))
  const support = strongest(reasons, 1)
  const caution = strongest(reasons, -1)
  return {
    horizon: 'year', start: first, end: last, rating, score,
    headline: T.yearHeadline(rating, support && T.SUPPORT_PHRASE[support.factor], caution && T.CAUTION_PHRASE[caution.factor]),
    reasons: sortReasons(reasons), events, parts: months, dasha: months[0].dasha,
  }
}

/**
 * The calendar year meets two Tajaka years: the one running on 1 January and the one starting at
 * this year's solar return. Each Muntha is listed for its own part of the year, weighted by it, so
 * a December birthday does not lead the whole year with a Muntha that starts in December.
 */
function munthaReasons(ctx: PredictContext, year: number, a: number, b: number): Reason[] {
  const [previous, current, next] = [year - 1, year, year + 1].map((y) => munthaForYear(ctx, y))
  const reasons: Reason[] = []
  for (const [m, endJd] of [[previous, current?.returnJd], [current, next?.returnJd]] as const) {
    if (!m || endJd === undefined || endJd <= a) continue
    const share = (Math.min(endJd, b) - Math.max(m.returnJd, a)) / (b - a)
    reasons.push({
      factor: 'muntha', effect: m.favourable ? 1 : -1, weight: round(1.5 * Math.max(share, 0.2), 2),
      title: T.E.munthaTitle(m.house, m.sign, spanLabel(ctx, m.returnJd, endJd, a, b, T.E.allYear)),
      text: `${T.MUNTHA_TEXT[m.house - 1]} ${T.PERIOD_TEXT.tajakaYear(fullDate(ctx, m.returnJd), fullDate(ctx, endJd))}`, source: T.SOURCES.muntha,
    })
  }
  return reasons
}

/** Starts and ends of Saturn's named phases inside [a, b). */
function saturnEvents(periods: readonly SaturnPeriod[], a: number, b: number): TimedEvent[] {
  const out: TimedEvent[] = []
  for (const p of periods) {
    const name = T.SATURN_PHASE_TITLE[p.phase]
    if (p.startJd >= a && p.startJd < b) out.push({ jd: p.startJd, kind: 'sade_sati', body: 'Saturn', sign: p.sign, title: T.E.phaseBegins(name), detail: T.SATURN_PHASE_TEXT[p.phase], effect: -1 })
    if (p.endJd >= a && p.endJd < b) out.push({ jd: p.endJd, kind: 'sade_sati', body: 'Saturn', title: T.E.phaseEnds(name), effect: 0 })
  }
  return out
}

/** Every planet's gochara row at an instant, for callers that want the raw table (e.g. a transit page). */
export function gocharaAt(ctx: PredictContext, jd: number): GocharaRow[] {
  return gochara(ctx.natal.moonSign, planetPositions(jd, ctx.settings), { bav: ctx.ashtakavarga.bav, natalAscSign: ctx.natal.ascSign })
}

