// Sunrise-based Vedic day, ported from Ephemeris.sunrise_context in
// vedic_toolkit/astronomy.py: upper limb, standard refraction (1013.25 hPa, 15 °C).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SE, swe } from './swe'
import { jdToLocal, localToJd, weekdayOf } from './time'
import type { SolarDay } from './types'

/** Next sunrise (or sunset) after `jd`; null in polar day or night. */
export function nextSolarEvent(jd: number, latitude: number, longitude: number, rising = true): number | null {
  return swe().riseTrans(jd, SE.SUN, rising ? SE.CALC_RISE : SE.CALC_SET, longitude, latitude)
}

/** The sunrise-to-sunrise day containing `jd` (weekday from the local date at sunrise), as sunrise_context. */
export function solarDayAt(jd: number, latitude: number, longitude: number, zone: string): SolarDay | null {
  let sr = nextSolarEvent(jd - 1.5, latitude, longitude)
  if (sr === null || sr > jd) return null
  let next: number | null = null
  for (let i = 0; i < 4; i++) {
    const n = nextSolarEvent(sr + 1e-5, latitude, longitude)
    if (n === null) return null
    if (n > jd) { next = n; break }
    sr = n
  }
  if (next === null) return null
  const ss = nextSolarEvent(sr + 1e-5, latitude, longitude, false)
  if (ss === null || !(sr < ss && ss < next) || next - sr > 1.5) return null
  return { sunriseJd: sr, sunsetJd: ss, nextSunriseJd: next, weekday: jdToLocal(sr, zone).weekday, isDay: sr <= jd && jd < ss }
}

/** The Vedic day that begins at sunrise on civil `date` in `zone`; null in polar day or night. */
export function solarDayForDate(date: string, latitude: number, longitude: number, zone: string): SolarDay | null {
  const midnight = localToJd(date, zone, '00:00')
  const sr = nextSolarEvent(midnight, latitude, longitude)
  if (sr === null || jdToLocal(sr, zone).date !== date) return null
  const ss = nextSolarEvent(sr + 1e-5, latitude, longitude, false)
  const next = nextSolarEvent(sr + 1e-5, latitude, longitude)
  if (ss === null || next === null || !(sr < ss && ss < next) || next - sr > 1.5) return null
  return { sunriseJd: sr, sunsetJd: ss, nextSunriseJd: next, weekday: weekdayOf(date), isDay: true }
}
