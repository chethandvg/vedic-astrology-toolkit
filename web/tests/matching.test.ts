// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
// Kundli matching (engine/matching.ts): table invariants checked against the published tables,
// symmetric and directional kootas, worked examples from published documentation, the ten
// poruthams, Manglik cases and the tone of the matching texts.
import { beforeAll, describe, expect, it } from 'vitest'
import {
  BAND_META, DOSHA_EXCEPTION_TEXT, DOSHA_TEXT, KOOTA_TEXT, MANGLIK_CANCELLATION_TEXT, MANGLIK_OUTCOME_TEXT, MANGLIK_TEXT, MATCH_DISCLAIMER, MATCH_METHOD,
  PORUTHAM_SUMMARY, PORUTHAM_TEXT,
} from '@/content/matching'
import { castChart } from '@/engine/chart'
import { nakshatra, signOf } from '@/engine/core'
import {
  ashtakoota, dasaPorutham, GANAS, isVedha, maitriPoints, manglik, matchCharts, moonFacts, NADIS, RAJJUS, scoreBand, starCount, taraFrom, TARAS,
  VARNAS, VASHYAS, VASYA_SIGNS, YONI_POINTS, YONIS, type KootaKey, type MoonFacts,
} from '@/engine/matching'
import { TARA_NAMES } from '@/engine/moon'
import { DEFAULT_SETTINGS, type Body, type Chart } from '@/engine/types'
import { loadSwe } from './helpers/swe'

/** A minimal chart: the Moon at `moon` degrees, other bodies by sign (index) where given. */
function fake(moon: number, signs: Partial<Record<Body, number>> = {}): Chart {
  const pos = (body: Body, longitude: number) => ({ body, longitude, sign: signOf(longitude), nakshatra: nakshatra(longitude) })
  const at = (body: Body) => pos(body, (signs[body] ?? 0) * 30 + 15)
  return { positions: { Moon: pos('Moon', moon), Asc: at('Asc'), Mars: at('Mars'), Venus: at('Venus'), Jupiter: at('Jupiter') } } as unknown as Chart
}
/** Moon facts at the middle of `pada` (1..4) of nakshatra `n` (1..27). */
const star = (n: number, pada = 1): MoonFacts => moonFacts(fake((n - 1) * (40 / 3) + (pada - 0.5) * (10 / 3)))
const points = (g: MoonFacts, b: MoonFacts) => Object.fromEntries(ashtakoota(g, b).kootas.map((k) => [k.key, k.points])) as Record<KootaKey, number>
/** All 108 padas. */
const PADAS = Array.from({ length: 108 }, (_, i) => star(Math.floor(i / 4) + 1, (i % 4) + 1))

