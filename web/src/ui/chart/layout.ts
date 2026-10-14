// Pure geometry for the chart SVGs: the house regions of the North and South Indian
// layouts and a label fitter that keeps crowded houses legible by stacking, adding
// columns, shrinking and finally shortening labels. No DOM access, so it runs in Node
// tests; text widths are estimated from Inter's advance widths (slightly generous).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { SignIndex } from '@/engine/types'

export interface Point { x: number; y: number }

/** The half-plane nx*x + ny*y >= d, where (nx, ny) is a unit normal pointing inside. */
export interface HalfPlane { nx: number; ny: number; d: number }

/** A convex area available to labels (intersection of half-planes) and where labels gravitate. */
export interface Region { planes: HalfPlane[]; anchor: Point }

/** Inner half-planes of a convex polygon given in either winding order. */
export function polygonPlanes(poly: readonly Point[]): HalfPlane[] {
  let area = 0
  poly.forEach((a, i) => {
    const b = poly[(i + 1) % poly.length]
    area += a.x * b.y - b.x * a.y
  })
  const s = Math.sign(area)
  return poly.map((a, i) => {
    const b = poly[(i + 1) % poly.length]
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const nx = (-(b.y - a.y) / len) * s
    const ny = ((b.x - a.x) / len) * s
    return { nx, ny, d: nx * a.x + ny * a.y }
  })
}

/** Points at least `dist` from `origin` in the direction of `toward` (reserves a corner for a marker). */
export function beyond(origin: Point, toward: Point, dist: number): HalfPlane {
  const len = Math.hypot(toward.x - origin.x, toward.y - origin.y)
  const nx = (toward.x - origin.x) / len
  const ny = (toward.y - origin.y) / len
  return { nx, ny, d: nx * origin.x + ny * origin.y + dist }
}

const insideAll = (planes: readonly HalfPlane[], k: readonly number[], p: Point) =>
  planes.every((pl, i) => pl.nx * p.x + pl.ny * p.y >= k[i] - 1e-7)

/**
 * Centre closest to `anchor` at which a w x h rectangle fits inside the planes with
 * `pad` clearance, or null. Each plane becomes a linear constraint on the centre, so
 * the feasible set is convex and its closest point is the anchor itself, a projection
 * onto one constraint line, or a vertex where two lines meet.
 */
