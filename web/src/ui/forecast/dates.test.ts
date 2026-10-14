// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import {
  datesBetween, isIsoDate, longDate, monthWeeks, periodEnd, periodShortLabel, periodStart, periodTitle, rangeLabel,
  relativeLabel, shiftDate,
} from './dates'

describe('forecast dates', () => {
  it('accepts only real calendar dates', () => {
    expect(isIsoDate('2026-10-14')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true)
    for (const bad of ['2026-02-29', '2026-13-01', '2026-10-32', '2026-1-01', '14-10-2026', '', null, undefined]) {
      expect(isIsoDate(bad)).toBe(false)
    }
  })

  it('finds the period around a date (weeks start on Sunday)', () => {
    expect(periodStart('day', '2026-10-14')).toBe('2026-10-14')
    expect(periodStart('week', '2026-10-14')).toBe('2026-10-11')
    expect(periodStart('week', '2026-10-11')).toBe('2026-10-11')
    expect(periodStart('week', '2026-10-17')).toBe('2026-10-11')
    expect(periodStart('month', '2026-10-14')).toBe('2026-10-01')
    expect(periodStart('year', '2026-10-14')).toBe('2026-01-01')
    expect(periodEnd('week', '2026-10-11')).toBe('2026-10-17')
    expect(periodEnd('month', '2028-02-01')).toBe('2028-02-29')
    expect(periodEnd('year', '2026-01-01')).toBe('2026-12-31')
  })

  it('steps periods, clamping month ends', () => {
    expect(shiftDate('day', '2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftDate('week', '2026-10-14', -1)).toBe('2026-10-07')
    expect(shiftDate('month', '2026-01-31', 1)).toBe('2026-02-28')
    expect(shiftDate('year', '2028-02-29', 1)).toBe('2029-02-28')
  })

  it('lays a month out in Sunday-first weeks', () => {
    const weeks = monthWeeks('2026-10-20')
    expect(weeks).toHaveLength(5)
    expect(weeks[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03'])
    expect(weeks.flat().filter(Boolean)).toEqual(datesBetween('2026-10-01', '2026-10-31'))
    expect(weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('labels periods for headings and the navigator', () => {
    expect(longDate('2026-10-14', 2026)).toBe('Wednesday, 14 October')
    expect(longDate('2027-01-01', 2026)).toBe('Friday, 1 January 2027')
    expect(periodTitle('week', '2026-10-11', 2026)).toBe('11 – 17 Oct')
    expect(periodTitle('week', '2025-10-12', 2026)).toBe('12 – 18 Oct 2025')
    expect(periodTitle('week', '2026-09-27', 2026)).toBe('27 Sep – 3 Oct')
    expect(periodTitle('week', '2026-12-27', 2026)).toBe('27 Dec 2026 – 2 Jan 2027')
    expect(periodTitle('month', '2026-10-01')).toBe('October 2026')
    expect(periodTitle('year', '2026-01-01')).toBe('2026')
    expect(periodShortLabel('day', '2026-10-14')).toBe('Wed 14 Oct')
    expect(periodShortLabel('month', '2026-10-01')).toBe('Oct 2026')
    expect(rangeLabel('2026-10-11', '2026-10-17')).toBe('11 – 17 Oct')
  })

  it('names periods next to the current one', () => {
    expect(relativeLabel('day', '2026-10-14', '2026-10-14')).toBe('Today')
    expect(relativeLabel('day', '2026-10-15', '2026-10-14')).toBe('Tomorrow')
    expect(relativeLabel('day', '2026-10-13', '2026-10-14')).toBe('Yesterday')
    expect(relativeLabel('day', '2026-10-16', '2026-10-14')).toBeNull()
    expect(relativeLabel('week', '2026-10-18', '2026-10-14')).toBe('Next week')
    expect(relativeLabel('month', '2026-09-01', '2026-10-14')).toBe('Last month')
    expect(relativeLabel('year', '2026-01-01', '2026-10-14')).toBe('This year')
  })
})
