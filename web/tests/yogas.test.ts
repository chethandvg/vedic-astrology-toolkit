// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { beforeAll, describe, expect, it } from 'vitest'
import chartFixtures from './fixtures/charts.json'
import strengthFixtures from './fixtures/strengths.json'
import yogaFixtures from './fixtures/yogas.json'
import { castChart } from '@/engine/chart'
import { evaluateYogaRules, evaluateYogas, horaGhatiLagnas, type YogaResult } from '@/engine/yogas'
import { YOGA_CATEGORY_TEXT, YOGA_CONTENT, yogaContent } from '@/content/yogas'
import { PLANETS, type Body, type BirthInput, type Planet, type Settings } from '@/engine/types'
import { loadSwe } from './helpers/swe'

type PyRule = { name: string; pdf_page: number; category: string; status: string; conditions: Record<string, boolean | null>; participants?: string[] }
type ChartFixture = {
  id: string
  input: { datetime: string; timezone?: string; fold?: 0 | 1; latitude: number; longitude: number }
  settings: { ayanamsa: Settings['ayanamsa']; node: Settings['node'] }
  positions: Record<string, { longitude: number; speed: number }>
}
type StrengthFixture = { id: string; shadbala: { planets?: Record<string, { ratio_to_requirement: number }> } }

const YOGAS = (yogaFixtures as unknown as { charts: { id: string; rules: PyRule[] }[] }).charts
const CHARTS = new Map((chartFixtures as unknown as { charts: ChartFixture[] }).charts.map((c) => [c.id, c]))
const STRENGTHS = new Map((strengthFixtures as unknown as { charts: StrengthFixture[] }).charts.map((c) => [c.id, c]))

/** Toolkit spec to BirthInput, as in tests/foundation.test.ts toBirth(). */
function toBirth(f: ChartFixture): BirthInput {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)(.*)$/.exec(f.input.datetime)!
  return { date: m[1], time: m[2], timeZone: m[3] || f.input.timezone!, fold: f.input.fold, latitude: f.input.latitude, longitude: f.input.longitude }
}

/** analysis.chart's strength map: Shadbala ratio_to_requirement >= 1 (Raman/Sripati profile). */
function strongFor(id: string): Partial<Record<Planet, boolean>> {
  const planets = STRENGTHS.get(id)!.shadbala.planets ?? {}
  return Object.fromEntries(Object.entries(planets).map(([p, r]) => [p, r.ratio_to_requirement >= 1]))
}

const asFixture = (r: YogaResult): PyRule => ({ name: r.name, pdf_page: r.pdfPage, category: r.category, status: r.status, conditions: r.conditions, participants: r.participants })

