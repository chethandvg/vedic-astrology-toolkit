// Transit events: sign ingresses (sankrantis for the Sun), stations of the five tara grahas and
// the Moon's sign and nakshatra changes. Instants are JD UT1; every function returns the events
// with startJd <= jd < endJd in time order. Times agree with a brute-force scan of the Python
// toolkit's Ephemeris to well under a second (tests/events.test.ts).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { NAKSHATRA_NAMES, NAKSHATRA_SPAN, norm, SIGN_NAMES, SIGN_SANSKRIT, signOf } from './core'
import { planetLongitude } from './ephem'
import { bisectInstant, DEFAULT_TOLERANCE_DAYS } from './search'
import { PLANETS, type Planet, type Settings, type SignIndex, type TimedEvent } from './types'

/** Grahas with stations. The luminaries never turn back and the mean nodes always move backward. */
export const STATION_PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const
export type StationPlanet = (typeof STATION_PLANETS)[number]

export const isStationPlanet = (planet: Planet): planet is StationPlanet => (STATION_PLANETS as readonly Planet[]).includes(planet)

/**
 * Station scan steps in days: under a third of the shortest retrograde or direct phase found by
 * scanning 1900-2100 (Mercury 19.75 days, Venus 40.5, Mars 60, Jupiter 117, Saturn 133), so one
 * step can never hide a whole phase and with it two stations.
 */
const STATION_STEP: Record<StationPlanet, number> = { Mercury: 5, Venus: 10, Mars: 15, Jupiter: 30, Saturn: 30 }

/**
 * Longest stretch, in days, examined at once while the motion is one-way. The body moves at most
 * about 45 degrees in it (Mercury 2.2 deg/day), so the change of cell between the two ends tells
 * exactly how many boundaries were crossed in between.
 */
const CHUNK_DAYS: Record<Planet, number> = { Sun: 30, Moon: 2, Mercury: 20, Venus: 30, Mars: 30, Jupiter: 90, Saturn: 120, Rahu: 365, Ketu: 365 }

/**
 * The true node wobbles and can reverse for very short spans near its stations, so it has no
 * clean one-way segments; it is scanned on a fixed grid instead. An excursion across a boundary
 * that returns within this step is skipped as a pair, which keeps the sign sequence consistent.
 * Its Moshier longitude also jitters by about 1e-5 degree from one second to the next, so its
 * ingress instants are only good to about half a minute (the mean node's to a fraction of a second).
 */
const TRUE_NODE_STEP = 0.25

/**
 * Every scan samples whole multiples of its step in absolute JD, from the last multiple before the
 * window to the first one past its end, so each change is bracketed, and therefore timed, exactly
 * alike from any window. Adjacent windows [a, m) and [m, b) then share their events exactly, even
 * when m is itself an event instant or a station (where the speed jitters by ~1e-8 deg/day, so
 * different brackets would land on different sub-second roots and could drop or repeat the event).
 */
const gridBefore = (jd: number, step: number) => (Math.ceil(jd / step) - 1) * step
const gridAfter = (jd: number, step: number) => (Math.floor(jd / step) + 1) * step

/** A partition of the zodiac into equal cells: the 12 signs or the 27 nakshatras. */
interface Grid { width: number; count: number }
const SIGNS: Grid = { width: 30, count: 12 }
const NAKSHATRAS: Grid = { width: NAKSHATRA_SPAN, count: 27 }

const mod = (x: number, n: number) => ((x % n) + n) % n
const cellOf = (longitude: number, grid: Grid) => Math.min(grid.count - 1, Math.floor(norm(longitude) / grid.width))
/** Signed angle in [-180, 180). */
const wrap180 = (x: number) => x - 360 * Math.floor((x + 180) / 360)

interface Sample { jd: number; longitude: number; speed: number }
type Direction = 1 | -1

/** A change of cell (sign or nakshatra index, 0-based). */
export interface CellChange { jd: number; from: number; to: number; direction: Direction }

/** A Moon nakshatra change; `nakshatra` is the one entered, 1 = Ashwini. */
export interface NakshatraEvent extends TimedEvent { kind: 'moon_nakshatra'; nakshatra: number }

const sampler = (planet: Planet, settings: Settings) => (jd: number): Sample => {
  const r = planetLongitude(jd, planet, settings)
  return { jd, longitude: r.longitude, speed: r.speed }
}

/**
 * First instant in (lo.jd, hi.jd] at which `f` has reached zero (`f >= 0`, or `f > 0` when
 * `strict`), to within DEFAULT_TOLERANCE_DAYS, given f(lo) short of it and f(hi) past it. Each step
 * is a Newton step (with `slope`) or a secant step (without), aimed slightly beyond the root
 * alternately from each side so that the bracket closes; it bisects whenever the step leaves the
 * bracket, e.g. near a station where the speed is close to zero. Usually 3-6 ephemeris calls,
 * against about 25 for plain bisection.
 */
