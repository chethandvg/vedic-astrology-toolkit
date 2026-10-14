// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import { PLANETS, type Planet } from '@/engine/types'
import { dignity, EXALTATION_SIGN } from './dignity'

const sign = { Ar: 0, Ta: 1, Ge: 2, Cn: 3, Le: 4, Vi: 5, Li: 6, Sc: 7, Sg: 8, Cp: 9, Aq: 10, Pi: 11 } as const

describe('dignity', () => {
  it('uses the classical exaltation signs (same table as the Python toolkit core.EXALT)', () => {
    // vedic_toolkit/core.py: EXALT = dict(zip(PLANETS, (0, 1, 9, 5, 3, 11, 6, ...)))
    expect(EXALTATION_SIGN).toEqual({ Sun: 0, Moon: 1, Mars: 9, Mercury: 5, Jupiter: 3, Venus: 11, Saturn: 6 })
  })

  it('marks exaltation and the opposite sign as debilitation', () => {
    const cases: [Planet, number, number][] = [
      ['Sun', sign.Ar, sign.Li], ['Moon', sign.Ta, sign.Sc], ['Mars', sign.Cp, sign.Cn], ['Mercury', sign.Vi, sign.Pi],
      ['Jupiter', sign.Cn, sign.Cp], ['Venus', sign.Pi, sign.Vi], ['Saturn', sign.Li, sign.Ar],
    ]
    for (const [p, ex, deb] of cases) {
      expect(dignity(p, ex), p).toBe('exalted')
      expect(dignity(p, deb), p).toBe('debilitated')
    }
  })

  it('marks own signs from the sign lords, with exaltation taking precedence', () => {
    const own: [Planet, number][] = [
      ['Sun', sign.Le], ['Moon', sign.Cn], ['Mars', sign.Ar], ['Mars', sign.Sc], ['Mercury', sign.Ge],
      ['Jupiter', sign.Sg], ['Jupiter', sign.Pi], ['Venus', sign.Ta], ['Venus', sign.Li], ['Saturn', sign.Cp], ['Saturn', sign.Aq],
    ]
    for (const [p, s] of own) expect(dignity(p, s), `${p} ${s}`).toBe('own')
    expect(dignity('Mercury', sign.Vi)).toBe('exalted')
  })

  it('is null for neutral signs, the nodes and the ascendant', () => {
    expect(dignity('Sun', sign.Ge)).toBeNull()
    expect(dignity('Saturn', sign.Le)).toBeNull()
    for (let s = 0; s < 12; s++) {
      expect(dignity('Rahu', s)).toBeNull()
      expect(dignity('Ketu', s)).toBeNull()
      expect(dignity('Asc', s)).toBeNull()
    }
  })

  it('gives each of the seven grahas exactly one exaltation, one debilitation and one or two own signs', () => {
    for (const p of PLANETS.filter((x) => x !== 'Rahu' && x !== 'Ketu')) {
      const all = Array.from({ length: 12 }, (_, s) => dignity(p, s))
      expect(all.filter((d) => d === 'exalted'), p).toHaveLength(1)
      expect(all.filter((d) => d === 'debilitated'), p).toHaveLength(1)
      expect(all.filter((d) => d === 'own').length, p).toBe(p === 'Sun' || p === 'Moon' || p === 'Mercury' ? 1 : 2)
    }
  })
})
