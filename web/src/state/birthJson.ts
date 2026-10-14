// Exchange a profile with the Python toolkit's birth specification
// (INPUT_FORMATS.md): {label, datetime, timezone, fold, latitude, longitude,
// settings}. A naive datetime plus an IANA "timezone" is used for zone names;
// a fixed offset is written into the datetime itself, which Python's
// datetime.fromisoformat accepts even with seconds (local mean time).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { fixedOffsetMinutes, isValidTimeZone, localToUtc } from '@/engine/time'
import type { BirthInput, Settings } from '@/engine/types'
import { formatOffset } from './birth'

export interface ToolkitBirth {
  label?: string
  datetime: string
  timezone?: string
  fold?: 0 | 1
  latitude: number
  longitude: number
  /** Display label for the place; ignored by the toolkit. */
  place?: string
  settings?: { ayanamsa: string; node: string; engine: 'moshier' }
}

/** Ayanamsas the toolkit's Settings accepts (vedic_toolkit/astronomy.py). */
const TOOLKIT_AYANAMSAS = new Set(['lahiri', 'raman', 'krishnamurti'])

/**
 * The toolkit JSON for a profile. Settings are included only when the toolkit
 * supports the ayanamsa, so the file always loads there; the year model is a
 * toolkit command-line option, not part of this file.
 */
export function toToolkitBirth(birth: BirthInput, settings?: Settings): ToolkitBirth {
  const time = birth.time.length === 5 ? `${birth.time}:00` : birth.time
  const fixed = fixedOffsetMinutes(birth.timeZone)
  return {
    label: birth.name || 'Birth chart',
    datetime: `${birth.date}T${time}${fixed === null ? '' : formatOffset(fixed, '')}`,
    ...(fixed === null ? { timezone: birth.timeZone } : {}),
    ...(fixed === null && birth.fold !== undefined ? { fold: birth.fold } : {}),
    latitude: birth.latitude,
    longitude: birth.longitude,
    ...(birth.place ? { place: birth.place } : {}),
    ...(settings && TOOLKIT_AYANAMSAS.has(settings.ayanamsa)
      ? { settings: { ayanamsa: settings.ayanamsa, node: settings.node, engine: 'moshier' as const } }
      : {}),
  }
}

const DATETIME_RE = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(Z|[+-]\d{2}:?\d{2}(?::?\d{2})?)?$/

function toNumber(v: unknown, field: string): number {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new Error(`"${field}" must be a number`)
  return n
}

/**
 * Read a toolkit birth file. Mirrors load_birth/local_time: a naive datetime
 * needs a time zone, and an explicit offset must agree with the zone when both
 * are given. Fractions of a second are dropped. Throws Error with a message
 * suitable for display.
 */
export function parseToolkitBirth(json: unknown): BirthInput {
  if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error('Expected a JSON object with datetime, latitude and longitude')
  const spec = json as Record<string, unknown>
  if (typeof spec.datetime !== 'string') throw new Error('"datetime" is required, e.g. "1990-04-28T05:50:00"')
  const m = DATETIME_RE.exec(spec.datetime.trim())
  if (!m) throw new Error('"datetime" must look like 1990-04-28T05:50:00 (optionally with an offset such as +05:30)')
  const [, date, time, offset] = m
  const zoneName = typeof spec.timezone === 'string' && spec.timezone.trim() ? spec.timezone.trim() : null
  const offsetZone = offset === 'Z' ? 'UTC' : offset ?? null
  const timeZone = zoneName ?? offsetZone
  if (!timeZone) throw new Error('A local datetime needs a "timezone" (such as "Asia/Kolkata") or an offset')
  if (!isValidTimeZone(timeZone)) throw new Error(`Unknown time zone "${timeZone}"`)
  const fold = spec.fold === 0 || spec.fold === 1 ? spec.fold : undefined
  if (spec.fold !== undefined && fold === undefined) throw new Error('"fold" must be 0 or 1')
  const latitude = toNumber(spec.latitude, 'latitude')
  const longitude = toNumber(spec.longitude, 'longitude')
  if (Math.abs(latitude) >= 90) throw new Error('Latitude must be strictly between -90 and 90')
  if (Math.abs(longitude) > 180) throw new Error('Longitude must be between -180 and 180')

  const birth: BirthInput = {
    ...(typeof spec.label === 'string' && spec.label.trim() ? { name: spec.label.trim().slice(0, 60) } : {}),
    date, time, timeZone,
    ...(fold !== undefined ? { fold } : {}),
    latitude, longitude,
    ...(typeof spec.place === 'string' && spec.place.trim() ? { place: spec.place.trim() } : {}),
  }
  if (zoneName && offsetZone) {
    // The written offset fixes which reading of the wall time is meant.
    const wanted = fixedOffsetMinutes(offsetZone)!
    const match = ([0, 1] as const).find((f) => localToUtc({ ...birth, fold: f }).offsetMinutes === wanted)
    if (match === undefined) throw new Error('The offset in "datetime" disagrees with "timezone"')
    const ambiguous = localToUtc({ ...birth, fold: 0 }).offsetMinutes !== localToUtc({ ...birth, fold: 1 }).offsetMinutes
    return ambiguous ? { ...birth, fold: match } : birth
  }
  localToUtc(birth) // Rejects a skipped or unresolved repeated wall time, as the toolkit does.
  return birth
}

/** "ravi-kumar.birth.json" */
export function birthFileName(birth: BirthInput): string {
  const slug = (birth.name ?? 'chart').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug || 'chart'}.birth.json`
}
