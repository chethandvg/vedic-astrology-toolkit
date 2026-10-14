// Daily Moon factors: Tara bala (the nine stars counted from the birth star), Chandra bala and
// Chandrashtama. Original wording; the good and difficult classes follow src/engine/moon.ts.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { TaraName } from '@/engine/moon'

export const TARA_TEXT: Readonly<Record<TaraName, string>> = {
  Janma: 'The Moon is back in your birth star; feelings run strong, so keep the day balanced and save major new starts for later.',
  Sampat: 'A star of wealth and progress; good for practical work and money matters.',
  Vipat: 'A star of hurdles; expect small hitches and keep important beginnings for another day.',
  Kshema: 'A star of well-being; steady, comfortable progress is likely.',
  Pratyak: 'A star of resistance; things may push back, so stay flexible and patient.',
  Saadhana: 'A star of achievement; effort aimed at a clear goal tends to succeed.',
  Naidhana: 'The most delicate star of the cycle; go gently, avoid risks and keep plans low-key.',
  Mitra: 'A friendly star; help and goodwill come more easily.',
  'Parama Mitra': 'A very friendly star, good for seeking support and cooperation.',
}

export const CHANDRA_BALA_TEXT = {
  good: 'The Moon is in a supportive sign from your birth Moon, so moods and daily efforts tend to flow.',
  bad: 'The Moon is in a less supportive sign from your birth Moon; keep the day simple and avoid forcing outcomes.',
} as const

export const CHANDRASHTAMA_TEXT =
  'The Moon is crossing the 8th sign from your birth Moon. Traditionally a time to go slow, postpone big decisions and take extra care with health, travel and words.'

/** "Moon enters Scorpio at 14:32" style notes are built by the engine; this explains why it matters. */
export const MOON_CHANGE_TEXT =
  'The day is judged by the sign and star the Moon holds for most of the daytime; after each change the new one sets the tone.'
