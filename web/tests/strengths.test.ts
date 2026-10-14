// Parity of src/engine/strengths.ts and functional.ts with the Python toolkit
// (analysis.chart: dignities, combustion, compound relationships, Shadbala,
// Vimsopaka, yoga_review.functional_nature) over every strengths.json entry.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import charts from './fixtures/charts.json'
import strengths from './fixtures/strengths.json'
import { castChart } from '@/engine/chart'
import { functionalNature, functionalRole } from '@/engine/functional'
import {
  angularDistance, compoundRelation, drishtiValue, GRAHAS, naturalNature, ramanTimeLords, strengthsFor, strongPlanets,
  vimsopaka, VIMSOPAKA_WEIGHTS, type NatalStrengths, type ShadbalaComplete,
} from '@/engine/strengths'
import { PLANETS, type BirthInput, type Chart, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

type Input = { datetime: string; timezone?: string; fold?: 0 | 1; latitude: number; longitude: number }
type PySb = {
  status?: string; reason?: string
  planets: Record<string, {
    sthana_components: Record<string, number>; saptavargaja_components: { varga: number; relation: string; virupas: number }[]
    sthana: number; dig: number; kala_components: Record<string, number>; kala: number; chesta: number; naisargika: number
    drik: number; drik_components: Record<string, number>; total_virupas: number; rupas: number; required_virupas: number; ratio_to_requirement: number
  }>
  planetary_wars: { winner: string; loser: string; transfer_virupas: number }[]
  time_lords: Record<string, string>
  motion_inputs: Record<string, { mean_longitude: number; seeghrochcha: number }>
  astronomical_inputs: { mc: number; apparent_solar_hour: number; period_fraction: number }
}
type PyDignity = {
  exalted_sign: boolean; debilitated_sign: boolean; own_sign: boolean; moolatrikona_sign: boolean; degree_in_sign: number
  degree_zone: string | null; moolatrikona_degree_zone?: boolean; distance_from_deep_exaltation?: number
}
type PyEntry = {
  id: string; shadbala: PySb; vimsopaka: Record<string, Record<string, number>>; dignities: Record<string, PyDignity>
  combustion: Record<string, { combust: boolean; applicable: boolean; separation_degrees?: number; limit_degrees?: number }>
  compound_relationships: Record<string, Record<string, string>>
  functional_nature: { benefics: string[]; neutrals: string[]; malefics: string[]; yogakarakas: string[]; unclassified: string[] } | null
}

const ENTRIES = (strengths as unknown as { charts: PyEntry[] }).charts
const INPUTS = new Map((charts as unknown as { charts: { id: string; input: Input }[] }).charts.map((c) => [c.id, c.input]))
const SETTINGS: Settings = { ayanamsa: 'lahiri', node: 'mean', yearModel: 'solar' }
/** Same astronomical inputs to ~1e-9 degree, so every virupa value agrees far inside this. */
const TOL = 1e-6

function toBirth(i: Input): BirthInput {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(.*)$/.exec(i.datetime)!
  return { date: m[1], time: m[2], timeZone: m[3] || i.timezone!, fold: i.fold, latitude: i.latitude, longitude: i.longitude }
}

const close = (a: number, b: number, what: string, tol = TOL) => expect(Math.abs(a - b), `${what}: ${a} vs ${b}`).toBeLessThan(tol)

describe('strengths parity with the Python toolkit', () => {
  const results = new Map<string, { chart: Chart; s: NatalStrengths }>()
  beforeAll(async () => {
    await loadSwe()
    for (const e of ENTRIES) {
      const chart = castChart(toBirth(INPUTS.get(e.id)!), SETTINGS)
      results.set(e.id, { chart, s: strengthsFor(chart) })
    }
  })

  it('covers every fixture entry', () => {
    expect(ENTRIES.length).toBe(49)
    expect(results.size).toBe(ENTRIES.length)
  })

  it('reproduces dignities, combustion and compound relationships', () => {
    for (const e of ENTRIES) {
      const { s } = results.get(e.id)!
      for (const p of PLANETS) {
        const py = e.dignities[p], ts = s.dignities[p], id = `${e.id} ${p}`
        expect([ts.exaltedSign, ts.debilitatedSign, ts.ownSign, ts.moolatrikonaSign, ts.degreeZone], id)
          .toEqual([py.exalted_sign, py.debilitated_sign, py.own_sign, py.moolatrikona_sign, py.degree_zone])
        close(ts.degreeInSign, py.degree_in_sign, id, 1e-8)
        expect(ts.moolatrikonaDegreeZone, id).toBe(py.moolatrikona_degree_zone ?? null)
        if (py.distance_from_deep_exaltation === undefined) expect(ts.distanceFromDeepExaltation, id).toBeNull()
        else close(ts.distanceFromDeepExaltation!, py.distance_from_deep_exaltation, id, 1e-8)
      }
      for (const p of GRAHAS) {
        const py = e.combustion[p], ts = s.combustion[p], id = `${e.id} ${p}`
        expect([ts.combust, ts.applicable, ts.limit], id).toEqual([py.combust, py.applicable, py.limit_degrees])
        if (py.separation_degrees !== undefined) close(ts.separation!, py.separation_degrees, id, 1e-8)
        expect(s.relationships[p], id).toEqual(e.compound_relationships[p])
      }
    }
  })

  it('reproduces Vimsopaka totals for all four varga groups', () => {
    for (const e of ENTRIES) {
      const { s } = results.get(e.id)!
      for (const [group, totals] of Object.entries(e.vimsopaka)) {
        for (const p of GRAHAS) close(s.vimsopaka[group as keyof NatalStrengths['vimsopaka']][p].total, totals[p], `${e.id} ${group} ${p}`, 1e-9)
      }
    }
    for (const [group, rows] of Object.entries(VIMSOPAKA_WEIGHTS)) expect(rows.reduce((a, [, w]) => a + w, 0), group).toBe(20)
  })

  it('reproduces every Shadbala component, total and planetary war', () => {
    let wars = 0
    for (const e of ENTRIES) {
      const { s } = results.get(e.id)!
      const py = e.shadbala
      expect(s.shadbala.status, e.id).toBe('complete')
      const sb = s.shadbala as ShadbalaComplete
      expect(sb.timeLords, e.id).toEqual(py.time_lords)
      close(sb.astronomicalInputs.mc, py.astronomical_inputs.mc, `${e.id} mc`, 1e-8)
      close(sb.astronomicalInputs.apparentSolarHour, py.astronomical_inputs.apparent_solar_hour, `${e.id} hour`, 1e-8)
      close(sb.astronomicalInputs.periodFraction, py.astronomical_inputs.period_fraction, `${e.id} fraction`, 1e-9)
      for (const [p, m] of Object.entries(py.motion_inputs)) {
        const t = sb.motionInputs[p as keyof typeof sb.motionInputs]
        close(t.meanLongitude, m.mean_longitude, `${e.id} ${p} mean`, 1e-8)
        close(t.seeghrochcha, m.seeghrochcha, `${e.id} ${p} seeghra`, 1e-8)
      }
      for (const p of GRAHAS) {
        const a = sb.planets[p], b = py.planets[p], id = `${e.id} ${p}`
        for (const [k, v] of Object.entries(b.sthana_components)) close(a.sthanaComponents[k as keyof typeof a.sthanaComponents], v, `${id} sthana.${k}`)
        for (const [k, v] of Object.entries(b.kala_components)) close(a.kalaComponents[k as keyof typeof a.kalaComponents], v, `${id} kala.${k}`)
        for (const [k, v] of Object.entries(b.drik_components)) close(a.drikComponents[k as keyof typeof a.drikComponents]!, v, `${id} drik.${k}`)
        expect(Object.keys(a.drikComponents), id).toEqual(Object.keys(b.drik_components))
        expect(a.saptavargaja, id).toEqual(b.saptavargaja_components)
        for (const [k, v] of [['sthana', b.sthana], ['dig', b.dig], ['kala', b.kala], ['chesta', b.chesta], ['naisargika', b.naisargika],
          ['drik', b.drik], ['totalVirupas', b.total_virupas], ['requiredVirupas', b.required_virupas]] as const) close(a[k], v, `${id} ${k}`)
        close(a.rupas, b.rupas, `${id} rupas`, TOL / 60)
        close(a.ratioToRequirement, b.ratio_to_requirement, `${id} ratio`, 1e-8)
      }
      expect(sb.wars.map((w) => [w.winner, w.loser]), e.id).toEqual(py.planetary_wars.map((w) => [w.winner, w.loser]))
      sb.wars.forEach((w, i) => close(w.transferVirupas, py.planetary_wars[i].transfer_virupas, `${e.id} war`))
      wars += sb.wars.length
    }
    expect(wars).toBe(3)
  })

  it('reproduces the functional nature table (PDF 152-153)', () => {
    let compared = 0
    for (const e of ENTRIES) {
      // Python omits it when the yoga review is pending a Mercury tie; the table itself is unaffected.
      if (!e.functional_nature) continue
      const f = results.get(e.id)!.s.functional
      const py = e.functional_nature
      expect([f.benefics, f.neutrals, f.malefics, f.yogakarakas, f.unclassified], e.id)
        .toEqual([py.benefics, py.neutrals, py.malefics, py.yogakarakas, py.unclassified])
      compared++
    }
    expect(compared).toBe(44)
  })

  it('returns plain structured-clone data', () => {
    const { s } = results.get(ENTRIES[0].id)!
    expect(structuredClone(s)).toEqual(s)
  })
})

describe('strength rules', () => {
  beforeAll(loadSwe)

  it('reports Shadbala unavailable in polar day, like analysis.chart', () => {
    const chart = castChart({ date: '2020-06-21', time: '12:00', timeZone: 'Europe/Oslo', latitude: 78.22, longitude: 15.65 }, SETTINGS)
    expect(chart.solarDay).toBeNull()
    const s = strengthsFor(chart)
    expect(s.shadbala).toEqual({ status: 'unavailable', reason: 'Ordinary sunrise/day-night partition unavailable' })
    expect(strongPlanets(s.shadbala)).toEqual({})
    expect(s.vimsopaka.shad.Sun.total).toBeGreaterThan(0)
  })

  it('asks for an explicit choice outside the 1800-2100 motion model', () => {
    const chart = castChart({ date: '1750-03-01', time: '06:30', timeZone: '+05:30', latitude: 12.97, longitude: 77.59 }, SETTINGS)
    expect(strengthsFor(chart).shadbala).toEqual({ status: 'needs_explicit_choice', reason: 'Historical approximation exposed only for 1800..2100' })
  })

  it('follows the Sripati aspect curve and its special intervals', () => {
    expect([drishtiValue(29.99), drishtiValue(60), drishtiValue(90), drishtiValue(120), drishtiValue(180), drishtiValue(300)]).toEqual([0, 15, 45, 30, 60, 0])
    expect([drishtiValue(100, 'Mars'), drishtiValue(130, 'Jupiter'), drishtiValue(280, 'Saturn')]).toEqual([55, 50, 55])
    expect(angularDistance(359, 1)).toBe(2)
  })

  it('classifies relationships and natural benefics', () => {
    expect(compoundRelation('Sun', 'Moon', { Sun: 0, Moon: 1 })).toBe('great_friend')
    expect(compoundRelation('Saturn', 'Sun', { Saturn: 0, Sun: 6 })).toBe('great_enemy')
    expect(compoundRelation('Venus', 'Venus', {})).toBe('own')
    const lon = { Sun: 0, Moon: 100, Mars: 200, Mercury: 5, Jupiter: 50, Venus: 70, Saturn: 300, Rahu: 10, Ketu: 190 }
    expect(naturalNature(lon).malefics).toEqual(['Sun', 'Mars', 'Mercury', 'Saturn', 'Rahu', 'Ketu'])
    expect(naturalNature(lon, { mercuryPolicy: 'majority' }).unknown).toEqual([])
    expect(naturalNature({ ...lon, Rahu: 120, Ketu: 300, Venus: 8 }, { mercuryPolicy: 'majority' }).unknown).toEqual(['Mercury'])
  })

  it('derives Raman time lords from the condensed ahargana', () => {
    // 1900-01-01 was a Monday; days = 26543 gives year lord index (3*73+3)%7 = 5, month (2*884+3)%7 = 0.
    expect(ramanTimeLords(Date.UTC(1900, 0, 1) / 86_400_000, 1, true, 0)).toEqual({ year: 'Venus', month: 'Sun', weekday: 'Moon', hora: 'Moon' })
  })

  it('keeps component sums consistent', () => {
    const chart = castChart({ date: '1990-05-17', time: '08:15', timeZone: 'Asia/Kolkata', latitude: 12.3, longitude: 76.65 }, SETTINGS)
    const sb = strengthsFor(chart).shadbala as ShadbalaComplete
    const v = vimsopaka(chart.vargas, 'shodasa')
    for (const p of GRAHAS) {
      const r = sb.planets[p]
      expect(r.sthana).toBeCloseTo(Object.values(r.sthanaComponents).reduce((a, b) => a + b, 0), 9)
      expect(r.totalVirupas).toBeCloseTo(r.sthana + r.dig + r.kala + r.chesta + r.naisargika + r.drik, 9)
      expect(v[p].total).toBeGreaterThanOrEqual(0)
      expect(v[p].total).toBeLessThanOrEqual(20)
    }
  })

  it('reads the functional table with the Moon by phase', () => {
    expect(functionalNature(0, null).unclassified).toEqual(['Moon', 'Rahu', 'Ketu'])
    expect(functionalNature(6, true).malefics).toContain('Moon')
    expect(functionalNature(9, false).neutrals).toContain('Moon')
    const taurus = functionalNature(1, null)
    expect([functionalRole(taurus, 'Saturn'), taurus.yogakarakas]).toEqual(['benefic', ['Saturn']])
    expect(functionalRole(taurus, 'Rahu')).toBe('unclassified')
  })
})
