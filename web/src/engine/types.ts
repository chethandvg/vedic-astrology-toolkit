// Shared engine contract. Every engine module and UI component codes against
// these types; change them only deliberately and update all users.
// Conventions: longitudes are sidereal degrees [0, 360); signs are indices
// 0 = Aries ... 11 = Pisces; houses are 1..12; instants are Julian Day UT1
// numbers ("jd"); civil dates are ISO strings "YYYY-MM-DD" in the user's zone.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

export const PLANETS = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn', 'Rahu', 'Ketu'] as const
export type Planet = (typeof PLANETS)[number]
export type Body = Planet | 'Asc'
export const BODIES: readonly Body[] = [...PLANETS, 'Asc']

/** Signs as in the Python toolkit (core.SIGNS). */
export const SIGN_CODES = ['Ar', 'Ta', 'Ge', 'Cn', 'Le', 'Vi', 'Li', 'Sc', 'Sg', 'Cp', 'Aq', 'Pi'] as const
export type SignIndex = number

export type Ayanamsa = 'lahiri' | 'raman' | 'krishnamurti' | 'true_citra' | 'true_pushya' | 'yukteshwar'
/** Length of a dasha year: 'solar' = 365.2425 days (most software), 'savana' = 360 days (Rao's book). */
export type YearModel = 'solar' | 'savana'
export type NodeType = 'mean' | 'true'

export interface Settings {
  ayanamsa: Ayanamsa
  node: NodeType
  yearModel: YearModel
}

export const PRESETS: Record<'popular' | 'book', Settings> = {
  /** Matches most Vedic software: Lahiri, mean node, solar-year dashas. */
  popular: { ayanamsa: 'lahiri', node: 'mean', yearModel: 'solar' },
  /** P. V. R. Narasimha Rao's book: Lahiri, mean node, 360-day savana years. */
  book: { ayanamsa: 'lahiri', node: 'mean', yearModel: 'savana' },
}
export const DEFAULT_SETTINGS: Settings = PRESETS.popular

export interface BirthInput {
  name?: string
  /** Local civil date, "YYYY-MM-DD". */
  date: string
  /** Local civil time, "HH:mm" or "HH:mm:ss". */
  time: string
  /** IANA zone ("Asia/Kolkata") or fixed offset ("+05:30", "UTC-04:00", "+05:21:10" for LMT). */
  timeZone: string
  /** Disambiguates a repeated wall time during a daylight-saving change. */
  fold?: 0 | 1
  /** Degrees, north positive. */
  latitude: number
  /** Degrees, east positive. */
  longitude: number
  /** Display label such as "Mysuru, Karnataka, India". */
  place?: string
}

export interface Nakshatra {
  /** 1..27, Ashwini = 1. */
  index: number
  name: string
  pada: 1 | 2 | 3 | 4
  /** Vimsottari lord. */
  lord: Planet
  /** Fraction of the nakshatra already traversed, [0, 1). */
  elapsed: number
}

export interface BodyPosition {
  body: Body
  longitude: number
  latitude: number
  /** Degrees per day; 0 for the ascendant. */
  speed: number
  retrograde: boolean
  sign: SignIndex
  /** Degrees within the sign, [0, 30). */
  degree: number
  nakshatra: Nakshatra
}

export interface Panchanga {
  /** 1..30 */
  tithi: number
  paksha: 'Sukla' | 'Krishna'
  tithiInPaksha: number
  tithiName: string
  /** Moon minus Sun, [0, 360). */
  elongation: number
  nakshatra: Nakshatra
  /** 1..27 */
  yogaIndex: number
  yoga: string
  karana: string
}

/** The Vedic day runs from sunrise to the next sunrise. */
export interface SolarDay {
  sunriseJd: number
  sunsetJd: number
  nextSunriseJd: number
  /** 0 = Sunday, counted from sunrise. */
  weekday: number
  isDay: boolean
}

