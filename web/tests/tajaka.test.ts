// Parity of the Tajaka annual chart with analysis.solar_return in the Python toolkit.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import fixtures from './fixtures/tajaka.json'
import { POLAR_WARNING } from '@/engine/chart'
import { SIGN_SHORT } from '@/engine/core'
import { swe } from '@/engine/swe'
import { annualChart, saham, type AnnualPeriod, type AnnualChart } from '@/engine/tajaka'
import { BODIES, type BirthInput, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

type Py = any
const CASES = (fixtures as Py).returns as Py[]
const SETTINGS: Settings = { ayanamsa: 'lahiri', node: 'mean', yearModel: 'solar' }

function toBirth(input: { datetime: string; timezone?: string; latitude: number; longitude: number }): BirthInput {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(.*)$/.exec(input.datetime)!
  return { date: m[1], time: m[2], timeZone: m[3] || input.timezone!, latitude: input.latitude, longitude: input.longitude }
}

/** Toolkit isoformat ("2000-03-08T04:41:11.969815+05:30") to JD UT1, inverting from_jd. */
function isoToJd(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(iso)!
  const offsetMs = (m[8] === '-' ? -1 : 1) * ((Number(m[9]) * 60 + Number(m[10])) * 60 + Number(m[11] ?? 0)) * 1000
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6])) - offsetMs
  const d = new Date(ms)
  const frac = m[7] ? Number(`0.${m[7]}`) : 0
  return swe().utcToJd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds() + frac).ut1
}

const camel = (k: string) => k.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())
/** Snake-case toolkit conditions to the engine's camelCase, dropping undefined. */
const conditions = (c: Record<string, unknown>) => Object.fromEntries(Object.entries(c).map(([k, v]) => [camel(k), v]))
const clean = (c: Record<string, unknown>) => Object.fromEntries(Object.entries(c).filter(([, v]) => v !== undefined))

function expectClose(actual: Record<string, unknown>, expected: Record<string, unknown>, label: string) {
  expect(Object.keys(clean(actual)).sort(), label).toEqual(Object.keys(expected).sort())
  for (const [k, v] of Object.entries(expected)) {
    if (typeof v === 'number') expect(Math.abs((actual[k] as number) - v), `${label} ${k}`).toBeLessThan(1e-8)
    else expect(actual[k], `${label} ${k}`).toEqual(v)
  }
}

function expectPeriods(actual: AnnualPeriod[], expected: Py[], label: string) {
  expect(actual.map((p) => p.lord), label).toEqual(expected.map((p) => p.lord))
  actual.forEach((p, i) => {
    const e = expected[i]
    expect(Math.abs(p.startYear - e.start_year), `${label} ${i}`).toBeLessThan(1e-12)
    expect(Math.abs(p.endYear - e.end_year), `${label} ${i}`).toBeLessThan(1e-12)
    expect(Math.abs(p.startJd - isoToJd(e.start)) * 86400, `${label} ${i} start`).toBeLessThan(1)
    expect(Math.abs(p.endJd - isoToJd(e.end)) * 86400, `${label} ${i} end`).toBeLessThan(1)
    if (e.children) expectPeriods(p.children!, e.children, `${label}/${p.lord}`)
  })
}

