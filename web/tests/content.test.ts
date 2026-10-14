// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { describe, expect, it } from 'vitest'
import {
  binduNote, CAUTION_PHRASE, chandrashtamaCaution, chandrashtamaHeadline, DAY_HEADLINE_VARIANTS, CHANDRASHTAMA_TEXT, CHANDRA_BALA_TEXT, dashaChangeText, dashaCombination, dashaTransitText, DASHA_THEMES,
  dayHeadline, GOCHARA_TEXT, HOUSE_THEMES, joinList, MOON_CHANGE_TEXT, MUNTHA_TEXT, NO_SADE_SATI_TEXT, ordinal, PANCHANGA_TEXT,
  PERIOD_TEXT, periodHeadline, PLANET_THEMES, SATURN_PHASE_TEXT, SATURN_PHASE_TITLE, SOURCES, STATION_TEXT, SUPPORT_PHRASE, TARA_TEXT,
  vedhaNote, vipareetaNote, yearHeadline, dashaChainText, dashaChangePromiseText, dashaPromiseTitle, functionalNote, HOUSE_AREAS, lordBrief, lordOutlook,
} from '@/content'
import type { LordPromise } from '@/engine/promise'
import { TARA_NAMES } from '@/engine/moon'
import type { SaturnPhase } from '@/engine/saturn'
import { PLANETS, type Effect, type Rating } from '@/engine/types'

/** Words that would make the guidance fatalistic, alarming or overconfident. */
const BANNED = /\b(death|deaths|die|dies|dying|disaster\w*|guarantee\w*|cure\w*|will definitely|certainly will|doom\w*|curse\w*|fatal\w*|catastroph\w*|ruin\w*|tragedy|tragic|accident\w*|widow\w*|sinful|punish\w*)\b/i

const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z"(])/)
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

const PHASES: SaturnPhase[] = ['sade_sati_rising', 'sade_sati_peak', 'sade_sati_setting', 'ashtama', 'ardhashtama']
const RATINGS: Rating[] = ['favourable', 'mixed', 'challenging']
const EFFECTS: Effect[] = [1, 0, -1]

/** Every user-facing string of the library, with template functions called on sample arguments. */
function allTexts(): string[] {
  const out: string[] = [
    ...PLANETS.flatMap((p) => GOCHARA_TEXT[p]),
    ...PLANETS.flatMap((p) => [PLANET_THEMES[p].short, PLANET_THEMES[p].theme, DASHA_THEMES[p]]),
    ...HOUSE_THEMES, ...MUNTHA_TEXT, ...Object.values(TARA_TEXT), CHANDRA_BALA_TEXT.good, CHANDRA_BALA_TEXT.bad, CHANDRASHTAMA_TEXT,
    MOON_CHANGE_TEXT, NO_SADE_SATI_TEXT, ...Object.values(SATURN_PHASE_TEXT), ...Object.values(SATURN_PHASE_TITLE),
    ...Object.values(SUPPORT_PHRASE), ...Object.values(CAUTION_PHRASE), ...Object.values(SOURCES),
    PANCHANGA_TEXT.amavasya('through the daytime'), PANCHANGA_TEXT.amavasya('until 10:05', 'Sukla Pratipada'),
    PANCHANGA_TEXT.rikta('Navami', 'until 12:50', 'Sukla Dashami'), PANCHANGA_TEXT.rikta('Chaturthi', 'from 09:12'), PANCHANGA_TEXT.vishti('until 11:20'),
    chandrashtamaCaution({ from: '15:41' }), chandrashtamaCaution({ until: '09:30' }),
    PERIOD_TEXT.bestDays('Tue 20 Oct'), PERIOD_TEXT.chandrashtamaStay('Fri 2 Oct 15:41', 'Sun 4 Oct 18:32'), PERIOD_TEXT.toughDays('Fri 23 Oct'),
    PERIOD_TEXT.sadeSatiSpan('1 Jan 2020', '29 Mar 2025'), PERIOD_TEXT.nextSadeSati('Dec 2046'), PERIOD_TEXT.tajakaYear('8 Mar 2026', '9 Mar 2027'),
  ]
  for (const p of PLANETS) {
    out.push(vedhaNote(p, ['Mars', 'Saturn'], 9), vipareetaNote([p], 3), STATION_TEXT.retrograde(p, PLANET_THEMES[p].short), STATION_TEXT.direct(p, PLANET_THEMES[p].short))
    for (const e of EFFECTS) out.push(dashaTransitText(p, e))
    for (const q of PLANETS) out.push(dashaCombination(p, q, 'Sun'), dashaCombination(p, q), dashaChangeText([p, q]))
  }
  for (let b = 0; b <= 8; b++) out.push(binduNote(b, true), binduNote(b, false))
  // Chart-specific dasha texts over sample lords: one per planet, cycling through the variants.
  const lords = PLANETS.map((planet, i): LordPromise => {
    const node = planet === 'Rahu' || planet === 'Ketu'
    return {
      planet, role: node ? 'unclassified' : (['benefic', 'neutral', 'malefic'] as const)[i % 3], yogakaraka: i === 4, rules: node ? [] : i % 2 ? [6, 9] : [1 + (i % 12)],
      house: 1 + ((i * 5) % 12), ...(node ? { dispositor: 'Saturn' as const } : {}),
      dignity: (['exalted', 'own', 'debilitated', 'friend', 'great_enemy', 'moolatrikona', 'neutral'] as const)[i % 7],
      strengthRatio: node ? null : [0.8, 1, 1.3][i % 3], combust: i === 3, vipareeta: i === 1,
      supportiveYogas: i === 2 ? ['Gaja-Kesari'] : [], challengingYogas: i === 5 ? ['Kemadruma'] : [], score: 0, effect: EFFECTS[i % 3],
    }
  })
  for (const [i, l] of lords.entries()) {
    for (const e of EFFECTS) {
      const variant = { ...l, effect: e }
      out.push(lordOutlook(variant, 'sub-period'), lordOutlook(variant, 'period'), lordBrief(variant, 'phase'), dashaPromiseTitle(l.planet, e))
      // A chain whose outlook differs from the sub-lord's: once with the main period deciding it, once without.
      for (const c of EFFECTS.filter((x) => x !== e)) {
        const main = lords[(i + 1) % 9]
        out.push(lordOutlook(variant, 'sub-period', c, { ...main, effect: c }), lordOutlook(variant, 'sub-period', c, main))
      }
      out.push(dashaChainText(variant, lords[(i + 1) % 9], lords[(i + 2) % 9], [null, 5, 8, 3][i % 4]), dashaChangePromiseText([l.planet, lords[(i + 1) % 9].planet], variant))
      out.push(functionalNote('benefic', false, e), functionalNote('malefic', false, e), functionalNote('neutral', true, e))
    }
  }
  out.push(...HOUSE_AREAS)
  return out
}

