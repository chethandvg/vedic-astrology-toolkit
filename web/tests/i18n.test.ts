// Languages: every interface key present in every locale with the same {placeholders}, the
// interpretation packs shaped like the English one, and forecasts that come out in the chosen
// script (with English back when the pack is switched back).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { EN_CONTENT, setContentPack, type ContentPack } from '@/content/active'
import { castChart } from '@/engine/chart'
import { matchCharts } from '@/engine/matching'
import { createContext, forecastDay, forecastMonth, forecastWeek, forecastYear, resetForecastCaches } from '@/engine/predict'
import { PRESETS, type BirthInput, type Forecast } from '@/engine/types'
import { activateLanguage, format, getLanguage, t, tp } from '@/i18n'
import HI_CONTENT from '@/i18n/content/hi'
import KN_CONTENT from '@/i18n/content/kn'
import TA_CONTENT from '@/i18n/content/ta'
import TE_CONTENT from '@/i18n/content/te'
import { detectLanguage, LANGS, type Lang } from '@/i18n/langs'
import { en } from '@/i18n/locales/en'
import hi from '@/i18n/locales/hi'
import kn from '@/i18n/locales/kn'
import ta from '@/i18n/locales/ta'
import te from '@/i18n/locales/te'
import { EN_NAMES, type Names } from '@/i18n/names/en'
import HI_NAMES from '@/i18n/names/hi'
import KN_NAMES from '@/i18n/names/kn'
import TA_NAMES from '@/i18n/names/ta'
import TE_NAMES from '@/i18n/names/te'
import { loadSwe } from './helpers/swe'

type Indic = Exclude<Lang, 'en'>
const LOCALES: Readonly<Record<Indic, Readonly<Record<string, string>>>> = { kn, hi, ta, te }
const PACKS: Readonly<Record<Indic, ContentPack>> = { kn: KN_CONTENT, hi: HI_CONTENT, ta: TA_CONTENT, te: TE_CONTENT }
const NAMES: Readonly<Record<Indic, Names>> = { kn: KN_NAMES, hi: HI_NAMES, ta: TA_NAMES, te: TE_NAMES }
/** Unicode block of each script (Kannada, Devanagari, Tamil, Telugu). */
const SCRIPT: Readonly<Record<Indic, RegExp>> = { kn: /[ಀ-೿]/, hi: /[ऀ-ॿ]/, ta: /[஀-௿]/, te: /[ఀ-౿]/ }
const INDIC = LANGS.filter((l): l is Indic => l !== 'en')

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
const ASHA: BirthInput = { date: '1990-05-12', time: '06:00', timeZone: 'Asia/Kolkata', latitude: 12.9719, longitude: 77.5937 }
const BENGALURU = { latitude: 12.9716, longitude: 77.5946, timeZone: 'Asia/Kolkata' }

describe('interface messages', () => {
  const enKeys = Object.keys(en).sort()

  it.each(INDIC)('%s has exactly the English keys, none empty', (lang) => {
    const messages = LOCALES[lang]
    expect(Object.keys(messages).sort()).toEqual(enKeys)
    for (const [key, value] of Object.entries(messages)) expect(value.trim(), key).not.toBe('')
  })

  it.each(INDIC)('%s keeps every {placeholder} of the English message', (lang) => {
    const mismatched = enKeys.filter((key) => placeholders(LOCALES[lang][key]).join() !== placeholders(en[key as keyof typeof en]).join())
    expect(mismatched).toEqual([])
  })

  it.each(INDIC)('%s is written in its own script', (lang) => {
    // Brand names, units and codes (Jyotish Daily, PDF, JSON, N/S/E/W) may stay Latin; prose may not.
    const latinOnly = Object.entries(LOCALES[lang]).filter(([, v]) => v.length > 12 && !SCRIPT[lang].test(v)).map(([k]) => k)
    expect(latinOnly.filter((k) => !['report.saveAsPdf'].includes(k))).toEqual([])
  })

  it('pairs every plural key', () => {
    for (const key of enKeys.filter((k) => k.endsWith('_one'))) expect(enKeys).toContain(key.replace(/_one$/, '_other'))
  })

  it('formats placeholders and plurals', () => {
    expect(format('{n} of {total}', { n: 2, total: 5 })).toBe('2 of 5')
    expect(format('{a} {b}', { a: 1 })).toBe('1 {b}')
    expect(tp('place.found', 1)).toBe('1 place found')
    expect(tp('place.found', 3)).toBe('3 places found')
  })
})

describe('language choice', () => {
  it('detects the first supported browser language', () => {
    expect(detectLanguage(['kn-IN', 'en-US'])).toBe('kn')
    expect(detectLanguage(['hi'])).toBe('hi')
    expect(detectLanguage(['ta_LK'])).toBe('ta')
    expect(detectLanguage(['fr-FR', 'te-IN'])).toBe('te')
    expect(detectLanguage(['fr-FR', 'de'])).toBe('en')
    expect(detectLanguage([])).toBe('en')
  })

  it('switches the interface words and back', async () => {
    await activateLanguage('hi')
    expect(getLanguage()).toBe('hi')
    expect(t('nav.today')).toBe('आज')
    expect(t('common.until', { x: '5' })).toBe('5 तक')
    await activateLanguage('en')
    expect(t('nav.today')).toBe('Today')
  })
})

