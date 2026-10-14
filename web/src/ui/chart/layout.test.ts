// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import fixtures from '../../../tests/fixtures/charts.json'
import { BODIES, type Body } from '@/engine/types'
import { degreeText, HIGHLIGHT_PAD, houseModels, labelScale, layoutChart, layoutHouse, MAX_LABEL_SCALE, type HouseLayout, type Occupant } from './chartModel'
import { crowdedDemoChart, crowdedLagnaDemoChart, demoChart } from './demo'
import { closestCenter, labelWidthEm, northHouses, polygonPlanes, southCells, wrapText, type Region } from './layout'

const SIZE = 400
const occ = (abbr: string, retro: boolean, degree: string | null): Occupant => ({ abbr, retro, degree, wholeDegree: degree && `${parseInt(degree, 10)}°`, body: 'Sun', highlight: false })
const WORST: Occupant[] = [occ('Asc', false, '29°59′'), ...['Su', 'Mo', 'Ma', 'Me', 'Ju', 'Ve', 'Sa', 'Ra', 'Ke'].map((a) => occ(a, true, '28°58′'))]

/** Every label box (with its highlight pill) lies inside the region and no two boxes overlap. */
function expectClean(region: Region, occupants: Occupant[], label: string, layout: HouseLayout = layoutHouse(region, occupants)) {
  const { fit, degreeStyle } = layout
  expect(fit.fits, label).toBe(true)
  expect(fit.fontSize, label).toBeGreaterThanOrEqual(8)
  const boxes = occupants.map((o, i) => {
    const w = (labelWidthEm({ abbr: o.abbr, retro: o.retro, degree: degreeText(o, degreeStyle) }) + (o.highlight ? HIGHLIGHT_PAD : 0)) * fit.fontSize
    const c = fit.centers[i]
    return { x0: c.x - w / 2, x1: c.x + w / 2, y0: c.y - fit.lineHeight / 2, y1: c.y + fit.lineHeight / 2 }
  })
  for (const b of boxes) {
    for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]]) {
      for (const p of region.planes) expect(p.nx * x + p.ny * y, label).toBeGreaterThanOrEqual(p.d - 1e-6)
    }
  }
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j]
      const overlap = a.x0 < b.x1 - 1e-6 && b.x0 < a.x1 - 1e-6 && a.y0 < b.y1 - 1e-6 && b.y0 < a.y1 - 1e-6
      expect(overlap, `${label} labels ${i} and ${j}`).toBe(false)
    }
  }
  return fit
}

describe('house models', () => {
  it('put every body of every fixture chart in the house of its fixture varga sign (D1, D9, D10)', () => {
    for (const fc of fixtures.charts) {
      const vargas = fc.vargas as Record<string, Record<Body, number>>
      const chart = { ...demoChart, positions: demoChart.positions, vargas: { 1: vargas.D1, 9: vargas.D9, 10: vargas.D10 } }
      for (const n of [1, 9, 10]) {
        const houses = houseModels(chart, n)
        const lagna = vargas[`D${n}`].Asc
        houses.forEach((h, i) => expect(h.sign, `${fc.id} D${n} house ${h.house}`).toBe((lagna + i) % 12))
        for (const b of BODIES) {
          const at = houses.filter((h) => h.occupants.some((o) => o.body === b))
          expect(at.map((h) => h.sign), `${fc.id} D${n} ${b}`).toEqual([vargas[`D${n}`][b]])
        }
      }
    }
  })

  it('draws Example 118 as in the book: Leo lagna, Jupiter in the 12th, Mercury retrograde in the 7th', () => {
    const houses = houseModels(demoChart)
    const where = (b: Body) => houses.find((h) => h.occupants.some((o) => o.body === b))!.house
    expect(houses[0].sign).toBe(4)
    expect(BODIES.map((b) => [b, where(b)])).toEqual([
      ['Sun', 7], ['Moon', 6], ['Mars', 3], ['Mercury', 7], ['Jupiter', 12], ['Venus', 8], ['Saturn', 8], ['Rahu', 9], ['Ketu', 3], ['Asc', 1],
    ])
    expect(houses[6].occupants.map((o) => [o.body, o.retro, o.degree])).toEqual([['Mercury', true, '15°27′'], ['Sun', false, '23°50′']])
    // The mean nodes always move backwards, so the drawing does not mark them.
    expect(houses[8].occupants[0]).toMatchObject({ body: 'Rahu', retro: false })
  })
})

