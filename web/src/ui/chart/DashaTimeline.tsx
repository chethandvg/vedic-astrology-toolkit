// Vimsottari timeline: a proportional mahadasha bar with a "Now" marker, then an
// expandable list down to antardashas and pratyantardashas with the running chain marked.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { useId, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { names, rich, t, useT } from '@/i18n'
import { fullDate } from '@/i18n/format'
import type { DashaPeriod } from '@/engine/types'
import { activeChain, localSpan, localSpokenSpan, yearTicks } from './dasha'
import { bodyColor } from './planets'
import './chart.css'

export interface DashaTimelineProps {
  periods: DashaPeriod[]
  /** The instant treated as "now" (JD UT1). */
  now: number
  /** IANA zone or offset in which dates are shown. */
  timeZone: string
  className?: string
}

const keyOf = (p: DashaPeriod) => `${p.level}:${p.startJd}`
const tint = (p: DashaPeriod, pct: number) => `color-mix(in oklab, ${bodyColor(p.lord)} ${pct}%, transparent)`
const accentTint = (pct: number) => `color-mix(in oklab, var(--accent) ${pct}%, transparent)`

export function DashaTimeline({ periods, now, timeZone, className }: DashaTimelineProps) {
  const { n } = useT()
  const chain = useMemo(() => activeChain(periods, now), [periods, now])
  // Only the user's toggles are stored; the running mahadasha is open by default, so the
  // default follows new data (a profile or year-model change) instead of a stale first render.
  const [toggled, setToggled] = useState<ReadonlySet<string>>(() => new Set())
  const runningKey = chain.length ? keyOf(chain[0]) : null
  const isOpen = (p: DashaPeriod) => (keyOf(p) === runningKey) !== toggled.has(keyOf(p))
  const toggle = (p: DashaPeriod) => setToggled((s) => {
    const next = new Set(s)
    if (!next.delete(keyOf(p))) next.add(keyOf(p))
    return next
  })
  if (!periods.length) return null
  const date = (jd: number) => fullDate(jd, timeZone)
  return (
    <section className={clsx('@container', className)} aria-label={t('dashaTimeline.aria')}>
      {chain.length > 0 && (
        // One row per level in narrow containers (three tiles would truncate the lords), tiles from 36rem.
        <dl className="mb-6 grid gap-1.5 @xl:grid-cols-3 @xl:gap-2">
          {chain.map((p) => (
            <div key={keyOf(p)} className="flex min-w-0 items-baseline gap-2.5 rounded-xl px-3 py-2 @xl:block @xl:py-2.5" style={{ background: tint(p, 12) }}>
              <dt className="w-[4.75rem] shrink-0 truncate text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-(--text-muted) @md:w-[7.5rem] @xl:w-auto">
                <span className="@md:hidden" aria-hidden>{n.dashaLevelShort[p.level]}</span>
                <span className="@max-md:sr-only">{n.dashaLevel[p.level]}</span>
              </dt>
              <dd className="m-0 min-w-0 flex-1 truncate text-sm font-semibold @xl:mt-0.5 @xl:text-base" style={{ color: bodyColor(p.lord) }}>{n.body[p.lord]}</dd>
              <dd className="m-0 shrink-0 text-[0.7rem] tabular-nums text-(--text-muted)">
                {rich(t('common.until'), { x: <>{date(p.endJd)}</> })}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <Overview periods={periods} now={now} chain={chain} />
      <ol className="mt-5 space-y-1">
        {periods.map((p) => (
          <PeriodRow key={keyOf(p)} period={p} now={now} chain={chain} isOpen={isOpen} onToggle={toggle} date={date} />
        ))}
      </ol>
    </section>
  )
}

/**
 * Label visibility by a segment's share of the bar, using container queries so it
 * follows the bar's own width: wide shares always, narrow ones only on wide bars.
 */
function labelVisibility(share: number): string | undefined {
  if (share >= 0.075) return undefined
  return share >= 0.045 ? 'hidden @md:inline' : 'hidden @2xl:inline'
}

/** Proportional bar of sibling periods; the running one is filled and ringed. */
function SegmentBar({ periods, now, chain, tall }: { periods: readonly DashaPeriod[]; now: number; chain: readonly DashaPeriod[]; tall?: boolean }) {
  const start = periods[0].startJd
  const end = periods[periods.length - 1].endJd
  const nowPct = ((now - start) / (end - start)) * 100
  return (
    <div className="@container relative" aria-hidden>
      <div className={clsx('flex gap-px overflow-hidden rounded-lg', tall ? 'h-11' : 'h-7')}>
        {periods.map((p) => {
          const active = chain.includes(p)
          const share = (p.endJd - p.startJd) / (end - start)
          return (
            <div
              key={keyOf(p)} style={{ flexGrow: share, flexBasis: 0, background: tint(p, active ? 55 : 22) }}
              className={clsx('flex min-w-0 items-center justify-center overflow-hidden text-[0.7rem] font-semibold', active && 'ring-2 ring-inset ring-(--accent)')}
              title={names().body[p.lord]}
            >
              <span className={clsx('overflow-hidden whitespace-nowrap', active ? 'text-(--text)' : 'text-(--text-muted)', labelVisibility(share))}>
                <span className={tall ? '@xl:hidden' : undefined}>{names().bodyShort[p.lord]}</span>
                {tall && <span className="hidden @xl:inline">{names().body[p.lord]}</span>}
              </span>
            </div>
          )
        })}
      </div>
      {nowPct > 0 && nowPct < 100 && (
        <div className="pointer-events-none absolute inset-y-[-5px] w-0" style={{ left: `${nowPct}%` }}>
          <div className="absolute inset-y-0 -left-px w-0.5 rounded-full bg-(--text) shadow-[0_0_0_2px_var(--bg)]" />
        </div>
      )}
    </div>
  )
}

function Overview({ periods, now, chain }: { periods: readonly DashaPeriod[]; now: number; chain: readonly DashaPeriod[] }) {
  const start = periods[0].startJd
  const end = periods[periods.length - 1].endJd
  const pct = (jd: number) => ((jd - start) / (end - start)) * 100
  const nowPct = pct(now)
  return (
    <div className="pt-6">
      <div className="relative">
        {nowPct > 0 && nowPct < 100 && (
          <span
            className="absolute -top-6 -translate-x-1/2 rounded-full bg-(--text) px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wider text-(--bg)"
            style={{ left: `clamp(1.25rem, ${nowPct}%, calc(100% - 1.25rem))` }} aria-hidden
          >
            Now
          </span>
        )}
        <SegmentBar periods={periods} now={now} chain={chain} tall />
      </div>
      <div className="relative mt-1.5 h-4 text-[0.65rem] tabular-nums text-(--text-muted)" aria-hidden>
        {yearTicks(start, end, (end - start) / 365.25 > 60 ? 20 : 10).map((t) => (
          <span key={t.year} className="absolute -translate-x-1/2" style={{ left: `${pct(t.jd)}%` }}>{t.year}</span>
        ))}
      </div>
    </div>
  )
}

interface RowProps {
  period: DashaPeriod
  now: number
  chain: readonly DashaPeriod[]
  isOpen: (p: DashaPeriod) => boolean
  onToggle: (p: DashaPeriod) => void
  date: (jd: number) => string
}

function PeriodRow({ period: p, now, chain, isOpen, onToggle, date }: RowProps) {
  const { n } = useT()
  const id = useId()
  const reduce = useReducedMotion()
  const active = chain.includes(p)
  const past = p.endJd <= now
  const children = p.children ?? []
  const expanded = children.length > 0 && isOpen(p)
  const progress = active ? Math.min(1, Math.max(0, (now - p.startJd) / (p.endJd - p.startJd))) : 0
  const days = p.endJd - p.startJd
  const body = (
    <>
      <span
        className={clsx('grid shrink-0 place-items-center rounded-full font-semibold', p.level === 0 ? 'size-8 text-xs' : 'size-6 text-[0.65rem]')}
        style={{ background: tint(p, active ? 30 : 16), color: bodyColor(p.lord) }} aria-hidden
      >
        {n.bodyShort[p.lord]}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span className={clsx('font-medium', p.level === 0 ? 'text-base' : 'text-sm', past && !active ? 'text-(--text-muted)' : 'text-(--text)')}>{n.body[p.lord]}</span>
          <span className="sr-only">{n.dashaLevel[p.level]},</span>
          {active && <span className="rounded-full bg-(--accent) px-1.5 py-px text-[0.6rem] font-bold uppercase tracking-wider text-(--accent-contrast)">{t('common.now')}</span>}
          <span className="ml-auto shrink-0 text-xs tabular-nums text-(--text-muted)">
            <span aria-hidden>{localSpan(days)}</span>
            <span className="sr-only">, {localSpokenSpan(days)}, </span>
          </span>
        </span>
        <span className="block text-xs tabular-nums text-(--text-muted)">
          {/* Each date stays whole, so a narrow row breaks after the dash, never inside a date. */}
          <span className="whitespace-nowrap">{date(p.startJd)} <span aria-hidden>–</span><span className="sr-only">{t('dashaTimeline.to')}</span></span>{' '}
          <span className="whitespace-nowrap">{date(p.endJd)}</span>
        </span>
        {active && (
          <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-(--surface-border)" aria-hidden>
            <span className="block h-full rounded-full" style={{ width: `${progress * 100}%`, background: bodyColor(p.lord) }} />
          </span>
        )}
      </span>
    </>
  )
  const rowClass = clsx('flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors', !active && 'hover:bg-(--surface-border)')
  const rowStyle = active ? { background: accentTint(7), boxShadow: `inset 0 0 0 1px ${accentTint(32)}` } : undefined
  return (
    <li aria-current={active ? 'true' : undefined}>
      {children.length ? (
        <button type="button" className={rowClass} style={rowStyle} aria-expanded={expanded} aria-controls={id} onClick={() => onToggle(p)}>
          <ChevronRight aria-hidden className={clsx('size-4 shrink-0 text-(--text-muted) transition-transform', expanded && 'rotate-90')} />
          {body}
        </button>
      ) : (
        <div className={clsx(rowClass, 'pl-9')} style={rowStyle}>{body}</div>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={id} key="children" className="overflow-hidden"
            initial={reduce ? false : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          >
            <div className="ml-4 border-l border-(--surface-border) pb-2 pl-3 pt-2 sm:ml-5 sm:pl-4">
              <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-(--text-muted)">
                {t('dashaTimeline.children', { level: n.dashaLevel[p.level + 1], lord: n.body[p.lord] })}
              </p>
              <SegmentBar periods={children} now={now} chain={chain} />
              <ol className="mt-2 space-y-0.5">
                {children.map((c) => <PeriodRow key={keyOf(c)} period={c} now={now} chain={chain} isOpen={isOpen} onToggle={onToggle} date={date} />)}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}
