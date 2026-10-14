// Vimsottari dasha themes and the templates that combine them. Original wording.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Effect, Planet } from '@/engine/types'
import { PLANET_THEMES } from './planets'

/** One sentence per dasha lord: the tone its period tends to bring. */
export const DASHA_THEMES: Readonly<Record<Planet, string>> = {
  Sun: 'A Sun period puts self-confidence, recognition and responsibility in focus.',
  Moon: 'A Moon period centres life on feelings, home, family and public dealings.',
  Mars: 'A Mars period brings energy, courage and drive, along with a taste for competition.',
  Mercury: 'A Mercury period favours learning, communication, trade and new skills.',
  Jupiter: 'A Jupiter period supports growth, wisdom, teachers, children and wise counsel.',
  Venus: 'A Venus period highlights relationships, comforts, the arts and enjoyment.',
  Saturn: 'A Saturn period rewards patience, discipline and steady work toward lasting results.',
  Rahu: 'A Rahu period stirs ambition and brings unconventional paths and sudden opportunities.',
  Ketu: 'A Ketu period turns attention inward, toward insight, simplicity and letting go.',
}

/** "Jupiter–Venus–Saturn": the broad chapter, its sub-chapter and the current phase. */
export function dashaCombination(md: Planet, ad: Planet, pd?: Planet): string {
  const sub = ad === md
    ? `the ${md} sub-period concentrates its own themes`
    : `the ${ad} sub-period colours it with ${PLANET_THEMES[ad].short}`
  const phase = !pd ? '' : pd === ad
    ? ` For now the ${pd} phase reinforces the same themes.`
    : ` For now the ${pd} phase adds a note of ${PLANET_THEMES[pd].short}.`
  return `The ${md} period brings ${PLANET_THEMES[md].short}, and ${sub}.${phase}`
}

/** The antardasha lord's own transit from the natal Moon. */
export function dashaTransitText(lord: Planet, effect: Effect): string {
  const theme = PLANET_THEMES[lord].short
  if (effect > 0) return `Your sub-period lord ${lord} is passing a supportive sign, so its themes (${theme}) find easier expression.`
  if (effect < 0) return `Your sub-period lord ${lord} is passing a sensitive sign, so matters of ${theme} may need more patience.`
  return `Your sub-period lord ${lord} gets mixed support from its current sign, so take its themes (${theme}) step by step.`
}

/** A dasha period starting within the forecast period. */
export const dashaChangeText = (chain: readonly Planet[]): string =>
  `A new dasha phase (${chain.join('–')}) begins. ${DASHA_THEMES[chain.at(-1)!]}`