describe('matching tables', () => {
  it('assigns yonis, ganas, nadis and rajjus to the 27 stars as published', () => {
    const stars = Array.from({ length: 27 }, (_, i) => star(i + 1))
    const count = <T,>(values: T[], v: T) => values.filter((x) => x === v).length
    // Each animal has two stars, except the Mongoose, whose second star (Abhijit) is not one of the 27.
    for (const y of YONIS) expect(count(stars.map((s) => s.yoni), y), y).toBe(y === 'Mongoose' ? 1 : 2)
    for (const g of GANAS) expect(count(stars.map((s) => s.gana), g), g).toBe(9)
    for (const n of NADIS) expect(count(stars.map((s) => s.nadi), n), n).toBe(9)
    expect(RAJJUS.map((r) => count(stars.map((s) => s.rajju), r))).toEqual([6, 6, 6, 6, 3])
    expect(stars.filter((s) => s.gana === 'Deva').map((s) => s.nakshatra)).toEqual([1, 5, 7, 8, 13, 15, 17, 22, 27])
    expect(stars.filter((s) => s.nadi === 'Adi').map((s) => s.nakshatra)).toEqual([1, 6, 7, 12, 13, 18, 19, 24, 25])
    expect(stars.filter((s) => s.rajju === 'Siro').map((s) => s.nakshatra)).toEqual([5, 14, 23])
  })

  it('has a symmetric yoni grid with 4 on the diagonal and 0 only for the seven sworn enemies', () => {
    const zeros: string[] = []
    YONI_POINTS.forEach((row, i) => row.forEach((v, j) => {
      expect(v, `${YONIS[i]}-${YONIS[j]}`).toBe(YONI_POINTS[j][i])
      if (i === j) expect(v).toBe(4)
      if (v === 0 && i < j) zeros.push(`${YONIS[i]}-${YONIS[j]}`)
    }))
    expect(zeros.sort()).toEqual(['Cat-Rat', 'Cow-Tiger', 'Dog-Deer', 'Elephant-Lion', 'Horse-Buffalo', 'Serpent-Mongoose', 'Sheep-Monkey'])
  })

  it('derives the published Graha Maitri table from natural friendship', () => {
    const order = ['Sun', 'Moon', 'Mars', 'Mercury', 'Jupiter', 'Venus', 'Saturn'] as const
    const published = [
      [5, 5, 5, 4, 5, 0, 0],
      [5, 5, 4, 1, 4, 0.5, 0.5],
      [5, 4, 5, 0.5, 5, 3, 0.5],
      [4, 1, 0.5, 5, 0.5, 5, 4],
      [5, 4, 5, 0.5, 5, 0.5, 3],
      [0, 0.5, 3, 5, 0.5, 5, 5],
      [0, 0.5, 0.5, 4, 3, 5, 5],
    ]
    expect(order.map((a) => order.map((b) => maitriPoints(a, b)))).toEqual(published)
  })

  it('lists vedha pairs that are mutual, within one rajju and in each star at most twice', () => {
    for (let a = 1; a <= 27; a++) {
      const partners = Array.from({ length: 27 }, (_, i) => i + 1).filter((b) => isVedha(a, b))
      expect(partners.length, String(a)).toBe([5, 14, 23].includes(a) ? 2 : 1)
      for (const b of partners) {
        expect(isVedha(b, a)).toBe(true)
        expect([19, 28, 37]).toContain(a + b)
        expect(star(a).rajju).toBe(star(b).rajju)
      }
    }
  })

  it('keeps the vasya sign list and the shared names consistent', () => {
    expect(VASYA_SIGNS).toHaveLength(12)
    expect(TARAS).toEqual(TARA_NAMES)
    expect(KOOTA_MAX_SUM()).toBe(36)
  })

  it('counts stars and taras like the published tables', () => {
    expect(starCount(1, 1)).toBe(1)
    expect(starCount(27, 1)).toBe(2)
    expect(starCount(8, 4)).toBe(24)
    // Jagannathhora's Tara Koot example: Ashwini to Punarvasu is the 7th (Vadha), to Pushya the 8th (Mitra).
    expect(taraFrom(1, 7)).toEqual({ tara: 7, good: false })
    expect(taraFrom(1, 8)).toEqual({ tara: 8, good: true })
    // OnlineJyotish's tara grid: remainders 3, 5 and 7 are the hard ones in every round.
    for (let c = 1; c <= 27; c++) expect(taraFrom(1, c).good, String(c)).toBe(![3, 5, 7].includes(((c - 1) % 9) + 1))
  })
})

