// Small persisted stores for React's useSyncExternalStore. Storage can be
// missing or throw (private mode, blocked cookies, Node tests), so every
// access is guarded and the app keeps working in memory.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

export interface Store<T> {
  get(): T
  set(next: T | ((prev: T) => T)): void
  subscribe(listener: () => void): () => void
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readStored(key: string): unknown {
  try {
    const text = storage()?.getItem(key)
    return text == null ? undefined : JSON.parse(text)
  } catch {
    return undefined
  }
}

/** Returns false when the value could not be saved (quota, disabled storage). */
export function writeStored(key: string, value: unknown): boolean {
  try {
    const s = storage()
    if (!s) return false
    s.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function removeStored(key: string): void {
  try {
    storage()?.removeItem(key)
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}

/**
 * A value persisted under `key`. `parse` turns whatever is stored (possibly
 * written by an older version or edited by hand) into a valid value. The
 * snapshot keeps its identity until it changes, as useSyncExternalStore needs,
 * and other tabs' writes arrive through the `storage` event.
 */
export function createPersistentStore<T>(key: string, parse: (raw: unknown) => T): Store<T> {
  let value = parse(readStored(key))
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (event.key === key || event.key === null) {
        value = parse(readStored(key))
        emit()
      }
    })
  }

  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next
      writeStored(key, value)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
