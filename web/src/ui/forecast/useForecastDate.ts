// The date a forecast screen shows lives in the URL (?date=YYYY-MM-DD), so links and
// reloads keep it, plus a shared minute clock for "now" markers.
// Wouter's hash navigation keeps the query in location.search (".../?date=2026-10-20#/p/id/today"),
// so links built here carry the date in the same place and survive copy and paste.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useSyncExternalStore, type MouseEvent } from 'react'
import { useLocation, useSearch } from 'wouter'
import { epochMsToJd, todayIn } from '@/engine/time'
import type { Horizon } from '@/engine/types'
import type { Profile } from '@/state/profiles'
import { useTimingsPlace } from './data'
import { isIsoDate, periodStart } from './dates'

// ---------------------------------------------------------------------------------------------
// Minute clock: one timer for every subscriber, firing just after each minute turns. The value
// is the start of the current minute, so "now" never reads ahead of the wall clock (formatJd
// rounds to the nearest minute: 13:04:30 would otherwise show as 13:05).

const minuteStart = (ms: number) => ms - (ms % 60_000)
let nowMs = minuteStart(Date.now())
const listeners = new Set<() => void>()
let timer: ReturnType<typeof setTimeout> | undefined

function tick() {
  // Also runs when the tab becomes visible: replace the pending timer rather than add a second one.
  clearTimeout(timer)
  const ms = Date.now()
  nowMs = minuteStart(ms)
  listeners.forEach((l) => l())
  timer = setTimeout(tick, 60_000 - (ms % 60_000) + 20)
}

function onVisible() {
  if (document.visibilityState === 'visible') tick()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  if (listeners.size === 1) {
    tick()
    document.addEventListener('visibilitychange', onVisible)
  }
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0) {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }
}

const getNow = () => nowMs

/** Start of the current minute in epoch milliseconds, refreshed every minute and when the tab becomes visible. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getNow, getNow)
}

/** Start of the current minute as a Julian Day (UTC standing in for UT1). */
export function useNowJd(): number {
  return epochMsToJd(useNow())
}

// ---------------------------------------------------------------------------------------------
// Date in the URL

export type ForecastView = 'today' | 'week' | 'month' | 'year' | 'chart'

/** In-app route (for wouter's navigate): the date goes after "?"; a bare "?" clears it. */
export const forecastRoute = (profileId: string, view: ForecastView, date?: string | null): string =>
  `/p/${profileId}/${view}?${date ? `date=${date}` : ''}`

/** A real link to a forecast screen, valid when copied or opened in a new tab. */
export const forecastHref = (profileId: string, view: ForecastView, date?: string | null): string =>
  `${import.meta.env.BASE_URL}${date ? `?date=${date}` : ''}#/p/${profileId}/${view}`

/** Click handler for links made with forecastHref: plain clicks navigate in place, modified clicks behave natively. */
export function useForecastLink() {
  const [, navigate] = useLocation()
  return (profileId: string, view: ForecastView, date?: string | null) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    navigate(forecastRoute(profileId, view, date))
  }
}

export interface ForecastDate {
  /** The selected civil date (today when the URL has none). */
  date: string
  /** First civil date of the period containing `date`. */
  anchor: string
  /** Today in the timings place's zone. */
  today: string
  /** True when the period shown contains today. */
  isCurrent: boolean
  /** Show another date; null or any date in the current period returns to today. */
  setDate(date: string | null): void
}

/** The date a forecast screen shows, read from and written to ?date=; "today" is in `profile`'s timings place. */
export function useForecastDate(horizon: Horizon, profile?: Profile): ForecastDate {
  const search = useSearch()
  const [location, navigate] = useLocation()
  const { place } = useTimingsPlace(profile)
  useNow() // Re-render after midnight so "today" moves on.
  const today = todayIn(place.timeZone)
  const requested = new URLSearchParams(search).get('date')
  const date = isIsoDate(requested) ? requested : today
  const anchor = periodStart(horizon, date)
  const isCurrent = anchor === periodStart(horizon, today)
  function setDate(next: string | null) {
    const keep = next && periodStart(horizon, next) !== periodStart(horizon, today)
    navigate(`${location}?${keep ? `date=${next}` : ''}`, { replace: true })
  }
  return { date, anchor, today, isCurrent, setDate }
}
