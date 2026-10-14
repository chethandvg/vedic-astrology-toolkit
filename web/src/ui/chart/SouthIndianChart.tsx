// South Indian chart: signs are fixed in a 4 x 4 ring (Pisces top-left, clockwise), the
// lagna sign is marked with a diagonal across its corner, and the centre holds a caption.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId, useMemo } from 'react'
import { clsx } from 'clsx'
import { useT } from '@/i18n'
import { chartSummary, houseModels, layoutChart } from './chartModel'
import { CHART_UNITS, ChartTable, HouseLabels, LagnaGradient, svgId, useLabelScale, VIEWBOX, type ChartCaption, type ChartProps } from './ChartParts'
import { SOUTH_LAGNA_CUT, SOUTH_NAME_BAND, southCells, textWidthEm, wrapText } from './layout'
import { vargaInfo } from './vargas'

const S = CHART_UNITS
const C = S / 4
/** Outer ring of cells; the inner lines stop at the centre 2 x 2 block. */
const LINES = [
  `M0 ${C}H${S}M0 ${3 * C}H${S}M${C} 0V${S}M${3 * C} 0V${S}`,
  `M0 ${2 * C}H${C}M${3 * C} ${2 * C}H${S}M${2 * C} 0V${C}M${2 * C} ${3 * C}V${S}`,
].join('')
/** Sign names and the centre text grow at most this much on small screens (bands and centre are fixed). */
const TEXT_MAX_SCALE = 1.2

export function SouthIndianChart({ chart, varga = 1, caption, highlight, size, className }: ChartProps) {
  const highlightKey = highlight?.join() ?? ''
  // Keyed by content: callers often pass a fresh array literal on every render.
  const { lang, n } = useT()
  // The labels are in the current language, so a language change rebuilds them too.
  const houses = useMemo(() => houseModels(chart, varga, highlight), [chart, varga, highlightKey, lang])
  const lagna = houses[0].sign
  const cells = useMemo(() => southCells(S, lagna), [lagna])
  const [figure, scale] = useLabelScale()
  const layouts = useMemo(() => layoutChart(houses.map((h) => cells[h.sign].region), houses, scale), [houses, cells, scale])
  const lagnaCell = cells[lagna]
  const cut = SOUTH_LAGNA_CUT * C
  const gradient = svgId(useId())
  const textScale = Math.min(scale, TEXT_MAX_SCALE)
  const nameSize = 8 * textScale
  return (
    <figure ref={figure} className={clsx('relative m-0', className)} style={size ? { width: size, maxWidth: '100%' } : undefined}>
      <svg viewBox={VIEWBOX} role="img" aria-label={chartSummary(houses, varga, 'south')} className="block h-auto w-full select-none font-sans">
        <defs><LagnaGradient id={gradient} x2={1} y2={1} /></defs>
        <rect width={S} height={S} rx={2} fill="var(--chart-fill)" />
        <rect x={lagnaCell.x} y={lagnaCell.y} width={C} height={C} fill={`url(#${gradient})`} />
        <path d={LINES} fill="none" stroke="var(--chart-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <rect width={S} height={S} rx={2} fill="none" stroke="var(--chart-frame)" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        <path
          d={`M${lagnaCell.x} ${lagnaCell.y + cut}L${lagnaCell.x + cut} ${lagnaCell.y}`} stroke="var(--planet-asc)" strokeWidth={1.5}
          vectorEffect="non-scaling-stroke" strokeLinecap="round"
        />
        {cells.map((cell) => (
          <text
            key={cell.sign} x={cell.x + C - 6} y={cell.y + C - (SOUTH_NAME_BAND * C) / 2 + nameSize * 0.33} textAnchor="end" fontSize={nameSize}
            letterSpacing={lang === 'en' ? 0.9 : 0} fontWeight={cell.sign === lagna ? 650 : 500}
            style={{ fill: cell.sign === lagna ? 'var(--planet-asc)' : 'var(--chart-sign)' }}
          >
            {n.sign[cell.sign].toUpperCase()}
          </text>
        ))}
        {houses.map((h, i) => <HouseLabels key={h.house} house={h} layout={layouts[i]} />)}
        <CentreCaption varga={varga} caption={caption} scale={textScale} />
      </svg>
      {/* The drawn caption is inside role="img", which hides it from assistive tech. */}
      {caption && (
        <figcaption className="sr-only">
          {[caption.title, caption.subtitle?.replace(/\n/g, ', ')].filter(Boolean).join('. ')}
        </figcaption>
      )}
      <ChartTable houses={houses} varga={varga} />
    </figure>
  )
}