export function closestCenter(planes: readonly HalfPlane[], w: number, h: number, pad: number, anchor: Point): Point | null {
  const k = planes.map((p) => p.d + pad + (Math.abs(p.nx) * w) / 2 + (Math.abs(p.ny) * h) / 2)
  const candidates: Point[] = [anchor]
  planes.forEach((p, i) => {
    const t = k[i] - (p.nx * anchor.x + p.ny * anchor.y)
    candidates.push({ x: anchor.x + p.nx * t, y: anchor.y + p.ny * t })
    for (let j = i + 1; j < planes.length; j++) {
      const q = planes[j]
      const det = p.nx * q.ny - p.ny * q.nx
      if (Math.abs(det) < 1e-12) continue
      candidates.push({ x: (k[i] * q.ny - p.ny * k[j]) / det, y: (p.nx * k[j] - k[i] * q.nx) / det })
    }
  })
  let best: Point | null = null
  let bestDist = Infinity
  for (const c of candidates) {
    const dist = Math.hypot(c.x - anchor.x, c.y - anchor.y)
    if (dist < bestDist && insideAll(planes, k, c)) {
      best = c
      bestDist = dist
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// Text metrics

const NARROW: Record<string, number> = {
  ' ': 0.28, '°': 0.42, '′': 0.3, '.': 0.3, ',': 0.3, '·': 0.3, ':': 0.3, '-': 0.42, '–': 0.56, '(': 0.36, ')': 0.36,
  i: 0.27, l: 0.27, j: 0.3, f: 0.37, t: 0.39, r: 0.41, I: 0.3, m: 0.88, w: 0.8, M: 0.9, W: 0.95,
}

/** Estimated advance width of `text` in em for Inter (digits assumed tabular). */
export function textWidthEm(text: string): number {
  let w = 0
  for (const ch of text) {
    w += NARROW[ch] ?? (/[0-9]/.test(ch) ? 0.62 : /[A-Z]/.test(ch) ? 0.7 : 0.58)
  }
  return w
}

/** Proportions of a chart label: semibold abbreviation, superscript R, smaller degree. */
export const LABEL = { abbrWeight: 1.06, retroScale: 0.62, retroRise: 0.42, degreeScale: 0.82, degreeGap: 0.26 } as const

export interface LabelText { abbr: string; retro: boolean; degree: string | null }

/** Width of a chart label in em of its font size. */
export function labelWidthEm(l: LabelText): number {
  let w = textWidthEm(l.abbr) * LABEL.abbrWeight
  if (l.retro) w += 0.7 * LABEL.retroScale + 0.06
  if (l.degree) w += LABEL.degreeGap + textWidthEm(l.degree) * LABEL.degreeScale
  return w
}

function greedyWrap(words: readonly string[], maxWidth: number, fontSize: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (line && textWidthEm(next) * fontSize > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/**
 * Word wrap by estimated width; "\n" starts a new paragraph. Each paragraph is balanced
 * (the narrowest width that keeps its line count) so no line ends up as a lone orphan.
 * The last kept line is ellipsised when the text needs more than `maxLines`.
 */
export function wrapText(text: string, maxWidth: number, fontSize: number, maxLines: number): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean)
    const count = greedyWrap(words, maxWidth, fontSize).length
    let lo = maxWidth / 2, hi = maxWidth
    while (count > 1 && hi - lo > 1) {
      const mid = (lo + hi) / 2
      if (greedyWrap(words, mid, fontSize).length === count) hi = mid
      else lo = mid
    }
    lines.push(...greedyWrap(words, hi, fontSize))
  }
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  let last = kept[maxLines - 1]
  while (last.length > 1 && textWidthEm(`${last}…`) * fontSize > maxWidth) last = last.slice(0, -1).trimEnd()
  kept[maxLines - 1] = `${last}…`
  return kept
}

// ---------------------------------------------------------------------------
// Label fitting

/** One way of writing the labels (e.g. with minutes, whole degrees, bare names) and its font range. */
export interface FitTier {
  /** Label widths in em, one per label. */
  widths: readonly number[]
  maxFont: number
  minFont: number
}

export interface FitOptions {
  /** Line pitch in em. */
  lineHeight?: number
  /** Gap between columns in em. */
  columnGap?: number
  /** Clearance from the region edges in user units. */
  pad?: number
  maxColumns?: number
}

export interface LabelFit {
  /** Index of the tier used. */
  tier: number
  fontSize: number
  columns: number
  /** Width of one column cell and the line pitch, in user units. */
  cellWidth: number
  lineHeight: number
  /** Centre of each label, in input order (row-major, last row centred). */
  centers: Point[]
  /** False only if even the last tier at its smallest size overflows. */
  fits: boolean
}

function arrange(n: number, columns: number, center: Point, cellWidth: number, gap: number, lineHeight: number): Point[] {
  const rows = Math.ceil(n / columns)
  const top = center.y - (rows * lineHeight) / 2
  return Array.from({ length: n }, (_, i) => {
    const row = Math.floor(i / columns)
    const col = i % columns
    const inRow = row === rows - 1 ? n - row * columns : columns
    const left = center.x - (inRow * cellWidth + (inRow - 1) * gap) / 2
    return { x: left + col * (cellWidth + gap) + cellWidth / 2, y: top + row * lineHeight + lineHeight / 2 }
  })
}

/**
 * Places n labels as a centred grid inside `region`: tries each tier from its largest
 * to its smallest font, with 1..maxColumns columns, and takes the first grid that fits
 * nearest the anchor. Preferring a larger font over fewer columns keeps text readable.
 */
export function fitLabels(region: Region, tiers: readonly FitTier[], options: FitOptions = {}): LabelFit {
  const { lineHeight = 1.28, columnGap = 0.55, pad = 3, maxColumns = 3 } = options
  const n = tiers[0].widths.length
  const make = (tier: number, f: number, columns: number, center: Point, fits: boolean): LabelFit => {
    const cellWidth = Math.max(...tiers[tier].widths) * f
    return { tier, fontSize: f, columns, cellWidth, lineHeight: f * lineHeight, centers: arrange(n, columns, center, cellWidth, f * columnGap, f * lineHeight), fits }
  }
  if (n === 0) return make(0, tiers[0].maxFont, 1, region.anchor, true)
  for (let t = 0; t < tiers.length; t++) {
    const widest = Math.max(...tiers[t].widths)
    for (let f = tiers[t].maxFont; f >= tiers[t].minFont - 1e-9; f -= 0.25) {
      for (let columns = 1; columns <= Math.min(maxColumns, n); columns++) {
        const rows = Math.ceil(n / columns)
        const w = columns * widest * f + (columns - 1) * columnGap * f
        const h = rows * lineHeight * f
        const center = closestCenter(region.planes, w, h, pad, region.anchor)
        if (center) return make(t, f, columns, center, true)
      }
    }
  }
  const last = tiers.length - 1
  return make(last, tiers[last].minFont, Math.min(maxColumns, n), region.anchor, false)
}

// ---------------------------------------------------------------------------
// North Indian layout: houses are fixed, the lagna is the top-centre diamond and
// houses run anticlockwise. Sign numbers sit at each house's inner corner.

export interface NorthHouse {
  house: number
  polygon: Point[]
  /** Where the sign number is drawn. */
  numberAt: Point
  region: Region
}

/**
 * Distance of the sign number from the house's inner corner, as a fraction of the chart
 * size. Triangles keep it tucked into their 90° corner (a 15-unit "12" still clears both
 * diagonals there), because the space it blocks is what limits labels in the narrow side
 * triangles; diamonds have room to spare and keep the four central numbers apart.
 */
const NUMBER_DIST = { diamond: 0.056, triangle: 0.042 } as const
/** Extra distance kept clear beyond the sign number. */
const NUMBER_CLEAR = { diamond: 0.034, triangle: 0.029 } as const

export function northHouses(size: number): NorthHouse[] {
  const s = size, h = s / 2, q = s / 4
  const P = (x: number, y: number): Point => ({ x, y })
  const TL = P(0, 0), T = P(h, 0), TR = P(s, 0), R = P(s, h), BR = P(s, s), B = P(h, s), BL = P(0, s), L = P(0, h), C = P(h, h)
  const Ptl = P(q, q), Ptr = P(3 * q, q), Pbr = P(3 * q, 3 * q), Pbl = P(q, 3 * q)
  const houses: [Point[], Point][] = [
    [[T, Ptr, C, Ptl], C], [[TL, T, Ptl], Ptl], [[TL, Ptl, L], Ptl], [[L, Ptl, C, Pbl], C],
    [[L, Pbl, BL], Pbl], [[BL, Pbl, B], Pbl], [[B, Pbl, C, Pbr], C], [[B, Pbr, BR], Pbr],
    [[BR, Pbr, R], Pbr], [[R, Pbr, C, Ptr], C], [[R, Ptr, TR], Ptr], [[TR, Ptr, T], Ptr],
  ]
  return houses.map(([polygon, inner], i) => {
    const centroid = { x: polygon.reduce((a, p) => a + p.x, 0) / polygon.length, y: polygon.reduce((a, p) => a + p.y, 0) / polygon.length }
    const len = Math.hypot(centroid.x - inner.x, centroid.y - inner.y)
    const ux = (centroid.x - inner.x) / len, uy = (centroid.y - inner.y) / len
    const shape = polygon.length === 3 ? 'triangle' : 'diamond'
    const numberAt = { x: inner.x + ux * NUMBER_DIST[shape] * s, y: inner.y + uy * NUMBER_DIST[shape] * s }
    const planes = [...polygonPlanes(polygon), beyond(inner, centroid, (NUMBER_DIST[shape] + NUMBER_CLEAR[shape]) * s)]
    return { house: i + 1, polygon, numberAt, region: { planes, anchor: centroid } }
  })
}

// ---------------------------------------------------------------------------
// South Indian layout: signs are fixed in a 4 x 4 ring, Pisces top-left, running
// clockwise; the centre 2 x 2 is free for a caption.

/** [row, column] of each sign, Aries..Pisces. */
export const SOUTH_GRID: readonly (readonly [number, number])[] = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [3, 3], [3, 2], [3, 1], [3, 0], [2, 0], [1, 0], [0, 0],
]

export interface SouthCell {
  sign: SignIndex
  x: number
  y: number
  size: number
  region: Region
}

/** Height reserved at the bottom of each cell for the sign name, as a fraction of the cell. */
export const SOUTH_NAME_BAND = 0.15
/** Leg of the corner triangle cut off by the lagna diagonal, as a fraction of the cell. */
export const SOUTH_LAGNA_CUT = 0.3

export function southCells(size: number, lagna: SignIndex): SouthCell[] {
  const c = size / 4
  return SOUTH_GRID.map(([row, col], sign) => {
    const x = col * c, y = row * c
    const bottom = y + c * (1 - SOUTH_NAME_BAND)
    const planes = polygonPlanes([{ x, y }, { x: x + c, y }, { x: x + c, y: bottom }, { x, y: bottom }])
    if (sign === lagna) planes.push(beyond({ x, y }, { x: x + 1, y: y + 1 }, (SOUTH_LAGNA_CUT * c) / Math.SQRT2 + c * 0.04))
    return { sign, x, y, size: c, region: { planes, anchor: { x: x + c / 2, y: (y + bottom) / 2 } } }
  })
}
