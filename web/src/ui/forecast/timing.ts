// Small helpers for showing day timings.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { formatJd } from '@/engine/time'
import type { DayTimings, TimeWindow } from '@/engine/types'
import { names, t } from '@/i18n'
import type { WindowName } from '@/i18n/names/en'

/**
 * The item running at `jd` (start inclusive, end exclusive). Same rule as engine/muhurta.ts
 * activeAt, kept here so the page chunks do not pull in the ephemeris glue that module imports.
 */
export function runningAt<T extends { startJd: number; endJd: number }>(items: readonly T[], jd: number): T | undefined {
  return items.find((x) => x.startJd <= jd && jd < x.endJd)
}

/** "12:04 – 13:33" */
export const timeRange = (startJd: number, endJd: number, zone: string): string => `${formatJd(startJd, zone, 'time')} – ${formatJd(endJd, zone, 'time')}`

/** Spoken form of a time range for labels: "12:04 to 13:33". */
export const spokenRange = (startJd: number, endJd: number, zone: string): string => t('timings.spokenRange', { from: formatJd(startJd, zone, 'time'), to: formatJd(endJd, zone, 'time') })

/** A day window's name ("Rahu Kalam") in the current language. */
export const windowName = (name: string): string => names().window[name as WindowName] ?? name

/** A day window's note in the current language (the engine writes them in English). */
export const windowNote = (w: TimeWindow): string | undefined => {
  const key = `window.${w.name}` as const
  return w.note && (key in WINDOW_NOTES ? t(WINDOW_NOTES[key as keyof typeof WINDOW_NOTES]) : w.note)
}

const WINDOW_NOTES = {
  'window.Rahu Kalam': 'note.rahu', 'window.Yamaganda': 'note.yama', 'window.Gulika Kalam': 'note.gulika', 'window.Durmuhurta': 'note.durmuhurta',
  'window.Abhijit Muhurta': 'note.abhijit', 'window.Udveg': 'note.Udveg', 'window.Amrit': 'note.Amrit', 'window.Rog': 'note.Rog', 'window.Labh': 'note.Labh',
  'window.Shubh': 'note.Shubh', 'window.Char': 'note.Char', 'window.Kaal': 'note.Kaal', 'window.Chandrashtama': 'note.chandrashtama',
} as const

/** The windows tradition asks you to avoid for new beginnings, in time order. */
export function avoidWindows(t: DayTimings): TimeWindow[] {
  return [t.rahuKalam, t.yamaganda, t.gulikaKalam, ...t.durmuhurta].sort((a, b) => a.startJd - b.startJd)
}

/** Every marked window of the day (avoid windows and Abhijit), in time order. */
export function markedWindows(t: DayTimings): TimeWindow[] {
  return [...avoidWindows(t), ...(t.abhijit ? [t.abhijit] : [])].sort((a, b) => a.startJd - b.startJd)
}