/** Fraunces runs narrower than the Inter metrics used for estimates. */
const DISPLAY_WIDTH = 0.9
/** Text column of the centre block; only its corners could reach the ornament ring. */
const TEXT_WIDTH = 2 * C - 28

/**
 * The largest title size that fits on one line, else the largest that fits on two lines;
 * only a name too long even for that is shortened with an ellipsis.
 */
function titleLines(title: string, scale: number): { lines: string[]; size: number } {
  for (const size of [18, 16.5, 15].map((f) => f * scale)) {
    if (textWidthEm(title) * size * DISPLAY_WIDTH <= TEXT_WIDTH) return { lines: [title], size }
  }
  const sizes = [16.5, 15, 13.5].map((f) => f * scale)
  const size = sizes.find((f) => wrapText(title, TEXT_WIDTH, f * DISPLAY_WIDTH, 3).length <= 2) ?? sizes[sizes.length - 1]
  return { lines: wrapText(title, TEXT_WIDTH, size * DISPLAY_WIDTH, 2), size }
}

/** Varga name, title and subtitle stacked in the free centre, wrapped by estimated width. */
function CentreCaption({ varga, caption, scale }: { varga: number; caption?: ChartCaption; scale: number }) {
  const info = vargaInfo(varga)
  type Line = { text: string; size: number; gap: number; className: string; fill: string; weight?: number; spacing?: number }
  const lines: Line[] = []
  const small = 10 * scale
  const overline = { size: 8.5 * scale, gap: 0, className: 'font-sans', fill: 'var(--planet-asc)', weight: 600, spacing: 1.6 }
  const muted = (text: string, i: number): Line => ({ text, size: small, gap: i ? 3 : 8, className: 'font-sans', fill: 'var(--text-muted)' })
  if (caption) {
    lines.push({ ...overline, text: `${info.name} · D${varga}`.toUpperCase() })
    const title = titleLines(caption.title, scale)
    title.lines.forEach((text, i) => lines.push({ text, size: title.size, gap: i ? title.size * 0.2 : 8, className: 'font-display', fill: 'var(--text)', weight: 500 }))
    if (caption.subtitle) wrapText(caption.subtitle, TEXT_WIDTH, small, 4).forEach((text, i) => lines.push(muted(text, i)))
  } else {
    lines.push({ ...overline, text: `D${varga}` })
    lines.push({ text: info.name, size: 22 * scale, gap: 6, className: 'font-display', fill: 'var(--text)', weight: 500 })
    wrapText(info.theme, TEXT_WIDTH, small, 3).forEach((text, i) => lines.push(muted(text, i)))
  }
  const height = lines.reduce((h, l) => h + l.gap + l.size, 0)
  let y = S / 2 - height / 2
  return (
    <g>
      <circle cx={S / 2} cy={S / 2} r={C * 0.97} fill="none" stroke="var(--chart-line)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray="1 5" strokeLinecap="round" />
      {lines.map((l, i) => {
        y += l.gap + l.size
        return (
          <text
            key={i} x={S / 2} y={y - l.size * 0.2} textAnchor="middle" fontSize={l.size} fontWeight={l.weight}
            letterSpacing={l.spacing} className={l.className} style={{ fill: l.fill }}
          >
            {l.text}
          </text>
        )
      })}
    </g>
  )
}
