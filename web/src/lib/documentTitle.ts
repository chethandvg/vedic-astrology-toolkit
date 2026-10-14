// Page titles: each screen names itself in the browser tab and history ("Today, Wed 14 Oct ·
// Asha · Jyotish Daily"), and the shell announces the new title to screen readers after a
// route change (RouteAnnouncer in ui/layout/AppLayout.tsx), since focus stays on the nav link.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useEffect, useSyncExternalStore } from 'react'

export const APP_NAME = 'Jyotish Daily'
/** The landing page's title (index.html), which says what the app is. */
export const HOME_TITLE = 'Jyotish Daily: private Vedic astrology forecasts'

/** "Settings · Jyotish Daily"; empty parts are skipped. */
export const pageTitle = (...parts: (string | null | undefined | false)[]): string =>
  [...parts.filter((p): p is string => !!p && p.trim() !== ''), APP_NAME].join(' · ')

/** The page's own part of a title made by pageTitle: "Settings" from "Settings · Jyotish Daily". */
export const titleWithoutApp = (title: string): string => {
  const suffix = ` · ${APP_NAME}`
  return title.endsWith(suffix) ? title.slice(0, -suffix.length) : title
}

let current = typeof document === 'undefined' ? '' : document.title
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const read = () => current

/** Sets document.title while the calling page is shown. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title
    if (current === title) return
    current = title
    listeners.forEach((l) => l())
  }, [title])
}

/** The title the pages last set. */
export const usePageTitle = (): string => useSyncExternalStore(subscribe, read, read)
