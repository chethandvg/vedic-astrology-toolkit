// What the rating card's summary line shows: the same quantities the rating is computed from,
// so it can never contradict the rating word. A day's score is the balance of its scored
// reasons' weights (engine/predict.ts scoreReasons); a week, month or year is the average of
// its days or months, so their ratings are counted instead. Also which reasons a shortened
// list shows first, so the ones the card names are always among them.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Effect, Forecast, Rating, Reason } from '@/engine/types'
import { t, tp } from '@/i18n'

/** Reasons that explain context but do not vote in the score (engine/predict.ts INFORMATIONAL_FACTORS). */
export const UNSCORED_FACTORS: readonly string[] = ['dasha', 'moon_change']
/** Period reasons that restate the daily ratings ("Best days: ...") rather than explain them. */
export const SUMMARY_FACTORS: readonly string[] = ['best_days', 'careful_days']

export type BalanceSlice =
  | { kind: 'effect'; effect: Effect; share: number; label: string }
  | { kind: 'rating'; rating: Rating; share: number; label: string }

export interface Balance {
  /** Accessible name of the list, e.g. "Weight of the reasons". */
  title: string
  /** In display order (good first); shares add up to 1. */
  slices: BalanceSlice[]
}

const scored = (r: Reason) => !UNSCORED_FACTORS.includes(r.factor)

/** Whole percentages that add up to 100 (largest remainder); zero shares stay zero. */
export function percentages(values: readonly number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0)
  if (!total) return values.map(() => 0)
  const raw = values.map((v) => (v / total) * 100)
  const out = raw.map(Math.floor)
  const order = raw.map((v, i) => [v - Math.floor(v), i] as const).filter(([, i]) => values[i] > 0).sort((a, b) => b[0] - a[0])
  for (let k = 0, left = 100 - out.reduce((a, b) => a + b, 0); left > 0 && order.length; k++, left--) out[order[k % order.length][1]]++
  return out
}

const RATINGS: readonly Rating[] = ['favourable', 'mixed', 'challenging']
const EFFECTS: readonly Effect[] = [1, 0, -1]
const EFFECT_KEY = { 1: 'balance.pctSupportive', 0: 'balance.pctNeutral', [-1]: 'balance.pctChallenging' } as const

export function ratingBalance(forecast: Forecast): Balance {
  const parts = forecast.parts ?? []
  if (parts.length) {
    const unit = forecast.horizon === 'year' ? 'month' : 'day'
    const slices = RATINGS.flatMap((rating): BalanceSlice[] => {
      const n = parts.filter((p) => p.rating === rating).length
      return n ? [{ kind: 'rating', rating, share: n / parts.length, label: tp(`balance.${unit}s`, n, { rating: t(`balance.${rating}`) }) }] : []
    })
    return { title: t(unit === 'day' ? 'balance.daysTitle' : 'balance.monthsTitle'), slices }
  }
  const reasons = forecast.reasons.filter(scored)
  const weights = EFFECTS.map((e) => reasons.filter((r) => r.effect === e).reduce((sum, r) => sum + r.weight, 0))
  const total = weights.reduce((a, b) => a + b, 0)
  const pct = percentages(weights)
  const slices = EFFECTS.flatMap((effect, i): BalanceSlice[] =>
    pct[i] > 0 ? [{ kind: 'effect', effect, share: weights[i] / total, label: t(EFFECT_KEY[effect], { pct: pct[i] }) }] : [])
  return { title: t('balance.weightTitle'), slices }
}

/**
 * The heaviest supportive and challenging reasons that explain the rating: scored ones only,
 * leaving out the period summaries ("Best days", "Go gently") that merely restate the days.
 */
export function strongestReasons(reasons: readonly Reason[]): { lift?: Reason; drag?: Reason } {
  const candidates = reasons.filter((r) => scored(r) && !SUMMARY_FACTORS.includes(r.factor)).sort((a, b) => b.weight - a.weight)
  return { lift: candidates.find((r) => r.effect > 0), drag: candidates.find((r) => r.effect < 0) }
}

/**
 * The `count` reasons to show first: the heaviest supportive and challenging ones (those the
 * rating card names as lifting and holding back the day), then the rest by weight, the ones
 * that do not vote in the score last.
 */
export function leadingReasons(reasons: readonly Reason[], count: number): ReadonlySet<Reason> {
  const unscored = (r: Reason) => Number(UNSCORED_FACTORS.includes(r.factor))
  const ranked = [...reasons].sort((a, b) => unscored(a) - unscored(b) || b.weight - a.weight)
  const leaders = ([1, -1] as const).flatMap((e) => ranked.filter((r) => r.effect === e && !unscored(r)).slice(0, 1))
  return new Set([...new Set([...leaders, ...ranked])].slice(0, count))
}