// Independent transcriptions of the published tables, keyed by name, compared cell by cell.
describe('matching tables against the published sources', () => {
  const N = Array.from({ length: 27 }, (_, i) => star(i + 1))
  const stars = (pick: (m: MoonFacts) => boolean) => N.filter(pick).map((m) => m.nakshatra)

  it('lists the stars of every yoni, gana, nadi and rajju as published', () => {
    // BPHS yoni list (findyourfate; PyJHora yoni_mappings).
    const yoni: Record<string, number[]> = {
      Horse: [1, 24], Elephant: [2, 27], Sheep: [3, 8], Serpent: [4, 5], Dog: [6, 19], Cat: [7, 9], Rat: [10, 11], Cow: [12, 26], Buffalo: [13, 15],
      Tiger: [14, 16], Deer: [17, 18], Monkey: [20, 22], Mongoose: [21], Lion: [23, 25],
    }
    for (const y of YONIS) expect(stars((m) => m.yoni === y), y).toEqual(yoni[y])
    // OnlineJyotish "Gana Kootam"; PyJHora.
    expect(stars((m) => m.gana === 'Manushya')).toEqual([2, 4, 6, 11, 12, 20, 21, 25, 26])
    expect(stars((m) => m.gana === 'Rakshasa')).toEqual([3, 9, 10, 14, 16, 18, 19, 23, 24])
    // OnlineJyotish "Nadi Kootam".
    expect(stars((m) => m.nadi === 'Madhya')).toEqual([2, 5, 8, 11, 14, 17, 20, 23, 26])
    expect(stars((m) => m.nadi === 'Antya')).toEqual([3, 4, 9, 10, 15, 16, 21, 22, 27])
    // Hindutone and findyourfate rajju groups.
    expect(stars((m) => m.rajju === 'Kantha')).toEqual([4, 6, 13, 15, 22, 24])
    expect(stars((m) => m.rajju === 'Nabhi')).toEqual([3, 7, 12, 16, 21, 25])
    expect(stars((m) => m.rajju === 'Kati')).toEqual([2, 8, 11, 17, 20, 26])
    expect(stars((m) => m.rajju === 'Pada')).toEqual([1, 9, 10, 18, 19, 27])
  })

  it('scores Varna, Vashya and Gana exactly as the published groom-and-bride grids', () => {
    const base = star(1)
    const pts = (g: Partial<MoonFacts>, b: Partial<MoonFacts>) => points({ ...base, ...g }, { ...base, ...b })
    // Drik Panchang varna rule: the groom's varna equal to or above the bride's scores 1.
    for (const [gi, g] of VARNAS.entries()) for (const [bi, b] of VARNAS.entries()) expect(pts({ varna: g }, { varna: b }).varna).toBe(gi <= bi ? 1 : 0)
    // Astroyogi "Vasya Koota", bride rows, groom columns.
    const vashya = [[2, 1, 1, 1.5, 1], [1, 2, 1.5, 0, 1], [1, 1.5, 2, 1, 1], [0, 0, 0, 2, 0], [1, 1, 1, 0, 2]]
    for (const [bi, b] of VASHYAS.entries()) for (const [gi, g] of VASHYAS.entries()) expect(pts({ vashya: g }, { vashya: b }).vashya, `${b}/${g}`).toBe(vashya[bi][gi])
    // OnlineJyotish "Gana Kootam", bride rows, groom columns (Astroyogi and PyJHora agree).
    const gana = [[6, 6, 0], [5, 6, 0], [1, 0, 6]]
    for (const [bi, b] of GANAS.entries()) for (const [gi, g] of GANAS.entries()) expect(pts({ gana: g }, { gana: b }).gana, `${b}/${g}`).toBe(gana[bi][gi])
  })

  it('matches the yoni friendship lists of findyourfate\'s yoni-kuta lesson in every cell but two', () => {
    // [friendly (3), unfriendly (1), sworn enemy (0)] of each animal; the rest are neutral (2).
    // The lesson also lists Mongoose as both neutral and unfriendly for Cat: read as neutral.
    const lists: Record<string, [string[], string[], string]> = {
      Horse: [['Serpent', 'Deer', 'Monkey'], ['Cow', 'Tiger', 'Lion'], 'Buffalo'],
      Elephant: [['Sheep', 'Serpent', 'Buffalo', 'Monkey'], ['Tiger'], 'Lion'],
      Sheep: [['Elephant', 'Cow', 'Buffalo', 'Mongoose'], ['Dog', 'Rat', 'Tiger', 'Lion'], 'Monkey'],
      Serpent: [['Horse', 'Elephant'], ['Cat', 'Rat', 'Cow', 'Buffalo'], 'Mongoose'],
      Dog: [[], ['Sheep', 'Rat', 'Tiger', 'Mongoose', 'Lion'], 'Deer'],
      Cat: [['Deer', 'Monkey'], ['Serpent', 'Tiger', 'Lion'], 'Rat'],
      Rat: [[], ['Sheep', 'Serpent', 'Dog', 'Mongoose'], 'Cat'],
      Cow: [['Sheep', 'Buffalo', 'Deer'], ['Horse', 'Serpent', 'Lion'], 'Tiger'],
      Buffalo: [['Elephant', 'Sheep', 'Cow'], ['Serpent', 'Tiger', 'Lion'], 'Horse'],
      Tiger: [[], ['Horse', 'Elephant', 'Sheep', 'Dog', 'Cat', 'Buffalo', 'Deer', 'Monkey', 'Lion'], 'Cow'],
      Deer: [['Cat', 'Cow'], ['Horse', 'Tiger', 'Lion'], 'Dog'],
      Monkey: [['Horse', 'Elephant', 'Cat', 'Mongoose'], ['Tiger'], 'Sheep'],
      Mongoose: [['Sheep', 'Monkey'], ['Dog', 'Rat'], 'Serpent'],
      Lion: [[], ['Horse', 'Sheep', 'Dog', 'Cat', 'Cow', 'Tiger', 'Deer'], 'Elephant'],
    }
    const differ: string[] = []
    for (const [i, a] of YONIS.entries()) {
      for (const [j, b] of YONIS.entries()) {
        const [friendly, unfriendly, enemy] = lists[a]
        const listed = i === j ? 4 : b === enemy ? 0 : friendly.includes(b) ? 3 : unfriendly.includes(b) ? 1 : 2
        if (YONI_POINTS[i][j] !== listed) differ.push(`${a}-${b}`)
      }
    }
    // The two cells where the lesson's lists disagree with each other (see YONI_POINTS).
    expect(differ).toEqual(['Deer-Horse', 'Lion-Buffalo'])
  })
})

