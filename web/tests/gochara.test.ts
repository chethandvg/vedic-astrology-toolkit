// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { advanceSign } from '@/engine/core'
import { planetPositions } from '@/engine/ephem'
import { BINDU_STRONG, BINDU_WEAK, gochara, GOCHARA_RULES, VEDHA_CASTERS, VIPAREETA_VEDHA, type GocharaRow } from '@/engine/gochara'
import { solarDayForDate } from '@/engine/sunrise'
import { PLANETS, PRESETS, type Planet } from '@/engine/types'
import { loadSwe } from './helpers/swe'

const CAPRICORN = 9

/** Transit signs placing each listed planet in the given house from `moonSign`. */
const at = (houses: Partial<Record<Planet, number>>, moonSign = CAPRICORN) =>
  Object.fromEntries(Object.entries(houses).map(([p, h]) => [p, { sign: advanceSign(moonSign, h) }])) as Partial<Record<Planet, { sign: number }>>

const row = (rows: GocharaRow[], planet: Planet) => rows.find((r) => r.planet === planet)!

describe('gochara tables', () => {
  it('match Phaladeepika ch. 26 (favourable house -> vedha house)', () => {
    const saturn = { favourable: [3, 6, 11], vedha: { 3: 12, 6: 9, 11: 5 } }
    expect(GOCHARA_RULES).toEqual({
      Sun: { favourable: [3, 6, 10, 11], vedha: { 3: 9, 6: 12, 10: 4, 11: 5 } },
      Moon: { favourable: [1, 3, 6, 7, 10, 11], vedha: { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 } },
      Mars: { favourable: [3, 6, 11], vedha: { 3: 12, 6: 9, 11: 5 } },
      Mercury: { favourable: [2, 4, 6, 8, 10, 11], vedha: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12 } },
      Jupiter: { favourable: [2, 5, 7, 9, 11], vedha: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 } },
      // Phaladeepika pairs Venus's 12th with the 6th and its 11th with the 3rd.
      Venus: { favourable: [1, 2, 3, 4, 5, 8, 9, 11, 12], vedha: { 1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 3, 12: 6 } },
      Saturn: saturn, Rahu: saturn, Ketu: saturn,
    })
  })

  it('has a vedha house for every favourable house, and only for those', () => {
    for (const p of PLANETS) {
      const { favourable, vedha } = GOCHARA_RULES[p]
      expect(Object.keys(vedha).map(Number).sort((a, b) => a - b), p).toEqual([...favourable].sort((a, b) => a - b))
    }
  })

  it('derives vipareeta vedha as the reversed pairs whose target is unfavourable (nikhilworld table)', () => {
    const saturn = { 5: 11, 9: 6, 12: 3 }
    expect(VIPAREETA_VEDHA).toEqual({
      Sun: { 4: 10, 5: 11, 9: 3, 12: 6 },
      Moon: { 2: 7, 4: 10, 5: 1, 8: 11, 9: 3, 12: 6 },
      Mars: saturn,
      Mercury: { 1: 8, 3: 4, 5: 2, 9: 6, 12: 11 },
      Jupiter: { 3: 7, 4: 5, 8: 11, 10: 9, 12: 2 },
      Venus: { 6: 12, 7: 2, 10: 4 },
      Saturn: saturn, Rahu: saturn, Ketu: saturn,
    })
  })

  it('lets only the seven grahas obstruct', () => {
    expect(VEDHA_CASTERS).toEqual(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'])
  })
})

