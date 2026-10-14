// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import charts from './fixtures/charts.json'
import { ashtakavarga, SEVEN, transitBindus } from '@/engine/ashtakavarga'
import type { Body, SignIndex } from '@/engine/types'

describe('ashtakavarga parity with vedic_toolkit/ashtakavarga.py calculate()', () => {
  it('matches BAV and SAV for every fixture', () => {
    for (const c of charts.charts) {
      const signs = c.vargas.D1 as Record<Body, SignIndex>
      const av = ashtakavarga(signs)
      for (const p of SEVEN) expect(av.bav[p], `${c.id} ${p}`).toEqual(c.ashtakavarga.BAV[p])
      expect(av.sav, c.id).toEqual(c.ashtakavarga.SAV)
      expect(av.sav.reduce((a, b) => a + b, 0), c.id).toBe(337)
    }
  })

  it('reads transit bindus from the planet’s own BAV', () => {
    const av = ashtakavarga(charts.charts[0].vargas.D1 as Record<Body, SignIndex>)
    expect(transitBindus(av.bav, 'Saturn', 0)).toBe(av.bav.Saturn[0])
    expect(transitBindus(av.bav, 'Jupiter', 11)).toBe(charts.charts[0].ashtakavarga.BAV.Jupiter[11])
  })
})