function KOOTA_MAX_SUM() {
  return ashtakoota(star(1), star(1)).kootas.reduce((s, k) => s + k.max, 0)
}

describe('ashtakoota', () => {
  it('scores every pada pair within range, symmetric where the tables are symmetric', () => {
    const asymmetric = new Set<KootaKey>()
    for (const g of PADAS) {
      for (const b of PADAS) {
        const r = ashtakoota(g, b)
        expect(r.total).toBeGreaterThanOrEqual(0)
        expect(r.total).toBeLessThanOrEqual(36)
        expect((r.total * 2) % 1).toBe(0)
        expect(r.band).toBe(scoreBand(r.total))
        expect(r.adjustedTotal).toBeGreaterThanOrEqual(r.total)
        for (const k of r.kootas) {
          expect(k.points, k.key).toBeGreaterThanOrEqual(0)
          expect(k.points, k.key).toBeLessThanOrEqual(k.max)
        }
        const p = points(g, b)
        const q = points(b, g)
        for (const key of ['tara', 'yoni', 'maitri', 'bhakoot', 'nadi'] as const) expect(p[key], key).toBe(q[key])
        for (const key of ['varna', 'vashya', 'gana'] as const) if (p[key] !== q[key]) asymmetric.add(key)
      }
    }
    // The directional kootas really are directional somewhere.
    expect([...asymmetric].sort()).toEqual(['gana', 'varna', 'vashya'])
  })

  it('gives full marks to the same pada only where the tradition allows (Nadi always fails)', () => {
    const r = ashtakoota(star(4, 2), star(4, 2))
    expect(points(star(4, 2), star(4, 2))).toMatchObject({ varna: 1, vashya: 2, tara: 3, yoni: 4, maitri: 5, gana: 6, bhakoot: 7, nadi: 0 })
    expect(r.total).toBe(28)
    expect(r.nadiDosha).toEqual({ present: true, exceptions: [], cancelled: false })
  })

  it('reads the groom-and-bride tables in the right direction', () => {
    // Varna: groom Kshatriya (Aries) with bride Brahmin (Cancer) scores 0; reversed 1 (Drik Panchang rule).
    expect(points(star(1), star(8)).varna).toBe(0)
    expect(points(star(8), star(1)).varna).toBe(1)
    // Gana (OnlineJyotish grid): bride Rakshasa with groom Deva 1; bride Deva with groom Rakshasa 0.
    expect(points(star(1), star(3)).gana).toBe(1)
    expect(points(star(3), star(1)).gana).toBe(0)
    // Gana: bride Manushya with groom Deva 5; bride Deva with groom Manushya 6.
    expect(points(star(1), star(2)).gana).toBe(5)
    expect(points(star(2), star(1)).gana).toBe(6)
    // Vashya (Astroyogi grid): bride quadruped (Aries) with groom wild (Leo, Magha) 1.5; reversed 0.
    expect(points(star(10), star(1)).vashya).toBe(1.5)
    expect(points(star(1), star(10)).vashya).toBe(0)
    // Sagittarius and Capricorn split at 15 degrees.
    expect(star(19, 1).vashya).toBe('Manava')
    expect(star(20, 3).vashya).toBe('Chatushpada')
    expect(star(21, 2).vashya).toBe('Chatushpada')
    expect(star(22, 2).vashya).toBe('Jalachara')
  })

  // Worked example in AstroMedha's "Ashtakoota Guna Milan": person 1 Krittika in Taurus, person 2
  // Vishakha in Libra. The article's breakdown: Varna 1, Vashya 1, Tara 1.5, Yoni 2, Maitri 5, Gana 6,
  // Bhakoot 7, Nadi 0 = 23.5. Two published differences: it restores Bhakoot's 7 points because both
  // signs belong to Venus (we keep the raw 0 and report the cancellation, and adjustedTotal adds the
  // 7 back), and its Yoni grid scores Sheep-Tiger 2 where the full 14x14 grid has 1.
  it('reproduces AstroMedha\'s worked example (Krittika in Taurus with Vishakha in Libra)', () => {
    const g = star(3, 3)
    const b = star(16, 2)
    expect([g.sign, b.sign, g.varna, b.varna, g.vashya, b.vashya, g.yoni, b.yoni, g.gana, b.gana, g.nadi, b.nadi])
      .toEqual([1, 6, 'Vaishya', 'Shudra', 'Chatushpada', 'Manava', 'Sheep', 'Tiger', 'Rakshasa', 'Rakshasa', 'Antya', 'Antya'])
    const r = ashtakoota(g, b)
    expect(points(g, b)).toEqual({ varna: 1, vashya: 1, tara: 1.5, yoni: 1, maitri: 5, gana: 6, bhakoot: 0, nadi: 0 })
    expect(r.bhakootDosha).toEqual({ present: true, exceptions: ['same_lord'], cancelled: true })
    expect(r.nadiDosha.cancelled).toBe(false)
    expect(r.total).toBe(15.5)
    expect(r.adjustedTotal).toBe(22.5) // 23.5 in the article, less its extra Yoni point
  })

  // The same article's variant with noon births: person 2's Moon moves to Swati (Deva), Gana
  // falls from 6 to 0 and nothing else changes in its breakdown except through Yoni (see above).
  it('reproduces AstroMedha\'s noon variant (Krittika with Swati): Gana 0', () => {
    const r = points(star(3, 3), star(15, 2))
    expect(r).toMatchObject({ varna: 1, vashya: 1, tara: 1.5, maitri: 5, gana: 0, bhakoot: 0, nadi: 0 })
  })

  // Hindutone's "Kundli Matching Explained" example: groom Pushya (Cancer), bride Rohini (Taurus):
  // Varna 1, Tara 1.5, Graha Maitri 0.5, Bhakoot 7, Nadi 8 (it leaves Vashya, Yoni and Gana open).
  it('reproduces Hindutone\'s worked example (Pushya with Rohini)', () => {
    const r = points(star(8, 2), star(4, 2))
    expect(r).toMatchObject({ varna: 1, tara: 1.5, maitri: 0.5, bhakoot: 7, nadi: 8 })
    // The other three from the tables: bride quadruped with groom aquatic 1, Sheep-Serpent 2, bride Manushya with groom Deva 5.
    expect(r).toMatchObject({ vashya: 1, yoni: 2, gana: 5 })
  })

  it('applies the common Nadi and Bhakoot exceptions without changing the raw score', () => {
    // Same sign, different stars: Ardra and Punarvasu pada 1, both Adi and both in Gemini.
    const sameSign = ashtakoota(star(6, 2), star(7, 1))
    expect(sameSign.nadiDosha).toEqual({ present: true, exceptions: ['same_sign_other_star'], cancelled: true })
    expect(sameSign.kootas.find((k) => k.key === 'nadi')!.points).toBe(0)
    // Same star, different signs: Krittika pada 1 (Aries) and pada 2 (Taurus).
    expect(ashtakoota(star(3, 1), star(3, 2)).nadiDosha.exceptions).toEqual(['same_star_other_sign'])
    // Same star and sign, different padas.
    expect(ashtakoota(star(1, 1), star(1, 3)).nadiDosha.exceptions).toEqual(['same_star_other_pada'])
    // Bhakoot 2/12 between Aries (Mars) and Pisces (Jupiter): mutual friends cancel it.
    const friends = ashtakoota(star(1), star(27))
    expect(friends.bhakootDosha).toEqual({ present: true, exceptions: ['friendly_lords'], cancelled: true })
    expect(friends.adjustedTotal - friends.total).toBe(7)
    // Bhakoot 2/12 between Aries (Mars) and Taurus (Venus): neutral lords, no exception.
    expect(ashtakoota(star(1), star(4)).bhakootDosha).toEqual({ present: true, exceptions: [], cancelled: false })
  })

  it('bands totals at 18, 25 and 33', () => {
    expect([0, 17.5, 18, 24.5, 25, 32.5, 33, 36].map(scoreBand)).toEqual(['low', 'low', 'average', 'average', 'good', 'good', 'excellent', 'excellent'])
  })
})