export interface Chart {
  input: BirthInput
  settings: Settings
  jd: number
  /** UTC ISO instant of birth. */
  utc: string
  /** Offset in minutes east of UTC that applied at birth. */
  utcOffsetMinutes: number
  ayanamsaDegrees: number
  positions: Record<Body, BodyPosition>
  /** vargas[9].Moon is the Moon's navamsa sign. Contains D1..D60 as in the Python toolkit. */
  vargas: Record<number, Record<Body, SignIndex>>
  panchanga: Panchanga
  /** null in polar day or night. */
  solarDay: SolarDay | null
  warnings: string[]
}

export interface DashaPeriod {
  lord: Planet
  /** 0 = mahadasha, 1 = antardasha, 2 = pratyantardasha. */
  level: 0 | 1 | 2
  startJd: number
  endJd: number
  children?: DashaPeriod[]
}

export type EventKind =
  | 'ingress' | 'retrograde' | 'direct' | 'moon_sign' | 'moon_nakshatra' | 'sankranti'
  | 'dasha' | 'sade_sati' | 'chandrashtama' | 'eclipse' | 'tithi'

export interface TimedEvent {
  jd: number
  kind: EventKind
  body?: Planet
  sign?: SignIndex
  /** Nakshatra 1..27 for nakshatra events. */
  nakshatra?: number
  /** Short plain-language label, e.g. "Jupiter enters Leo". */
  title: string
  /** Optional one-line explanation of what it means for the user. */
  detail?: string
  effect?: Effect
}

export type WindowQuality = 'good' | 'neutral' | 'avoid'

export interface TimeWindow {
  name: string
  startJd: number
  endJd: number
  quality: WindowQuality
  note?: string
}

export interface Hora {
  startJd: number
  endJd: number
  lord: Planet
}

export interface DayTimings {
  /** Civil date the timings belong to (the day whose sunrise starts it). */
  date: string
  timeZone: string
  solarDay: SolarDay
  rahuKalam: TimeWindow
  yamaganda: TimeWindow
  gulikaKalam: TimeWindow
  abhijit: TimeWindow | null
  durmuhurta: TimeWindow[]
  /** 8 day + 8 night segments. */
  choghadiya: TimeWindow[]
  /** 24 planetary hours from sunrise. */
  horas: Hora[]
}

/** +1 supportive, 0 neutral or mixed, -1 challenging. */
export type Effect = 1 | 0 | -1
export type Rating = 'favourable' | 'mixed' | 'challenging'

export interface Reason {
  /** Machine key, e.g. "tara_bala", "gochara_Jupiter", "chandrashtama", "dasha". */
  factor: string
  effect: Effect
  /** Relative importance used by the score, > 0. */
  weight: number
  /** Short heading, e.g. "Moon in your 8th (Chandrashtama)". */
  title: string
  /** One or two plain-language sentences. Original wording, never copied from books. */
  text: string
  /** Where the rule comes from, e.g. "Classical gochara table (Phaladeepika ch. 26)". */
  source: string
}

export type Horizon = 'day' | 'week' | 'month' | 'year'

export interface Forecast {
  horizon: Horizon
  /** First civil date covered, "YYYY-MM-DD". */
  start: string
  /** Last civil date covered (inclusive). */
  end: string
  rating: Rating
  /** Weighted score in [-1, 1]. */
  score: number
  headline: string
  reasons: Reason[]
  events: TimedEvent[]
  /** Daily breakdown for week and month views; monthly breakdown for the year view. */
  parts?: Forecast[]
  /** Running dasha chain at the start of the period (MD, AD, PD). */
  dasha: DashaPeriod[]
  /** Day timings for the day view. */
  timings?: DayTimings
  /** Week and month: the days the summary names, so every view lists the same ones. */
  highlights?: PeriodHighlights
}

export interface PeriodHighlights {
  /** Best days, in date order. */
  best: string[]
  /** Days to take gently (the lowest-scoring challenging days), in date order. */
  careful: string[]
  /** Stays of the Moon in the 8th sign from the birth Moon (Chandrashtama) that touch the period. */
  chandrashtama: TimeWindow[]
}

export const DISCLAIMER =
  'Traditional Jyotish indications computed from classical rules. They are not validated predictions and are not medical, legal or financial advice.'
