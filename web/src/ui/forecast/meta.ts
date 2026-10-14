// Display metadata shared by the forecast components: colours, icons and words for
// ratings, effects, event kinds, window qualities and horas.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import {
  ArrowRightLeft, CalendarDays, CircleAlert, CircleCheck, CircleMinus, Compass, Eclipse, Hourglass, Moon, MoonStar, Mountain, Orbit, Redo2,
  Sparkles, Star, Sun, TriangleAlert, Undo2, type LucideIcon,
} from 'lucide-react'
import type { Effect, EventKind, Planet, Rating, WindowQuality } from '@/engine/types'
import { t } from '@/i18n'

// Words are getters that read the current language when used; components call useT() so they
// re-render on a language change.

export type Tone = 'good' | 'mixed' | 'bad'

/** CSS variables of a tone (shell.css), each with a light-theme value meeting WCAG AA for text. */
export const TONE_VARS: Record<Tone, { fg: string; bg: string; border: string; solid: string }> = {
  good: { fg: 'var(--good-fg)', bg: 'var(--good-bg)', border: 'var(--good-border)', solid: 'var(--color-good)' },
  mixed: { fg: 'var(--mixed-fg)', bg: 'var(--mixed-bg)', border: 'var(--mixed-border)', solid: 'var(--color-mixed)' },
  bad: { fg: 'var(--bad-fg)', bg: 'var(--bad-bg)', border: 'var(--bad-border)', solid: 'var(--color-bad)' },
}

export const RATING_TONE: Record<Rating, Tone> = { favourable: 'good', mixed: 'mixed', challenging: 'bad' }
export const RATING_WORD: Readonly<Record<Rating, string>> = {
  get favourable() { return t('rating.favourable') },
  get mixed() { return t('rating.mixed') },
  get challenging() { return t('rating.challenging') },
}
export const RATING_ICON: Record<Rating, LucideIcon> = { favourable: CircleCheck, mixed: CircleMinus, challenging: CircleAlert }

export const EFFECT_META: Record<Effect, { label: string; tone: Tone; icon: LucideIcon }> = {
  1: { get label() { return t('effect.supportive') }, tone: 'good', icon: CircleCheck },
  0: { get label() { return t('effect.neutral') }, tone: 'mixed', icon: CircleMinus },
  [-1]: { get label() { return t('effect.challenging') }, tone: 'bad', icon: CircleAlert },
}

export const QUALITY_META: Record<WindowQuality, { label: string; tone: Tone }> = {
  good: { get label() { return t('quality.good') }, tone: 'good' },
  neutral: { get label() { return t('quality.neutral') }, tone: 'mixed' },
  avoid: { get label() { return t('quality.avoid') }, tone: 'bad' },
}

/** Score in [-1, 1] as a 0..100 figure for people. */
export const scorePercent = (score: number): number => Math.round((Math.max(-1, Math.min(1, score)) + 1) * 50)

export const EVENT_ICON: Record<EventKind, LucideIcon> = {
  ingress: ArrowRightLeft, retrograde: Undo2, direct: Redo2, moon_sign: Moon, moon_nakshatra: Sparkles, sankranti: Sun,
  dasha: Hourglass, sade_sati: Mountain, chandrashtama: TriangleAlert, eclipse: Eclipse, tithi: CalendarDays,
}

/** Icon for a reason's factor key ("tara_bala", "gochara_Jupiter", "careful_days", ...). */
export function factorIcon(factor: string): LucideIcon {
  if (factor.startsWith('tara')) return Sparkles
  if (factor.startsWith('chandrashtama') || factor.startsWith('careful')) return TriangleAlert
  if (factor.startsWith('chandra') || factor.startsWith('moon')) return MoonStar
  if (factor.startsWith('dasha')) return Hourglass
  if (factor.startsWith('sade_sati') || factor.startsWith('ashtama')) return Mountain
  if (factor.startsWith('best')) return Star
  if (factor.startsWith('muntha')) return Compass
  if (['tithi', 'vara', 'vishti', 'period'].some((k) => factor.startsWith(k))) return CalendarDays
  if (factor.startsWith('station') || factor.startsWith('retrograde')) return Undo2
  if (factor.startsWith('eclipse')) return Eclipse
  if (factor.startsWith('gochara_Sun')) return Sun
  return Orbit
}

/**
 * What each planetary hora traditionally suits, in our own words after the hora tables of
 * Shubh Panchang and Dekho Panchang (they agree on the broad uses; Mars and Saturn horas are
 * read as unsuitable for auspicious beginnings by both).
 */
export const HORA_USE: Readonly<Record<Exclude<Planet, 'Rahu' | 'Ketu'>, string>> = {
  get Sun() { return t('hora.Sun') },
  get Moon() { return t('hora.Moon') },
  get Mars() { return t('hora.Mars') },
  get Mercury() { return t('hora.Mercury') },
  get Jupiter() { return t('hora.Jupiter') },
  get Venus() { return t('hora.Venus') },
  get Saturn() { return t('hora.Saturn') },
}
