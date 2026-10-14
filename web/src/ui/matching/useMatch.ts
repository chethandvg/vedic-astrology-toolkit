// Data seam of the matching screen: the match is computed in the engine worker (engineApi.match,
// which casts both charts once and memoises them) and cached by the birth details that change
// results and the calculation settings. The chosen pair is remembered in this browser.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useSyncExternalStore } from 'react'
import type { MatchData } from '@/engine/api'
import { useEngineQuery } from '@/lib/engine'
import type { Profile } from '@/state/profiles'
import { calcSettings, useSettings } from '@/state/settings'
import { createPersistentStore } from '@/state/storage'
import { birthForEngine } from '@/ui/forecast/data'

export type { MatchData } from '@/engine/api'

export interface MatchQuery {
  data?: MatchData
  error: Error | null
  loading: boolean
  retry(): void
}

/** The match of `groom` and `bride` (either missing: nothing runs). */
export function useMatch(groom: Profile | undefined, bride: Profile | undefined): MatchQuery {
  const settings = calcSettings(useSettings())
  const births = groom && bride ? [birthForEngine(groom.birth), birthForEngine(bride.birth)] as const : null
  const key = births ? JSON.stringify(['match', births, settings]) : null
  // Kept while a newer pair loads, like the forecast screens, so the result does not flash.
  const { data, error, loading, retry } = useEngineQuery<MatchData>(key, (engine) => engine.match(births![0], births![1], settings))
  return { data: key ? data : undefined, error, loading, retry }
}

// ---------------------------------------------------------------------------------------------
// The chosen pair, per browser.

export interface MatchPair {
  groomId: string | null
  brideId: string | null
}

const parsePair = (raw: unknown): MatchPair => {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
  return { groomId: typeof r.groomId === 'string' ? r.groomId : null, brideId: typeof r.brideId === 'string' ? r.brideId : null }
}

const pairStore = createPersistentStore('jyotish-daily:match:v1', parsePair)

/**
 * The remembered pair, falling back to the first two saved profiles (a choice whose profile was
 * deleted falls back too), and a setter.
 */
export function useMatchPair(profiles: Profile[]): [{ groom?: Profile; bride?: Profile }, (next: MatchPair) => void] {
  const stored = useSyncExternalStore(pairStore.subscribe, pairStore.get, pairStore.get)
  const find = (id: string | null) => (id ? profiles.find((p) => p.id === id) : undefined)
  let groom = find(stored.groomId)
  let bride = find(stored.brideId)
  if (!groom) groom = profiles.find((p) => p !== bride)
  if (!bride) bride = profiles.find((p) => p !== groom)
  return [{ groom, bride }, (next) => pairStore.set(next)]
}
