// Display metadata for the nine grahas and the ascendant, shared by the chart components.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import type { Body } from '@/engine/types'

/** Two-letter labels used inside the charts (the convention of most Indian chart software). */
export const BODY_ABBR: Readonly<Record<Body, string>> = {
  Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke', Asc: 'Asc',
}

export const BODY_NAME: Readonly<Record<Body, string>> = {
  Sun: 'Sun', Moon: 'Moon', Mars: 'Mars', Mercury: 'Mercury', Jupiter: 'Jupiter', Venus: 'Venus', Saturn: 'Saturn', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Ascendant',
}

export const BODY_SANSKRIT: Readonly<Record<Body, string>> = {
  Sun: 'Surya', Moon: 'Chandra', Mars: 'Mangala', Mercury: 'Budha', Jupiter: 'Guru', Venus: 'Shukra', Saturn: 'Shani', Rahu: 'Rahu', Ketu: 'Ketu', Asc: 'Lagna',
}

/**
 * Astronomical symbols; U+FE0E forces text (not emoji) presentation of ♂ and ♀.
 * The bundled Inter has no such glyphs, so they come from the system symbol font.
 */
export const BODY_GLYPH: Readonly<Record<Body, string>> = {
  Sun: '☉', Moon: '☽', Mars: '♂︎', Mercury: '☿', Jupiter: '♃', Venus: '♀︎', Saturn: '♄', Rahu: '☊', Ketu: '☋', Asc: 'As',
}

/** CSS colour (a custom property from chart.css) for a body's label. */
export const bodyColor = (body: Body): string => `var(--planet-${body.toLowerCase()})`

/** Font stack for the planet symbols, which Inter lacks. */
export const GLYPH_FONT = "'Segoe UI Symbol', 'Noto Sans Symbols 2', 'Noto Sans Symbols', 'Apple Symbols', 'DejaVu Sans', sans-serif"