function straddle<T extends { jd: number }>(
  at: (jd: number) => T, f: (s: T) => number, slope: ((s: T) => number) | null, strict: boolean, lo: T, hi: T,
): T {
  const tol = DEFAULT_TOLERANCE_DAYS
  const past = (s: T) => (strict ? f(s) > 0 : f(s) >= 0)
  let low = lo.jd
  let best = hi
  let s = lo
  let other = hi
  for (let i = 0; i < 100 && best.jd - low > tol; i++) {
    const m = slope ? slope(s) : (f(s) - f(other)) / (s.jd - other.jd)
    let x = s.jd - f(s) / m + (past(s) ? -0.4 : 0.4) * tol
    if (!(x > low && x < best.jd)) x = (low + best.jd) / 2
    other = s
    s = at(x)
    if (past(s)) best = s
    else low = x
  }
  return best
}

/** Every cell change over [a, b] while the body moves only in direction `d`, sampled at multiples of `chunk`. */
function monotonicChanges(at: (jd: number) => Sample, grid: Grid, a: number, b: number, d: Direction, chunk: number): CellChange[] {
  const out: CellChange[] = []
  let s0 = at(a)
  let c0 = cellOf(s0.longitude, grid)
  while (s0.jd < b) {
    const s1 = at(Math.min(gridAfter(s0.jd, chunk), b))
    const c1 = cellOf(s1.longitude, grid)
    let lo = s0
    for (let i = 1, n = mod(d * (c1 - c0), grid.count); i <= n; i++) {
      const to = mod(c0 + d * i, grid.count)
      // Moving forward the boundary is the lower edge of the new cell, moving back its upper edge.
      const boundary = (d > 0 ? to : to + 1) * grid.width
      // A boundary itself belongs to the upper cell, as signOf and nakshatra() count it.
      lo = straddle(at, (s) => d * wrap180(s.longitude - boundary), (s) => d * s.speed, d < 0, lo, s1)
      out.push({ jd: lo.jd, from: mod(to - d, grid.count), to, direction: d })
    }
    s0 = s1
    c0 = c1
  }
  return out
}

/**
 * Cell changes of the true node from samples at multiples of TRUE_NODE_STEP over [a, b], each
 * bisected inside its step; an excursion that returns within one step is skipped as a pair.
 */
function sampledChanges(at: (jd: number) => Sample, grid: Grid, a: number, b: number): CellChange[] {
  const cell = (jd: number) => cellOf(at(jd).longitude, grid)
  const out: CellChange[] = []
  let c0 = cell(a)
  for (let t = a; t < b; t += TRUE_NODE_STEP) {
    const c1 = cell(t + TRUE_NODE_STEP)
    if (c1 !== c0) {
      const jd = bisectInstant((x) => cell(x) !== c0, t, t + TRUE_NODE_STEP)
      out.push({ jd, from: c0, to: c1, direction: at(jd).speed < 0 ? -1 : 1 })
    }
    c0 = c1
  }
  return out
}

/** A station: the first instant of retrograde (speed < 0) or direct (speed >= 0) motion. */
interface Station { jd: number; retrograde: boolean }

/** Stations of a tara graha around [startJd, endJd], scanned at multiples of STATION_STEP and refined on the speed. */
function stationChanges(planet: StationPlanet, startJd: number, endJd: number, settings: Settings): Station[] {
  const at = sampler(planet, settings)
  const step = STATION_STEP[planet]
  const out: Station[] = []
  let a = at(gridBefore(startJd, step))
  while (a.jd < endJd) {
    const b = at(a.jd + step)
    const retrograde = b.speed < 0
    if (retrograde !== a.speed < 0) {
      const toward = retrograde ? -1 : 1
      out.push({ jd: straddle(at, (s) => toward * s.speed, null, retrograde, a, b).jd, retrograde })
    }
    a = b
  }
  return out
}

