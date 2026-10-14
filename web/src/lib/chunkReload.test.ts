// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import { claimReload, reloadOnStaleChunks, type ReloadHost, type SessionStore } from './chunkReload'

function memoryStore(): SessionStore {
  const data = new Map<string, string>()
  return { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
}

function fakeHost(onLine = true, controller: unknown = null) {
  const target = new EventTarget()
  const host = {
    addEventListener: (type: string, listener: (event: Event) => void) => target.addEventListener(type, listener),
    navigator: { onLine, serviceWorker: { controller } },
    location: { reload: () => void host.reloads++ },
    reloads: 0,
  } satisfies ReloadHost & { reloads: number }
  /** Dispatch one 'vite:preloadError' and report whether it was cancelled (the import then resolves). */
  const fail = () => !target.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
  return { host, fail }
}

describe('claimReload', () => {
  it('allows one reload a minute', () => {
    const store = memoryStore()
    expect(claimReload(store, 1_000_000)).toBe(true)
    expect(claimReload(store, 1_000_000 + 59_999)).toBe(false)
    expect(claimReload(store, 1_000_000 + 60_000)).toBe(true)
  })

  it('never reloads without storage to remember it, and ignores a garbled record', () => {
    expect(claimReload(null, 1_000_000)).toBe(false)
    const throwing: SessionStore = { getItem: () => { throw new Error('blocked') }, setItem: () => {} }
    expect(claimReload(throwing, 1_000_000)).toBe(false)
    const store = memoryStore()
    store.setItem('jyotish-daily:chunk-reload-at', 'garbage')
    expect(claimReload(store, 1_000_000)).toBe(true)
  })
})

describe('reloadOnStaleChunks', () => {
  it('reloads once for a burst of failures, then lets later failures through', () => {
    const store = memoryStore()
    const first = fakeHost()
    reloadOnStaleChunks(first.host, store)
    // A chunk and its modulepreload dependency failing together cause one reload.
    expect([first.fail(), first.fail()]).toEqual([true, true])
    expect(first.host.reloads).toBe(1)

    // The reloaded page (same tab, same session storage) still cannot load it: no loop.
    const second = fakeHost()
    reloadOnStaleChunks(second.host, store)
    expect(second.fail()).toBe(false)
    expect(second.host.reloads).toBe(0)
  })

  it('does not reload offline unless a service worker can serve the page', () => {
    const offline = fakeHost(false)
    reloadOnStaleChunks(offline.host, memoryStore())
    expect(offline.fail()).toBe(false)
    expect(offline.host.reloads).toBe(0)

    const cached = fakeHost(false, {})
    reloadOnStaleChunks(cached.host, memoryStore())
    expect(cached.fail()).toBe(true)
    expect(cached.host.reloads).toBe(1)
  })
})
