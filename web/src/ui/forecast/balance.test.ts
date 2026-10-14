// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import { engineApi } from '@/engine/api'
import { INFORMATIONAL_FACTORS } from '@/engine/predict'
import { addDays } from '@/engine/time'
import { PRESETS, type BirthInput, type Forecast, type Reason } from '@/engine/types'
import { leadingReasons, percentages, ratingBalance, strongestReasons, UNSCORED_FACTORS } from './balance'

const reason = (factor: string, effect: Reason['effect'], weight: number, title = factor): Reason => ({ factor, effect, weight, title, text: '', source: '' })
const day = (reasons: Reason[], rating: Forecast['rating'] = 'mixed'): Forecast => ({
  horizon: 'day', start: '2026-10-14', end: '2026-10-14', rating, score: 0, headline: '', reasons, events: [], dasha: [],
})

describe('percentages', () => {
  it('adds up to 100 and keeps zeros', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33])
    expect(percentages([2, 0, 1])).toEqual([67, 0, 33])
    expect(percentages([0, 0, 0])).toEqual([0, 0, 0])
  })
})

describe('ratingBalance', () => {
  it('skips the same reasons as the engine score', () => {
    expect([...UNSCORED_FACTORS].sort()).toEqual([...INFORMATIONAL_FACTORS].sort())
  })

  it('weighs a day by its scored reasons, not by how many there are', () => {
    // One heavy support against three light cautions: the count says challenging, the weight supportive.
    const b = ratingBalance(day([reason('tara_bala', 1, 3), reason('a', -1, 0.5), reason('b', -1, 0.5), reason('c', -1, 0.5), reason('dasha', 0, 5)]))
    expect(b.slices.map((s) => s.label)).toEqual(['67% supportive', '33% challenging'])
  })

  it('counts the days of a period by rating', () => {
    const parts = (['favourable', 'favourable', 'mixed', 'challenging'] as const).map((r) => day([], r))
    const b = ratingBalance({ ...day([]), horizon: 'week', parts })
    expect(b.title).toBe('Days by rating')
    expect(b.slices.map((s) => s.label)).toEqual(['2 favourable days', '1 mixed day', '1 challenging day'])
  })
})

describe('strongestReasons', () => {
  it('leaves out the period summaries and informational reasons', () => {
    const { lift, drag } = strongestReasons([
      reason('best_days', 1, 9), reason('careful_days', -1, 9), reason('dasha', 1, 9),
      reason('gochara_Jupiter', 1, 1), reason('chandrashtama', -1, 1.5),
    ])
    expect([lift?.factor, drag?.factor]).toEqual(['gochara_Jupiter', 'chandrashtama'])
  })
})

describe('leadingReasons', () => {
  it('keeps the heaviest support and caution, then fills by weight with unscored ones last', () => {
    const reasons = [
      reason('dasha', 0, 9), reason('a', 1, 3), reason('b', 1, 2.5), reason('c', 0, 2), reason('d', 1, 1.8),
      reason('e', 0, 1.5), reason('tithi', -1, 0.6),
    ]
    expect([...leadingReasons(reasons, 5)].map((r) => r.factor)).toEqual(['a', 'tithi', 'b', 'c', 'd'])
  })
})

describe('ratingBalance on real days', () => {
  beforeAll(() => engineApi.init())

  it('never leans against the rating word of a day', () => {
    const place = { latitude: 12.9719, longitude: 77.5937, timeZone: 'Asia/Kolkata' }
    const birth: BirthInput = { date: '1990-05-12', time: '06:00', ...place }
    for (let i = 0; i < 120; i += 3) {
      const { forecast } = engineApi.forecast(birth, PRESETS.popular, place, 'day', addDays('2026-01-01', i))
      const share = (effect: number) => ratingBalance(forecast).slices.find((s) => s.kind === 'effect' && s.effect === effect)?.share ?? 0
      if (forecast.rating === 'favourable') expect(share(1)).toBeGreaterThan(share(-1))
      if (forecast.rating === 'challenging') expect(share(-1)).toBeGreaterThan(share(1))
    }
  })
})