describe('dasa porutham', () => {
  const status = (g: MoonFacts, b: MoonFacts) => Object.fromEntries(dasaPorutham(g, b).items.map((p) => [p.key, p.status]))

  it('returns ten checks, with Rajju and Vedha symmetric', () => {
    for (const g of PADAS.filter((_, i) => i % 3 === 0)) {
      for (const b of PADAS) {
        const r = dasaPorutham(g, b)
        expect(r.items).toHaveLength(10)
        expect(r.agreed).toBeLessThanOrEqual(10)
        const s = status(g, b)
        const t = status(b, g)
        expect(s.rajju).toBe(t.rajju)
        expect(s.vedha).toBe(t.vedha)
        expect(s.rasyadhipati).toBe(t.rasyadhipati)
        expect(s.vasya).toBe(t.vasya)
        expect(r.essentialsAgree).toBe(s.rajju === 'match' && s.vedha === 'match')
      }
    }
  })

  it('follows the counting rules from the bride\'s star', () => {
    const bride = star(1)
    // Mahendra at 4, 7, 10 ... 25.
    const mahendra = Array.from({ length: 27 }, (_, i) => i + 1).filter((n) => status(star(n), bride).mahendra === 'match')
    expect(mahendra.map((n) => starCount(1, n))).toEqual([4, 7, 10, 13, 16, 19, 22, 25])
    // Dina: remainders 2, 4, 6, 8, 0; third-round 17, 22 and 27 partial; the same star partial.
    const dina = Array.from({ length: 27 }, (_, i) => status(star(i + 1), bride).dina)
    expect(dina.map((s, i) => (s === 'match' ? i + 1 : 0)).filter(Boolean)).toEqual([2, 4, 6, 8, 9, 11, 13, 15, 18, 20, 24, 26])
    expect(dina.map((s, i) => (s === 'partial' ? i + 1 : 0)).filter(Boolean)).toEqual([1, 17, 22, 27])
    // Stree Deergha: more than 13 agrees, 10-13 partly.
    expect(status(star(14), bride).stree_deergha).toBe('match')
    expect(status(star(13), bride).stree_deergha).toBe('partial')
    expect(status(star(9), bride).stree_deergha).toBe('no')
  })

  it('flags Rajju, Vedha, Gana and Rasi as the almanacs do', () => {
    // Ashwini and Jyeshtha: a vedha pair, both in the feet rajju.
    expect(status(star(1), star(18))).toMatchObject({ vedha: 'no', rajju: 'no' })
    expect(dasaPorutham(star(1), star(18)).essentialsAgree).toBe(false)
    // Mrigashira, Chitra and Dhanishta obstruct each other.
    expect(status(star(5), star(23)).vedha).toBe('no')
    // Gana: Deva-Deva match, Deva-Manushya partial, Rakshasa with Deva no.
    expect(status(star(1), star(5)).gana).toBe('match')
    expect(status(star(1), star(2)).gana).toBe('partial')
    expect(status(star(1), star(3)).gana).toBe('no')
    // Rasi: groom 7th from the bride agrees; 6th does not (Virgo from Aries, Mercury and Mars unfriendly).
    expect(status(star(15), star(1)).rasi).toBe('match')
    expect(status(star(13), star(1)).rasi).toBe('no')
    // Gemini (Mercury) 2nd from Taurus (Venus): a disagreeing count, softened to partial by friendly lords.
    expect(status(star(6), star(4)).rasi).toBe('partial')
  })
})

