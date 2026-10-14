// A small in-house i18n: English messages are built in; Kannada, Hindi, Tamil and Telugu are
// loaded on demand (one chunk each for the interface words, the names and the interpretation
// pack), so English readers download none of them. `t()` works anywhere; components call
// useT(), which re-renders them when the language changes. Messages use {name} placeholders.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react'
import { intlDates } from './intl'
import { LANG_INFO, type Lang } from './langs'
import { en, type MessageKey, type Messages } from './locales/en'
import { EN_NAMES, type Names } from './names/en'
import { getLanguage, setCurrentLanguage, subscribeLanguage } from './store'

export { LANG_INFO, LANGS, resolveLanguage, type Lang, type LanguagePreference } from './langs'
export { getLanguage, subscribeLanguage } from './store'
export type { MessageKey } from './locales/en'
export type { Names } from './names/en'

export type Params = Readonly<Record<string, string | number>>

interface Bundle {
  messages: Messages
  names: Names
}

const bundles: Partial<Record<Lang, Bundle>> = { en: { messages: en, names: EN_NAMES } }

const UI_LOADERS: Readonly<Record<Exclude<Lang, 'en'>, () => Promise<Bundle>>> = {
  kn: () => Promise.all([import('./locales/kn'), import('./names/kn')]).then(([m, n]) => ({ messages: m.default, names: n.default })),
  hi: () => Promise.all([import('./locales/hi'), import('./names/hi')]).then(([m, n]) => ({ messages: m.default, names: n.default })),
  ta: () => Promise.all([import('./locales/ta'), import('./names/ta')]).then(([m, n]) => ({ messages: m.default, names: n.default })),
  te: () => Promise.all([import('./locales/te'), import('./names/te')]).then(([m, n]) => ({ messages: m.default, names: n.default })),
}

/** "{n} days" with {n} = 3. Unknown placeholders are left as they are. */
export function format(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (all, name: string) => (name in params ? String(params[name]) : all))
}

/** The message for `key` in the current language (English when a language lacks it). */
export function t(key: MessageKey, params?: Params): string {
  return format(bundles[getLanguage()]?.messages[key] ?? en[key], params)
}

/** `key` + "_one" or "_other" by English-style plural of `count` (each language fills both). */
export function tp(key: string, count: number, params?: Params): string {
  return t(`${key}_${count === 1 ? 'one' : 'other'}` as MessageKey, { n: count, ...params })
}

/**
 * A message with React nodes in its placeholders: rich('Choose {save} as the destination',
 * { save: <strong>Save as PDF</strong> }).
 */
export function rich(template: string, nodes: Readonly<Record<string, ReactNode>>): ReactNode {
  const parts = template.split(/\{(\w+)\}/g)
  return createElement(Fragment, null, ...parts.map((part, i) => (i % 2 ? createElement(Fragment, { key: i }, nodes[part] ?? `{${part}}`) : part)))
}

/** The names of the current language. */
export const names = (): Names => bundles[getLanguage()]?.names ?? EN_NAMES

/** BCP 47 tag of the current language, for Intl. */
export const languageTag = (): string => LANG_INFO[getLanguage()].tag

let activating: Promise<void> = Promise.resolve()

/**
 * Load `lang` (interface words, names and the interpretation pack), then make it current: sets
 * <html lang> and notifies listeners (the engine client first, then React). A failed load leaves
 * the current language in place and rejects.
 */
export function activateLanguage(lang: Lang): Promise<void> {
  const run = async () => {
    const [bundle, pack, active] = await Promise.all([
      lang === 'en' ? bundles.en! : bundles[lang] ?? UI_LOADERS[lang](),
      lang === 'en' ? null : import('./content').then((m) => m.loadContentPack(lang)),
      // English readers who never switch never load the pack here: it comes with the pages that use it.
      lang === 'en' && getLanguage() === 'en' ? null : import('@/content/active'),
    ])
    bundles[lang] = bundle
    if (active) active.setContentPack(pack ?? active.EN_CONTENT)
    if (typeof document !== 'undefined') document.documentElement.lang = LANG_INFO[lang].tag
    setCurrentLanguage(lang)
  }
  activating = activating.then(run, run)
  return activating
}

/** Date formats of the current language (Indian languages through Intl). */
export const dates = () => intlDates(languageTag())

export interface I18n {
  lang: Lang
  /** BCP 47 tag for Intl ("kn-IN"). */
  tag: string
  t: typeof t
  tp: typeof tp
  /** Names of planets, signs, nakshatras... in the current language. */
  n: Names
}

/** The current language for a component, which re-renders when it changes. */
export function useT(): I18n {
  const lang = useSyncExternalStore(subscribeLanguage, getLanguage, getLanguage)
  return { lang, tag: LANG_INFO[lang].tag, t, tp, n: bundles[lang]?.names ?? EN_NAMES }
}
