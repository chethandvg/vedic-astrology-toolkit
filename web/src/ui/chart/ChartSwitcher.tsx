// Chart with segmented controls for the drawing style (North/South Indian) and the
// division (D1, D9, D10 and a menu with every varga the engine computes).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId, useState } from 'react'
import { ToggleGroup } from 'radix-ui'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { clsx } from 'clsx'
import type { ChartProps } from './ChartParts'
import { NorthIndianChart } from './NorthIndianChart'
import { SouthIndianChart } from './SouthIndianChart'
import { useT } from '@/i18n'
import { vargaInfo, vargaList } from './vargas'

export type ChartStyle = 'north' | 'south'

export interface ChartSwitcherProps extends Omit<ChartProps, 'varga'> {
  /** Controlled style; omit to let the switcher keep its own state. */
  chartStyle?: ChartStyle
  defaultChartStyle?: ChartStyle
  onChartStyleChange?: (style: ChartStyle) => void
  varga?: number
  defaultVarga?: number
  onVargaChange?: (varga: number) => void
}

const QUICK: readonly number[] = [1, 9, 10]

const segment = clsx(
  'rounded-full px-3 py-1.5 text-sm font-medium text-(--text-muted) transition-colors outline-none',
  'hover:text-(--text) focus-visible:ring-2 focus-visible:ring-(--accent)',
  // The app's one selected look (as SegmentedControl and the nav): soft fill, accent ring and text.
  'data-[state=on]:bg-(--selected-bg) data-[state=on]:text-(--accent-text) data-[state=on]:shadow-sm data-[state=on]:ring-1 data-[state=on]:ring-(--accent)/45',
)
const group = 'inline-flex rounded-full border border-(--surface-border) bg-(--bg-elevated) p-1'

export function ChartSwitcher({
  chartStyle, defaultChartStyle = 'north', onChartStyleChange, varga, defaultVarga = 1, onVargaChange, className, ...chartProps
}: ChartSwitcherProps) {
  const { t } = useT()
  const [ownStyle, setOwnStyle] = useState<ChartStyle>(defaultChartStyle)
  const [ownVarga, setOwnVarga] = useState(defaultVarga)
  const style = chartStyle ?? ownStyle
  const division = varga ?? ownVarga
  const selectId = useId()
  const reduce = useReducedMotion()
  const setStyle = (s: string) => {
    if (s !== 'north' && s !== 'south') return // radix sends '' when the active item is pressed again
    setOwnStyle(s)
    onChartStyleChange?.(s)
  }
  const setVarga = (n: number) => {
    if (!Number.isFinite(n) || n <= 0) return
    setOwnVarga(n)
    onVargaChange?.(n)
  }
  const info = vargaInfo(division)
  const isQuick = QUICK.includes(division)
  const Chart = style === 'north' ? NorthIndianChart : SouthIndianChart
  return (
    <div className={className}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <ToggleGroup.Root type="single" value={style} onValueChange={setStyle} aria-label={t('chart.style')} className={group}>
          <ToggleGroup.Item value="north" className={segment}>{t('chart.north')}</ToggleGroup.Item>
          <ToggleGroup.Item value="south" className={segment}>{t('chart.south')}</ToggleGroup.Item>
        </ToggleGroup.Root>
        {/* min-w-0 lets this group shrink on narrow phones; the menu then gives up width first. */}
        <div className="flex min-w-0 items-center gap-2">
          <ToggleGroup.Root
            type="single" value={isQuick ? String(division) : ''} onValueChange={(v) => setVarga(Number(v))}
            aria-label={t('chart.divisional')} className={clsx(group, 'shrink-0')}
          >
            {QUICK.map((n) => (
              <ToggleGroup.Item key={n} value={String(n)} className={segment} title={vargaInfo(n).name}>D{n}</ToggleGroup.Item>
            ))}
          </ToggleGroup.Root>
          <label htmlFor={selectId} className="sr-only">{t('chart.allDivisional')}</label>
          <span className="relative w-[8.5rem] min-w-[5.5rem] shrink">
            <select
              id={selectId} value={isQuick ? '' : String(division)} onChange={(e) => setVarga(Number(e.target.value))}
              className={clsx(
                'w-full appearance-none truncate rounded-full border border-(--surface-border) bg-(--bg-elevated) py-2 pl-3.5 pr-8 text-sm font-medium outline-none',
                'focus-visible:ring-2 focus-visible:ring-(--accent)',
                isQuick ? 'text-(--text-muted)' : 'text-(--text)',
              )}
            >
              <option value="" disabled>{t('chart.more')}</option>
              {vargaList().map((v) => <option key={v.n} value={v.n}>D{v.n} {v.name}</option>)}
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-(--text-muted)" />
          </span>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${style}-${division}`}
          initial={reduce ? false : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={reduce ? undefined : { opacity: 0, scale: 0.985 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
        >
          <Chart {...chartProps} varga={division} />
        </motion.div>
      </AnimatePresence>
      <p className="mt-3 text-center text-sm text-(--text-muted)" aria-live="polite">
        <span className="font-medium text-(--text)">{info.name}</span> (D{info.n}) · {info.theme}
      </p>
    </div>
  )
}
