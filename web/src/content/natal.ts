// Plain-language labels for the natal strength, yoga and annual-chart (Varshaphal) sections.
// Original wording; the classical terms are kept in brackets where users may meet them elsewhere.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { FunctionalRole } from '@/engine/functional'
import type { YearLordReason } from '@/engine/tajaka'

export const STRENGTH_INTRO =
  'Shadbala adds six classical kinds of strength (position, direction, time, motion, natural and aspect) in rupas. A planet at or above its minimum tends to deliver what it promises more fully.'

export const VIMSOPAKA_INTRO =
  'Vimsopaka scores each planet out of 20 by the signs it holds across the divisional charts; higher means it is comfortable in more of them.'

export const FUNCTIONAL_INTRO =
  'Each rising sign makes some planets helpful and others harder through the houses they rule. Dasha readings on this site lean on this table.'

export const FUNCTIONAL_ROLE_LABEL: Readonly<Record<FunctionalRole | 'yogakaraka', string>> = {
  yogakaraka: 'Yogakaraka',
  benefic: 'Helpful for your ascendant',
  neutral: 'Neutral',
  malefic: 'Harder for your ascendant',
  unclassified: 'Acts for its sign lord',
}

export const YOGA_INTRO =
  'Yogas are named planetary combinations from the classical texts. Each one listed here meets every condition of its rule in your birth chart; the dashas of the planets involved tend to bring it out.'

export const YOGA_PENDING_NOTE =
  'Some rules depend on a detail the classical text leaves open, so they are counted as undecided rather than guessed.'

export const YOGA_GROUP_TITLE = {
  supportive: 'Supportive combinations',
  challenging: 'Combinations that ask for care',
  mixed: 'Mixed combinations',
} as const

export const VARSHAPHAL_INTRO =
  'The Tajaka annual chart is cast for the moment the Sun returns to its place at your birth. It is read alongside the birth chart, never instead of it.'

export const YEAR_LORD_REASON_TEXT: Readonly<Record<YearLordReason, string>> = {
  benefic_aspect: 'It looks at the year’s ascendant in a friendly way and is the strongest of the candidates that do.',
  malefic_aspect_fallback: 'No candidate looks at the year’s ascendant in a friendly way, so the strongest one with a tense aspect leads the year.',
  very_strong_without_aspect: 'No candidate aspects the year’s ascendant, so the strongest candidate leads the year.',
  first_candidate_fallback: 'No candidate aspects the year’s ascendant or stands out by strength, so the first classical candidate is taken.',
}

export const YEAR_LORD_TIED_TEXT = 'Two or more candidates are equally strong, and the classical rule gives no way to choose between them.'

/** A few sahams (sensitive points) with what they are read for, in display order. */
export const KEY_SAHAMS: readonly { name: 'Punya' | 'Vidya' | 'Karyasiddhi' | 'Vivaha' | 'Artha' | 'Mitra'; label: string }[] = [
  { name: 'Punya', label: 'Fortune and merit' },
  { name: 'Karyasiddhi', label: 'Success in efforts' },
  { name: 'Artha', label: 'Money' },
  { name: 'Vidya', label: 'Learning' },
  { name: 'Vivaha', label: 'Marriage' },
  { name: 'Mitra', label: 'Friends' },
]

export const MUDDA_TEXT = 'Mudda dasha compresses the Vimsottari sequence into this one year, so each planet colours a few weeks of it.'
