// Structured context the forecast screens show beside a forecast, computed in the worker from the
// same context: the day's Moon and its Chandrashtama stay, and for a year the slow planets' sign
// stays, Saturn's named phases and the Muntha. Plain data, so it crosses the worker boundary as is.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { advanceSign, houseFrom } from './core'
import { cellChanges } from './events'
import { chandrashtamaWindows, moonDay, type MoonDay } from './moon'
import { daySpan, munthaForYear, saturnYear, type Muntha, type PredictContext } from './predict'
import type { SaturnPeriod } from './saturn'
import { localToJd } from './time'
import type { Planet, SignIndex, TimeWindow } from './types'

/** One stay of a slow graha in a sign. */
export interface TransitStay {
  sign: SignIndex
  /** House of the sign counted from the natal Moon sign, 1..12. */
  house: number
  /** Entry into the sign (may precede the period). */
  startJd: number
  /** Exit from the sign (may follow the period). */
  endJd: number
}

export interface TransitTrack {
  planet: Planet
  /** Stays overlapping the period, in time order; each starts where the previous one ends. */
  stays: TransitStay[]
}

export interface ForecastExtras {
  /** Day view: the transit Moon at the middle of the daytime, the instant the day's Moon factors use. */
  moon?: MoonDay
  /** Day view: the Chandrashtama stay overlapping the Vedic day, if any. */
  chandrashtama?: TimeWindow
  /** Year view: Jupiter, Saturn, Rahu and Ketu sign stays overlapping the calendar year. */
  transits?: TransitTrack[]
  /** Year view: Saturn's phases from the natal Moon overlapping the calendar year. */
  saturn?: SaturnPeriod[]
  /** Year view: Muntha of the Tajaka year that begins in the calendar year. */
  muntha?: Muntha
}

/** The Moon and Chandrashtama of the Vedic day that begins on civil `date`. */
export function dayExtras(ctx: PredictContext, date: string): ForecastExtras {
  const span = daySpan(ctx, date)
  // forecastDay judges the Moon by the sign and star it holds at the middle of the daytime.
  const moon = moonDay({ moonLongitude: ctx.chart.positions.Moon.longitude }, (span.start + span.sunset) / 2, ctx.settings)
  const stay = chandrashtamaWindows(ctx.natal.moonSign, span.start, span.end, ctx.settings).find((w) => w.startJd < span.end && w.endJd > span.start)
  return stay ? { moon, chandrashtama: stay } : { moon }
}

/**
 * Days searched beyond the year for the entry and exit of the stays that overlap it: longer than
 * any continuous stay in one sign (Jupiter about 13 months with a retrograde loop, the nodes about
 * 19 months, Saturn 1,092 days at most in 1800-2200).
 */
const STAY_MARGIN_DAYS: Partial<Record<Planet, number>> = { Jupiter: 500, Saturn: 1150, Rahu: 700 }

function stays(ctx: PredictContext, planet: 'Jupiter' | 'Saturn' | 'Rahu', a: number, b: number): TransitStay[] {
  const margin = STAY_MARGIN_DAYS[planet]!
  const changes = cellChanges(planet, 'sign', a - margin, b + margin, ctx.settings)
  const out: TransitStay[] = []
  for (let i = 0; i + 1 < changes.length; i++) {
    const [entry, exit] = [changes[i], changes[i + 1]]
    if (exit.jd > a && entry.jd < b) out.push({ sign: entry.to, house: houseFrom(ctx.natal.moonSign, entry.to), startJd: entry.jd, endJd: exit.jd })
  }
  return out
}

/** Transit tracks, Saturn's phases and the Muntha for calendar `year` (civil midnights in the place's zone). */
export function yearExtras(ctx: PredictContext, year: number): ForecastExtras {
  const zone = ctx.place.timeZone
  const a = localToJd(`${year}-01-01`, zone)
  const b = localToJd(`${year + 1}-01-01`, zone)
  const rahu = stays(ctx, 'Rahu', a, b)
  // Ketu is always exactly opposite Rahu, so it changes sign at the same instants.
  const ketu = rahu.map((s) => {
    const sign = advanceSign(s.sign, 7)
    return { ...s, sign, house: houseFrom(ctx.natal.moonSign, sign) }
  })
  const transits: TransitTrack[] = [
    { planet: 'Jupiter', stays: stays(ctx, 'Jupiter', a, b) },
    { planet: 'Saturn', stays: stays(ctx, 'Saturn', a, b) },
    { planet: 'Rahu', stays: rahu },
    { planet: 'Ketu', stays: ketu },
  ]
  const muntha = munthaForYear(ctx, year)
  return { transits, saturn: saturnYear(ctx, year), ...(muntha ? { muntha } : {}) }
}
