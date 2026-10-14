// Calendar words and dates through Intl for the Indian-language interfaces (English keeps the
// app's own compact forms, "Wed 14 Oct"). Pure and cached: used on the main thread and by the
// interpretation packs in the engine worker. Dates are civil "YYYY-MM-DD" strings, formatted in
// UTC so no time zone can move them to another day.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

const cache = new Map<string, Intl.DateTimeFormat>()

function formatter(tag: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${tag}|${JSON.stringify(options)}`
  let f = cache.get(key)
  if (!f) {
    f = new Intl.DateTimeFormat(tag, { ...options, timeZone: 'UTC' })
    cache.set(key, f)
  }
  return f
}

const utc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  const date = new Date(Date.UTC(2000, m - 1, d))
  date.setUTCFullYear(y)
  return date
}

/** `iso` ("YYYY-MM-DD") in the locale with the given Intl options. */
export const intlDate = (tag: string, iso: string, options: Intl.DateTimeFormatOptions): string =>
  // Some CLDR patterns omit the space after a comma (kn: "ಅಕ್ಟೋ 31,2026").
  formatter(tag, options).format(utc(iso)).replace(/,(?=\S)/g, ', ')

/** Month 1..12 by name ("ಅಕ್ಟೋ", "अक्टूबर"). */
export const intlMonth = (tag: string, month: number, style: 'short' | 'long'): string =>
  formatter(tag, { month: style }).format(new Date(Date.UTC(2021, month - 1, 1)))

/** Weekday 0..6 (Sunday first) by name. 7 Feb 2021 was a Sunday. */
export const intlWeekday = (tag: string, weekday: number, style: 'narrow' | 'short' | 'long'): string =>
  formatter(tag, { weekday: style }).format(new Date(Date.UTC(2021, 1, 7 + weekday)))

/** Date formats shared by the Indian-language packs and the UI. */
export const intlDates = (tag: string) => ({
  /** "ಬುಧ, 14 ಅಕ್ಟೋ" or "14 ಅಕ್ಟೋ". */
  short: (iso: string, weekday = true) => intlDate(tag, iso, weekday ? { weekday: 'short', day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short' }),
  /** "ಬುಧವಾರ, 14 ಅಕ್ಟೋಬರ್" (with the year when asked). */
  long: (iso: string, year = false) => intlDate(tag, iso, { weekday: 'long', day: 'numeric', month: 'long', ...(year ? { year: 'numeric' } : {}) }),
  /** "14 ಅಕ್ಟೋ 2026". */
  full: (iso: string) => {
    // Day, month, year in the Indian order for every language (CLDR kn puts the month first).
    const parts = formatter(tag, { day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(utc(iso))
    const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
    return `${part('day')} ${part('month')} ${part('year')}`
  },
  /** "ಅಕ್ಟೋಬರ್ 2026" or "ಅಕ್ಟೋ 2026". */
  monthYear: (year: number, month: number, style: 'short' | 'long' = 'long') =>
    intlDate(tag, `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`, { month: style, year: 'numeric' }),
})
