// Saturn's transit phases counted from the natal Moon sign: Sade Sati (12th, 1st, 2nd),
// Ashtama Shani (8th) and Ardhashtama Shani (4th). Whole-sign counting from the Janma rasi, as
// mainstream panchangs (Drik Panchang, Jagannatha Hora) publish them.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { houseFrom } from './core'
import { cellChanges } from './events'
import type { Settings, SignIndex } from './types'

export type SaturnPhase = 'sade_sati_rising' | 'sade_sati_peak' | 'sade_sati_setting' | 'ashtama' | 'ardhashtama'

/**
 * Houses from the Moon sign that carry a named phase. Sade Sati is the 7.5 years Saturn spends in
 * the 12th, 1st and 2nd; Ashtama ("eighth") Shani is the 8th; Ardhashtama ("half of eighth") Shani
 * is the 4th, which North Indian almanacs pair with the 8th as Shani Dhaiya and some lineages call
 * Kantaka Shani.
 */
const PHASE_BY_HOUSE: Readonly<Partial<Record<number, SaturnPhase>>> = {
  12: 'sade_sati_rising', 1: 'sade_sati_peak', 2: 'sade_sati_setting', 8: 'ashtama', 4: 'ardhashtama',
}

export interface SaturnPeriod {
  phase: SaturnPhase
  /** Saturn's entry into the sign (may precede the requested window). */
  startJd: number
  /** Saturn's exit from the sign (may follow the requested window). */
  endJd: number
  /** Saturn's house counted from the natal Moon sign. */
  house: number
  /** Saturn's sign. */
  sign: SignIndex
}

/** A whole Sade Sati: from Saturn's first entry into the 12th to its final exit from the 2nd. */
export interface SadeSatiSpan {
  startJd: number
  endJd: number
  periods: SaturnPeriod[]
}

export interface SadeSatiSummary {
  /** Saturn's house from the natal Moon sign at `aroundJd`. */
  house: number
  /** Phase in force at `aroundJd`, or null (also during a retrograde dip out of the Sade Sati signs). */
  phase: SaturnPhase | null
  current: SaturnPeriod | null
  /** The Sade Sati whose overall span contains `aroundJd`, or null. */
  sadeSati: SadeSatiSpan | null
  /** The last Sade Sati that ended at or before `aroundJd`. */
  previous: SadeSatiSpan | null
  /** The first Sade Sati that starts after `aroundJd`. */
  next: SadeSatiSpan | null
}

/**
 * Saturn stays in one sign at most about 1,100 days at a stretch (1,092 in 1800-2200), so
 * searching this far beyond a window always finds the entry and exit of every stay touching it.
 */
const STAY_MARGIN_DAYS = 1500
/**
 * Retrograde dips out of the Sade Sati signs last months; the next Sade Sati comes about 22 years
 * after one ends. Periods closer than this belong to the same Sade Sati.
 */
const SADE_SATI_MERGE_DAYS = 2 * 365.25
/** One Saturn cycle (29.5 years) plus the longest Sade Sati (about 8.3 years), with room to spare. */
const SUMMARY_REACH_DAYS = 40 * 365.25

interface Stay { sign: SignIndex; startJd: number; endJd: number }

/** Saturn's stays in each sign that overlap [startJd, endJd), with their true entry and exit. */
function saturnStays(startJd: number, endJd: number, settings: Settings): Stay[] {
  const changes = cellChanges('Saturn', 'sign', startJd - STAY_MARGIN_DAYS, endJd + STAY_MARGIN_DAYS, settings)
  const stays: Stay[] = []
  for (let i = 0; i + 1 < changes.length; i++) {
    const stay = { sign: changes[i].to, startJd: changes[i].jd, endJd: changes[i + 1].jd }
    if (stay.endJd > startJd && stay.startJd < endJd) stays.push(stay)
  }
  return stays
}

/**
 * Saturn's named phases from the natal Moon sign overlapping [startJd, endJd), in time order and
 * not clipped to the window. Each period is one continuous stay in a sign: when retrograde motion
 * takes Saturn back into the previous sign and forward again, the phase is split into separate
 * periods (with the other sign's phase, if any, in between), so periods never overlap.
 */
export function saturnPhases(natalMoonSign: SignIndex, startJd: number, endJd: number, settings: Settings): SaturnPeriod[] {
  const out: SaturnPeriod[] = []
  for (const s of saturnStays(startJd, endJd, settings)) {
    const house = houseFrom(natalMoonSign, s.sign)
    const phase = PHASE_BY_HOUSE[house]
    if (phase) out.push({ phase, startJd: s.startJd, endJd: s.endJd, house, sign: s.sign })
  }
  return out
}

/** Group Sade Sati periods into whole Sade Satis, bridging short retrograde dips. */
function sadeSatiSpans(periods: readonly SaturnPeriod[]): SadeSatiSpan[] {
  const spans: SadeSatiSpan[] = []
  for (const p of periods) {
    if (!p.phase.startsWith('sade_sati')) continue
    const last = spans.at(-1)
    if (last && p.startJd - last.endJd < SADE_SATI_MERGE_DAYS) {
      last.endJd = p.endJd
      last.periods.push(p)
    } else {
      spans.push({ startJd: p.startJd, endJd: p.endJd, periods: [p] })
    }
  }
  return spans
}

/** Saturn's status at `aroundJd` relative to the natal Moon sign, with the surrounding, previous and next Sade Sati. */
export function sadeSatiSummary(natalMoonSign: SignIndex, aroundJd: number, settings: Settings): SadeSatiSummary {
  const stays = saturnStays(aroundJd - SUMMARY_REACH_DAYS, aroundJd + SUMMARY_REACH_DAYS, settings)
  const periods: SaturnPeriod[] = []
  let house = 0
  for (const s of stays) {
    const h = houseFrom(natalMoonSign, s.sign)
    if (s.startJd <= aroundJd && aroundJd < s.endJd) house = h
    const phase = PHASE_BY_HOUSE[h]
    if (phase) periods.push({ phase, startJd: s.startJd, endJd: s.endJd, house: h, sign: s.sign })
  }
  const current = periods.find((p) => p.startJd <= aroundJd && aroundJd < p.endJd) ?? null
  const spans = sadeSatiSpans(periods)
  return {
    house,
    phase: current?.phase ?? null,
    current,
    sadeSati: spans.find((s) => s.startJd <= aroundJd && aroundJd < s.endJd) ?? null,
    previous: spans.filter((s) => s.endJd <= aroundJd).at(-1) ?? null,
    next: spans.find((s) => s.startJd > aroundJd) ?? null,
  }
}