describe('manglik', () => {
  it('finds Mars in a dosha house from the ascendant and applies the chart-wide cancellations', () => {
    // Aries ascendant, Mars in Libra (7th); Moon and Venus in Gemini (Libra is their 5th).
    const base = { Asc: 0, Mars: 6, Venus: 2, Jupiter: 1 }
    const r = manglik(fake(75, base))
    expect(r.placements.map((p) => [p.from, p.house, p.inDoshaHouse])).toEqual([['Lagna', 7, true], ['Moon', 5, false], ['Venus', 5, false]])
    expect(r).toMatchObject({ present: true, afflicted: 1, cancellations: [], active: true })
    // Jupiter in Aquarius aspects Libra by its 9th.
    expect(manglik(fake(75, { ...base, Jupiter: 10 }))).toMatchObject({ cancellations: ['jupiter'], active: false })
    // Leo ascendant (Mars a yogakaraka); Mars in Libra is then 3rd from it, so put Mars in Aquarius (7th).
    expect(manglik(fake(75, { Asc: 4, Mars: 10, Venus: 2, Jupiter: 1 }))).toMatchObject({ present: true, cancellations: ['lagna'], active: false })
  })

  it('applies the house-and-sign exceptions per reference', () => {
    // Mars in Capricorn, 7th from a Cancer ascendant: excepted placement, own_or_exalted and lagna both hold.
    const cancer = manglik(fake(15, { Asc: 3, Mars: 9, Venus: 0, Jupiter: 2 }))
    expect(cancer.placements[0]).toEqual({ from: 'Lagna', house: 7, inDoshaHouse: true, excepted: true })
    expect(cancer.cancellations).toEqual(['own_or_exalted', 'lagna'])
    // Mars in Taurus, 12th from a Gemini ascendant (Venus's sign): excepted; from the Moon in Taurus it is the 1st.
    const gemini = manglik(fake(45, { Asc: 2, Mars: 1, Venus: 5, Jupiter: 6 }))
    expect(gemini.placements.map((p) => [p.house, p.excepted])).toEqual([[12, true], [1, false], [9, false]])
    expect(gemini).toMatchObject({ afflicted: 1, active: true })
  })

  it('balances two Manglik charts and names a one-sided dosha', () => {
    const m = fake(75, { Asc: 0, Mars: 6, Venus: 2, Jupiter: 1 })
    // Mars in Gemini with the Moon there: the 1st from the Moon counts.
    expect(manglik(fake(75, { Asc: 0, Mars: 2, Venus: 6, Jupiter: 1 })).present).toBe(true)
    // The same Mars with the Moon in Libra: 3rd from the ascendant, 9th from the Moon and from Venus.
    const none = fake(195, { Asc: 0, Mars: 2, Venus: 6, Jupiter: 1 })
    expect(manglik(none).present).toBe(false)
    expect(matchCharts(m, m).manglik.outcome).toBe('mutual')
    expect(matchCharts(m, none).manglik.outcome).toBe('groom')
    expect(matchCharts(none, m).manglik.outcome).toBe('bride')
    expect(matchCharts(none, none).manglik.outcome).toBe('none')
  })
})

