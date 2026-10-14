// Civil time <-> Julian Day UT1, mirroring local_time/to_jd/from_jd in
// vedic_toolkit/astronomy.py: nonexistent wall times are rejected and a
// repeated wall time needs fold 0 (first) or 1 (second).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Temporal } from 'temporal-polyfill'
import { swe } from './swe'
import type { BirthInput } from './types'

const OFFSET_RE = /^(?:UTC|GMT)?\s*([+-])(\d{1,2}):?(\d{2})(?::?(\d{2}))?$/i

/** Fixed offset in minutes east of UTC, or null when `zone` is an IANA name. */
export function fixedOffsetMinutes(zone: string): number | null {
  const z = zone.trim()
  if (/^(UTC|GMT|Z)$/i.test(z)) return 0
  const m = OFFSET_RE.exec(z)
  if (!m) return null
  const h = Number(m[2]), min = Number(m[3]), sec = Number(m[4] ?? 0)
  if (h > 23 || min > 59 || sec > 59) throw new Error(`Invalid UTC offset: ${zone}`)
  return (m[1] === '-' ? -1 : 1) * (h * 60 + min + sec / 60)
}

/** True if `zone` is a fixed offset or an IANA zone known to this browser. */
export function isValidTimeZone(zone: string): boolean {
  try {
    if (fixedOffsetMinutes(zone) !== null) return true
    Temporal.Now.instant().toZonedDateTimeISO(zone)
    return true
  } catch {
    return false
  }
}

function parseLocal(date: string, time: string): Temporal.PlainDateTime {
  const t = time.length === 5 ? `${time}:00` : time
  return Temporal.PlainDateTime.from(`${date}T${t}`)
}

export interface UtcResult {
  /** Milliseconds since the Unix epoch (UTC), with sub-millisecond fraction. */
  epochMs: number
  /** Offset east of UTC in minutes at that instant. */
  offsetMinutes: number
}

/** Local civil time to UTC with the toolkit's gap/overlap rules. */
export function localToUtc(input: Pick<BirthInput, 'date' | 'time' | 'timeZone' | 'fold'>): UtcResult {
  const local = parseLocal(input.date, input.time)
  const fixed = fixedOffsetMinutes(input.timeZone)
  const asUtcMs = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond)
    + local.microsecond / 1000
  if (fixed !== null) return { epochMs: asUtcMs - fixed * 60_000, offsetMinutes: fixed }
  const earlier = local.toZonedDateTime(input.timeZone, { disambiguation: 'earlier' })
  const later = local.toZonedDateTime(input.timeZone, { disambiguation: 'later' })
  if (!earlier.toPlainDateTime().equals(local)) throw new Error('Nonexistent local time during a clock change')
  let chosen = earlier
  if (earlier.epochNanoseconds !== later.epochNanoseconds) {
    if (input.fold === undefined) throw new Error('Ambiguous local time: choose the first or second occurrence (fold 0 or 1)')
    chosen = input.fold === 1 ? later : earlier
  }
  const offsetMinutes = chosen.offsetNanoseconds / 60e9
  return { epochMs: asUtcMs - offsetMinutes * 60_000, offsetMinutes }
}

const UNIX_EPOCH_JD = 2440587.5
const DAY_MS = 86_400_000

/**
 * UTC epoch milliseconds to a Julian Day number. Pure arithmetic that treats UTC as UT1
 * (they differ by under 0.9 s), so dates and times can be scheduled and displayed without
 * loading the ephemeris. Birth instants use birthToJd, which matches the toolkit exactly.
 */
export function epochMsToJd(epochMs: number): number {
  return epochMs / DAY_MS + UNIX_EPOCH_JD
}

/** Julian Day number to UTC epoch milliseconds; the inverse of epochMsToJd. */
export function jdToEpochMs(jd: number): number {
  return (jd - UNIX_EPOCH_JD) * DAY_MS
}

/** UTC epoch milliseconds to JD UT1 via swe_utc_to_jd, the same call as the toolkit's to_jd. */
function epochMsToJdUt1(epochMs: number): number {
  const d = new Date(Math.floor(epochMs))
  const second = d.getUTCSeconds() + (epochMs - Math.floor(epochMs / 1000) * 1000) / 1000
  return swe().utcToJd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), second).ut1
}

