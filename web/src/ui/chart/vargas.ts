// Names and one-line themes of the 20 divisional charts (vargas) the engine computes.
// Names and themes follow Parasara's shodasa-varga list (BPHS ch. 6-7) and, for the
// non-shodasa D5, D6, D8 and D11, P. V. R. Narasimha Rao's book ch. 6 (the toolkit's
// reference). Wording is original and deliberately brief; both are in the current language
// (names from the language's names, themes from the messages varga.<n>).
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { VARGAS } from '@/engine/core'
import { names, t, type MessageKey } from '@/i18n'

export interface VargaInfo {
  /** Division number, e.g. 9 for the navamsa. */
  n: number
  /** Name, e.g. "Navamsa". */
  name: string
  /** Main life areas the chart is read for. */
  theme: string
}

export function vargaInfo(n: number): VargaInfo {
  const name = names().varga[n]
  if (!name) throw new Error(`Unknown varga D-${n}`)
  return { n, name, theme: t(`varga.${n}` as MessageKey) }
}

/** Every varga the engine computes, in order. */
export const vargaList = (): VargaInfo[] => VARGAS.map(vargaInfo)

/** "Navamsa · D9" */
export const vargaLabel = (n: number): string => `${vargaInfo(n).name} · D${n}`