describe('chart geometry', () => {
  it('builds 12 North Indian houses that tile the square', () => {
    const houses = northHouses(SIZE)
    expect(houses.map((h) => h.house)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    const area = (poly: { x: number; y: number }[]) => Math.abs(poly.reduce((a, p, i) => a + p.x * poly[(i + 1) % poly.length].y - poly[(i + 1) % poly.length].x * p.y, 0)) / 2
    expect(houses.reduce((a, h) => a + area(h.polygon), 0)).toBeCloseTo(SIZE * SIZE, 6)
    // Lagna diamond sits top-centre, house 4 on the left, 7 at the bottom, 10 on the right.
    expect(houses[0].numberAt.y).toBeLessThan(SIZE / 2)
    expect(houses[3].numberAt.x).toBeLessThan(SIZE / 2)
    expect(houses[6].numberAt.y).toBeGreaterThan(SIZE / 2)
    expect(houses[9].numberAt.x).toBeGreaterThan(SIZE / 2)
  })

  it('places South Indian signs clockwise from Pisces at the top left', () => {
    const cells = southCells(SIZE, 0)
    const at = (sign: number) => [cells[sign].y / 100, cells[sign].x / 100]
    expect(at(11)).toEqual([0, 0])
    expect(at(0)).toEqual([0, 1])
    expect(at(3)).toEqual([1, 3])
    expect(at(5)).toEqual([3, 3])
    expect(at(8)).toEqual([3, 0])
    expect(at(10)).toEqual([1, 0])
  })

  it('finds the nearest feasible centre for a rectangle', () => {
    const square = polygonPlanes([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])
    expect(closestCenter(square, 4, 4, 0, { x: 5, y: 5 })).toEqual({ x: 5, y: 5 })
    const c = closestCenter(square, 4, 4, 0, { x: 0, y: 0 })!
    expect([c.x, c.y].map((v) => +v.toFixed(9))).toEqual([2, 2])
    expect(closestCenter(square, 12, 4, 0, { x: 5, y: 5 })).toBeNull()
  })

  it('wraps caption text by estimated width', () => {
    expect(wrapText('8 Mar 1967, 17:40 near Jodhpur, India', 120, 10, 3).length).toBeGreaterThan(1)
    expect(wrapText('One two three four five six seven eight nine ten', 40, 10, 2)[1]).toMatch(/…$/)
    expect(wrapText('a\nb', 400, 10, 3)).toEqual(['a', 'b'])
    // Balanced: two similar lines rather than a long line and an orphan.
    const [l1, l2] = wrapText('26°18′ N, 73°04′ E (near Jodhpur, India)', 172, 10, 3)
    expect(l2.split(' ').length).toBeGreaterThan(1)
    expect(Math.abs(l1.length - l2.length)).toBeLessThan(12)
  })
})

describe('label fitting', () => {
  it('fits all ten bodies into any single North Indian house without overlap', () => {
    for (const h of northHouses(SIZE)) expectClean(h.region, WORST, `north house ${h.house}`)
  })

  it('fits all ten bodies into any South Indian cell, lagna or not', () => {
    for (const lagna of [0, 4]) {
      for (const cell of southCells(SIZE, lagna)) expectClean(cell.region, WORST, `south sign ${cell.sign} lagna ${lagna}`)
    }
  })

  it('enlarges text for small renderings only, in 0.05 steps up to a cap', () => {
    expect([labelScale(1440), labelScale(400), labelScale(390), labelScale(324), labelScale(254), labelScale(0)]).toEqual([1, 1, 1.05, 1.25, MAX_LABEL_SCALE, 1])
  })

  it('keeps full degrees at a comfortable size for a typical house', () => {
    const north = northHouses(SIZE)
    const fit = expectClean(north[1].region, WORST.slice(1, 3), 'two planets in house 2')
    expect(fit.tier).toBe(0)
    expect(fit.fontSize).toBeGreaterThanOrEqual(12)
  })

  it('lays out the demo and both crowded stress charts cleanly in both styles and several vargas', () => {
    for (const chart of [demoChart, crowdedDemoChart(), crowdedLagnaDemoChart()]) {
      for (const varga of [1, 9, 10, 60]) {
        const houses = houseModels(chart, varga, ['Moon', 'Saturn', 'Jupiter'])
        const north = northHouses(SIZE).map((h) => h.region)
        const south = southCells(SIZE, houses[0].sign)
        const southRegions = houses.map((h) => south[h.sign].region)
        for (const [style, regions] of [['north', north], ['south', southRegions]] as const) {
          const base = layoutChart(regions, houses)
          for (const scale of [1, 1.2, MAX_LABEL_SCALE]) {
            const where = `${style} D${varga} x${scale}`
            const layouts = layoutChart(regions, houses, scale)
            houses.forEach((h, i) => expectClean(regions[i], h.occupants, `${where} house ${h.house}`, layouts[i]))
            // Houses with one or two bodies share one size; crowded houses may only be smaller.
            const sparse = layouts.filter((_, i) => houses[i].occupants.length > 0 && houses[i].occupants.length <= 2).map((l) => l.fit.fontSize)
            const common = Math.min(...sparse)
            expect(new Set(sparse).size, where).toBe(1)
            for (const l of layouts) expect(l.fit.fontSize).toBeLessThanOrEqual(common)
            // Enlarging never shortens the degrees and never shrinks a label.
            layouts.forEach((l, i) => {
              expect(l.degreeStyle, `${where} house ${i + 1}`).toBe(base[i].degreeStyle)
              expect(l.fit.fontSize).toBeGreaterThanOrEqual(base[i].fit.fontSize)
            })
          }
        }
      }
    }
  })
})