describe('Tajaka annual chart parity with analysis.solar_return', () => {
  const results = new Map<Py, AnnualChart>()
  beforeAll(async () => {
    await loadSwe()
    for (const f of CASES) results.set(f, annualChart(toBirth(f.input), SETTINGS, f.completed_years))
  }, 60_000)

  it('covers all five fixtures', () => expect(CASES).toHaveLength(5))

  it.each(CASES.map((f) => [`${f.id} +${f.completed_years}`, f] as const))('%s', (_, f) => {
    const r = results.get(f)!
    // Return instant and chart.
    expect(Math.abs(r.returnJd - f.julian_day_ut1) * 86400).toBeLessThan(1)
    expect(Math.abs(r.chart.jd - f.julian_day_ut1) * 86400e3).toBeLessThan(1e-3)
    expect(Math.abs(r.residualDegrees - f.return_details.residual_degrees)).toBeLessThan(1e-9)
    expect(r.solarArcDegrees).toBe(f.return_details.solar_arc_degrees)
    for (const b of BODIES) expect(Math.abs(r.chart.positions[b].longitude - f.positions[b]), b).toBeLessThan(1e-8)
    expect(r.nextReturnJd - r.returnJd).toBeGreaterThan(365.2)
    expect(r.nextReturnJd - r.returnJd).toBeLessThan(365.3)

    // Muntha, strengths, year lord.
    expect(SIGN_SHORT[r.munthaSign]).toBe(f.muntha_sign)
    expect(r.yearLordCandidates).toEqual(f.year_lord_candidates)
    const yl = r.yearLord!
    expect([yl.lord, yl.reason, yl.tiedCandidates, yl.tieTolerance]).toEqual([f.year_lord.lord, f.year_lord.selection_reason, f.year_lord.tied_candidates, f.year_lord.tie_tolerance])
    yl.candidates.forEach((c, i) => expectClose(c, f.year_lord.candidates[i], `year lord ${c.planet}`))
    for (const [p, h] of Object.entries(f.harsha_bala as Record<string, Py>)) expect(r.harshaBala![p as 'Sun'], p).toEqual(conditions(h))
    for (const [p, e] of Object.entries(f.pancha_vargeeya.planets as Record<string, Py>)) {
      const a = r.panchaVargeeya[p as 'Sun']
      const { relations, category, ...nums } = e
      expect([a.relations, a.category], p).toEqual([relations, category])
      expectClose({ ...a, relations: undefined, category: undefined }, nums, `pancha ${p}`)
    }
    for (const [p, e] of Object.entries(f.dwadasa_vargeeya as Record<string, Py>)) {
      expect(r.dwadasaVargeeya[p as 'Sun'], p).toEqual({ total: e.total, components: e.components.map((x: Py) => x.value) })
    }
    expect(Object.keys(r.sahams!)).toEqual(Object.keys(f.sahams))
    for (const [n, e] of Object.entries(f.sahams as Record<string, Py>)) expect(Math.abs(r.sahams![n as 'Punya'] - e.longitude), n).toBeLessThan(1e-8)

    // Tajaka yogas: every configuration with its recorded conditions.
    const ty = f.tajaka_yogas
    for (const [name, rows] of Object.entries(ty.configurations as Record<string, Py[]>)) {
      const mine = r.yogas.configurations[name as 'Ithasala']
      expect(mine.map((x) => x.planets), name).toEqual(rows.map((x) => x.planets))
      mine.forEach((x, i) => expectClose(x.conditions, conditions(rows[i].conditions), `${name} ${x.planets}`))
    }
    expect(r.yogas.pending.map((x) => [x.name, x.planets])).toEqual(ty.pending_conditions.map((x: Py) => [x.name, x.planets]))
    expect(r.yogas.futureIthasala.map((x) => x.planets)).toEqual(ty.future_ithasala_candidates.map((x: Py) => x.planets))
    r.yogas.futureIthasala.forEach((x, i) => expectClose(x.conditions, conditions(ty.future_ithasala_candidates[i].conditions), 'future'))
    expect(Object.keys(r.yogas.ingressChecks)).toEqual(Object.keys(ty.ingress_checks))
    for (const [p, e] of Object.entries(ty.ingress_checks as Record<string, Py>)) {
      const a = r.yogas.ingressChecks[p as 'Sun']!
      expect([a.fromSign, a.toSign]).toEqual([e.from_sign, e.to_sign])
      expect(Math.abs(a.jd - e.jd_ut1) * 86400).toBeLessThan(1)
    }
    expect(r.yogas.perfection.map((x) => [x.planets, x.status])).toEqual(ty.perfection_tracking.map((x: Py) => [x.planets, x.status]))
    r.yogas.perfection.forEach((x, i) => {
      const e = ty.perfection_tracking[i]
      if (e.jd_ut1 !== undefined) expect(Math.abs(x.jd! - e.jd_ut1) * 86400).toBeLessThan(1)
      if (e.jd_bracket) expect(Math.max(...x.jdBracket!.map((t, k) => Math.abs(t - e.jd_bracket[k])))).toBeLessThan(1e-9)
      expect((x.stations ?? []).map((s) => s.planet)).toEqual((e.stations ?? []).map((s: Py) => s.planet))
    })
    expect(r.yogas.qualification.map((x) => [x.planets, x.status, x.adverseModifiers, x.supportingModifiers, x.explicitOverride]))
      .toEqual(ty.qualification.pairs.map((x: Py) => [x.planets, x.status, x.adverse_modifiers, x.supporting_modifiers, x.explicit_override]))

    // Annual dasas: lords, relative years and dates.
    expectPeriods(r.mudda, f.mudda, 'mudda')
    expectPeriods(r.patyayini!, f.patyayini, 'patyayini')
  })
})

describe('Tajaka helpers', () => {
  it('adds 30 degrees when C lies outside the arc from B to A', () => {
    expect(saham(100, 40, 10)).toBeCloseTo(100 - 40 + 10 + 30, 12)
    expect(saham(100, 40, 70)).toBeCloseTo(130, 12)
    expect(saham(10, 350, 5)).toBeCloseTo(25, 12) // arc 350 -> 10 contains 5
  })

  it('returns the natal instant for completed year 0 and is plain data', () => {
    const f = CASES[0]
    const r = annualChart(toBirth(f.input), SETTINGS, 0)
    expect(r.returnJd).toBe(r.natalJd)
    expect(structuredClone(r)).toEqual(r)
    expect(() => annualChart(toBirth(f.input), SETTINGS, 1.5)).toThrow()
  })

  it('leaves day/night-dependent results empty under the midnight sun', () => {
    const r = annualChart({ date: '1990-06-21', time: '12:00', timeZone: 'Europe/Oslo', latitude: 69.65, longitude: 18.96 }, SETTINGS, 30)
    expect(r.isDay).toBeNull()
    expect([r.harshaBala, r.yearLord, r.yearLordCandidates, r.sahams]).toEqual([null, null, null, null])
    expect(r.chart.warnings).toContain(POLAR_WARNING)
    expect(r.mudda.length).toBeGreaterThan(8)
    expect(r.mudda[0].startJd).toBeLessThanOrEqual(r.returnJd)
    expect(r.mudda.at(-1)!.endJd).toBeGreaterThanOrEqual(r.nextReturnJd - 1e-6)
  })
})
