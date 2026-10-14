// The engine's public surface. The UI reaches it through a Web Worker
// (src/worker/engine.worker.ts, src/lib/engine.ts); tests call it directly.
// To extend it, add a property to engineApi: Comlink then exposes it with a
// Promise-returning signature automatically. Arguments and results must be
// structured-clone friendly (plain objects, arrays, strings, numbers): no
// functions or class instances, and thrown errors keep only name and message.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { EN_CONTENT, setContentPack } from '../content/active'
import { loadContentPack } from '../i18n/content'
import type { Lang } from '../i18n/langs'
import { castChart, validateBirthInput } from './chart'
import { vimsottari } from './dasha'
import { dayExtras, yearExtras, type ForecastExtras } from './extras'
import { matchCharts, type MatchResult } from './matching'
import { dayTimings } from './muhurta'
import { contextFor, forecastDay, forecastMonth, forecastWeek, forecastYear, resetForecastCaches, type Place } from './predict'
import { analyseNatal, type LordPromise, type NatalAnalysis } from './promise'
import type { NatalStrengths } from './strengths'
import { initSwe, swe } from './swe'
import { annualChart, type AnnualChart } from './tajaka'
import type { BirthInput, Chart, DashaPeriod, DayTimings, Forecast, Horizon, Planet, Settings } from './types'
import type { YogaResult } from './yogas'

export interface EngineInitOptions {
  /** Where to fetch swisseph.wasm; the worker passes the bundled asset URL. Node finds the file itself. */
  wasmUrl?: string
}

export interface EngineVersion {
  /** Increment when a change alters computed results, so stored results can be invalidated. */
  engine: number
  /** Swiss Ephemeris library version, e.g. "2.10.03". */
  swisseph: string
}

/**
 * 2: forecasts (predict.ts) and their extras joined the API. 3: Chandrashtama days are never
 * rated favourable; weeks and months carry their highlights. 4: forecasts read the dasha and the
 * transits against the natal promise (promise.ts); strengths, yogas, the annual chart and
 * matching joined the API.
 */
export const ENGINE_VERSION = 4

export interface ChartData {
  chart: Chart
  /** Vimsottari mahadashas of one 120-year cycle, down to pratyantardashas. */
  dashas: DashaPeriod[]
}

export interface ForecastResult {
  forecast: Forecast
  extras: ForecastExtras
}

export interface MatchData {
  result: MatchResult
  groom: Chart
  bride: Chart
}

const ISO_DATE = /^(\d{4})-(\d{2})-\d{2}$/

/** Only the settings that change results, so a UI preference never splits a cache. */
const calc = (s: Settings): Settings => ({ ayanamsa: s.ayanamsa, node: s.node, yearModel: s.yearModel })

interface Natal extends NatalAnalysis {
  chart: Chart
}

const NATAL = new Map<string, Natal>()
const MAX_NATAL = 6

/**
 * The cast chart with its strengths, yogas and natal promise, memoised on birth and settings (the
 * last few kept), so the chart, strengths, yogas and report calls for one profile share one cast.
 */
function natalFor(birth: BirthInput, settings: Settings): Natal {
  const key = JSON.stringify([birth, calc(settings)])
  let natal = NATAL.get(key)
  if (natal) NATAL.delete(key)
  else {
    const chart = castChart(birth, calc(settings))
    natal = { chart, ...analyseNatal(chart) }
  }
  NATAL.set(key, natal)
  if (NATAL.size > MAX_NATAL) NATAL.delete(NATAL.keys().next().value!)
  return natal
}

