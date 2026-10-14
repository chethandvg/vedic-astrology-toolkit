// The English interpretation pack: every sentence and phrase of the forecasts, matching and natal
// sections in one object, and the shape each language's pack (src/i18n/content) follows. The
// engine and the UI read the active pack through content/active.ts. Yoga texts stay outside the
// pack (content/yogas.ts, English for every language), so pages without yogas never load them.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { DISCLAIMER } from '@/engine/types'
import { EN_NAMES } from '@/i18n/names/en'
import { DASHA_THEMES, dashaChangeText, dashaCombination, dashaTransitText } from './dasha'
import { ENGINE_TEXT } from './engine'
import { capitalize, joinList, ordinal } from './format'
import { binduNote, GOCHARA_TEXT, STATION_TEXT, vedhaNote, vipareetaNote } from './gochara'
import { CAUTION_PHRASE, chandrashtamaCaution, chandrashtamaHeadline, dayHeadline, periodHeadline, SUPPORT_PHRASE, yearHeadline } from './headlines'
import {
  BAND_META, DOSHA_EXCEPTION_TEXT, DOSHA_TEXT, KOOTA_TEXT, kootaOutcome, MANGLIK_CANCELLATION_TEXT, MANGLIK_OUTCOME_TEXT, MANGLIK_TEXT, MATCH_BASIS,
  MATCH_DISCLAIMER, MATCH_METHOD, PORUTHAM_SUMMARY, PORUTHAM_TEXT, poruthamOutcome,
} from './matching'
import { CHANDRA_BALA_TEXT, CHANDRASHTAMA_TEXT, MOON_CHANGE_TEXT, TARA_TEXT } from './moon'
import { MUNTHA_TEXT } from './muntha'
import {
  FUNCTIONAL_INTRO, FUNCTIONAL_ROLE_LABEL, KEY_SAHAMS, MUDDA_TEXT, STRENGTH_INTRO, VARSHAPHAL_INTRO, VIMSOPAKA_INTRO, YEAR_LORD_REASON_TEXT,
  YEAR_LORD_TIED_TEXT, YOGA_GROUP_TITLE, YOGA_INTRO, YOGA_PENDING_NOTE,
} from './natal'
import { PANCHANGA_TEXT } from './panchanga'
import { PERIOD_TEXT } from './period'
import { HOUSE_THEMES, PLANET_THEMES } from './planets'
import { dashaChainText, dashaChangePromiseText, dashaPromiseTitle, functionalNote, HOUSE_AREAS, lordBrief, lordOutlook } from './promise'
import { NO_SADE_SATI_TEXT, SATURN_PHASE_TEXT, SATURN_PHASE_TITLE } from './saturn'
import { SOURCES } from './sources'

const EN = {
  lang: 'en',
  names: EN_NAMES,
  /** Phrases the forecast engine builds titles and dates from. */
  E: ENGINE_TEXT,
  ordinal, joinList, capitalize,
  DISCLAIMER,
  SOURCES,
  // Transits, the Moon and the day
  PLANET_THEMES, HOUSE_THEMES, GOCHARA_TEXT, vedhaNote, vipareetaNote, binduNote, STATION_TEXT,
  TARA_TEXT, CHANDRA_BALA_TEXT, CHANDRASHTAMA_TEXT, MOON_CHANGE_TEXT, PANCHANGA_TEXT,
  // Dashas and the natal promise
  DASHA_THEMES, dashaCombination, dashaTransitText, dashaChangeText,
  HOUSE_AREAS, lordOutlook, lordBrief, dashaPromiseTitle, dashaChainText, dashaChangePromiseText, functionalNote,
  // Saturn, Muntha and the period summaries
  SATURN_PHASE_TITLE, SATURN_PHASE_TEXT, NO_SADE_SATI_TEXT, MUNTHA_TEXT, PERIOD_TEXT,
  // Headlines
  SUPPORT_PHRASE, CAUTION_PHRASE, chandrashtamaCaution, dayHeadline, chandrashtamaHeadline, periodHeadline, yearHeadline,
  // Matching
  KOOTA_TEXT, kootaOutcome, PORUTHAM_TEXT, poruthamOutcome, BAND_META, DOSHA_EXCEPTION_TEXT, DOSHA_TEXT, MANGLIK_CANCELLATION_TEXT, MANGLIK_TEXT,
  MANGLIK_OUTCOME_TEXT, PORUTHAM_SUMMARY, MATCH_DISCLAIMER, MATCH_METHOD, MATCH_BASIS,
  // Strength, yogas and the annual chart
  STRENGTH_INTRO, VIMSOPAKA_INTRO, FUNCTIONAL_INTRO, FUNCTIONAL_ROLE_LABEL, YOGA_INTRO, YOGA_PENDING_NOTE, YOGA_GROUP_TITLE, VARSHAPHAL_INTRO,
  YEAR_LORD_REASON_TEXT, YEAR_LORD_TIED_TEXT, KEY_SAHAMS, MUDDA_TEXT,
}

/** String literal types widened to string, so another language can fill the same shape. */
type Widen<T> = T extends string ? string
  : T extends (...args: infer A) => infer R ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[] ? readonly Widen<U>[]
      : T extends object ? { readonly [K in keyof T]: Widen<T[K]> }
        : T

export type ContentPack = Widen<typeof EN>

export const EN_CONTENT: ContentPack = EN