/** Every change of sign or nakshatra cell of `planet` in [startJd, endJd). */
export function cellChanges(planet: Planet, grid: 'sign' | 'nakshatra', startJd: number, endJd: number, settings: Settings): CellChange[] {
  const g = grid === 'sign' ? SIGNS : NAKSHATRAS
  const at = sampler(planet, settings)
  const trueNode = (planet === 'Rahu' || planet === 'Ketu') && settings.node === 'true'
  const chunk = trueNode ? TRUE_NODE_STEP : CHUNK_DAYS[planet]
  const a = gridBefore(startJd, chunk)
  const b = gridAfter(endJd, chunk)
  let out: CellChange[]
  if (trueNode) {
    out = sampledChanges(at, g, a, b)
  } else if (planet === 'Rahu' || planet === 'Ketu') {
    out = monotonicChanges(at, g, a, b, -1, chunk)
  } else if (!isStationPlanet(planet)) {
    out = monotonicChanges(at, g, a, b, 1, chunk)
  } else {
    // Split at the stations so that each segment is one-way; retrograde re-entries then fall out.
    const st = stationChanges(planet, a, b, settings).filter((c) => c.jd > a && c.jd < b)
    const cuts = [a, ...st.map((c) => c.jd), b]
    out = []
    for (let i = 0; i + 1 < cuts.length; i++) {
      const retro = i === 0 ? (st.length ? !st[0].retrograde : at((a + b) / 2).speed < 0) : st[i - 1].retrograde
      out.push(...monotonicChanges(at, g, cuts[i], cuts[i + 1], retro ? -1 : 1, chunk))
    }
  }
  return out.filter((c) => c.jd >= startJd && c.jd < endJd)
}

function ingressTitle(planet: Planet, sign: SignIndex, direction: Direction): string {
  const name = SIGN_NAMES[sign]
  if (planet === 'Sun') return `Sun enters ${name} (${SIGN_SANSKRIT[sign]} Sankranti)`
  if (direction < 0 && isStationPlanet(planet)) return `${planet} moves back into ${name} (retrograde)`
  return `${planet} enters ${name}`
}

/**
 * Sign changes of `planet`. The Sun's are sankrantis (kind 'sankranti'), the Moon's 'moon_sign',
 * all others 'ingress'; a retrograde step back into the previous sign is titled as such.
 */
export function ingresses(planet: Planet, startJd: number, endJd: number, settings: Settings): TimedEvent[] {
  const kind = planet === 'Sun' ? 'sankranti' : planet === 'Moon' ? 'moon_sign' : 'ingress'
  return cellChanges(planet, 'sign', startJd, endJd, settings).map((c) => ({
    jd: c.jd, kind, body: planet, sign: c.to, title: ingressTitle(planet, c.to, c.direction),
  }))
}

/** Retrograde and direct stations of Mercury, Venus, Mars, Jupiter and Saturn; [] for other grahas. */
export function stations(planet: Planet, startJd: number, endJd: number, settings: Settings): TimedEvent[] {
  if (!isStationPlanet(planet)) return []
  return stationChanges(planet, startJd, endJd, settings)
    .filter((c) => c.jd >= startJd && c.jd < endJd)
    .map((c) => {
      const sign = signOf(planetLongitude(c.jd, planet, settings).longitude)
      const turn = c.retrograde ? 'retrograde' : 'direct'
      return { jd: c.jd, kind: turn, body: planet, sign, title: `${planet} turns ${turn} in ${SIGN_NAMES[sign]}` }
    })
}

export const moonSignChanges = (startJd: number, endJd: number, settings: Settings): TimedEvent[] =>
  ingresses('Moon', startJd, endJd, settings)

export function moonNakshatraChanges(startJd: number, endJd: number, settings: Settings): NakshatraEvent[] {
  return cellChanges('Moon', 'nakshatra', startJd, endJd, settings).map((c) => ({
    jd: c.jd, kind: 'moon_nakshatra', body: 'Moon', nakshatra: c.to + 1, title: `Moon enters ${NAKSHATRA_NAMES[c.to]} nakshatra`,
  }))
}

export interface EventOptions {
  /** Grahas whose sign changes are listed (the Sun's as sankrantis, the Moon's as moon_sign). Default: all nine. */
  ingresses?: readonly Planet[]
  /** Grahas whose stations are listed. Default: Mercury, Venus, Mars, Jupiter, Saturn. */
  stations?: readonly Planet[]
  /** List the Moon's nakshatra changes. Default true. */
  moonNakshatras?: boolean
}

/** All transit events in [startJd, endJd), sorted by time (ties keep graha order). */
export function eventsBetween(startJd: number, endJd: number, settings: Settings, options: EventOptions = {}): TimedEvent[] {
  const out: TimedEvent[] = []
  for (const p of options.ingresses ?? PLANETS) out.push(...ingresses(p, startJd, endJd, settings))
  for (const p of options.stations ?? STATION_PLANETS) out.push(...stations(p, startJd, endJd, settings))
  if (options.moonNakshatras ?? true) out.push(...moonNakshatraChanges(startJd, endJd, settings))
  return out.sort((a, b) => a.jd - b.jd)
}