export const engineApi = {
  /** Load Swiss Ephemeris once; repeated calls share the first load. */
  async init(options: EngineInitOptions = {}): Promise<EngineVersion> {
    const { wasmUrl } = options
    await initSwe(wasmUrl ? { locateFile: () => wasmUrl } : {})
    return engineApi.version()
  },
  /**
   * The language of every text the engine writes (forecast reasons, headlines, event titles and
   * matching notes). Cached forecasts in the previous language are dropped; English needs no load.
   */
  async setLanguage(lang: Lang): Promise<void> {
    const pack = lang === 'en' ? EN_CONTENT : await loadContentPack(lang)
    if (setContentPack(pack)) resetForecastCaches()
  },
  /** Requires init(). */
  version(): EngineVersion {
    return { engine: ENGINE_VERSION, swisseph: swe().version() }
  },
  /** Field-level problems with a birth input (empty when valid); works before init(). */
  validateBirthInput,
  /** Natal chart; throws an Error named "BirthInputError" for invalid input. */
  castChart,
  /** Natal chart with its Vimsottari dashas under the settings' dasha year. */
  chart(birth: BirthInput, settings: Settings): ChartData {
    const { chart } = natalFor(birth, settings)
    return { chart, dashas: vimsottari(chart.positions.Moon.longitude, chart.jd, settings.yearModel, 2) }
  },
  /** Natal strengths (dignities, combustion, relationships, Shadbala, Vimsopaka, functional nature). */
  strengths(birth: BirthInput, settings: Settings): NatalStrengths {
    return natalFor(birth, settings).strengths
  },
  /**
   * The 170 chapter-11 yoga rules checked on the birth chart, with the toolkit's strength map
   * (Shadbala at or above the minimum), and what each planet promises in this chart.
   */
  yogas(birth: BirthInput, settings: Settings): { yogas: YogaResult[]; promise: Record<Planet, LordPromise> } {
    const { yogas, promise } = natalFor(birth, settings)
    return { yogas, promise }
  },
  /** The Tajaka annual chart for the year after `completedYears` completed solar years (0..150). */
  annualChart(birth: BirthInput, settings: Settings, completedYears: number): AnnualChart {
    return annualChart(birth, calc(settings), completedYears)
  },
  /** Kundli matching: `groom` read in the groom's role, `bride` in the bride's. */
  match(groom: BirthInput, bride: BirthInput, settings: Settings): MatchData {
    const [a, b] = [natalFor(groom, settings).chart, natalFor(bride, settings).chart]
    return { result: matchCharts(a, b), groom: a, bride: b }
  },
  /** Muhurta timings of the Vedic day that begins at sunrise on civil `date`; null in polar day or night. */
  dayTimings(date: string, latitude: number, longitude: number, timeZone: string): DayTimings | null {
    return dayTimings(date, latitude, longitude, timeZone)
  },
  /**
   * The forecast of the period starting on civil `anchor` (a week runs 7 days from it; a month or
   * year is the one containing it) at the user's current `place`, with the structured extras the
   * day and year screens show. Contexts are memoised on birth, settings and place (predict.ts
   * contextFor keeps the last few), so moving between views and dates reuses the cast chart and
   * every day already computed.
   */
  forecast(birth: BirthInput, settings: Settings, place: Place, horizon: Horizon, anchor: string): ForecastResult {
    const m = ISO_DATE.exec(anchor)
    if (!m) throw new RangeError(`Anchor must be a "YYYY-MM-DD" date, got "${anchor}"`)
    // Only the fields that change results, so a display name or UI preference cannot split the cache.
    const ctx = contextFor(
      birth,
      { ayanamsa: settings.ayanamsa, node: settings.node, yearModel: settings.yearModel },
      { latitude: place.latitude, longitude: place.longitude, timeZone: place.timeZone },
    )
    const [year, month] = [Number(m[1]), Number(m[2])]
    switch (horizon) {
      case 'day': return { forecast: forecastDay(ctx, anchor), extras: dayExtras(ctx, anchor) }
      case 'week': return { forecast: forecastWeek(ctx, anchor), extras: {} }
      case 'month': return { forecast: forecastMonth(ctx, year, month), extras: {} }
      case 'year': return { forecast: forecastYear(ctx, year), extras: yearExtras(ctx, year) }
      default: throw new RangeError(`Unknown horizon "${String(horizon)}"`)
    }
  },
}

export type EngineApi = typeof engineApi
