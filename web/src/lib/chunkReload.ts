// Recovery from a stale build. A tab opened before a deploy can ask for a code-split chunk that
// no longer exists: GitHub Pages replaces every hashed file, and the new service worker drops
// the old ones from its cache. Vite then fires 'vite:preloadError'
// (https://vite.dev/guide/build#load-error-handling), and a reload fetches the new build. A time
// stamp in sessionStorage allows one such reload a minute per tab, so a chunk that is really
// missing ends in the app's error screen instead of a reload loop.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

const KEY = 'jyotish-daily:chunk-reload-at'
const MIN_GAP_MS = 60_000

export type SessionStore = Pick<Storage, 'getItem' | 'setItem'>

/** The page-level APIs used here (a subset of Window, so tests can pass a stand-in). */
export interface ReloadHost {
  addEventListener(type: 'vite:preloadError', listener: (event: Event) => void): void
  navigator: { onLine: boolean; serviceWorker?: { controller: unknown } }
  location: { reload(): void }
}

/** Whether a failed chunk may reload the page at `now` (ms); records the reload when it may. */
export function claimReload(store: SessionStore | null, now: number): boolean {
  if (!store) return false // without a record a reload could repeat forever
  try {
    const last = Number(store.getItem(KEY))
    if (now >= last && now - last < MIN_GAP_MS) return false
    store.setItem(KEY, String(now))
    return true
  } catch {
    return false
  }
}

function session(): SessionStore | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Reload the page (at most once a minute) when a code-split chunk fails to load. */
export function reloadOnStaleChunks(host: ReloadHost = window, store: SessionStore | null = session()): void {
  let reloading = false
  host.addEventListener('vite:preloadError', (event) => {
    // Offline, only a service worker holding the new build can serve the reloaded page.
    const reachable = host.navigator.onLine || !!host.navigator.serviceWorker?.controller
    if (!reloading && reachable && claimReload(store, Date.now())) {
      reloading = true
      host.location.reload()
    }
    // While the reload is pending, keep this and any further failure from reaching the app;
    // otherwise the import fails as usual and the error screen offers a reload.
    if (reloading) event.preventDefault()
  })
}
