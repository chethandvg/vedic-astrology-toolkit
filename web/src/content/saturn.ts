// Saturn's named phases from the natal Moon. Original wording, deliberately calm: these are
// long periods that many people meet several times in life.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { SaturnPhase } from '@/engine/saturn'

export const SATURN_PHASE_TITLE: Readonly<Record<SaturnPhase, string>> = {
  sade_sati_rising: 'Sade Sati, rising phase',
  sade_sati_peak: 'Sade Sati, peak phase',
  sade_sati_setting: 'Sade Sati, setting phase',
  ashtama: 'Ashtama Shani',
  ardhashtama: 'Ardhashtama Shani',
}

export const SATURN_PHASE_TEXT: Readonly<Record<SaturnPhase, string>> = {
  sade_sati_rising: 'Saturn moves through the 12th sign from your Moon, the opening phase of Sade Sati. Expenses and sleep may need attention; simplify and save where you can.',
  sade_sati_peak: 'Saturn crosses your Moon sign, the central phase of Sade Sati. Responsibilities can feel heavier, but patient, disciplined effort builds lasting strength.',
  sade_sati_setting: 'Saturn moves through the 2nd sign from your Moon, the closing phase of Sade Sati. Family and finances ask for care while the pressure gradually eases.',
  ashtama: 'Saturn moves through the 8th sign from your Moon (Ashtama Shani). Traditionally a time for caution with health, money and risk; steady routines help a lot.',
  ardhashtama: 'Saturn moves through the 4th sign from your Moon (Ardhashtama or Kantaka Shani). Home, comfort and peace of mind may need extra care.',
}

export const NO_SADE_SATI_TEXT = 'Saturn is clear of your Sade Sati signs this year.'
