// Generic root finding over time. All instants are JD UT1.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

/** Default precision: about 0.1 second. */
export const DEFAULT_TOLERANCE_DAYS = 1e-6

/**
 * Bisect between `lo` and `hi` (where `isAfter(lo)` is false and `isAfter(hi)` is true)
 * to the first instant at which `isAfter` becomes true.
 */
export function bisectInstant(isAfter: (jd: number) => boolean, lo: number, hi: number, tolerance = DEFAULT_TOLERANCE_DAYS): number {
  for (let i = 0; i < 64 && hi - lo > tolerance; i++) {
    const mid = (lo + hi) / 2
    if (isAfter(mid)) hi = mid
    else lo = mid
  }
  return hi
}

export interface Change<T> {
  /** First instant with the new value. */
  jd: number
  from: T
  to: T
}

/**
 * Every change of a discrete quantity (sign, nakshatra, motion direction...) in [start, end].
 * `step` must be shorter than the shortest time the value stays constant.
 */
export function findChanges<T>(value: (jd: number) => T, start: number, end: number, step: number, tolerance = DEFAULT_TOLERANCE_DAYS): Change<T>[] {
  const out: Change<T>[] = []
  let t = start
  let v = value(t)
  while (t < end) {
    const t2 = Math.min(t + step, end)
    const v2 = value(t2)
    if (v2 !== v) {
      const from = v
      const jd = bisectInstant((x) => value(x) !== from, t, t2, tolerance)
      const to = value(jd)
      out.push({ jd, from, to })
      // Continue from the change; a second change inside the same step is caught on the next pass.
      t = jd
      v = to
      continue
    }
    t = t2
    v = v2
  }
  return out
}
