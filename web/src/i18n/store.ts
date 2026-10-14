// The language currently shown, as a tiny external store (no React), so non-React modules such
// as the engine client and the date helpers can read it and hear when it changes.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Lang } from './langs'

let current: Lang = 'en'
const listeners = new Set<() => void>()

export const getLanguage = (): Lang => current

/** Make `lang` current (its messages must already be loaded) and notify the listeners in order. */
export function setCurrentLanguage(lang: Lang): void {
  if (lang === current) return
  current = lang
  for (const l of [...listeners]) l()
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
