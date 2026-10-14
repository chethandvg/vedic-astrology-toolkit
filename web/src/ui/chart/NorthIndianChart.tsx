// North Indian (diamond) chart: houses are fixed, the lagna is the top-centre diamond,
// houses run anticlockwise and each house shows its sign number (1 = Aries).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId, useMemo } from 'react'
import { clsx } from 'clsx'
import { useT } from '@/i18n'
import { chartSummary, houseModels, layoutChart } from './chartModel'
import { CHART_UNITS, ChartTable, HouseLabels, LagnaGradient, svgId, useLabelScale, VIEWBOX, type ChartProps } from './ChartParts'
import { northHouses } from './layout'
import { vargaLabel } from './vargas'

const S = CHART_UNITS
const SHAPES = northHouses(S)
const REGIONS = SHAPES.map((h) => h.region)
/** Both diagonals plus the inner diamond joining the side midpoints. */
const LINES = `M0 0L${S} ${S}M${S} 0L0 ${S}M${S / 2} 0L${S} ${S / 2}L${S / 2} ${S}L0 ${S / 2}Z`
/** Sign-number size; it grows less than the planet labels because four numbers meet at the centre. */
const NUMBER_SIZE = 13
const NUMBER_MAX_SCALE = 1.15

export function NorthIndianChart({ chart, varga = 1, caption, highlight, size, className }: ChartProps) {
  const highlightKey = highlight?.join() ?? ''
  // Keyed by content: callers often pass a fresh array literal on every render.
  const { lang } = useT()
  // The labels are in the current language, so a language change rebuilds them too.
  const houses = useMemo(() => houseModels(chart, varga, highlight), [chart, varga, highlightKey, lang])
  const [figure, scale] = useLabelScale()
  const layouts = useMemo(() => layoutChart(REGIONS, houses, scale), [houses, scale])
  const summary = chartSummary(houses, varga, 'north')
  const gradient = svgId(useId())
  const numberSize = NUMBER_SIZE * Math.min(scale, NUMBER_MAX_SCALE)
  return (
    <figure ref={figure} className={clsx('relative m-0', className)} style={size ? { width: size, maxWidth: '100%' } : undefined}>
      <svg viewBox={VIEWBOX} role="img" aria-label={summary} className="block h-auto w-full select-none font-sans">
        <defs><LagnaGradient id={gradient} x1={0.5} x2={0.5} y2={1} /></defs>
        <rect width={S} height={S} rx={2} fill="var(--chart-fill)" />
        <polygon points={SHAPES[0].polygon.map((p) => `${p.x},${p.y}`).join(' ')} fill={`url(#${gradient})`} />
        <path d={LINES} fill="none" stroke="var(--chart-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <rect width={S} height={S} rx={2} fill="none" stroke="var(--chart-frame)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        {SHAPES.map((shape, i) => (
          <text
            key={shape.house} x={shape.numberAt.x} y={shape.numberAt.y + numberSize * 0.354} textAnchor="middle" fontSize={numberSize}
            className="font-display" fontWeight={i === 0 ? 650 : 500} style={{ fill: i === 0 ? 'var(--planet-asc)' : 'var(--chart-sign)' }}
          >
            {houses[i].sign + 1}
          </text>
        ))}
        {houses.map((h, i) => <HouseLabels key={h.house} house={h} layout={layouts[i]} />)}
      </svg>
      {caption && (
        <figcaption className="mt-3 text-center">
          <span className="block font-display text-lg leading-tight text-(--text)">{caption.title}</span>
          {caption.subtitle && <span className="mt-0.5 block whitespace-pre-line text-balance text-sm text-(--text-muted)">{caption.subtitle}</span>}
          <span className="mt-1 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-(--accent)">{vargaLabel(varga)}</span>
        </figcaption>
      )}
      <ChartTable houses={houses} varga={varga} />
    </figure>
  )
}
