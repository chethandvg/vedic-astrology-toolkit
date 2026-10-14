// Data seam for the forecast screens: the pages read forecasts, the birth chart and the
// timings place only through the hooks below, which call the engine worker (src/lib/engine.ts).
// Requests are keyed by the birth details that change results (not the name or place label),
// the calculation settings and the timings place, so changing any of them recomputes, and
// results are cached by that key, so returning to a view or a date is instant.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useEffect, useSyncExternalStore } from 'react'
import type { ChartData, ForecastResult } from '@/engine/api'
import type { ForecastExtras } from '@/engine/extras'
import type { LordPromise } from '@/engine/promise'
import type { NatalStrengths } from '@/engine/strengths'
import type { AnnualChart } from '@/engine/tajaka'
import type { Planet } from '@/engine/types'
import type { YogaResult } from '@/engine/yogas'
import type { BirthInput, DayTimings, Forecast, Horizon, Settings } from '@/engine/types'
import { prefetchEngine, useEngineQuery, type Engine } from '@/lib/engine'
import { useActiveProfile, useProfile, type Profile } from '@/state/profiles'
import { calcSettings, useSettings } from '@/state/settings'
import { createPersistentStore } from '@/state/storage'
import { periodStart } from './dates'

export type { ChartData } from '@/engine/api'
export type { ForecastExtras, TransitStay, TransitTrack } from '@/engine/extras'
/** Muntha of the Tajaka year beginning in the calendar year (engine/predict.ts munthaForYear). */
export type { Muntha as MunthaInfo } from '@/engine/predict'

/** Where the user is now: day timings (sunrise, Rahu Kalam, horas...) are computed for it. */
export interface TimingsPlace {
  /** Display label, e.g. "Bengaluru, Karnataka, India". */
  name: string
  latitude: number
  longitude: number
  /** IANA zone or fixed offset; every date and time on the forecast screens is shown in it. */
  timeZone: string
}

export interface Query<T> {
  /** Latest result; kept while a newer request loads (so date steps do not flash), cleared on error. */
  data?: T
  error?: Error
  loading: boolean
  /** Run the request again after an error. */
  retry(): void
}

export type ForecastQuery = Query<Forecast> & { extras?: ForecastExtras }

interface ForecastRequest {
  birth: BirthInput
  settings: Settings
  /** Only what changes results: the engine memoises its contexts on the place it is given. */
  place: Pick<TimingsPlace, 'latitude' | 'longitude' | 'timeZone'>
  horizon: Horizon
  /** First civil date of the period: the day, the week's Sunday, the 1st of the month or 1 January. */
  anchor: string
}

/**
 * The birth fields that change results. The name and place label are left out, so renaming a
 * profile neither splits the cache here nor the engine's memoised contexts (keyed on the birth).
 */
export function birthForEngine({ date, time, timeZone, fold, latitude, longitude }: BirthInput): BirthInput {
  return fold === undefined ? { date, time, timeZone, latitude, longitude } : { date, time, timeZone, fold, latitude, longitude }
}

const forecastKey = (r: ForecastRequest) => JSON.stringify(['forecast', r.birth, r.settings, r.place, r.horizon, r.anchor])
const loadForecast = (r: ForecastRequest) => (engine: Engine) => engine.forecast(r.birth, r.settings, r.place, r.horizon, r.anchor)
const chartKey = (birth: BirthInput, settings: Settings) => JSON.stringify(['chart', birth, settings])
const loadChart = (birth: BirthInput, settings: Settings) => (engine: Engine) => engine.chart(birth, settings)

/**
 * Views that are cheap to prepare once a day is shown (tens of milliseconds each, the day's
 * context being ready); the year takes several hundred and is left until asked for, so it
 * never delays the user's own next request in the single-threaded worker.
 */
const PREFETCH_AFTER_DAY: readonly Horizon[] = ['week', 'month']

