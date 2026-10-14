// Loaders of the interpretation packs, one lazily loaded chunk per language, shared by the main
// thread (matching, natal and report texts) and the engine worker (forecast texts).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { ContentPack } from '@/content/pack'
import type { Lang } from '../langs'

const LOADERS: Readonly<Record<Exclude<Lang, 'en'>, () => Promise<ContentPack>>> = {
  kn: () => import('./kn').then((m) => m.default),
  hi: () => import('./hi').then((m) => m.default),
  ta: () => import('./ta').then((m) => m.default),
  te: () => import('./te').then((m) => m.default),
}

/** The pack of a language other than English (English is content/pack.ts EN_CONTENT, always loaded). */
export const loadContentPack = (lang: Exclude<Lang, 'en'>): Promise<ContentPack> => LOADERS[lang]()