/** Words that would make the guidance fatalistic, alarming or overconfident (same list as tests/content.test.ts). */
const BANNED = /\b(death|deaths|die|dies|dying|disaster\w*|guarantee\w*|cure\w*|will definitely|certainly will|doom\w*|curse\w*|fatal\w*|catastroph\w*|ruin\w*|tragedy|tragic|accident\w*|widow\w*|sinful|punish\w*)\b/i
/** Extra words kept out of yoga titles and texts: no labels that frighten or diagnose. */
const SCARY = /\b(poverty|poor|penniless|beggar\w*|misfortune|evil|bad luck|doomed|disease\w*|illness|suffer\w*|destroy\w*|loss of)\b/i
const sentences = (text: string) => text.split(/(?<=[.!?])\s+(?=[A-Z"(])/)
const words = (s: string) => s.split(/\s+/).filter(Boolean).length

describe('yogas parity with vedic_toolkit/yogas.py evaluate()', () => {
  beforeAll(async () => {
    await loadSwe()
  })

  it('covers 30 fixture charts x 170 rules', () => {
    expect(YOGAS).toHaveLength(30)
    for (const c of YOGAS) expect(c.rules, c.id).toHaveLength(170)
  })

  it.each(YOGAS.map((c) => [c.id, c] as const))('%s: identical status, conditions and participants', (id, fixture) => {
    const f = CHARTS.get(id)!
    const chart = castChart(toBirth(f), { ...f.settings, yearModel: 'solar' })
    const rules = evaluateYogas(chart, { strong: strongFor(id) })
    expect(rules.map((r) => r.name)).toEqual(fixture.rules.map((r) => r.name))
    rules.forEach((r, i) => expect(asFixture(r), r.name).toEqual({ ...fixture.rules[i], participants: fixture.rules[i].participants ?? [] }))
  })

  it('matches from the fixture longitudes directly (no ephemeris)', () => {
    for (const c of YOGAS.slice(0, 10)) {
      const f = CHARTS.get(c.id)!
      const longitudes = Object.fromEntries(Object.entries(f.positions).map(([b, v]) => [b, v.longitude])) as Record<Body, number>
      const speeds = Object.fromEntries(PLANETS.map((p) => [p, f.positions[p].speed])) as Record<Planet, number>
      const chart = castChart(toBirth(f), { ...f.settings, yearModel: 'solar' })
      const rules = evaluateYogaRules({ longitudes, speeds, strong: strongFor(c.id), points: horaGhatiLagnas(chart) ?? undefined })
      expect(rules.map((r) => r.status), c.id).toEqual(c.rules.map((r) => r.status))
    }
  })

  it('keeps strength-dependent conditions unknown without a strength map', () => {
    const f = CHARTS.get(YOGAS[0].id)!
    const rules = evaluateYogas(castChart(toBirth(f), { ...f.settings, yearModel: 'solar' }))
    const lakshmi = rules.find((r) => r.name === 'Lakshmi')!
    expect(lakshmi.conditions.lagna_lord_strong).toBeNull()
    expect(lakshmi.status).not.toBe('conditions_met')
    expect(rules.find((r) => r.name === 'Bheri')!.conditions.ninth_lord_strong).toBeNull()
  })

  it('evaluates both Mercury readings on an equal benefic/malefic tie', () => {
    // Sagittarius rising; Mercury in Gemini (7th) with Venus (benefic) and the Sun (malefic): a 1-1 tie.
    const longitudes: Record<Body, number> = {
      Sun: 80, Moon: 150, Mars: 10, Mercury: 70, Jupiter: 300, Venus: 75, Saturn: 200, Rahu: 100, Ketu: 280, Asc: 250,
    }
    const both = evaluateYogaRules({ longitudes })
    const asBenefic = evaluateYogaRules({ longitudes }, { mercuryTie: 'benefic' })
    const asMalefic = evaluateYogaRules({ longitudes }, { mercuryTie: 'malefic' })
    both.forEach((r, i) => {
      if (asBenefic[i].status !== asMalefic[i].status) expect(r.status, r.name).toBe('conditions_pending')
      else expect(r.status, r.name).toBe(asBenefic[i].status)
      for (const [k, v] of Object.entries(r.conditions)) {
        expect(v, `${r.name}.${k}`).toBe(asBenefic[i].conditions[k] === asMalefic[i].conditions[k] ? asBenefic[i].conditions[k] : null)
      }
    })
    // Chaamara's second reading needs two benefics in the 7th: Venus plus Mercury only if Mercury is benefic.
    const at = both.findIndex((r) => r.name === 'Chaamara')
    expect([asBenefic[at].status, asMalefic[at].status, both[at].status]).toEqual(['conditions_met', 'conditions_not_met', 'conditions_pending'])
    // Toolkit output for these longitudes (no strength map, no HL/GL; whole-degree longitudes tie the karakas).
    expect(both.filter((r) => r.status === 'conditions_pending').map((r) => r.name)).toEqual([
      'Kaahala', 'Chaamara', 'Mridanga', 'advanced_raaja_03', 'advanced_raaja_04', 'advanced_raaja_05', 'advanced_raaja_06', 'advanced_raaja_08',
      'raaja_sambandha_01', 'raaja_sambandha_03', 'raaja_sambandha_04', 'raaja_sambandha_05', 'raaja_sambandha_06', 'raaja_sambandha_07',
      'raaja_sambandha_08', 'raaja_sambandha_09', 'raaja_sambandha_10', 'raaja_sambandha_11', 'raaja_sambandha_14', 'raaja_sambandha_15',
    ])
    expect(both.filter((r) => r.status === 'conditions_met').map((r) => r.name)).toEqual(['Vesi', 'Sunaphaa', 'Budha-Aaditya', 'Bhadra', 'Paasa', 'Amala', 'Basic_Raaja', 'Dharma_Karmadhipati'])
    expect(both.flatMap((r) => Object.entries(r.conditions).filter(([, v]) => v === null).map(([k]) => `${r.name}.${k}`))).toHaveLength(34)
    expect(both.find((r) => r.name === 'daridra_10')!.conditions.benefics_in_malefic_owned_signs).toBeNull()
  })

  it("follows the book's Sarpa example (PDF 112) and names yoga participants", () => {
    // vedic_toolkit tests/test_research.py sample(): Scorpio rising, Jupiter in the lagna.
    const sample = (changes: Partial<Record<Body, number>>) =>
      ({ Sun: 10, Moon: 42, Mars: 78, Mercury: 95, Jupiter: 139, Venus: 173, Saturn: 211, Rahu: 244, Ketu: 64, Asc: 15, ...changes }) as Record<Body, number>
    const rule = (changes: Partial<Record<Body, number>>, name: string) => evaluateYogaRules({ longitudes: sample(changes) }).find((r) => r.name === name)!
    // The book's example: Mars, Rahu and Ketu in three angles forms Sarpa; Jupiter in the lagna weakens it.
    const sarpa = rule({ Asc: 215, Mars: 37, Rahu: 127, Ketu: 307, Jupiter: 217 }, 'Sarpa')
    expect(sarpa.status).toBe('conditions_met')
    expect(sarpa.qualifications).toEqual({ no_angular_benefic: false })
    const rules = evaluateYogaRules({ longitudes: sample({ Asc: 215 }) })
    const by = (name: string) => rules.find((r) => r.name === name)!.participants
    expect([by('Gaja-Kesari'), by('Kemadruma'), by('Chandra-Mangala'), by('Guru-Mangala')]).toEqual([['Jupiter', 'Moon'], ['Moon'], ['Moon', 'Mars'], ['Jupiter', 'Mars']])
    // Scorpio rising: Mars rules the 6th, Mercury the 8th, Venus the 12th; only Mars sits in a hard house (8th).
    expect([by('Harsha'), by('Sarala'), by('Vimala'), by('Vipareeta_Raaja_base'), by('Vipareeta_Raaja_ideal')]).toEqual([['Mars'], ['Mercury'], ['Venus'], ['Mars'], ['Mars', 'Mercury', 'Venus']])
    expect(by('Dharma_Karmadhipati')).toEqual(['Moon', 'Sun'])
  })

  it('rejects a negative deep-exaltation orb', () => {
    const longitudes = { Sun: 10, Moon: 33, Mars: 298, Mercury: 165, Jupiter: 95, Venus: 357, Saturn: 200, Rahu: 0, Ketu: 180, Asc: 0 } as Record<Body, number>
    expect(() => evaluateYogaRules({ longitudes }, { deepExaltationOrb: -1 })).toThrow()
  })
})

describe('yoga content', () => {
  const NAMES = YOGAS[0].rules.map((r) => r.name)

  it('has content for every one of the 170 rules and nothing else', () => {
    expect(NAMES).toHaveLength(170)
    expect(Object.keys(YOGA_CONTENT).sort()).toEqual([...NAMES].sort())
    for (const n of NAMES) expect(yogaContent(n), n).toBeDefined()
    expect(yogaContent('not_a_rule')).toBeUndefined()
  })

  it('has unique friendly titles and a category label for every category', () => {
    const titles = NAMES.map((n) => YOGA_CONTENT[n].title)
    expect(new Set(titles).size).toBe(170)
    for (const t of titles) {
      expect(t, t).toMatch(/^[A-Z]/)
      expect(t, t).not.toMatch(/_/)
      expect(t.length, t).toBeLessThanOrEqual(64)
    }
    expect(YOGA_CONTENT.advanced_raaja_07.title).toMatch(/^Raja yoga: .+ \(7\)$/)
    expect(YOGA_CONTENT.daridra_03.title).toBe('Wealth-weakening combination (3)')
    for (const c of new Set(YOGAS[0].rules.map((r) => r.category))) expect(YOGA_CATEGORY_TEXT[c as keyof typeof YOGA_CATEGORY_TEXT], c).toBeTruthy()
  })

  it('gives every rule a nature, a one-sentence meaning and a short hint', () => {
    for (const n of NAMES) {
      const c = YOGA_CONTENT[n]
      expect(['supportive', 'challenging', 'mixed'], n).toContain(c.nature)
      expect(sentences(c.meaning), c.meaning).toHaveLength(1)
      expect(c.meaning, n).toMatch(/^[A-Z].*\.$/)
      expect(c.hint, n).toMatch(/^[A-Z].*\.$/)
      expect(sentences(c.hint).length, c.hint).toBeLessThanOrEqual(2)
    }
    expect(YOGA_CONTENT.daridra_01.nature).toBe('challenging')
    expect(YOGA_CONTENT['Gaja-Kesari'].nature).toBe('supportive')
  })

  it('passes the interpretation tone rules', () => {
    const texts = [...NAMES.flatMap((n) => [YOGA_CONTENT[n].title, YOGA_CONTENT[n].meaning, YOGA_CONTENT[n].hint]), ...Object.values(YOGA_CATEGORY_TEXT).flatMap((c) => [c.title, c.text])]
    for (const t of texts) {
      expect(t.trim(), JSON.stringify(t)).not.toBe('')
      expect(t).not.toMatch(/undefined|null|NaN|\$\{|\s{2}/)
      expect(t, t).not.toMatch(BANNED)
      expect(t, t).not.toMatch(SCARY)
      expect(sentences(t).length, t).toBeLessThanOrEqual(3)
      for (const s of sentences(t)) expect(words(s), s).toBeLessThanOrEqual(32)
    }
  })
})
