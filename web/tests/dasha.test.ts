// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import charts from './fixtures/charts.json'
import { dashaChainAt, dashaChanges, describeDuration, vimsottari } from '@/engine/dasha'
import type { DashaPeriod, YearModel } from '@/engine/types'

type Row = { lord: string; start_jd: number; end_jd: number; children?: Row[] }

/** Depth of the toolkit rows (0 = mahadashas only). */
const depthOf = (rows: Row[]): number => (rows[0].children ? 1 + depthOf(rows[0].children) : 0)

function compare(ours: DashaPeriod[], rows: Row[], label: string, level = 0) {
  expect(ours.length, label).toBe(rows.length)
  rows.forEach((r, i) => {
    const p = ours[i]
    const where = `${label} L${level}#${i}`
    expect(p.lord, where).toBe(r.lord)
    expect(p.level, where).toBe(level)
    expect(Math.abs(p.startJd - r.start_jd), where).toBeLessThan(1e-6)
    expect(Math.abs(p.endJd - r.end_jd), where).toBeLessThan(1e-6)
    if (r.children) compare(p.children!, r.children, label, level + 1)
    else expect(p.children, where).toBeUndefined()
  })
}

describe('vimsottari parity with vedic_toolkit/dashas.py', () => {
  it('matches every fixture at every available level in both year models', () => {
    let checked = 0
    for (const c of charts.charts) {
      for (const model of ['savana', 'solar'] as YearModel[]) {
        const rows = (c.vimsottari as Record<YearModel, Row[]>)[model]
        const depth = depthOf(rows) as 0 | 1 | 2
        compare(vimsottari(c.positions.Moon.longitude, c.jd, model, depth), rows, `${c.id} ${model}`)
        checked++
      }
    }
    expect(checked).toBe(2 * charts.charts.length)
  })

  it('starts the first mahadasha before birth and tiles every level without gaps', () => {
    const c = charts.charts[0]
    const md = vimsottari(c.positions.Moon.longitude, c.jd, 'solar', 2, 2)
    expect(md).toHaveLength(18)
    expect(md[0].startJd).toBeLessThanOrEqual(c.jd)
    expect(md[17].endJd - md[0].startJd).toBeCloseTo(240 * 365.2425, 6)
    const walk = (list: DashaPeriod[], start: number, end: number) => {
      expect(list[0].startJd).toBe(start)
      expect(list.at(-1)!.endJd).toBe(end)
      list.forEach((p, i) => {
        if (i) expect(p.startJd).toBe(list[i - 1].endJd)
        if (p.children) {
          expect(p.children[0].lord).toBe(p.lord)
          walk(p.children, p.startJd, p.endJd)
        }
      })
    }
    walk(md, md[0].startJd, md[17].endJd)
  })

  it('rejects unsupported cycle counts', () => {
    expect(() => vimsottari(10, 2451545, 'solar', 0, 0)).toThrow()
    expect(() => vimsottari(10, 2451545, 'solar', 0, 6)).toThrow()
  })
})

describe('dasha chain and changes', () => {
  const c = charts.charts[0]
  const periods = vimsottari(c.positions.Moon.longitude, c.jd, 'savana', 2)

  it('finds the running MD/AD/PD with half-open intervals', () => {
    const ad = periods[2].children![3]
    const pd = ad.children![5]
    expect(dashaChainAt(periods, pd.startJd)).toEqual([periods[2], ad, pd])
    // The end instant belongs to the next period.
    expect(dashaChainAt(periods, pd.endJd)[2]).toBe(ad.children![6])
    expect(dashaChainAt(periods, periods[0].startJd - 1)).toEqual([])
    expect(dashaChainAt(periods, periods[8].endJd)).toEqual([])
    expect(dashaChainAt(vimsottari(c.positions.Moon.longitude, c.jd, 'savana', 0), c.jd)).toHaveLength(1)
  })

  it('emits one event per change, named after the highest level that changes', () => {
    const md = periods[3]
    const events = dashaChanges(periods, md.startJd - 1, md.endJd, 2)
    expect(events[0].jd).toBe(md.startJd)
    expect(events[0].title).toBe(`Mahadasha of ${md.lord} begins`)
    expect(events.filter((e) => e.jd === md.startJd)).toHaveLength(1)
    const ad2 = md.children![1]
    const adEvent = events.find((e) => e.jd === ad2.startJd)!
    expect(adEvent.title).toBe(`Antardasha of ${ad2.lord} begins (${md.lord}–${ad2.lord})`)
    const pd2 = md.children![0].children![1]
    expect(events.find((e) => e.jd === pd2.startJd)!.title).toBe(
      `Pratyantardasha of ${pd2.lord} begins (${md.lord}–${md.lord}–${pd2.lord})`,
    )
    expect(events.every((e) => e.kind === 'dasha' && e.jd >= md.startJd && e.jd < md.endJd)).toBe(true)
    expect(events.map((e) => e.jd)).toEqual([...events.map((e) => e.jd)].sort((a, b) => a - b))
    // maxLevel 1 drops pratyantardasha changes.
    expect(events).toHaveLength(81)
    expect(dashaChanges(periods, md.startJd - 1, md.endJd, 1)).toHaveLength(9)
    expect(dashaChanges(periods, md.startJd - 1, md.endJd, 0)).toHaveLength(1)
  })

  it('describes durations in plain words', () => {
    expect(describeDuration(365.2425 * 2 + 30.44 * 8)).toBe('about 2 years 8 months')
    expect(describeDuration(365.2425)).toBe('about 1 year')
    expect(describeDuration(21)).toBe('about 3 weeks')
    expect(describeDuration(0.4)).toBe('about 1 day')
  })
})