describe('matchCharts on cast charts', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('matches two real charts end to end', () => {
    const a = castChart({ date: '1990-07-04', time: '10:12', timeZone: 'Asia/Kolkata', latitude: 28.6139, longitude: 77.209 }, DEFAULT_SETTINGS)
    const b = castChart({ date: '1992-03-15', time: '14:30', timeZone: 'Asia/Kolkata', latitude: 19.076, longitude: 72.8777 }, DEFAULT_SETTINGS)
    const r = matchCharts(a, b)
    expect([r.groom.nakshatra, r.bride.nakshatra]).toEqual([a.positions.Moon.nakshatra.index, b.positions.Moon.nakshatra.index])
    expect(r.ashtakoota.kootas).toHaveLength(8)
    expect(r.porutham.items).toHaveLength(10)
    expect(r.manglik.groom.placements).toHaveLength(3)
    expect(JSON.parse(JSON.stringify(r))).toEqual(r) // structured-clone friendly
  })

  // Three cast pairs, every koota and porutham worked by hand from the published tables above.
  // No public calculator was queried: their result pages sit behind forms.
  const IST = { timeZone: 'Asia/Kolkata' }
  const PAIRS = [
    {
      groom: { ...IST, date: '1985-11-02', time: '06:45', latitude: 13.0827, longitude: 80.2707 }, // Mrigashira 3, Gemini
      bride: { ...IST, date: '1988-04-21', time: '19:20', latitude: 12.9716, longitude: 77.5946 }, // Ardra 2, Gemini
      stars: [5, 3, 6, 2],
      kootas: { varna: 1, vashya: 2, tara: 3, yoni: 2, maitri: 5, gana: 5, bhakoot: 7, nadi: 8 }, total: 33, adjusted: 33,
      porutham: 'partial partial no match partial match match no match match',
      manglik: [['jupiter'], ['own_or_exalted'], 'none'],
    },
    {
      groom: { ...IST, date: '1979-01-15', time: '23:10', latitude: 22.5726, longitude: 88.3639 }, // Ashlesha 4, Cancer
      bride: { ...IST, date: '1983-08-30', time: '05:05', latitude: 18.5204, longitude: 73.8567 }, // Bharani 4, Aries
      stars: [9, 4, 2, 4],
      kootas: { varna: 1, vashya: 1, tara: 1.5, yoni: 2, maitri: 4, gana: 0, bhakoot: 7, nadi: 8 }, total: 24.5, adjusted: 24.5,
      porutham: 'match no no no partial no partial no match match',
      manglik: [['own_or_exalted', 'jupiter'], ['jupiter', 'lagna'], 'none'],
    },
    {
      groom: { ...IST, date: '1993-06-12', time: '12:00', latitude: 26.9124, longitude: 75.7873 }, // Purva Bhadrapada 3, Aquarius
      bride: { ...IST, date: '1995-12-25', time: '08:30', latitude: 17.385, longitude: 78.4867 }, // Shravana 4, Capricorn (21.8 deg)
      stars: [25, 3, 22, 4],
      kootas: { varna: 0, vashya: 1.5, tara: 1.5, yoni: 2, maitri: 5, gana: 6, bhakoot: 0, nadi: 8 }, total: 24, adjusted: 31,
      porutham: 'match partial match no partial partial match match match match',
      manglik: [['lagna'], ['jupiter'], 'none'],
    },
  ]
  it.each(PAIRS.map((p, i) => [i + 1, p] as const))('reproduces hand-worked pair %i', (_, p) => {
    const r = matchCharts(castChart(p.groom, DEFAULT_SETTINGS), castChart(p.bride, DEFAULT_SETTINGS))
    expect([r.groom.nakshatra, r.groom.pada, r.bride.nakshatra, r.bride.pada]).toEqual(p.stars)
    expect(Object.fromEntries(r.ashtakoota.kootas.map((k) => [k.key, k.points]))).toEqual(p.kootas)
    expect([r.ashtakoota.total, r.ashtakoota.adjustedTotal]).toEqual([p.total, p.adjusted])
    expect(r.porutham.items.map((x) => x.status).join(' ')).toBe(p.porutham)
    expect([r.manglik.groom.cancellations, r.manglik.bride.cancellations, r.manglik.outcome]).toEqual(p.manglik)
    expect(r.manglik.groom.present && r.manglik.bride.present).toBe(true)
  })
})

