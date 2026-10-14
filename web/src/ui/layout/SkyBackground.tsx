// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { memo, type CSSProperties } from 'react'

/** Small seeded PRNG (mulberry32) so the sky is the same on every visit. */
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const next = random(108)
const STARS = Array.from({ length: 140 }, (_, i) => ({
  x: next() * 1600,
  y: next() * 1000,
  r: 0.35 + next() ** 3 * 1.4,
  o: 0.25 + next() * 0.6,
  twinkle: i % 4 === 0,
  duration: 3 + next() * 5,
  delay: next() * -8,
}))

/** Fixed night-sky backdrop: soft glows plus a twinkling starfield (stars hide in the light theme). */
export const SkyBackground = memo(function SkyBackground() {
  return (
    <div className="sky" aria-hidden>
      <svg className="stars absolute inset-0 size-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">
        {STARS.map((s, i) => (
          <circle
            key={i}
            cx={s.x.toFixed(1)}
            cy={s.y.toFixed(1)}
            r={s.r.toFixed(2)}
            fill="#ffffff"
            opacity={s.o.toFixed(2)}
            className={s.twinkle ? 'twinkle' : undefined}
            style={s.twinkle ? ({ '--twinkle': `${s.duration.toFixed(1)}s`, '--delay': `${s.delay.toFixed(1)}s` } as CSSProperties) : undefined}
          />
        ))}
      </svg>
    </div>
  )
})