describe('names', () => {
  it.each(INDIC)('%s names every sign, star, tithi, yoga, karana, window and varga', (lang) => {
    const n = NAMES[lang]
    const sameKeys = (a: object, b: object) => expect(Object.keys(a).sort()).toEqual(Object.keys(b).sort())
    expect(n.sign).toHaveLength(12)
    expect(n.signShort).toHaveLength(12)
    expect(n.nakshatra).toHaveLength(27)
    expect(n.tithi).toHaveLength(14)
    expect(n.yoga).toHaveLength(27)
    expect(n.vara).toHaveLength(7)
    expect(n.dashaLevel).toHaveLength(3)
    for (const key of ['body', 'bodyShort', 'karana', 'window', 'varga', 'koota', 'porutham', 'tara', 'choghadiya'] as const) sameKeys(n[key], EN_NAMES[key])
    for (const value of [...n.sign, ...n.nakshatra, ...n.tithi, ...n.yoga, ...Object.values(n.window)]) expect(value).toMatch(SCRIPT[lang])
    expect(n.list(['a', 'b', 'c'])).toMatch(/^a, b .+ c$/)
  })
})

/** Shape of an object: keys, array lengths and leaf kinds, ignoring the words. */
function shape(value: unknown, depth = 0): unknown {
  if (typeof value === 'function') return 'fn'
  if (typeof value === 'string') return 'str'
  if (Array.isArray(value)) return value.map((v) => shape(v, depth + 1))
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((k) => [k, depth > 2 && k.length === 0 ? '' : shape((value as Record<string, unknown>)[k], depth + 1)]))
  return typeof value
}

describe('interpretation packs', () => {
  const { names: _n, lang: _l, ...enRest } = EN_CONTENT

  it.each(INDIC)('%s has the English pack’s shape', (lang) => {
    const { names: _names, lang: packLang, ...rest } = PACKS[lang]
    expect(packLang).toBe(lang)
    expect(shape(rest)).toEqual(shape(enRest))
  })

  it.each(INDIC)('%s fills every phrase with text in its script', (lang) => {
    const pack = PACKS[lang]
    const strings: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    const { names: _names, SOURCES: _sources, KEY_SAHAMS: sahams, ...rest } = pack
    walk(rest)
    walk(sahams.map((s) => s.label))
    const bad = strings.filter((s) => s !== pack.lang && s.length > 1 && !SCRIPT[lang].test(s) && !/^[\s:;,.()–-]*$/.test(s) && !/^, /.test(s))
    expect(bad).toEqual([])
  })
})

describe('forecasts in each language', () => {
  beforeAll(async () => {
    await loadSwe()
  })
  afterAll(() => {
    setContentPack(EN_CONTENT)
    resetForecastCaches()
  })

  const texts = (f: Forecast) => [f.headline, ...f.reasons.flatMap((r) => [r.title, r.text]), ...f.events.flatMap((e) => [e.title, e.detail ?? ''])].filter(Boolean)

  it.each(INDIC)('%s: day, week, month and year read in the script, with no gaps', (lang) => {
    setContentPack(PACKS[lang])
    resetForecastCaches()
    const ctx = createContext(ASHA, PRESETS.popular, BENGALURU)
    const all = [forecastDay(ctx, '2026-10-14'), forecastWeek(ctx, '2026-10-12'), forecastMonth(ctx, 2026, 10), forecastYear(ctx, 2026)]
    for (const f of all) {
      expect(f.headline).toMatch(SCRIPT[lang])
      for (const text of texts(f)) {
        expect(text).not.toMatch(/undefined|NaN|\[object|\{\w+\}/)
        expect(text, text).toMatch(SCRIPT[lang])
      }
    }
  })

  it('goes back to English', () => {
    setContentPack(EN_CONTENT)
    resetForecastCaches()
    const ctx = createContext(ASHA, PRESETS.popular, BENGALURU)
    const day = forecastDay(ctx, '2026-10-14')
    expect(day.headline).toMatch(/^[\x20-\x7E’–]+$/)
  })

  it.each(INDIC)('%s: matching explanations', (lang) => {
    setContentPack(PACKS[lang])
    const a = castChart(ASHA, PRESETS.popular)
    const b = castChart({ date: '1988-11-03', time: '14:20', timeZone: 'Asia/Kolkata', latitude: 13.0827, longitude: 80.2707 }, PRESETS.popular)
    const m = matchCharts(a, b)
    const pack = PACKS[lang]
    const words = [
      ...m.ashtakoota.kootas.map((k) => pack.kootaOutcome(k.key, k.points, k.max)),
      ...m.porutham.items.flatMap((p) => [p.basis, pack.poruthamOutcome(p.key, p.status)]),
    ]
    for (const w of words) expect(w, w).toMatch(SCRIPT[lang])
  })
})

describe('coverage', () => {
  it('reports translated share per language (yoga meanings stay English)', () => {
    const total = Object.keys(en).length
    const rows = INDIC.map((lang) => {
      const translated = Object.entries(LOCALES[lang]).filter(([k, v]) => v !== en[k as keyof typeof en]).length
      return `${lang}: UI ${translated}/${total} differ from English, pack 100%, yoga meanings 0% (English fallback)`
    })
    // Same-as-English entries are brand names, units and codes (N, S, E, W, "Save as PDF").
    for (const lang of INDIC) expect(Object.entries(LOCALES[lang]).filter(([k, v]) => v === en[k as keyof typeof en]).length).toBeLessThanOrEqual(6)
    console.info(rows.join('\n'))
  })
})
