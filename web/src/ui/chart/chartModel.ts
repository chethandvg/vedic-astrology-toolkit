// Chart data shaped for drawing: occupants per house for a varga, the fitted label
// layout and a plain-language summary for screen readers.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { formatDegree, houseFrom } from '@/engine/core'
import { PLANETS, type Body, type Chart, type Planet, type SignIndex } from '@/engine/types'
import { fitLabels, labelWidthEm, type LabelFit, type Region } from './layout'
import { names, t } from '@/i18n'
import { vargaLabel } from './vargas'

export interface Occupant {
  body: Body
  abbr: string
  /** Shown as a superscript R. Rahu and Ketu are not marked: the mean nodes are always retrograde. */
  retro: boolean
  /** "23°50′" in the rasi chart; null in other vargas, whose degrees are not meaningful. */
  degree: string | null
  /** "23°", the shorter form used when a house is crowded. */
  wholeDegree: string | null
  highlight: boolean
}

export interface HouseModel {
  /** 1..12 counted from the varga lagna. */
  house: number
  sign: SignIndex
  occupants: Occupant[]
}

const ORDER: readonly Body[] = ['Asc', ...PLANETS]

/** Signs of every body in division `varga`, throwing a clear error if the chart lacks it. */
function vargaSigns(chart: Chart, varga: number): Record<Body, SignIndex> {
  const signs = chart.vargas[varga]
  if (!signs) throw new Error(`Chart has no D-${varga}`)
  return signs
}

/**
 * Occupants of the 12 houses (index 0 = house 1). In the rasi chart a house lists the
 * ascendant first and then planets by degree, the usual reading order; other vargas
 * keep the classical Sun..Ketu order because degrees there are not shown.
 */
export function houseModels(chart: Chart, varga = 1, highlight: readonly Planet[] = []): HouseModel[] {
  const signs = vargaSigns(chart, varga)
  const lagna = signs.Asc
  const houses: HouseModel[] = Array.from({ length: 12 }, (_, i) => ({ house: i + 1, sign: (lagna + i) % 12, occupants: [] }))
  for (const body of ORDER) {
    const p = chart.positions[body]
    const isNode = body === 'Rahu' || body === 'Ketu'
    houses[houseFrom(lagna, signs[body]) - 1].occupants.push({
      body,
      abbr: names().bodyShort[body],
      retro: p.retrograde && !isNode,
      degree: varga === 1 ? formatDegree(p.longitude) : null,
      wholeDegree: varga === 1 ? `${Math.floor(p.degree)}°` : null,
      highlight: body !== 'Asc' && highlight.includes(body),
    })
  }
  if (varga === 1) {
    for (const h of houses) {
      h.occupants.sort((a, b) => (a.body === 'Asc' ? -1 : b.body === 'Asc' ? 1 : chart.positions[a.body].degree - chart.positions[b.body].degree))
    }
  }
  return houses
}

export type DegreeStyle = 'full' | 'whole' | 'none'

export interface HouseLayout {
  fit: LabelFit
  degreeStyle: DegreeStyle
}

const STYLES: readonly DegreeStyle[] = ['full', 'whole', 'none']

/** Font ranges (in user units of a 400-unit chart) for full, whole-degree and bare labels. */
const TIERS: Record<DegreeStyle, [number, number]> = { full: [14.5, 10.5], whole: [13.5, 9.5], none: [15, 8] }

/** Extra label width in em for the highlight pill drawn behind a label. */
export const HIGHLIGHT_PAD = 0.5

/**
 * Fits a house's labels into its region, shortening degrees only when it must.
 * `maxFont` caps the size so that houses can share a common size. `scale` (>= 1, see
 * labelScale) raises only the largest size tried, so a chart drawn small on a phone gets
 * bigger text where there is room without changing when degrees are shortened.
 */
export function layoutHouse(region: Region, occupants: readonly Occupant[], maxFont = Infinity, scale = 1): HouseLayout {
  const styles: readonly DegreeStyle[] = occupants.some((o) => o.degree) ? STYLES : ['none']
  const tiers = styles.map((style) => ({
    widths: occupants.map((o) => labelWidthEm({ abbr: o.abbr, retro: o.retro, degree: degreeText(o, style) }) + (o.highlight ? HIGHLIGHT_PAD : 0)),
    // Floored to the fitter's 0.25 step so every scale tries the same sizes below the top.
    maxFont: Math.max(TIERS[style][1], Math.min(Math.floor(TIERS[style][0] * scale * 4) / 4, maxFont)),
    minFont: TIERS[style][1],
  }))
  const fit = fitLabels(region, tiers, { pad: 3 })
  return { fit, degreeStyle: styles[fit.tier] }
}

/**
 * Lays out all twelve houses (`regions[i]` belongs to house i + 1). Houses holding one or
 * two bodies share the smallest size any of them needs, so the chart reads evenly; only
 * crowded houses go smaller.
 */
export function layoutChart(regions: readonly Region[], houses: readonly HouseModel[], scale = 1): HouseLayout[] {
  const first = houses.map((h, i) => layoutHouse(regions[i], h.occupants, Infinity, scale))
  const sparse = first.filter((l, i) => houses[i].occupants.length > 0 && houses[i].occupants.length <= 2 && l.fit.tier === 0)
  if (!sparse.length) return first
  const common = Math.min(...sparse.map((l) => l.fit.fontSize))
  return houses.map((h, i) => layoutHouse(regions[i], h.occupants, common, scale))
}

/** Rendered width in CSS pixels from which chart text is drawn at its base size. */
const COMFORT_WIDTH = 400
/** Largest enlargement, so that labels in a phone-sized chart still fit their houses. */
export const MAX_LABEL_SCALE = 1.35

/**
 * Text enlargement for a chart rendered `width` CSS pixels wide: the base sizes are tuned
 * for about 400 px, and on a 320-390 px phone the SVG would otherwise shrink labels to
 * 8-10 px. Quantised to 0.05 so small resizes do not re-run the layout.
 */
export function labelScale(width: number): number {
  if (!(width > 0)) return 1
  return Math.min(MAX_LABEL_SCALE, Math.max(1, Math.round((COMFORT_WIDTH / width) * 20) / 20))
}

export const degreeText = (o: Occupant, style: DegreeStyle): string | null =>
  style === 'full' ? o.degree : style === 'whole' ? o.wholeDegree : null

/** "Mercury retrograde 15°27′" for screen readers. */
export function describeOccupant(o: Occupant): string {
  return [names().body[o.body], o.retro ? t('chart.retrograde').toLowerCase() : '', o.degree ?? ''].filter(Boolean).join(' ')
}

/** One-paragraph description of the chart for the SVG's aria-label. */
export function chartSummary(houses: readonly HouseModel[], varga: number, style: 'north' | 'south'): string {
  const lagna = houses[0]
  const asc = lagna.occupants.find((o) => o.body === 'Asc')
  const sign = (s: SignIndex) => names().sign[s]
  const parts = [t('chart.summary', { style: t(style === 'north' ? 'chart.northIndian' : 'chart.southIndian'), varga: vargaLabel(varga) }), t(asc?.degree ? 'chart.lagnaAt' : 'chart.lagnaIn', { sign: sign(lagna.sign), degree: asc?.degree ?? '' })]
  for (const h of houses) {
    const planets = h.occupants.filter((o) => o.body !== 'Asc')
    if (planets.length) parts.push(t('chart.house', { n: h.house, sign: sign(h.sign), planets: planets.map(describeOccupant).join(', ') }))
  }
  return parts.join(' ')
}
