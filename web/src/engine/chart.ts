// Natal chart assembly, the web counterpart of analysis.chart in the Python
// toolkit (vedic_toolkit/analysis.py), limited to what the forecasts need:
// positions, all 20 vargas, panchanga and the sunrise day, plus input
// validation with user-facing messages and warnings about doubtful inputs.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Temporal } from 'temporal-polyfill'
import { panchanga, SIGN_NAMES, VARGAS, vargaSign } from './core'
import { ascendant, ayanamsaDegrees, positionsWithAscendant } from './ephem'
import { findChanges } from './search'
import { solarDayAt } from './sunrise'
import { birthToJd, fixedOffsetMinutes, isValidTimeZone, localToUtc } from './time'
import { BODIES, type Ayanamsa, type BirthInput, type Body, type Chart, type NodeType, type Settings, type SignIndex, type YearModel } from './types'

export type BirthField = 'date' | 'time' | 'timeZone' | 'fold' | 'latitude' | 'longitude'

export interface InputIssue {
  field: BirthField
  message: string
}

/** Thrown by castChart for invalid input. Across a worker boundary only `name` and `message` survive. */
export class BirthInputError extends Error {
  readonly issues: InputIssue[]
  constructor(issues: InputIssue[]) {
    super(issues.map((i) => i.message).join(' '))
    this.name = 'BirthInputError'
    this.issues = issues
  }
}

/**
 * Accepted birth years. Dates are proleptic Gregorian, so records before the
 * 1582 reform (Julian calendar) would be read wrongly; the upper bound keeps
 * inputs far inside the Moshier ephemeris range (3000 BC to AD 3000).
 */
export const MIN_YEAR = 1600
export const MAX_YEAR = 2400

/** Years the parity fixtures cover; outside it Delta T and old clock records are less certain. */
const TESTED_YEARS = [1900, 2100] as const
/** The IANA database promises accuracy only from 1970 (tzdb theory.html, "Scope of the tz database"). */
const TZDB_RELIABLE_FROM = 1970
/** Warn when the rising sign changes within this many minutes of the birth time. */
const ASC_MARGIN_MINUTES = 5
/** Sampling step for rising-sign changes, far shorter than the quickest-rising sign takes. */
const ASC_STEP_DAYS = 15 / 86400

export const POLAR_WARNING = 'Sunrise/sunset is unavailable here on this date (polar day/night)'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/
const END_OF_DAY_RE = /^24:00(?::00)?$/

// Records keyed by every union member, so adding an option to types.ts fails to compile here.
const AYANAMSAS: Record<Ayanamsa, true> = { lahiri: true, raman: true, krishnamurti: true, true_citra: true, true_pushya: true, yukteshwar: true }
const NODES: Record<NodeType, true> = { mean: true, true: true }
const YEAR_MODELS: Record<YearModel, true> = { solar: true, savana: true }

/** "UTC+05:30", "UTC-04:00", "UTC+05:21:10" (seconds only when present, as for local mean time). */
export function formatUtcOffset(minutes: number): string {
  const total = Math.round(Math.abs(minutes) * 60)
  const pad = (n: number) => String(n).padStart(2, '0')
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return `UTC${minutes < 0 ? '-' : '+'}${pad(h)}:${pad(m)}${s ? `:${pad(s)}` : ''}`
}

function dateIssue(date: unknown): string | null {
  const m = typeof date === 'string' ? DATE_RE.exec(date) : null
  if (!m) return 'Enter the birth date as YYYY-MM-DD.'
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])]
  try {
    Temporal.PlainDate.from({ year, month, day }, { overflow: 'reject' })
  } catch {
    return `${date} is not a real calendar date.`
  }
  if (year < MIN_YEAR || year > MAX_YEAR) return `Enter a birth year between ${MIN_YEAR} and ${MAX_YEAR}.`
  return null
}

function timeIssue(time: unknown): string | null {
  if (typeof time === 'string' && TIME_RE.test(time)) return null
  if (typeof time === 'string' && END_OF_DAY_RE.test(time)) return 'Midnight at the end of a day is 00:00 on the next date: enter the next date and 00:00.'
  return 'Enter the birth time as HH:mm or HH:mm:ss on the 24-hour clock.'
}

/**
 * The zone as later modules receive it in Chart.input: trimmed, and an IANA
 * name in the database's own capitalisation ("asia/kolkata" -> "Asia/Kolkata").
 * Assumes the zone is valid.
 */
function normalizeZone(zone: string): string {
  const z = zone.trim()
  return fixedOffsetMinutes(z) === null ? Temporal.Now.instant().toZonedDateTimeISO(z).timeZoneId : z
}

/** The repeated or skipped wall-clock time problems of localToUtc, reworded for people. */
function wallTimeIssue(input: BirthInput): InputIssue | null {
  try {
    localToUtc(input)
    return null
  } catch (e) {
    const where = `on ${input.date} in ${input.timeZone}`
    const text = e instanceof Error ? e.message : String(e)
    if (/Nonexistent/.test(text)) {
      return { field: 'time', message: `${input.time} never appeared on the clocks ${where}: they jumped forward at that point. Check the birth time and the time zone.` }
    }
    if (/Ambiguous/.test(text)) {
      const [first, second] = ([0, 1] as const).map((fold) => formatUtcOffset(localToUtc({ ...input, fold }).offsetMinutes))
      return { field: 'fold', message: `${input.time} happened twice ${where} because the clocks went back. Choose the first occurrence (${first}) or the second (${second}).` }
    }
    return { field: 'time', message: text }
  }
}

