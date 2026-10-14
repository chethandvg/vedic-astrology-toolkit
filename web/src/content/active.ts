// The interpretation pack in use. `T` reads through to the active pack on every access, so the
// engine and the UI pick up a language change without re-importing anything. English is active
// until setContentPack() is given another language's pack (src/i18n/content).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { EN_CONTENT, type ContentPack } from './pack'

export { EN_CONTENT, type ContentPack } from './pack'

let pack: ContentPack = EN_CONTENT

export const T: ContentPack = new Proxy({} as ContentPack, {
  get: (_target, key) => pack[key as keyof ContentPack],
})

/** Make `next` the active pack; true when it changed (so caches holding text must be cleared). */
export function setContentPack(next: ContentPack): boolean {
  if (next === pack) return false
  pack = next
  return true
}

export const contentLanguage = (): string => pack.lang
