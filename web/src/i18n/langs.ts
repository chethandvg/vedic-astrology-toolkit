// The interface languages, their names in their own script and the BCP 47 tags used for <html
// lang> and Intl formatting. Pure data and helpers: safe for the engine worker and for tests.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

export const LANGS = ['en', 'kn', 'hi', 'ta', 'te'] as const
export type Lang = (typeof LANGS)[number]
/** What the user chose in Settings: a language, or 'auto' to follow the browser. */
export type LanguagePreference = Lang | 'auto'

export const LANG_INFO: Readonly<Record<Lang, { native: string; english: string; tag: string }>> = {
  en: { native: 'English', english: 'English', tag: 'en' },
  kn: { native: 'ಕನ್ನಡ', english: 'Kannada', tag: 'kn-IN' },
  hi: { native: 'हिन्दी', english: 'Hindi', tag: 'hi-IN' },
  ta: { native: 'தமிழ்', english: 'Tamil', tag: 'ta-IN' },
  te: { native: 'తెలుగు', english: 'Telugu', tag: 'te-IN' },
}

export const isLang = (value: unknown): value is Lang => typeof value === 'string' && (LANGS as readonly string[]).includes(value)

/** The first supported language among the browser's preferred ones ("kn-IN" gives kn), else English. */
export function detectLanguage(preferred: readonly string[]): Lang {
  for (const tag of preferred) {
    const base = tag.toLowerCase().split(/[-_]/)[0]
    if (isLang(base)) return base
  }
  return 'en'
}

/** The language a preference stands for in this browser. */
export function resolveLanguage(pref: LanguagePreference): Lang {
  if (pref !== 'auto') return pref
  const nav = typeof navigator === 'undefined' ? undefined : navigator
  return detectLanguage(nav?.languages?.length ? nav.languages : nav?.language ? [nav.language] : [])
}
