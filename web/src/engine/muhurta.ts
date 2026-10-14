// Daily muhurta timings for one sunrise-to-sunrise Vedic day: Rahu Kalam, Yamaganda,
// Gulika Kalam, Abhijit, Durmuhurta, Choghadiya and planetary horas.
// Every weekday table below follows Drik Panchang and was checked against its New Delhi,
// Bengaluru, New York and Sydney pages for October 2026 (see tests/muhurta.test.ts);
// Prokerala's Ujjain pages agree apart from Saturday's durmuhurta. Prokerala's sunrise
// is about 3 minutes later and its sunset earlier (another sunrise convention), so its
// clock times differ slightly; we follow Drik Panchang (upper limb, refraction).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { solarDayAt, solarDayForDate } from './sunrise'
import { jdToLocal } from './time'
import type { DayTimings, Hora, Planet, SolarDay, TimeWindow, WindowQuality } from './types'

/** Weekday lords, Sunday = 0 (core.SEVEN in the toolkit). */
export const WEEKDAY_LORDS: readonly Planet[] = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn']

/** Chaldean order, slowest to fastest; successive horas step through it (core.hora_lord, PDF 25-26). */
export const CHALDEAN_ORDER: readonly Planet[] = ['Saturn', 'Jupiter', 'Mars', 'Sun', 'Venus', 'Mercury', 'Moon']

/**
 * Which eighth (1..8) of the daytime each kalam occupies, Sunday first.
 * Gulika Kalam is Saturn's part when the parts are ruled from the weekday lord in weekday
 * order, the same ring as core.upagraha_segments. Yamaganda is Jupiter's part in the plain
 * seven-lord ring, so on Friday and Saturday it falls in the 7th and 6th parts, whereas the
 * toolkit's Yamaghantaka upagraha (eight-part ring with a lordless part) uses the 8th and 7th.
 * The 7th/6th reading is the one Drik Panchang, Prokerala and most printed panchangs publish.
 * Rahu Kalam has no lord ring; it is the traditional fixed table (Sun 8, Mon 2, Tue 7, Wed 5,
 * Thu 6, Fri 4, Sat 3), identical in every source checked.
 */
export const RAHU_KALAM_PART = [8, 2, 7, 5, 6, 4, 3] as const
export const YAMAGANDA_PART = [5, 4, 3, 2, 1, 7, 6] as const
export const GULIKA_KALAM_PART = [7, 6, 5, 4, 3, 2, 1] as const

/**
 * Durmuhurtas as 1-based muhurtas among the 15 equal parts of the daytime (sunrise to sunset)
 * and the 15 of the night (sunset to next sunrise), Sunday first; only Tuesday has a night one
 * (the night's 7th, Agni). Drik Panchang publishes exactly this table. Prokerala agrees except on
 * Saturday, where it shows the 3rd muhurta alone (checked 17 and 24 Oct 2026); we keep the 1st
 * and 2nd (Rudra and Sarpa), the pair the classical weekday lists name for Saturday.
 */
export const DURMUHURTA: readonly { day: readonly number[]; night: readonly number[] }[] = [
  { day: [14], night: [] },
  { day: [9, 12], night: [] },
  { day: [4], night: [7] },
  { day: [8], night: [] },
  { day: [6, 12], night: [] },
  { day: [4, 9], night: [] },
  { day: [1, 2], night: [] },
]

export type ChoghadiyaName = 'Udveg' | 'Amrit' | 'Rog' | 'Labh' | 'Shubh' | 'Char' | 'Kaal'

/** Choghadiya ruled by each weekday lord (index = weekday, so Sun = Udveg ... Saturn = Kaal). */
export const CHOGHADIYA: readonly { name: ChoghadiyaName; quality: WindowQuality; note: string }[] = [
  { name: 'Udveg', quality: 'avoid', note: 'Restless period; avoid new starts, though official or government errands are traditionally allowed.' },
  { name: 'Amrit', quality: 'good', note: 'The best period of all, suitable for any worthwhile activity.' },
  { name: 'Rog', quality: 'avoid', note: 'Troubled period; traditionally avoided for new starts and for matters of health.' },
  { name: 'Labh', quality: 'good', note: 'Period of gain; well suited to business, trade and study.' },
  { name: 'Shubh', quality: 'good', note: 'Auspicious period for ceremonies, learning and new beginnings.' },
  { name: 'Char', quality: 'neutral', note: 'Moving period; fine for travel and routine work, less so for lasting commitments.' },
  { name: 'Kaal', quality: 'avoid', note: 'Period of loss; keep to routine tasks and postpone anything important.' },
]

const NOTES = {
  rahu: 'Rahu’s part of the day; traditionally avoided for starting new work, travel or purchases.',
  yama: 'Yama’s part of the day; traditionally avoided for auspicious beginnings.',
  gulika: 'Gulika’s part of the day; tradition holds that what begins now tends to repeat, so avoid starting what you would not want again.',
  abhijit: 'The midday muhurta, traditionally strong enough to support most undertakings.',
  durmuhurta: 'An unfavourable muhurta for this weekday; traditionally avoided for important beginnings.',
}

/** The `k`-th (0-based) of `n` equal parts of [from, to]; shared boundaries are bit-identical. */
function part(from: number, to: number, n: number, k: number): [number, number] {
  const at = (i: number) => (i === 0 ? from : i === n ? to : from + ((to - from) * i) / n)
  return [at(k), at(k + 1)]
}

