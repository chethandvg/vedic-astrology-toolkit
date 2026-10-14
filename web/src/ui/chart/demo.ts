// Demo data for developing the chart components without the engine worker: the book's
// Example 118 (P. V. R. Narasimha Rao). Only the raw ephemeris values are embedded here
// (copied from the Python golden fixture tests/fixtures/charts.json, which demo.test.ts
// checks them against); vargas, nakshatras, panchanga and dashas are derived with the
// pure engine functions, so the 1.9 MB fixture never reaches the app bundle.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { degreeInSign, nakshatra, panchanga, signOf, VARGAS, vargaSign } from '@/engine/core'
import { vimsottari } from '@/engine/dasha'
import { BODIES, PRESETS, type Body, type BodyPosition, type Chart, type DashaPeriod, type SignIndex } from '@/engine/types'

/** Example 118 as computed by vedic_toolkit: JD UT1, Lahiri ayanamsa, [longitude, speed] per body. */
const EXAMPLE_118 = {
  jd: 2439558.0069444445,
  ayanamsaDegrees: 23.39596519026188,
  positions: {
    Sun: [323.8340407269424, 1.0003945176385993],
    Moon: [294.1716905017833, 12.243354812951578],
    Mars: [189.7987744060806, 0.0028321645715130572],
    Mercury: [315.45353308885143, -0.9068961503781102],
    Jupiter: [91.29869420068326, -0.04173055184451607],
    Venus: [352.0713787841128, 1.2257962820192556],
    Saturn: [337.16532676786363, 0.12245974592065713],
    Rahu: [16.40249807076238, -0.05299200311952541],
    Ketu: [196.4024980707624, -0.05299200311952541],
    Asc: [130.78595798835113, 0],
  } satisfies Record<Body, [number, number]>,
  sunrise: { sunriseJd: 2439557.559350595, sunsetJd: 2439558.0502982675, nextSunriseJd: 2439558.5586447, weekday: 3, isDay: true },
}

/** Fixture positions carry no ecliptic latitude; the charts never use it, so it is 0 here. */
function toPosition(body: Body, longitude: number, speed: number): BodyPosition {
  return { body, longitude, latitude: 0, speed, retrograde: speed < 0, sign: signOf(longitude), degree: degreeInSign(longitude), nakshatra: nakshatra(longitude) }
}

/** All twenty vargas of every body, as the engine derives them from longitudes. */
function vargasOf(positions: Record<Body, BodyPosition>): Chart['vargas'] {
  return Object.fromEntries(VARGAS.map((n) => [n, Object.fromEntries(BODIES.map((b) => [b, vargaSign(positions[b].longitude, n)]))])) as Record<number, Record<Body, SignIndex>>
}

function buildChart(): Chart {
  const positions = Object.fromEntries(BODIES.map((b) => [b, toPosition(b, ...EXAMPLE_118.positions[b])])) as Record<Body, BodyPosition>
  return {
    input: {
      name: 'Book Example 118',
      date: '1967-03-08',
      time: '17:40',
      timeZone: '+05:30',
      latitude: 26.3,
      longitude: 73 + 4 / 60,
      place: '26°18′ N, 73°04′ E (near Jodhpur, India)',
    },
    // Solar-year dashas below, so the popular preset.
    settings: PRESETS.popular,
    jd: EXAMPLE_118.jd,
    utc: '1967-03-08T12:10:00.000Z',
    utcOffsetMinutes: 330,
    ayanamsaDegrees: EXAMPLE_118.ayanamsaDegrees,
    positions,
    vargas: vargasOf(positions),
    panchanga: panchanga(positions.Sun.longitude, positions.Moon.longitude),
    solarDay: EXAMPLE_118.sunrise,
    warnings: [],
  }
}

export const demoChart: Chart = buildChart()

/** Vimsottari mahadashas with antardashas and pratyantardashas (solar years, as most software). */
export const demoDashas: DashaPeriod[] = vimsottari(demoChart.positions.Moon.longitude, demoChart.jd, 'solar', 2)

/** Replaces some positions of the demo chart (a synthetic sky) and re-derives the vargas. */
function withPositions(name: string, crowd: readonly [Body, number, number][]): Chart {
  const positions = { ...demoChart.positions }
  for (const [b, lon, speed] of crowd) positions[b] = toPosition(b, lon, speed)
  return { ...demoChart, input: { ...demoChart.input, name }, positions, vargas: vargasOf(positions) }
}

/**
 * A synthetic stress case (not a real sky): seven bodies crowded into Aquarius, which
 * falls in the narrow 3rd-house triangle of the North Indian chart, to check that labels
 * stack and shrink without overlapping.
 */
export function crowdedDemoChart(): Chart {
  return withPositions('Crowded houses (synthetic)', [
    ['Sun', 301.2, 1], ['Mars', 309.75, 0.6], ['Mercury', 312.4, -0.4], ['Jupiter', 318.05, 0.1], ['Venus', 322.6, 1.2],
    ['Saturn', 327.3, -0.05], ['Ketu', 316.1, -0.05], ['Rahu', 136.1, -0.05], ['Moon', 138.6, 13], ['Asc', 250.4, 0],
  ])
}

/**
 * A second synthetic stress case: the ascendant and six planets in Leo, so the crowd sits
 * in the lagna diamond (North) and in the cell cut by the lagna diagonal (South).
 */
export function crowdedLagnaDemoChart(): Chart {
  return withPositions('Crowded lagna (synthetic)', [
    ['Asc', 124.2, 0], ['Sun', 121.4, 1], ['Mercury', 128.9, -0.3], ['Venus', 133.05, 1.2], ['Mars', 137.6, 0.6],
    ['Jupiter', 142.25, -0.1], ['Saturn', 147.9, 0.05], ['Moon', 20.5, 13], ['Rahu', 260.3, -0.05], ['Ketu', 80.3, -0.05],
  ])
}
