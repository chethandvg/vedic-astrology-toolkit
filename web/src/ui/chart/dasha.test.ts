// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import { activeChain, formatSpan, jdOfYear, spokenSpan, yearTicks } from './dasha'
import { demoDashas } from './demo'

describe('dasha helpers', () => {
  it('finds the running MD, AD and PD', () => {
    const md = demoDashas[3]
    const ad = md.children![2]
    const pd = ad.children![4]
    const jd = (pd.startJd + pd.endJd) / 2
    expect(activeChain(demoDashas, jd)).toEqual([md, ad, pd])
    expect(activeChain(demoDashas, demoDashas[0].startJd - 1)).toEqual([])
    // Start instants belong to the new period, end instants to the next one.
    expect(activeChain(demoDashas, md.startJd)[0]).toBe(md)
  })

  it('formats spans compactly', () => {
    expect(formatSpan(19 * 365.2425)).toBe('19y')
    expect(formatSpan(2 * 365.2425 + 4 * 30.436875)).toBe('2y 4m')
    expect(formatSpan(4 * 30.436875 + 12)).toBe('4m 12d')
    expect(formatSpan(18.2)).toBe('18d')
    expect(formatSpan(0.3)).toBe('1d')
    expect(formatSpan(365.2425 * 2 - 3)).toBe('2y')
    expect(spokenSpan(365.2425 + 30.436875)).toBe('1 year 1 month')
  })

  it('computes calendar year starts and ticks', () => {
    expect(jdOfYear(2000)).toBe(2451544.5)
    expect(jdOfYear(1967)).toBe(2439491.5)
    const ticks = yearTicks(jdOfYear(1961) + 10, jdOfYear(2001), 20)
    expect(ticks.map((t) => t.year)).toEqual([1980, 2000])
  })
})
