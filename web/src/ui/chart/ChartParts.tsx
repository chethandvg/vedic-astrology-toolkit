// Pieces shared by the North and South Indian charts: props, SVG house labels and the
// visually hidden table that gives screen-reader users the same data as the drawing.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { useT } from '@/i18n'
import type { Chart, Planet } from '@/engine/types'
import { degreeText, describeOccupant, HIGHLIGHT_PAD, labelScale, type HouseLayout, type HouseModel } from './chartModel'
import { LABEL, labelWidthEm } from './layout'
import { bodyColor } from './planets'
import { vargaLabel } from './vargas'
import './chart.css'

export interface ChartCaption {
  title: string
  /** Secondary line(s), e.g. date, time and place; "\n" forces a line break. */
  subtitle?: string
}

export interface ChartProps {
  chart: Chart
  /** Division to draw (1 = rasi, 9 = navamsa, ...). Degrees are shown only for D1. */
  varga?: number
  caption?: ChartCaption
  /** Planets to emphasise, e.g. those named in a forecast. */
  highlight?: readonly Planet[]
  /** Rendered width in CSS pixels; by default the chart fills its container. */
  size?: number
  className?: string
}

/** Side of the square drawing in SVG user units; all chart geometry is in these units. */
export const CHART_UNITS = 400
/** Margin around the frame so strokes are not clipped. */
export const VIEWBOX = `-4 -4 ${CHART_UNITS + 8} ${CHART_UNITS + 8}`

/**
 * Text enlargement for the chart inside `ref` (see labelScale), measured before the first
 * paint and kept current with a ResizeObserver. Layout widths ignore CSS transforms, so the
 * switcher's scale animation does not trigger a re-layout.
 */
export function useLabelScale(): [RefObject<HTMLElement | null>, number] {
  const ref = useRef<HTMLElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setScale(labelScale(el.offsetWidth))
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setScale(labelScale(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, scale]
}

/** useId output made safe for url(#id) references. */
export const svgId = (reactId: string): string => `chart-${reactId.replace(/[^\w-]/g, '')}`

/** Warm glow for the lagna house, fading from its outer edge (bounding-box units). */
export function LagnaGradient({ id, x1 = 0, y1 = 0, x2 = 0, y2 = 0 }: { id: string; x1?: number; y1?: number; x2?: number; y2?: number }) {
  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      <stop offset="0" style={{ stopColor: 'var(--chart-lagna-from)' }} />
      <stop offset="1" style={{ stopColor: 'var(--chart-lagna-to)' }} />
    </linearGradient>
  )
}

/** The labels of one house, positioned by its fitted layout. */
export function HouseLabels({ house, layout }: { house: HouseModel; layout: HouseLayout }) {
  const { fit, degreeStyle } = layout
  const f = fit.fontSize
  return house.occupants.map((o, i) => {
    const c = fit.centers[i]
    const degree = degreeText(o, degreeStyle)
    const isAsc = o.body === 'Asc'
    const width = labelWidthEm({ abbr: o.abbr, retro: o.retro, degree }) * f
    const pad = HIGHLIGHT_PAD * f
    return (
      <g key={o.body}>
        {o.highlight && (
          <rect
            x={c.x - (width + pad) / 2} y={c.y - fit.lineHeight * 0.44} width={width + pad} height={fit.lineHeight * 0.88}
            rx={fit.lineHeight * 0.44} fill="var(--chart-highlight)" stroke="var(--chart-highlight-line)" strokeWidth={0.75}
          />
        )}
        <text x={c.x} y={c.y + f * 0.36} textAnchor="middle" fontSize={f} className="tabular-nums">
          <tspan fontWeight={isAsc ? 700 : 600} style={{ fill: bodyColor(o.body) }}>{o.abbr}</tspan>
          {o.retro && (
            <tspan fontSize={f * LABEL.retroScale} fontWeight={700} dx={f * 0.06} dy={-f * LABEL.retroRise} style={{ fill: 'var(--chart-retro)' }}>R</tspan>
          )}
          {degree && (
            <tspan fontSize={f * LABEL.degreeScale} dx={f * LABEL.degreeGap} dy={o.retro ? f * LABEL.retroRise : undefined} style={{ fill: 'var(--chart-degree)' }}>
              {degree}
            </tspan>
          )}
        </text>
      </g>
    )
  })
}

/**
 * Screen-reader table listing each house, its sign and its occupants. The wrapper carries
 * sr-only because a table sizes itself to its content and would ignore the 1px box.
 */
export function ChartTable({ houses, varga }: { houses: readonly HouseModel[]; varga: number }) {
  const { t, n } = useT()
  return (
    <div className="sr-only">
      <table>
        <caption>{t('chart.tableCaption', { varga: vargaLabel(varga) })}</caption>
        <thead>
          <tr><th scope="col">{t('chart.houseCol')}</th><th scope="col">{t('moon.sign')}</th><th scope="col">{t('chart.occupants')}</th></tr>
        </thead>
        <tbody>
          {houses.map((h) => (
            <tr key={h.house}>
              <th scope="row">{h.house}</th>
              <td>{n.sign[h.sign]}</td>
              <td>
                {h.occupants.length ? h.occupants.map((o) => `${describeOccupant(o)}${o.highlight ? ` ${t('chart.highlighted')}` : ''}`).join(', ') : t('common.none')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