describe('interpretation library', () => {
  it('has a gochara text for each of the 9 planets in each of the 12 houses, all distinct', () => {
    expect(Object.keys(GOCHARA_TEXT).sort()).toEqual([...PLANETS].sort())
    const all = PLANETS.flatMap((p) => GOCHARA_TEXT[p])
    expect(all).toHaveLength(108)
    expect(new Set(all).size).toBe(108)
  })

  it('covers every planet, house, tara, Saturn phase and Muntha house', () => {
    expect(Object.keys(PLANET_THEMES).sort()).toEqual([...PLANETS].sort())
    expect(Object.keys(DASHA_THEMES).sort()).toEqual([...PLANETS].sort())
    expect(HOUSE_THEMES).toHaveLength(12)
    expect(MUNTHA_TEXT).toHaveLength(12)
    expect(Object.keys(TARA_TEXT).sort()).toEqual([...TARA_NAMES].sort())
    expect(Object.keys(SATURN_PHASE_TEXT).sort()).toEqual([...PHASES].sort())
    expect(Object.keys(SATURN_PHASE_TITLE).sort()).toEqual([...PHASES].sort())
  })

  it('has headline phrases for every factor that can lead a forecast', () => {
    const support = ['tara_bala', 'chandra_bala', 'dasha_transit', 'best_days', 'muntha', ...PLANETS.flatMap((p) => [`gochara_${p}`, `ingress_${p}`])]
    const caution = ['tara_bala', 'chandra_bala', 'chandrashtama', 'careful_days', 'dasha_transit', 'tithi', 'vishti', 'rahu_kalam', 'sade_sati', 'ashtama_shani', 'muntha',
      ...PLANETS.flatMap((p) => [`gochara_${p}`, `ingress_${p}`])]
    for (const f of support) expect(SUPPORT_PHRASE[f], f).toBeTruthy()
    for (const f of caution) expect(CAUTION_PHRASE[f], f).toBeTruthy()
  })

  it('has no empty strings, at most three sentences per text and no run-on sentences', () => {
    for (const t of allTexts()) {
      expect(t.trim(), JSON.stringify(t)).not.toBe('')
      expect(t).not.toMatch(/undefined|null|NaN|\$\{|\s{2}/)
      expect(sentences(t).length, t).toBeLessThanOrEqual(3)
      for (const s of sentences(t)) expect(words(s), s).toBeLessThanOrEqual(32)
    }
    for (const p of PLANETS) for (const t of GOCHARA_TEXT[p]) expect(sentences(t), t).toHaveLength(1)
  })

  it('keeps a safe, non-fatalistic tone', () => {
    for (const t of allTexts()) expect(t, t).not.toMatch(BANNED)
  })

  it('writes complete, short headlines for every rating and phrase combination', () => {
    const supports = [undefined, ...Object.values(SUPPORT_PHRASE)]
    // Timed Chandrashtama cautions, at their longest with a time after midnight.
    const cautions = [undefined, ...Object.values(CAUTION_PHRASE), chandrashtamaCaution({ from: '04:03 tomorrow' }), chandrashtamaCaution({ until: '15:41' })]
    const lines: string[] = []
    for (const r of RATINGS) {
      for (const s of supports) {
        for (const c of cautions) {
          lines.push(yearHeadline(r, s, c))
          for (let v = 0; v < DAY_HEADLINE_VARIANTS; v++) lines.push(dayHeadline(r, s, c, v))
        }
      }
      for (const s of supports) {
        for (let v = 0; v < DAY_HEADLINE_VARIANTS; v++) {
          const h = chandrashtamaHeadline(r, s, v)
          // The 8th-sign Moon leads: it comes before whatever supports the day.
          const at = (x: string) => h.toLowerCase().indexOf(x.toLowerCase())
          expect(at(CAUTION_PHRASE.chandrashtama), h).toBeGreaterThanOrEqual(0)
          if (s) expect(at(CAUTION_PHRASE.chandrashtama), h).toBeLessThan(at(s))
          lines.push(h)
        }
      }
      for (const best of [undefined, 'Tue 20 Oct', '19, 24 and 30 Oct']) {
        for (const careful of [undefined, 'Sat 24 – Sun 25 Oct']) lines.push(periodHeadline('week', r, best, careful), periodHeadline('month', r, best, careful))
      }
    }
    for (const h of lines) {
      expect(h, h).toMatch(/^[A-Z].*[^.]\.$/)
      expect(h.length, h).toBeLessThanOrEqual(130)
      expect(h, h).not.toMatch(/undefined|\s{2}|\s[,.;:]/)
      expect(h, h).not.toMatch(BANNED)
    }
  })

  it('joins a dasha lord\'s condition to its outlook by polarity and names the main period when it decides', () => {
    const base: LordPromise = {
      planet: 'Venus', role: 'malefic', yogakaraka: false, rules: [2, 7], house: 12, dignity: 'exalted', strengthRatio: 1.1, combust: false,
      vipareeta: false, supportiveYogas: [], challengingYogas: [], score: -0.3, effect: -1,
    }
    expect(lordOutlook(base, 'period')).toBe('Venus rules your 2nd and 7th and sits in your 12th. Although it is exalted, this period tends to ask for patience around family finances and partnerships, where steady habits help most.')
    expect(lordOutlook({ ...base, effect: 1 }, 'period')).toMatch(/ It is exalted, so this period tends to support /)
    expect(lordOutlook({ ...base, dignity: 'debilitated', strengthRatio: 1.4 }, 'period')).toMatch(/ It is debilitated, though strong overall; on balance, this period tends to ask /)
    expect(lordOutlook({ ...base, dignity: 'debilitated', effect: 1 }, 'period')).toMatch(/ Although it is debilitated, this period tends to support /)
    expect(lordOutlook({ ...base, dignity: 'friend', effect: 0 }, 'period')).toMatch(/12th\. This period tends to bring both openings and effort/)
    // Vipareeta: the lord sits in a hard house of its own or another's.
    expect(lordOutlook({ ...base, dignity: 'friend', rules: [6, 11], house: 6, vipareeta: true, effect: 1 }, 'period')).toMatch(/As the lord of a hard house sitting in a hard house, it can turn obstacles to your advantage\.$/)
    // The chain's outlook differs from the sub-lord's: say where it comes from, not blame the sub-lord.
    const mercury: LordPromise = { ...base, planet: 'Mercury', dignity: 'friend', rules: [3, 6], house: 1, effect: 0, supportiveYogas: ['Gaja-Kesari'] }
    const venus = { ...base, effect: -1 as const }
    expect(lordOutlook(mercury, 'sub-period', -1, venus)).toBe('Mercury rules your 3rd and 6th and sits in your 1st. This sub-period tends to bring both openings and effort around your own initiative and daily work. Within the Venus period, which asks for patience in your chart, this sub-period leans toward patience overall.')
    expect(lordOutlook(mercury, 'sub-period', 1, venus)).toMatch(/\. Taken together with the rest of the running dasha, this sub-period leans toward support overall\.$/)
    expect(lordOutlook(mercury, 'sub-period', 0, venus)).toMatch(/It also helps form Gaja-Kesari in your chart\.$/)
  })

  it('formats ordinals and lists', () => {
    expect([1, 2, 3, 4, 8, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual(['1st', '2nd', '3rd', '4th', '8th', '11th', '12th', '13th', '21st', '22nd', '23rd'])
    expect([joinList([]), joinList(['a']), joinList(['a', 'b']), joinList(['a', 'b', 'c'])]).toEqual(['', 'a', 'a and b', 'a, b and c'])
  })
})