function timeWindow(name: string, [startJd, endJd]: [number, number], quality: WindowQuality, note: string): TimeWindow {
  return { name, startJd, endJd, quality, note }
}

/**
 * Durmuhurtas of the day in time order. A muhurta is a fifteenth of the day or night, so
 * these are about 48 minutes long near the equinoxes.
 */
function durmuhurtas(day: SolarDay): TimeWindow[] {
  const { day: d, night: n } = DURMUHURTA[day.weekday]
  return [
    ...d.map((m) => part(day.sunriseJd, day.sunsetJd, 15, m - 1)),
    ...n.map((m) => part(day.sunsetJd, day.nextSunriseJd, 15, m - 1)),
  ].map((span) => timeWindow('Durmuhurta', span, 'avoid', NOTES.durmuhurta))
}

/**
 * Eight day and eight night choghadiyas. The day sequence starts with the weekday lord and
 * follows the hora (Chaldean) order, i.e. every 6th weekday (+5). The night starts with the
 * lord of the 5th weekday (Sunday night: Jupiter, Shubh) and steps every 5th weekday (+4),
 * the same night start as core.upagraha_segments. Verified against all seven day/night
 * sequences on Drik Panchang and Prokerala.
 */
function choghadiyas(day: SolarDay): TimeWindow[] {
  const w = day.weekday
  const seg = (lord: number, span: [number, number]) => {
    const c = CHOGHADIYA[lord % 7]
    return timeWindow(c.name, span, c.quality, c.note)
  }
  return [
    ...Array.from({ length: 8 }, (_, i) => seg(w + 5 * i, part(day.sunriseJd, day.sunsetJd, 8, i))),
    ...Array.from({ length: 8 }, (_, i) => seg(w + 4 + 4 * i, part(day.sunsetJd, day.nextSunriseJd, 8, i))),
  ]
}

/**
 * 24 unequal planetary hours: 12 from sunrise to sunset and 12 from sunset to the next sunrise,
 * the first ruled by the weekday lord and each next by the next planet in Chaldean order (as
 * Drik Panchang). The toolkit's hora_lord instead divides sunrise-to-sunrise into 24 equal horas
 * (Rao, PDF 25-26); the lord sequence is the same, only the boundaries differ.
 */
function horas(day: SolarDay): Hora[] {
  const first = CHALDEAN_ORDER.indexOf(WEEKDAY_LORDS[day.weekday])
  return Array.from({ length: 24 }, (_, i) => {
    const [startJd, endJd] = i < 12 ? part(day.sunriseJd, day.sunsetJd, 12, i) : part(day.sunsetJd, day.nextSunriseJd, 12, i - 12)
    return { startJd, endJd, lord: CHALDEAN_ORDER[(first + i) % 7] }
  })
}

/** All timings for a known solar day; `date` is the civil date of its sunrise in `zone`. */
export function timingsForSolarDay(solarDay: SolarDay, date: string, zone: string): DayTimings {
  const { sunriseJd: sr, sunsetJd: ss, weekday } = solarDay
  const eighth = (n: number) => part(sr, ss, 8, n - 1)
  return {
    date,
    timeZone: zone,
    solarDay,
    rahuKalam: timeWindow('Rahu Kalam', eighth(RAHU_KALAM_PART[weekday]), 'avoid', NOTES.rahu),
    yamaganda: timeWindow('Yamaganda', eighth(YAMAGANDA_PART[weekday]), 'avoid', NOTES.yama),
    gulikaKalam: timeWindow('Gulika Kalam', eighth(GULIKA_KALAM_PART[weekday]), 'avoid', NOTES.gulika),
    // The 8th of 15 daytime muhurtas, centred on the midpoint of sunrise and sunset. On Wednesday
    // that muhurta is the day's durmuhurta, so Drik Panchang ("None") and Prokerala ("Nil") give
    // no Abhijit at all; null keeps it from being shown as a good window.
    abhijit: weekday === 3 ? null : timeWindow('Abhijit Muhurta', part(sr, ss, 15, 7), 'good', NOTES.abhijit),
    durmuhurta: durmuhurtas(solarDay),
    choghadiya: choghadiyas(solarDay),
    horas: horas(solarDay),
  }
}

/** Timings of the Vedic day that begins at sunrise on civil `date` in `zone`; null in polar day or night. */
export function dayTimings(date: string, latitude: number, longitude: number, zone: string): DayTimings | null {
  const solarDay = solarDayForDate(date, latitude, longitude, zone)
  return solarDay && timingsForSolarDay(solarDay, date, zone)
}

/** Timings of the Vedic day containing `jd` (before sunrise that is the previous civil date's day). */
export function dayTimingsAt(jd: number, latitude: number, longitude: number, zone: string): DayTimings | null {
  const solarDay = solarDayAt(jd, latitude, longitude, zone)
  return solarDay && timingsForSolarDay(solarDay, jdToLocal(solarDay.sunriseJd, zone).date, zone)
}

/** The window or hora running at `jd` (start inclusive, end exclusive). */
export function activeAt<T extends { startJd: number; endJd: number }>(items: readonly T[], jd: number): T | undefined {
  return items.find((x) => x.startJd <= jd && jd < x.endJd)
}
