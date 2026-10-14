// App-wide preferences: calculation settings (with named presets), chart
// style, colour theme and interface language, persisted in localStorage.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useSyncExternalStore } from 'react'
import { PRESETS, type Ayanamsa, type NodeType, type Settings, type YearModel } from '@/engine/types'
import { isLang, type LanguagePreference } from '@/i18n/langs'
import { createPersistentStore } from './storage'

export type PresetName = keyof typeof PRESETS | 'custom'
export type ChartStyle = 'north' | 'south'
export type ThemePreference = 'dark' | 'light' | 'system'

export interface AppSettings extends Settings {
  preset: PresetName
  chartStyle: ChartStyle
  theme: ThemePreference
  /** Interface language; 'auto' follows the browser's preferred languages. */
  language: LanguagePreference
}

export const SETTINGS_KEY = 'jyotish-daily:settings:v1'

export const DEFAULT_APP_SETTINGS: AppSettings = { ...PRESETS.popular, preset: 'popular', chartStyle: 'north', theme: 'dark', language: 'auto' }

/**
 * Options with one-line plain explanations, shared by the Settings page and
 * chart headers. Differences from Lahiri are for 2026 (Swiss Ephemeris).
 */
export const AYANAMSA_OPTIONS: readonly { value: Ayanamsa; label: string; note: string }[] = [
  { value: 'lahiri', label: 'Lahiri (Chitrapaksha)', note: 'The Indian government standard and the default in most Vedic software.' },
  { value: 'raman', label: 'B. V. Raman', note: 'About 1.4° less than Lahiri; used by followers of B. V. Raman.' },
  { value: 'krishnamurti', label: 'Krishnamurti (KP)', note: 'About 6′ less than Lahiri; the standard in Krishnamurti Paddhati.' },
  { value: 'true_citra', label: 'True Chitrapaksha', note: 'Holds the star Spica (Chitra) at exactly 0° Libra; within a minute of Lahiri.' },
  { value: 'true_pushya', label: 'True Pushya', note: 'Holds Delta Cancri (Pushya) at 16° Cancer; about 1.1° less than Lahiri.' },
  { value: 'yukteshwar', label: 'Sri Yukteshwar', note: 'From The Holy Science (1894); about 1.4° less than Lahiri.' },
]

export const NODE_OPTIONS: readonly { value: NodeType; label: string; note: string }[] = [
  { value: 'mean', label: 'Mean node', note: 'The smoothed average position of Rahu and Ketu; the traditional choice.' },
  { value: 'true', label: 'True node', note: 'The actual, wobbling position; can differ from the mean by up to about 1.5°.' },
]

export const YEAR_MODEL_OPTIONS: readonly { value: YearModel; label: string; note: string }[] = [
  { value: 'solar', label: 'Solar year', note: 'Dasha years of 365.2425 days, as most software uses.' },
  { value: 'savana', label: '360-day year', note: 'Savana years of 360 days, as in P. V. R. Narasimha Rao’s book.' },
]

const AYANAMSAS = AYANAMSA_OPTIONS.map((o) => o.value)
const oneOf = <T extends string>(values: readonly T[], v: unknown, fallback: T): T =>
  values.includes(v as T) ? (v as T) : fallback

/** The named preset these calculation settings equal, else 'custom'. */
export function presetFor(s: Settings): PresetName {
  for (const name of Object.keys(PRESETS) as (keyof typeof PRESETS)[]) {
    const p = PRESETS[name]
    if (p.ayanamsa === s.ayanamsa && p.node === s.node && p.yearModel === s.yearModel) return name
  }
  return 'custom'
}

function parseSettings(raw: unknown): AppSettings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  const d = DEFAULT_APP_SETTINGS
  const calc: Settings = {
    ayanamsa: oneOf(AYANAMSAS, r.ayanamsa, d.ayanamsa),
    node: oneOf(['mean', 'true'], r.node, d.node),
    yearModel: oneOf(['solar', 'savana'], r.yearModel, d.yearModel),
  }
  // A stored 'custom' survives even when its values happen to equal a preset.
  const preset = r.preset === 'custom' ? 'custom' : presetFor(calc)
  return {
    ...calc,
    preset,
    chartStyle: oneOf(['north', 'south'], r.chartStyle, d.chartStyle),
    theme: oneOf(['dark', 'light', 'system'], r.theme, d.theme),
    language: r.language === 'auto' || isLang(r.language) ? r.language : d.language,
  }
}

const store = createPersistentStore(SETTINGS_KEY, parseSettings)

export const getSettings = (): AppSettings => store.get()

/**
 * Apply a change. Choosing 'popular' or 'book' loads that preset's values;
 * editing a calculation value re-derives the preset (so it reads 'custom'
 * unless the values match a named preset again).
 */
export function updateSettings(patch: Partial<AppSettings>): void {
  store.set((prev) => {
    const next = { ...prev, ...patch }
    if (patch.preset && patch.preset !== 'custom') return { ...next, ...PRESETS[patch.preset] }
    const calcChanged = patch.ayanamsa !== undefined || patch.node !== undefined || patch.yearModel !== undefined
    if (calcChanged && patch.preset === undefined) next.preset = presetFor(next)
    return next
  })
}

export function resetSettings(): void {
  store.set(DEFAULT_APP_SETTINGS)
}

/** Just the engine's calculation settings. */
export const calcSettings = ({ ayanamsa, node, yearModel }: Settings): Settings => ({ ayanamsa, node, yearModel })

export function useSettings(): AppSettings {
  return useSyncExternalStore(store.subscribe, store.get, store.get)
}

const LIGHT_QUERY = '(prefers-color-scheme: light)'

export function resolveTheme(pref: ThemePreference): 'dark' | 'light' {
  if (pref !== 'system') return pref
  return typeof matchMedia === 'function' && matchMedia(LIGHT_QUERY).matches ? 'light' : 'dark'
}

/** Set data-theme on <html> and the browser chrome colour to match. */
export function applyTheme(pref: ThemePreference): void {
  if (typeof document === 'undefined') return
  const theme = resolveTheme(pref)
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f7f5ef' : '#0b1020')
}

/** Follow OS theme changes while the preference is 'system'. */
export function watchSystemTheme(pref: ThemePreference): () => void {
  if (pref !== 'system' || typeof matchMedia !== 'function') return () => {}
  const query = matchMedia(LIGHT_QUERY)
  const onChange = () => applyTheme('system')
  query.addEventListener('change', onChange)
  return () => query.removeEventListener('change', onChange)
}
