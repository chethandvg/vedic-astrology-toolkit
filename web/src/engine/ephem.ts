// Sidereal positions from Swiss Ephemeris, mirroring Ephemeris.positions in
// vedic_toolkit/astronomy.py (geocentric apparent longitude, whole-sign houses).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { degreeInSign, nakshatra, norm, signOf } from './core'
import { SE, swe } from './swe'
import { PLANETS, type Ayanamsa, type BodyPosition, type Body, type Planet, type Settings } from './types'

const SIDM: Record<Ayanamsa, number> = {
  lahiri: SE.SIDM_LAHIRI, raman: SE.SIDM_RAMAN, krishnamurti: SE.SIDM_KRISHNAMURTI,
  true_citra: SE.SIDM_TRUE_CITRA, true_pushya: SE.SIDM_TRUE_PUSHYA, yukteshwar: SE.SIDM_YUKTESHWAR,
}

const BODY_ID: Record<Exclude<Planet, 'Rahu' | 'Ketu'>, number> = {
  Sun: SE.SUN, Moon: SE.MOON, Mars: SE.MARS, Mercury: SE.MERCURY, Jupiter: SE.JUPITER, Venus: SE.VENUS, Saturn: SE.SATURN,
}

const FLAGS = SE.FLG_SPEED | SE.FLG_SIDEREAL

function useSettings(settings: Settings) {
  swe().setSiderealMode(SIDM[settings.ayanamsa])
}

export function position(body: Body, longitude: number, latitude: number, speed: number): BodyPosition {
  const lon = norm(longitude)
  return { body, longitude: lon, latitude, speed, retrograde: speed < 0, sign: signOf(lon), degree: degreeInSign(lon), nakshatra: nakshatra(lon) }
}

/** Sidereal longitude and speed of one planet (Rahu/Ketu use the selected node). */
export function planetLongitude(jd: number, planet: Planet, settings: Settings): { longitude: number; speed: number; latitude: number } {
  useSettings(settings)
  if (planet === 'Rahu' || planet === 'Ketu') {
    const r = swe().calcUt(jd, settings.node === 'mean' ? SE.MEAN_NODE : SE.TRUE_NODE, FLAGS)
    return planet === 'Rahu'
      ? { longitude: r.longitude, speed: r.speed, latitude: r.latitude }
      : { longitude: norm(r.longitude + 180), speed: r.speed, latitude: -r.latitude }
  }
  const r = swe().calcUt(jd, BODY_ID[planet], FLAGS)
  return { longitude: r.longitude, speed: r.speed, latitude: r.latitude }
}

/** All nine grahas at an instant. */
export function planetPositions(jd: number, settings: Settings): Record<Planet, BodyPosition> {
  const out = {} as Record<Planet, BodyPosition>
  for (const p of PLANETS) {
    const r = planetLongitude(jd, p, settings)
    out[p] = position(p, r.longitude, r.latitude, r.speed)
  }
  return out
}

/** Sidereal ascendant (swe_houses_ex with the sidereal flag, as the toolkit). */
export function ascendant(jd: number, latitude: number, longitude: number, settings: Settings): BodyPosition {
  if (!Number.isFinite(latitude) || latitude <= -90 || latitude >= 90) throw new Error('Latitude must be strictly between -90 and 90')
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error('Longitude must be in [-180, 180]')
  useSettings(settings)
  return position('Asc', swe().housesEx(jd, SE.FLG_SIDEREAL, latitude, longitude).ascendant, 0, 0)
}

export function positionsWithAscendant(jd: number, latitude: number, longitude: number, settings: Settings): Record<Body, BodyPosition> {
  return { ...planetPositions(jd, settings), Asc: ascendant(jd, latitude, longitude, settings) }
}

export function ayanamsaDegrees(jd: number, settings: Settings): number {
  useSettings(settings)
  return swe().ayanamsa(jd)
}

export const sunLongitude = (jd: number, settings: Settings) => planetLongitude(jd, 'Sun', settings).longitude
export const moonLongitude = (jd: number, settings: Settings) => planetLongitude(jd, 'Moon', settings).longitude
