// Headline of a match: the 36-point dial with the band thresholds, the band word in its tone and
// a row of chips for the checks people look at next (Nadi, Bhakoot, the ten poruthams, Manglik).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { CircleAlert, CircleCheck, CircleMinus, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import { T } from '@/content/active'
import { rich, t, useT } from '@/i18n'
import type { DoshaCheck, MatchResult, ScoreBand } from '@/engine/matching'
import { cn } from '@/lib/cn'
import { Badge } from '@/ui/components/Badge'
import { TONE_VARS, type Tone } from '@/ui/forecast/meta'

export const BAND_TONE: Record<ScoreBand, Tone> = { excellent: 'good', good: 'good', average: 'mixed', low: 'bad' }
export const TONE_ICON: Record<Tone, LucideIcon> = { good: CircleCheck, mixed: CircleMinus, bad: CircleAlert }

/** "23.5" or "24". */
export const gunas = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

function doshaChip(name: string, d: DoshaCheck): { label: string; tone: Tone } {
  if (!d.present) return { label: t('chip.clear', { name }), tone: 'good' }
  return d.cancelled ? { label: t('chip.cancelled', { name }), tone: 'mixed' } : { label: t('match.dosha', { name }), tone: 'bad' }
}

export function MatchHero({ result, groomName, brideName, className }: { result: MatchResult; groomName: string; brideName: string; className?: string }) {
  const { t, n } = useT()
  const id = useId()
  const { ashtakoota: a, porutham, manglik } = result
  const tone = BAND_TONE[a.band]
  const Icon = TONE_ICON[tone]
  const manglikChip: { label: string; tone: Tone } =
    manglik.outcome === 'none' ? { label: t('chip.manglikClear'), tone: 'good' }
      : manglik.outcome === 'mutual' ? { label: t('chip.manglikBoth'), tone: 'mixed' }
        : { label: t('chip.manglikOnly', { name: manglik.outcome === 'groom' ? groomName : brideName }), tone: 'bad' }
  const chips = [
    doshaChip(n.koota.nadi, a.nadiDosha),
    doshaChip(n.koota.bhakoot, a.bhakootDosha),
    { label: t('chip.porutham', { n: gunas(porutham.agreed) }), tone: (porutham.essentialsAgree ? (porutham.agreed >= 6 ? 'good' : 'mixed') : 'bad') as Tone },
    manglikChip,
  ]
  return (
    <section aria-labelledby={id} className={cn('glass relative isolate overflow-hidden rounded-[var(--radius-card)] p-5 sm:p-7', className)}>
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-28 -z-10 size-80 rounded-full opacity-25 blur-3xl" style={{ background: TONE_VARS[tone].solid }} />
      <div aria-hidden className="pointer-events-none absolute -bottom-36 -right-20 -z-10 size-80 rounded-full bg-[var(--color-violet-glow)] opacity-[0.12] blur-3xl" />
      <div className="@container flex items-center gap-4 sm:gap-7">
        <GunaDial total={a.total} band={a.band} className="size-[clamp(6rem,34cqi,8rem)] shrink-0 sm:size-40" />
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">{t('match.heroEyebrow')}</p>
          <h2 id={id} className="mt-1 flex items-center gap-2 font-display text-[length:clamp(1.5rem,7cqi,2.25rem)] font-semibold leading-none tracking-tight" style={{ color: TONE_VARS[tone].fg }}>
            <Icon aria-hidden className="size-[0.72em] shrink-0" strokeWidth={2.2} />
            {T.BAND_META[a.band].label}
          </h2>
          <p className="mt-2 text-sm text-[var(--text-muted)] sm:text-base">
            {rich(t('match.heroScore', { groom: groomName, bride: brideName }), { score: <strong className="font-semibold text-[var(--text)]">{gunas(a.total)}</strong> })}
          </p>
          <p className="mt-3 hidden text-pretty leading-snug text-[var(--text)] sm:block">{T.BAND_META[a.band].text}</p>
        </div>
      </div>
      <p className="mt-4 text-pretty leading-snug text-[var(--text)] sm:hidden">{T.BAND_META[a.band].text}</p>
      <ul className="mt-5 flex flex-wrap gap-1.5 border-t border-[var(--divider)] pt-4" aria-label={t('match.keyChecks')}>
        {chips.map((c) => {
          const ChipIcon = TONE_ICON[c.tone]
          return (
            <li key={c.label}>
              <Badge tone={c.tone} size="md"><ChipIcon aria-hidden />{c.label}</Badge>
            </li>
          )
        })}
      </ul>
    </section>
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
/** Where the bands change: 18, 25 and 33 gunas. */
const THRESHOLDS = [18, 25, 33]

function GunaDial({ total, band, className }: { total: number; band: ScoreBand; className?: string }) {
  const { t } = useT()
  const gradient = useId()
  const reduce = useReducedMotion()
  const f = Math.max(0, Math.min(1, total / 36))
  const tone = TONE_VARS[BAND_TONE[band]]
  const [kx, ky] = point(angle(f))
  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={t('match.dialAria', { n: gunas(total) })}>
      <defs>
        <linearGradient id={gradient} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" style={{ stopColor: 'var(--color-bad)' }} />
          <stop offset="0.5" style={{ stopColor: 'var(--color-mixed)' }} />
          <stop offset="1" style={{ stopColor: 'var(--color-good)' }} />
        </linearGradient>
      </defs>
      <path d={ARC} fill="none" stroke="var(--surface-3)" strokeWidth="9" strokeLinecap="round" />
      <path d={ARC} fill="none" stroke={`url(#${gradient})`} strokeOpacity="0.28" strokeWidth="9" strokeLinecap="round" />
      {THRESHOLDS.map((t) => {
        const [x0, y0] = point(angle(t / 36), 41)
        const [x1, y1] = point(angle(t / 36), 45)
        return <line key={t} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--text-muted)" strokeOpacity="0.6" strokeWidth="1.4" strokeLinecap="round" />
      })}
      <motion.path
        key={total}
        d={ARC} fill="none" stroke={tone.solid} strokeWidth="9" strokeLinecap="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: Math.max(f, 0.001) }} transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
      />
      <motion.circle
        key={`knob-${total}`}
        cx={kx} cy={ky} r="7.5" fill="var(--bg)" stroke={tone.solid} strokeWidth="3.5"
        initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 0.7, duration: 0.25 }}
      />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--text)] font-display text-[30px] font-semibold tabular-nums">{gunas(total)}</text>
      <text x="60" y="84" textAnchor="middle" className="fill-[var(--text-muted)] text-[10px] font-medium uppercase tracking-[0.14em]">{t('match.of36')}</text>
    </svg>
  )
}