describe('matching texts', () => {
  const BANNED = /\b(death|deaths|die|dies|dying|disaster\w*|guarantee\w*|cure\w*|will definitely|certainly will|doom\w*|curse\w*|fatal\w*|catastroph\w*|ruin\w*|tragedy|tragic|accident\w*|widow\w*|sinful|punish\w*|divorce\w*|never)\b/i
  const sentences = (t: string) => t.split(/(?<=[.!?])\s+(?=[A-Z"(])/)
  const texts = [
    ...Object.values(KOOTA_TEXT).flatMap((t) => [t.about, t.full, t.some, t.none]),
    ...Object.values(PORUTHAM_TEXT).flatMap((t) => [t.about, t.full, t.some, t.none]),
    ...Object.values(BAND_META).flatMap((b) => [b.label, b.text]),
    ...Object.values(DOSHA_EXCEPTION_TEXT), ...Object.values(MANGLIK_CANCELLATION_TEXT), ...Object.values(MANGLIK_TEXT), ...Object.values(MANGLIK_OUTCOME_TEXT),
    ...Object.values(PORUTHAM_SUMMARY), DOSHA_TEXT.nadiPresent, DOSHA_TEXT.bhakootPresent, DOSHA_TEXT.noException, DOSHA_TEXT.rawScore, DOSHA_TEXT.adjusted('22.5'),
    MATCH_DISCLAIMER, ...MATCH_METHOD,
  ]

  it('is calm, short and complete', () => {
    expect(texts.length).toBeGreaterThan(100)
    for (const t of texts) {
      expect(t.trim(), JSON.stringify(t)).not.toBe('')
      expect(t, t).not.toMatch(BANNED)
      expect(t).not.toMatch(/undefined|null|NaN|\$\{|\s{2}/)
      expect(sentences(t).length, t).toBeLessThanOrEqual(3)
      for (const s of sentences(t)) expect(s.split(/\s+/).length, s).toBeLessThanOrEqual(32)
    }
  })
})