/** Every problem with a birth input, empty when castChart will accept it. Needs no ephemeris. */
export function validateBirthInput(input: BirthInput): InputIssue[] {
  const issues: InputIssue[] = []
  const date = dateIssue(input.date)
  if (date) issues.push({ field: 'date', message: date })
  const time = timeIssue(input.time)
  if (time) issues.push({ field: 'time', message: time })
  const zone = typeof input.timeZone === 'string' ? input.timeZone.trim() : ''
  if (!zone) issues.push({ field: 'timeZone', message: 'Choose the time zone of the birth place.' })
  else if (!isValidTimeZone(zone)) {
    issues.push({ field: 'timeZone', message: `Unknown time zone "${zone}". Use a zone name such as Asia/Kolkata or a UTC offset such as +05:30.` })
  }
  if (input.fold !== undefined && input.fold !== 0 && input.fold !== 1) {
    issues.push({ field: 'fold', message: 'Choose the first or the second occurrence of the repeated time.' })
  }
  if (typeof input.latitude !== 'number' || !Number.isFinite(input.latitude) || input.latitude <= -90 || input.latitude >= 90) {
    issues.push({ field: 'latitude', message: 'Latitude must be a number of degrees between -90 and 90 (north positive), excluding the poles.' })
  }
  if (typeof input.longitude !== 'number' || !Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    issues.push({ field: 'longitude', message: 'Longitude must be a number of degrees between -180 and 180 (east positive).' })
  }
  if (issues.length === 0) {
    const wall = wallTimeIssue({ ...input, timeZone: zone })
    if (wall) issues.push(wall)
  }
  return issues
}

function assertSettings(settings: Settings): void {
  if (!Object.hasOwn(AYANAMSAS, settings.ayanamsa)) throw new Error(`Unknown ayanamsa "${settings.ayanamsa}"`)
  if (!Object.hasOwn(NODES, settings.node)) throw new Error(`Unknown node type "${settings.node}"`)
  if (!Object.hasOwn(YEAR_MODELS, settings.yearModel)) throw new Error(`Unknown dasha year model "${settings.yearModel}"`)
}

/**
 * Warn when a small birth-time error would change the rising sign. The sign is
 * sampled either side of the birth time instead of extrapolated from the
 * ascendant's speed, because inside the polar circles the ascendant can stall,
 * move backwards or jump to the opposite sign.
 */
function ascendantWarning(jd: number, input: BirthInput, settings: Settings): string | null {
  const signAt = (t: number) => ascendant(t, input.latitude, input.longitude, settings).sign
  const margin = ASC_MARGIN_MINUTES / 1440
  const next = findChanges(signAt, jd, jd + margin, ASC_STEP_DAYS)[0]
  const previous = findChanges(signAt, jd - margin, jd, ASC_STEP_DAYS).at(-1)
  const about = (days: number) => (days * 1440 < 1 ? 'less than a minute' : `about ${Math.round(days * 1440)} min`)
  const tail = 'If the birth time is not exact to the minute, the ascendant and the houses counted from it may differ.'
  if (next && (!previous || next.jd - jd <= jd - previous.jd)) {
    return `The rising sign changes to ${SIGN_NAMES[next.to]} ${about(next.jd - jd)} after the given time. ${tail}`
  }
  if (previous) return `The rising sign was ${SIGN_NAMES[previous.from]} until ${about(jd - previous.jd)} before the given time. ${tail}`
  return null
}

function timeZoneWarning(year: number, zone: string, offsetMinutes: number): string | null {
  if (year >= TZDB_RELIABLE_FROM) return null
  const offset = formatUtcOffset(offsetMinutes)
  return fixedOffsetMinutes(zone) === null
    ? `Check the historical time zone: the time-zone database gives ${offset} for ${zone} on this date, but its records before 1970 are reconstructions, and war time, daylight saving or local mean time were common.`
    : `Check the historical time zone: before 1970 war time, daylight saving or local mean time were common, so confirm that ${offset} was the clock offset actually in use.`
}

/** Cast a natal chart. Throws BirthInputError for invalid input and Error for invalid settings. */
export function castChart(input: BirthInput, settings: Settings): Chart {
  const issues = validateBirthInput(input)
  if (issues.length) throw new BirthInputError(issues)
  assertSettings(settings)
  const zone = normalizeZone(input.timeZone)
  const { jd, utc, offsetMinutes } = birthToJd({ ...input, timeZone: zone })
  const positions = positionsWithAscendant(jd, input.latitude, input.longitude, settings)
  const vargas: Chart['vargas'] = {}
  for (const n of VARGAS) {
    vargas[n] = Object.fromEntries(BODIES.map((b) => [b, vargaSign(positions[b].longitude, n)])) as Record<Body, SignIndex>
  }
  const solarDay = solarDayAt(jd, input.latitude, input.longitude, zone)
  const year = Number(input.date.slice(0, 4))
  const warnings = [
    solarDay ? null : POLAR_WARNING,
    year < TESTED_YEARS[0] || year > TESTED_YEARS[1]
      ? `${year} is outside ${TESTED_YEARS[0]}-${TESTED_YEARS[1]}, the range this app is tested for. Earth-rotation corrections (Delta T) and clock records are less certain there, so the ascendant may be slightly off.`
      : null,
    timeZoneWarning(year, zone, offsetMinutes),
    ascendantWarning(jd, input, settings),
  ].filter((w): w is string => w !== null)
  return {
    input: { ...input, timeZone: zone },
    settings: { ...settings },
    jd,
    utc,
    utcOffsetMinutes: offsetMinutes,
    ayanamsaDegrees: ayanamsaDegrees(jd, settings),
    positions,
    vargas,
    panchanga: panchanga(positions.Sun.longitude, positions.Moon.longitude),
    solarDay,
    warnings,
  }
}