/** Birth time to JD UT1, reproducing the Python toolkit (needs the ephemeris loaded). */
export function birthToJd(input: Pick<BirthInput, 'date' | 'time' | 'timeZone' | 'fold'>): { jd: number; utc: string; offsetMinutes: number } {
  const { epochMs, offsetMinutes } = localToUtc(input)
  return { jd: epochMsToJdUt1(epochMs), utc: new Date(Math.round(epochMs)).toISOString(), offsetMinutes }
}

/** Offset east of UTC (minutes) in `zone` at an instant. */
export function offsetMinutesAt(zone: string, epochMs: number): number {
  const fixed = fixedOffsetMinutes(zone)
  if (fixed !== null) return fixed
  return Temporal.Instant.fromEpochMilliseconds(Math.floor(epochMs)).toZonedDateTimeISO(zone).offsetNanoseconds / 60e9
}

export interface LocalParts {
  date: string
  time: string
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
  /** 0 = Sunday (civil weekday). */
  weekday: number
  offsetMinutes: number
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0')

/**
 * Wall-clock fields in `zone` for an instant. Rounds to the millisecond (or to the
 * minute) first, so Julian Day floating-point noise cannot turn 00:00 into 23:59 the day before.
 */
export function jdToLocal(jd: number, zone: string, round: 'ms' | 'minute' = 'ms'): LocalParts {
  const unit = round === 'minute' ? 60_000 : 1
  const epochMs = Math.round(jdToEpochMs(jd) / unit) * unit
  const offsetMinutes = offsetMinutesAt(zone, epochMs)
  const d = new Date(epochMs + offsetMinutes * 60_000)
  const year = d.getUTCFullYear(), month = d.getUTCMonth() + 1, day = d.getUTCDate()
  const hour = d.getUTCHours(), minute = d.getUTCMinutes(), second = d.getUTCSeconds()
  return {
    date: `${pad(year, 4)}-${pad(month)}-${pad(day)}`, time: `${pad(hour)}:${pad(minute)}`,
    year, month, day, hour, minute, second, weekday: d.getUTCDay(), offsetMinutes,
  }
}

/** Julian Day of a local wall time on a civil date (gaps resolve forward, overlaps to the first). No ephemeris needed. */
export function localToJd(date: string, zone: string, time = '00:00'): number {
  const local = parseLocal(date, time)
  const fixed = fixedOffsetMinutes(zone)
  if (fixed !== null) return epochMsToJd(localToUtc({ date, time, timeZone: zone }).epochMs)
  const zdt = local.toZonedDateTime(zone, { disambiguation: 'compatible' })
  return epochMsToJd(zdt.epochMilliseconds)
}

export type JdFormat = 'time' | 'date' | 'datetime' | 'weekday-date'

/**
 * Human-readable local time for UI labels, e.g. "07:42", "14 Oct 2026", "Wed 14 Oct".
 * Times round to the nearest minute, as published panchangs do. No ephemeris needed.
 */
export function formatJd(jd: number, zone: string, style: JdFormat = 'datetime'): string {
  const p = jdToLocal(jd, zone, style === 'time' || style === 'datetime' ? 'minute' : 'ms')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const date = `${p.day} ${months[p.month - 1]} ${p.year}`
  if (style === 'time') return p.time
  if (style === 'date') return date
  if (style === 'weekday-date') return `${days[p.weekday]} ${p.day} ${months[p.month - 1]}`
  return `${date}, ${p.time}`
}

/** Civil-date arithmetic on "YYYY-MM-DD" strings. */
export function addDays(date: string, days: number): string {
  return Temporal.PlainDate.from(date).add({ days }).toString()
}

export function addMonths(date: string, months: number): string {
  return Temporal.PlainDate.from(date).add({ months }).toString()
}

/** 0 = Sunday. */
export function weekdayOf(date: string): number {
  return Temporal.PlainDate.from(date).dayOfWeek % 7
}

export function daysInMonth(year: number, month: number): number {
  return Temporal.PlainYearMonth.from({ year, month }).daysInMonth
}

/** Today's civil date in `zone`. */
export function todayIn(zone: string): string {
  const fixed = fixedOffsetMinutes(zone)
  if (fixed !== null) return new Date(Date.now() + fixed * 60_000).toISOString().slice(0, 10)
  return Temporal.Now.plainDateISO(zone).toString()
}

/** The browser's own IANA zone, e.g. "Asia/Kolkata". */
export const browserTimeZone = (): string => Intl.DateTimeFormat().resolvedOptions().timeZone
