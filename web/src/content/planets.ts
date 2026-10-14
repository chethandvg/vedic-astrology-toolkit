// What each graha and each house counted from the Moon stands for, in plain words.
// Original wording; the significations themselves are the standard classical ones.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Planet } from '@/engine/types'
import type { ByHouse } from './format'

export interface PlanetTheme {
  /** A few words for inline use: "vitality and standing". */
  short: string
  /** One sentence describing the planet's domain. */
  theme: string
}

export const PLANET_THEMES: Readonly<Record<Planet, PlanetTheme>> = {
  Sun: { short: 'confidence, career and authority', theme: 'The Sun stands for vitality, self-confidence, recognition and our dealings with authority and father figures.' },
  Moon: { short: 'mood, home and comfort', theme: 'The Moon stands for feelings, the mind, home, mother and the everyday sense of comfort.' },
  Mars: { short: 'energy, courage and property', theme: 'Mars stands for energy, courage, drive, competition, siblings, land and property.' },
  Mercury: { short: 'learning, speech and trade', theme: 'Mercury stands for thinking, speech, learning, trade, paperwork and friendships.' },
  Jupiter: { short: 'wisdom, growth and good counsel', theme: 'Jupiter stands for wisdom, growth, teachers, children, wealth and good counsel.' },
  Venus: { short: 'love, comforts and the arts', theme: 'Venus stands for love, partnership, beauty, art, comforts, vehicles and pleasures.' },
  Saturn: { short: 'duty, effort and endurance', theme: 'Saturn stands for duty, discipline, patience, hard work and things built to last.' },
  Rahu: { short: 'ambition and the unconventional', theme: 'Rahu stands for ambition, novelty, foreign links, technology and sudden turns.' },
  Ketu: { short: 'detachment and insight', theme: 'Ketu stands for detachment, intuition, spiritual insight and letting go.' },
}

/** Life areas of the houses counted from the natal Moon sign (house 1 = the Moon's own sign). */
export const HOUSE_THEMES: ByHouse<string> = [
  'yourself, your body and your mood',
  'money, family, food and speech',
  'courage, siblings, short trips and messages',
  'home, mother, comfort and vehicles',
  'creativity, children, learning and romance',
  'work, health routines, debts and rivals',
  'partners, contracts and public dealings',
  'the unexpected, shared resources and inner change',
  'luck, teachers, faith and long journeys',
  'career, status and visible achievement',
  'gains, friends and fulfilled wishes',
  'expenses, rest, distant places and letting go',
]