describe('gochara()', () => {
  it('gives every planet its classical result in every house when nothing obstructs', () => {
    for (let moon = 0; moon < 12; moon++) {
      for (const p of PLANETS) {
        for (let h = 1; h <= 12; h++) {
          const [r] = gochara(moon, at({ [p]: h }, moon))
          const favourable = GOCHARA_RULES[p].favourable.includes(h)
          expect(r).toEqual({ planet: p, sign: advanceSign(moon, h), houseFromMoon: h, favourable, effect: favourable ? 1 : -1, strength: 'normal' })
        }
      }
    }
  })

  it('cancels a favourable result when another graha occupies the vedha house', () => {
    const rows = gochara(CAPRICORN, at({ Sun: 3, Mars: 9, Jupiter: 9 }))
    expect(row(rows, 'Sun')).toMatchObject({ favourable: true, effect: 0, vedhaBy: ['Mars', 'Jupiter'] })
    // Jupiter is good in the 9th; the 10th (its vedha house) is empty.
    expect(row(rows, 'Jupiter')).toMatchObject({ favourable: true, effect: 1 })
    expect(row(rows, 'Jupiter').vedhaBy).toBeUndefined()
  })

  it('has no vedha between the Sun and Saturn, nor between the Moon and Mercury', () => {
    let rows = gochara(CAPRICORN, at({ Sun: 3, Saturn: 9 }))
    expect(row(rows, 'Sun').effect).toBe(1)
    rows = gochara(CAPRICORN, at({ Saturn: 3, Sun: 12 }))
    expect(row(rows, 'Saturn').effect).toBe(1)
    rows = gochara(CAPRICORN, at({ Moon: 1, Mercury: 5 }))
    expect(row(rows, 'Moon').effect).toBe(1)
    rows = gochara(CAPRICORN, at({ Mercury: 2, Moon: 5 }))
    expect(row(rows, 'Mercury').effect).toBe(1)
    // The same houses do obstruct when another graha stands there.
    expect(row(gochara(CAPRICORN, at({ Sun: 3, Mars: 9 })), 'Sun').effect).toBe(0)
    expect(row(gochara(CAPRICORN, at({ Moon: 1, Venus: 5 })), 'Moon').effect).toBe(0)
  })

  it('treats the nodes like Saturn: obstructed by the seven grahas, never obstructing', () => {
    // Ketu is always 7th from Rahu, so Rahu in the 11th has Ketu in its vedha house (5th).
    let rows = gochara(CAPRICORN, at({ Rahu: 11, Ketu: 5 }))
    expect(row(rows, 'Rahu')).toMatchObject({ favourable: true, effect: 1 })
    rows = gochara(CAPRICORN, at({ Rahu: 11, Ketu: 5, Mars: 5 }))
    expect(row(rows, 'Rahu')).toMatchObject({ effect: 0, vedhaBy: ['Mars'] })
    rows = gochara(CAPRICORN, at({ Sun: 3, Rahu: 9 }))
    expect(row(rows, 'Sun').effect).toBe(1)
  })

  it('applies vipareeta vedha to unfavourable transits', () => {
    const rows = gochara(CAPRICORN, at({ Saturn: 12, Mars: 3, Venus: 6, Moon: 12 }))
    expect(row(rows, 'Saturn')).toMatchObject({ favourable: false, effect: 0, vipareetaVedhaBy: ['Mars'] })
    // Venus in the 6th is relieved from the 12th.
    expect(row(rows, 'Venus')).toMatchObject({ favourable: false, effect: 0, vipareetaVedhaBy: ['Moon', 'Saturn'] })
    // Mars in the 3rd is favourable; its vedha house (12th) holds Saturn and the Moon.
    expect(row(rows, 'Mars')).toMatchObject({ favourable: true, effect: 0, vedhaBy: ['Moon', 'Saturn'] })
  })

  it('pairs Venus 11 with 3 and 12 with 6', () => {
    expect(row(gochara(CAPRICORN, at({ Venus: 11, Mars: 3 })), 'Venus').effect).toBe(0)
    expect(row(gochara(CAPRICORN, at({ Venus: 11, Mars: 6 })), 'Venus').effect).toBe(1)
    expect(row(gochara(CAPRICORN, at({ Venus: 12, Mars: 6 })), 'Venus').effect).toBe(0)
    expect(row(gochara(CAPRICORN, at({ Venus: 12, Mars: 3 })), 'Venus').effect).toBe(1)
  })

  it('keeps Mercury favourable in the 8th, which is also its 10th-house vedha point', () => {
    const rows = gochara(CAPRICORN, at({ Mercury: 8, Mars: 1 }))
    expect(row(rows, 'Mercury')).toMatchObject({ favourable: true, effect: 0, vedhaBy: ['Mars'] })
    expect(gochara(CAPRICORN, at({ Mercury: 10, Venus: 8 }))[0]).toMatchObject({ planet: 'Mercury', effect: 0, vedhaBy: ['Venus'] })
  })

  it('restricts obstructors with the casters option', () => {
    const transit = at({ Jupiter: 7, Moon: 3, Saturn: 4 })
    expect(row(gochara(CAPRICORN, transit), 'Jupiter')).toMatchObject({ effect: 0, vedhaBy: ['Moon'] })
    expect(row(gochara(CAPRICORN, transit, { casters: ['Jupiter', 'Saturn'] }), 'Jupiter').effect).toBe(1)
  })

  it('grades strength by the planet\'s own bindus and reports the house from the ascendant', () => {
    const bindus = (n: number) => Object.fromEntries(['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'].map((p) => [p, Array(12).fill(n)]))
    const cases: [number, number, string][] = [
      [3, BINDU_STRONG, 'strong'], [3, 4, 'normal'], [3, BINDU_WEAK, 'weak'],
      [12, BINDU_STRONG, 'weak'], [12, 4, 'normal'], [12, BINDU_WEAK, 'strong'],
    ]
    for (const [house, n, strength] of cases) {
      const [r] = gochara(CAPRICORN, at({ Saturn: house }), { bav: bindus(n) as never, natalAscSign: 4 })
      expect(r).toMatchObject({ bindus: n, strength, houseFromLagna: ((advanceSign(CAPRICORN, house) - 4 + 12) % 12) + 1 })
    }
    // The nodes have no ashtakavarga; an obstructed transit has normal strength.
    expect(gochara(CAPRICORN, at({ Rahu: 3 }), { bav: bindus(8) as never })[0].bindus).toBeUndefined()
    expect(row(gochara(CAPRICORN, at({ Saturn: 3, Mars: 12 }), { bav: bindus(8) as never }), 'Saturn').strength).toBe('normal')
  })
})

describe('gochara on real positions', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('reads Jupiter in the 7th from a Capricorn Moon as obstructed by Saturn in the 3rd (Bengaluru, 20 Oct 2026)', () => {
    const sunrise = solarDayForDate('2026-10-20', 12.9716, 77.5946, 'Asia/Kolkata')!.sunriseJd
    const rows = gochara(CAPRICORN, planetPositions(sunrise, PRESETS.popular))
    expect(rows.map((r) => [r.planet, r.houseFromMoon])).toEqual([
      ['Sun', 10], ['Moon', 1], ['Mars', 7], ['Mercury', 10], ['Jupiter', 7], ['Venus', 10], ['Saturn', 3], ['Rahu', 2], ['Ketu', 8],
    ])
    expect(row(rows, 'Jupiter')).toMatchObject({ favourable: true, effect: 0, vedhaBy: ['Saturn'] })
    expect(row(rows, 'Saturn')).toMatchObject({ favourable: true, effect: 1 })
    expect(row(rows, 'Venus')).toMatchObject({ favourable: false, effect: -1 })
  })
})