/** The forecast of `profileId` for the period starting on `anchor`, with day timings for the timings place. */
export function useForecast(profileId: string, horizon: Horizon, anchor: string): ForecastQuery {
  const profile = useProfile(profileId)
  const settings = calcSettings(useSettings())
  const { place: { latitude, longitude, timeZone } } = useTimingsPlace(profile)
  const request: ForecastRequest | null = profile
    ? { birth: birthForEngine(profile.birth), settings, place: { latitude, longitude, timeZone }, horizon, anchor }
    : null
  const key = request && forecastKey(request)
  const query = useEngineQuery<ForecastResult>(key, (engine) => loadForecast(request!)(engine))
  const ready = query.data !== undefined && !query.loading
  useEffect(() => {
    // Once a day is on screen, prepare the week and month around it and the chart while the user reads.
    if (!ready || !request || horizon !== 'day') return
    for (const h of PREFETCH_AFTER_DAY) {
      const next = { ...request, horizon: h, anchor: periodStart(h, anchor) }
      prefetchEngine(forecastKey(next), loadForecast(next))
    }
    prefetchEngine(chartKey(request.birth, request.settings), loadChart(request.birth, request.settings))
    // `request` is rebuilt every render; `key` stands for it.
  }, [ready, key])
  return { data: query.data?.forecast, extras: query.data?.extras, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

/** The natal chart and Vimsottari dashas of `profileId` under the current settings. */
export function useChartData(profileId: string): Query<ChartData> {
  const profile = useProfile(profileId)
  const settings = calcSettings(useSettings())
  const birth = profile && birthForEngine(profile.birth)
  const key = birth ? chartKey(birth, settings) : null
  const query = useEngineQuery<ChartData>(key, (engine) => loadChart(birth!, settings)(engine))
  return { data: query.data, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

/** The birth fields and calculation settings of a profile, or null when it is missing. */
function useEngineBirth(profileId: string): { birth: BirthInput; settings: Settings } | null {
  const profile = useProfile(profileId)
  const settings = calcSettings(useSettings())
  return profile ? { birth: birthForEngine(profile.birth), settings } : null
}

export interface NatalYogas {
  yogas: YogaResult[]
  promise: Record<Planet, LordPromise>
}

/** Natal strengths of `profileId` (Shadbala, Vimsopaka, dignities, functional nature). */
export function useStrengths(profileId: string): Query<NatalStrengths> {
  const req = useEngineBirth(profileId)
  const key = req && JSON.stringify(['strengths', req.birth, req.settings])
  const query = useEngineQuery<NatalStrengths>(key, (engine) => engine.strengths(req!.birth, req!.settings))
  return { data: query.data, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

/** The 170 yoga rules checked on the birth chart of `profileId`, with each planet's natal promise. */
export function useYogas(profileId: string): Query<NatalYogas> {
  const req = useEngineBirth(profileId)
  const key = req && JSON.stringify(['yogas', req.birth, req.settings])
  const query = useEngineQuery<NatalYogas>(key, (engine) => engine.yogas(req!.birth, req!.settings))
  return { data: query.data, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

/** The Tajaka annual chart after `completedYears` completed years; null asks for nothing. */
export function useAnnualChart(profileId: string, completedYears: number | null): Query<AnnualChart> {
  const req = useEngineBirth(profileId)
  const key = req && completedYears !== null ? JSON.stringify(['annual', req.birth, req.settings, completedYears]) : null
  const query = useEngineQuery<AnnualChart>(key, (engine) => engine.annualChart(req!.birth, req!.settings, completedYears!))
  return { data: query.data, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

/** Timings of the Vedic day beginning on `date` at the timings place; null `date` asks for nothing. */
export function useDayTimings(date: string | null, profile?: Profile): Query<DayTimings | null> {
  const { place: { latitude, longitude, timeZone } } = useTimingsPlace(profile)
  const key = date ? JSON.stringify(['timings', date, latitude, longitude, timeZone]) : null
  const query = useEngineQuery<DayTimings | null>(key, (engine) => engine.dayTimings(date!, latitude, longitude, timeZone))
  return { data: query.data, error: query.error ?? undefined, loading: query.loading, retry: query.retry }
}

export const PLACE_KEY = 'jyotish-daily:place:v1'

function parsePlace(raw: unknown): TimingsPlace | null {
  if (typeof raw !== 'object' || raw === null) return null
  const p = raw as Record<string, unknown>
  const ok = typeof p.name === 'string' && typeof p.timeZone === 'string' && p.timeZone.length > 0
    && typeof p.latitude === 'number' && Math.abs(p.latitude) < 90
    && typeof p.longitude === 'number' && Math.abs(p.longitude) <= 180
  return ok ? { name: p.name as string, latitude: p.latitude as number, longitude: p.longitude as number, timeZone: p.timeZone as string } : null
}

const placeStore = createPersistentStore<TimingsPlace | null>(PLACE_KEY, parsePlace)

/** Ujjain, the traditional prime meridian of Indian astronomy, when no profile exists yet. */
const FALLBACK_PLACE: TimingsPlace = { name: 'Ujjain, Madhya Pradesh, India', latitude: 23.1765, longitude: 75.7885, timeZone: 'Asia/Kolkata' }

export function birthPlace(birth: BirthInput): TimingsPlace {
  const name = birth.place || `${birth.latitude.toFixed(2)}, ${birth.longitude.toFixed(2)}`
  return { name, latitude: birth.latitude, longitude: birth.longitude, timeZone: birth.timeZone }
}

/** "Bengaluru" from "Bengaluru, Karnataka, India". */
export const shortPlaceName = (place: TimingsPlace): string => place.name.split(',')[0].trim() || place.name

export interface TimingsPlaceState {
  place: TimingsPlace
  /** True while the user has not chosen a place, so the profile's birthplace is used. */
  isDefault: boolean
  /** Choose a place, or null to go back to the birthplace. */
  setPlace(place: TimingsPlace | null): void
}

const setPlace = (place: TimingsPlace | null) => placeStore.set(place)

/**
 * The user's current place (persisted on this device); defaults to the birthplace of `profile`,
 * the profile on screen. Pages pass their own profile: while one leaves (its exit animation) the
 * active profile is already the next one, whose birthplace would make the leaving page recompute.
 */
export function useTimingsPlace(profile?: Profile): TimingsPlaceState {
  const stored = useSyncExternalStore(placeStore.subscribe, placeStore.get, placeStore.get)
  const active = useActiveProfile()
  const shown = profile ?? active
  const place = stored ?? (shown ? birthPlace(shown.birth) : FALLBACK_PLACE)
  return { place, isDefault: stored === null, setPlace }
}
