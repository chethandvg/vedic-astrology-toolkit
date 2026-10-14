// Mild panchanga cautions for new beginnings. Original wording.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

/** " Today it runs until 12:50, then Dashami begins." */
const span = (when: string, next?: string) => ` Today it runs ${when}${next ? `, then ${next} begins` : ''}.`

export const PANCHANGA_TEXT = {
  /** `when` is its part of the daytime ("until 12:50"); `next` the tithi that follows within it. */
  rikta: (tithiName: string, when: string, next?: string): string =>
    `${tithiName} is a Rikta ("empty") tithi, traditionally avoided for starting important ventures; routine work and finishing tasks are fine.${span(when, next)}`,
  amavasya: (when: string, next?: string): string =>
    `New Moon (Amavasya) is traditionally a time for rest, reflection and remembrance rather than new beginnings.${span(when, next)}`,
  vishti: (when: string): string =>
    `Vishti (Bhadra) karana runs ${when}; tradition advises against starting new ventures during it.`,
} as const
