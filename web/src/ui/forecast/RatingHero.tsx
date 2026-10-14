// The headline card of a forecast: the rating word in its colour over a soft glow, a score
// dial, the headline, what the rating is made of (the weight of a day's reasons, or how many
// days or months rate which way) and a one-line "why" built from the strongest reasons.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import type { Forecast, Rating } from '@/engine/types'
import { rich, useT } from '@/i18n'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/components/Badge'
import { ratingBalance, strongestReasons, type BalanceSlice } from './balance'
import { EFFECT_META, RATING_ICON, RATING_TONE, RATING_WORD, scorePercent, TONE_VARS } from './meta'

export function RatingHero({ forecast, label, className }: { forecast: Forecast; label: string; className?: string }) {
  useT()
  const id = useId()
  const tone = TONE_VARS[RATING_TONE[forecast.rating]]
  const Icon = RATING_ICON[forecast.rating]
  return (
    <section aria-labelledby={id} className={cn('glass relative isolate flex flex-col overflow-hidden rounded-[var(--radius-card)] p-5 sm:p-7', className)}>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-28 -z-10 size-80 rounded-full opacity-25 blur-3xl transition-colors duration-700" style={{ background: tone.solid }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-36 -right-20 -z-10 size-80 rounded-full bg-[var(--color-violet-glow)] opacity-[0.12] blur-3xl" />
      {/* Dial and rating word scale with the card (container units), so "Challenging" fits a 320 px phone. */}
      <div className="@container flex items-center gap-4 sm:gap-6">
        <ScoreDial score={forecast.score} rating={forecast.rating} className="size-[clamp(4.5rem,30cqi,6rem)] shrink-0 sm:size-32" />
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{label}</p>
          <h2 id={id} className="mt-1 flex items-center gap-2 font-display text-[length:clamp(1.375rem,9cqi,2rem)] font-semibold leading-none tracking-tight sm:text-5xl" style={{ color: tone.fg }}>
            <Icon aria-hidden className="size-[0.72em] shrink-0" strokeWidth={2.2} />
            {RATING_WORD[forecast.rating]}
          </h2>
          <p className="mt-3 hidden text-pretty text-lg leading-snug text-[var(--text)] sm:block">{forecast.headline}</p>
        </div>
      </div>
      <p className="mt-4 text-pretty text-[1.05rem] leading-snug text-[var(--text)] sm:hidden">{forecast.headline}</p>
      {/* Keeps the summary at the bottom when the card is stretched beside a taller one. */}
      <div aria-hidden className="flex-1" />
      <WhySummary forecast={forecast} />
    </section>
  )
}

const sliceMeta = (slice: BalanceSlice) =>
  slice.kind === 'effect' ? EFFECT_META[slice.effect] : { tone: RATING_TONE[slice.rating], icon: RATING_ICON[slice.rating] }

function WhySummary({ forecast }: { forecast: Forecast }) {
  const { t } = useT()
  const balance = ratingBalance(forecast)
  const { lift, drag } = strongestReasons(forecast.reasons)
  if (!balance.slices.length && !lift && !drag) return null
  return (
    <div className="mt-5 border-t border-[var(--divider)] pt-4">
      {balance.slices.length > 0 && (
        <>
          <div aria-hidden className="mb-3 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
            {balance.slices.map((slice) => (
              <span key={slice.label} className="h-full rounded-full" style={{ flexGrow: slice.share, background: TONE_VARS[sliceMeta(slice).tone].solid }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-1.5" aria-label={balance.title}>
            {balance.slices.map((slice) => {
              const meta = sliceMeta(slice)
              const Icon = meta.icon
              return (
                <li key={slice.label}>
                  <Badge tone={meta.tone} size="md"><Icon aria-hidden />{slice.label}</Badge>
                </li>
              )
            })}
          </ul>
        </>
      )}
      {(lift || drag) && (
        <p className="mt-3 text-pretty text-sm leading-relaxed text-[var(--text-muted)]">
          {lift && rich(t('why.lift'), { title: <strong className="font-semibold text-[var(--text)]">{lift.title}</strong> })}
          {lift && drag && '; '}
          {drag && rich(t(lift ? 'why.dragAfter' : 'why.drag'), { title: <strong className="font-semibold text-[var(--text)]">{drag.title}</strong> })}
          {t('why.end')}
        </p>
      )}
    </div>
  )
}

/** Angle in radians, clockwise from twelve o'clock, of a fraction of the 270° dial. */
const angle = (f: number) => (-135 + 270 * f) * (Math.PI / 180)
const point = (a: number, r = 50) => [60 + r * Math.sin(a), 60 - r * Math.cos(a)] as const
const ARC = (() => {
  const [x0, y0] = point(angle(0))
  const [x1, y1] = point(angle(1))
  return `M ${x0} ${y0} A 50 50 0 1 1 ${x1} ${y1}`
})()

function ScoreDial({ score, rating, className }: { score: number; rating: Rating; className?: string }) {
  const { t } = useT()
  const gradient = useId()
  const reduce = useReducedMotion()
  const pct = scorePercent(score)
  const f = pct / 100
  const tone = TONE_VARS[RATING_TONE[rating]]
  const [kx, ky] = point(angle(f))
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={t('score.aria', { pct })}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-bad)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--color-mixed)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-good)' }} />
        </linearGradient>
      </defs>
      <path d={ARC} fill="none" stroke="var(--surface-3)" strokeWidth="9" strokeLinecap="round" />
      <path d={ARC} fill="none" stroke={`url(#${gradient})`} strokeOpacity="0.28" strokeWidth="9" strokeLinecap="round" />
      <motion.path
        key={pct}
        d={ARC} fill="none" stroke={tone.solid} strokeWidth="9" strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: Math.max(f, 0.001) }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.circle
        key={`knob-${pct}`}
        cx={kx} cy={ky} r="7.5" fill="var(--bg)" stroke={tone.solid} strokeWidth="3.5"
        initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.7, duration: 0.25 }}
      />
      <text x="60" y="62" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text)] font-display text-[30px] font-semibold tabular-nums">{pct}</text>
      <text x="60" y="86" textAnchor="middle" className="fill-[var(--text-muted)] text-[10px] font-medium uppercase tracking-[0.14em]">{t('score.word')}</text>
    </svg>
  )
}
