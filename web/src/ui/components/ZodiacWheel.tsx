// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId } from 'react'
import { SIGN_SANSKRIT } from '@/engine/core'
import { cn } from '@/lib/cn'

const C = 200
const polar = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}
const ray = (r1: number, r2: number, deg: number) => {
  const [x1, y1] = polar(r1, deg), [x2, y2] = polar(r2, deg)
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`
}
/** Star polygon {n/k}: join every k-th of n points on a circle. */
const starPolygon = (n: number, k: number, r: number) =>
  Array.from({ length: n }, (_, i) => polar(r, ((i * k) % n) * (360 / n)).map((v) => v.toFixed(2)).join(' ')).join(' ')

const SIGN_DIVIDERS = Array.from({ length: 12 }, (_, i) => ray(166, 192, i * 30)).join('')
const NAKSHATRA_TICKS = Array.from({ length: 27 }, (_, i) => ray(146, 158, (i * 360) / 27)).join('')
const PADA_TICKS = Array.from({ length: 108 }, (_, i) => ray(153, 158, (i * 360) / 108)).join('')

// Grahas at fixed decorative angles, in their traditional colours.
const GRAHAS = [
  { deg: 18, r: 5.5, color: '#f8bd57' }, // Sun
  { deg: 64, r: 4.5, color: '#e8ecf8' }, // Moon
  { deg: 111, r: 3.2, color: '#fb7185' }, // Mars
  { deg: 152, r: 3, color: '#34d399' }, // Mercury
  { deg: 197, r: 4.2, color: '#fcd34d' }, // Jupiter
  { deg: 236, r: 3.6, color: '#f5d0fe' }, // Venus
  { deg: 281, r: 3.4, color: '#93c5fd' }, // Saturn
  { deg: 318, r: 2.8, color: '#a8a29e' }, // Rahu
  { deg: 138, r: 2.8, color: '#a8a29e' }, // Ketu
]

/** Decorative, slowly turning zodiac: 12 signs, 27 nakshatras, 108 padas and the nine grahas. */
export function ZodiacWheel({ className }: { className?: string }) {
  const id = useId()
  const labelPath = `${id}-labels`, sun = `${id}-sun`, glow = `${id}-glow`
  const line = { stroke: 'var(--wheel-stroke)' }
  const faint = { stroke: 'var(--wheel-faint)' }
  return (
    <svg viewBox="0 0 400 400" aria-hidden className={cn('select-none', className)} fill="none">
      <defs>
        <path id={labelPath} d={`M${C} ${C - 174}a174 174 0 1 1 -0.01 0`} />
        <radialGradient id={sun}>
          <stop offset="0" stopColor="#fff3d6" />
          <stop offset="0.45" stopColor="#f8bd57" />
          <stop offset="1" stopColor="#e08a16" />
        </radialGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#f8bd57" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f8bd57" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g className="spin-slow">
        <circle cx={C} cy={C} r="197" style={faint} />
        <circle cx={C} cy={C} r="192" style={line} strokeOpacity="0.55" />
        <circle cx={C} cy={C} r="166" style={line} strokeOpacity="0.55" />
        <path d={SIGN_DIVIDERS} style={line} strokeOpacity="0.45" />
        <text fontSize="9.5" letterSpacing="2.6" fontFamily="var(--font-sans)" fontWeight="600" style={{ fill: 'var(--text-muted)' }}>
          {SIGN_SANSKRIT.map((name, i) => (
            <textPath key={name} href={`#${labelPath}`} startOffset={`${((i * 30 + 15) / 360) * 100}%`} textAnchor="middle">
              {name.toUpperCase()}
            </textPath>
          ))}
        </text>
        <circle cx={C} cy={C} r="158" style={faint} />
        <path d={NAKSHATRA_TICKS} style={line} strokeOpacity="0.5" />
        <path d={PADA_TICKS} style={faint} />
      </g>

      <g className="spin-reverse">
        <circle cx={C} cy={C} r="128" style={faint} strokeDasharray="2 6" />
        {GRAHAS.map((g, i) => {
          const [x, y] = polar(128, g.deg)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={g.r * 2.4} fill={g.color} fillOpacity="0.12" />
              <circle cx={x} cy={y} r={g.r} fill={g.color} style={line} strokeOpacity="0.6" strokeWidth="0.8" />
            </g>
          )
        })}
        <polygon points={starPolygon(9, 4, 100)} style={line} strokeOpacity="0.35" strokeLinejoin="round" />
        <polygon points={starPolygon(9, 2, 100)} style={faint} strokeLinejoin="round" />
        <circle cx={C} cy={C} r="100" style={faint} />
      </g>

      <circle cx={C} cy={C} r="70" fill={`url(#${glow})`} />
      <circle cx={C} cy={C} r="26" fill={`url(#${sun})`} />
    </svg>
  )
}
