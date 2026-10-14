// Sign-level dignity of a graha: exalted, own sign or debilitated.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { SIGN_LORDS } from '@/engine/core'
import type { Body, Planet, SignIndex } from '@/engine/types'
import { t } from '@/i18n'

export type Dignity = 'exalted' | 'own' | 'debilitated'

type Graha = Exclude<Planet, 'Rahu' | 'Ketu'>

/**
 * Exaltation signs (BPHS ch. 3; Phaladeepika ch. 1), identical to core.EXALT in the
 * Python toolkit: Sun Aries, Moon Taurus, Mars Capricorn, Mercury Virgo, Jupiter Cancer,
 * Venus Pisces, Saturn Libra. Debilitation is always the opposite sign.
 */
export const EXALTATION_SIGN: Readonly<Record<Graha, SignIndex>> = {
  Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6,
}

/**
 * Whole-sign dignity for the badge in the planet table. Exaltation wins over own sign
 * (Mercury in Virgo), as the stronger state. Rahu and Ketu get none: their exaltation
 * signs differ between traditions (Taurus/Scorpio vs Gemini/Sagittarius) and they own
 * no sign in SIGN_LORDS. Degree-based refinements (deep exaltation, moolatrikona) are
 * intentionally left out of this simple badge.
 */
export function dignity(body: Body, sign: SignIndex): Dignity | null {
  if (body === 'Asc' || body === 'Rahu' || body === 'Ketu') return null
  const exalted = EXALTATION_SIGN[body]
  if (sign === exalted) return 'exalted'
  if (sign === (exalted + 6) % 12) return 'debilitated'
  if (SIGN_LORDS[sign] === body) return 'own'
  return null
}

/** In the current language (getters read it on use). */
export const DIGNITY_LABEL: Readonly<Record<Dignity, string>> = {
  get exalted() { return t('dignity.exalted') },
  get own() { return t('dignity.own') },
  get debilitated() { return t('dignity.debilitated') },
}
