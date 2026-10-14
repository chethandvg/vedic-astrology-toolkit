// The short phrases the forecast engine (engine/predict.ts) builds its reason titles, event titles
// and dates from, in English. Each language's interpretation pack supplies the same functions, so
// the engine composes no user-facing words of its own.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { NAKSHATRA_NAMES, SIGN_NAMES, SIGN_SANSKRIT, TITHI_NAMES } from '@/engine/core'
import { describeDuration } from '@/engine/dasha'
import { addDays, weekdayOf } from '@/engine/time'
import type { Planet, SignIndex } from '@/engine/types'
import { joinList, ordinal } from './format'

/** A local instant read to the minute (engine/time.ts jdToLocal). */
export interface LocalParts {
  date: string
  time: string
  weekday: number
  day: number
  month: number
  year: number
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LEVEL_NAMES = ['Mahadasha', 'Antardasha', 'Pratyantardasha'] as const

/** "Tue 20 Oct" (or "20 Oct"). */
function dateLabel(date: string, weekday = true): string {
  const [, m, d] = date.split('-').map(Number)
  return `${weekday ? `${WEEKDAYS[weekdayOf(date)]} ` : ''}${d} ${MONTHS[m - 1]}`
}

/** A run of consecutive dates: "Sat 24 – Sun 25 Oct", "7–8 Oct", "30 Oct – 1 Nov". */
function runLabel(first: string, last: string, weekday: boolean): string {
  if (first === last) return dateLabel(first, weekday)
  if (first.slice(0, 7) !== last.slice(0, 7)) return `${dateLabel(first, weekday)} – ${dateLabel(last, weekday)}`
  const day = Number(first.slice(8))
  return weekday ? `${WEEKDAYS[weekdayOf(first)]} ${day} – ${dateLabel(last)}` : `${day}–${dateLabel(last, false)}`
}

/** Sorted dates grouped into runs of consecutive days. */
export function dateRuns(dates: readonly string[]): string[][] {
  const runs: string[][] = []
  for (const d of dates) {
    const run = runs.at(-1)
    if (run && addDays(run.at(-1)!, 1) === d) run.push(d)
    else runs.push([d])
  }
  return runs
}

const tithiName = (tithi: number) => (tithi === 15 ? 'Purnima' : tithi === 30 ? 'Amavasya' : TITHI_NAMES[(tithi - 1) % 15])

export const ENGINE_TEXT = {
  dateLabel,
  /** Dates grouped into consecutive runs: "Tue 20 Oct and Sat 24 – Sun 25 Oct". */
  dateList: (dates: readonly string[], weekday = true): string => joinList(dateRuns(dates).map((r) => runLabel(r[0], r.at(-1)!, weekday))),
  /** A time on another civil date than the day's: "04:03 on Thu 15 Oct". */
  clockOn: (p: LocalParts): string => `${p.time} on ${WEEKDAYS[p.weekday]} ${p.day} ${MONTHS[p.month - 1]}`,
  /** A time after midnight, in a headline: "04:03 tomorrow". */
  timeTomorrow: (time: string): string => `${time} tomorrow`,
  /** "2 Jun 2027". */
  fullDate: (p: LocalParts): string => `${p.day} ${MONTHS[p.month - 1]} ${p.year}`,
  /** "2 Jun 2027, 14:05". */
  dateTime: (p: LocalParts): string => `${p.day} ${MONTHS[p.month - 1]} ${p.year}, ${p.time}`,
  /** "Jun 2027". */
  monthYear: (year: number, month: number): string => `${MONTHS[month - 1]} ${year}`,
  /** "Fri 2 Oct 15:41" (or "2 Oct 15:41"). */
  instant: (p: LocalParts, weekday: boolean): string => `${weekday ? `${WEEKDAYS[p.weekday]} ` : ''}${p.day} ${MONTHS[p.month - 1]} ${p.time}`,
  until: (x: string): string => `until ${x}`,
  from: (x: string): string => `from ${x}`,
  fromTo: (a: string, b: string): string => `from ${a} to ${b}`,
  range: (a: string, b: string): string => `${a} – ${b}`,
  throughDaytime: 'through the daytime',
  allMonth: 'all month',
  allYear: 'all year',
  thisWeek: ' this week',

  // Events
  ingressTitle(planet: Planet, sign: SignIndex, back: boolean): string {
    if (planet === 'Sun') return `Sun enters ${SIGN_NAMES[sign]} (${SIGN_SANSKRIT[sign]} Sankranti)`
    if (back) return `${planet} moves back into ${SIGN_NAMES[sign]} (retrograde)`
    return `${planet} enters ${SIGN_NAMES[sign]}`
  },
  stationTitle: (planet: Planet, turn: 'retrograde' | 'direct', sign: SignIndex): string => `${planet} turns ${turn} in ${SIGN_NAMES[sign]}`,
  nakshatraTitle: (star: number): string => `Moon enters ${NAKSHATRA_NAMES[star - 1]} nakshatra`,
  dashaEvent: (level: number, lord: Planet, chain: readonly Planet[], days: number): { title: string; detail: string } => ({
    title: `${LEVEL_NAMES[level]} of ${lord} begins${chain.length > 1 ? ` (${chain.join('–')})` : ''}`,
    detail: `Lasts ${describeDuration(days)}.`,
  }),
  fromMoonDetail: (house: number, text: string): string => `Your ${ordinal(house)} from the Moon: ${text}`,
  taraDetail: (tara: string, text: string): string => `${tara} tara: ${text}`,
  chandrashtamaBegins: 'Chandrashtama begins',
  chandrashtamaEnds: 'Chandrashtama ends',
  chandrashtamaEnterDetail: (sign: SignIndex, until: string): string => `The Moon enters ${SIGN_NAMES[sign]}, the 8th sign from your birth Moon, until ${until}.`,
  chandrashtamaLeaveDetail: 'The Moon leaves the 8th sign from your birth Moon.',
  phaseBegins: (name: string): string => `${name} begins`,
  phaseEnds: (name: string): string => `${name} ends`,

  // Reason titles
  gocharaTitle: (planet: Planet, house: number, suffix = ''): string => `${planet} in your ${ordinal(house)} from the Moon${suffix}`,
  moonChangeTitle: 'The Moon changes sign or star today',
  moonSign: (sign: SignIndex): string => SIGN_NAMES[sign],
  moonStar: (star: number): string => `${NAKSHATRA_NAMES[star - 1]} nakshatra`,
  /** "The Moon moves into Leo and Magha nakshatra at 22:18." */
  moonMoves: (moves: readonly { names: readonly string[]; time: string }[]): string =>
    `The Moon moves into ${joinList(moves.map((m) => `${m.names.join(' and ')} at ${m.time}`))}.`,
  taraTitle: (tara: string, star: number): string => `${tara} tara: Moon in ${NAKSHATRA_NAMES[star - 1]}`,
  chandrashtamaTitle: (when: string): string => `Chandrashtama ${when}`,
  chandraBalaTitle: (house: number): string => `Moon in your ${ordinal(house)} from your birth Moon`,
  dashaTransitTitle: (lord: Planet, house: number): string => `Sub-period lord ${lord} in your ${ordinal(house)} from the Moon`,
  tithiName,
  /** "Sukla Navami", "Amavasya". */
  tithiLabel: (tithi: number): string => (tithi % 15 === 0 ? tithiName(tithi) : `${tithi <= 15 ? 'Sukla' : 'Krishna'} ${tithiName(tithi)}`),
  amavasyaTitle: (when: string): string => `Amavasya (New Moon) ${when}`,
  riktaTitle: (label: string, when: string): string => `${label} (Rikta tithi) ${when}`,
  vishtiTitle: (when: string): string => `Vishti (Bhadra) karana ${when}`,
  bestDaysTitle: (count: number, dates: string): string => `Best ${count > 1 ? 'days' : 'day'}: ${dates}`,
  carefulDaysTitle: (dates: string): string => `Go gently: ${dates}`,
  chandrashtamaStayTitle: (from: string, to: string): string => `Moon in your 8th: ${from} – ${to}`,
  /** After a transit title in a week, month or year: " (Leo) until 2 Jun 2027". */
  stretchSuffix: (sign: SignIndex, span: string): string => ` (${SIGN_NAMES[sign]}) ${span}`,
  ingressReasonTitle: (title: string, house: number, on: string): string => `${title}, your ${ordinal(house)} from the Moon · ${on}`,
  dashaTitle: (lords: readonly Planet[]): string => `Dasha: ${lords.join('–')}`,
  retrogradeTitle: (planet: Planet, span: string): string => `${planet} retrograde ${span}`,
  noSadeSatiTitle: 'No Sade Sati this year',
  munthaTitle: (house: number, sign: SignIndex, span: string): string => `Muntha in your ${ordinal(house)} (${SIGN_NAMES[sign]}) ${span}`,
}

export type EngineText = typeof ENGINE_TEXT
