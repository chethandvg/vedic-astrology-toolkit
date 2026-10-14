// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.
import { readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildCityIndex, cityLabel, cityRegion, foldName, type CityIndex, type RawCities } from './cities'

const FILE = fileURLToPath(new URL('../../public/data/cities.json', import.meta.url))
let index: CityIndex
const top = (q: string) => index.search(q)[0]

beforeAll(() => {
  index = buildCityIndex(JSON.parse(readFileSync(FILE, 'utf8')) as RawCities)
})

describe('foldName', () => {
  it('ignores case, accents and punctuation', () => {
    expect(foldName('  São Paulo ')).toBe('sao paulo')
    expect(foldName('Đà Nẵng')).toBe('da nang')
    expect(foldName('St. John’s')).toBe('st johns')
    expect(foldName('Bobo-Dioulasso')).toBe('bobo dioulasso')
  })
})

describe('city search', () => {
  it('stays within the size budget', () => {
    expect(statSync(FILE).size).toBeLessThanOrEqual(1_500_000)
    expect(index.cities.length).toBeGreaterThan(30_000)
  })

  it('finds renamed Indian cities by their former names', () => {
    for (const [q, name] of [['Bangalore', 'Bengaluru'], ['Bombay', 'Mumbai'], ['Mysore', 'Mysuru'], ['Madras', 'Chennai'],
      ['Calcutta', 'Kolkata'], ['Trivandrum', 'Thiruvananthapuram'], ['Gurgaon', 'Gurugram'], ['Poona', 'Pune']]) {
      const m = top(q)
      expect(m.city.name, q).toBe(name)
      expect(m.city.country).toBe('India')
      expect(m.city.timeZone).toBe('Asia/Kolkata')
      expect(m.via?.toLowerCase(), q).toContain(q.toLowerCase().slice(0, 5))
    }
  })

  it('matches prefixes, ranks by population and reports the region', () => {
    const m = top('mysu')
    expect(m.via).toBeNull()
    expect(cityLabel(m.city)).toBe('Mysuru, Karnataka, India')
    expect(m.city.latitude).toBeCloseTo(12.2979, 4)
    expect(top('lond').city.country).toBe('United Kingdom')
    expect(top('new york').city.name).toBe('New York City')
    expect(top('sao paulo').city.name).toBe('São Paulo')
    expect(top('munchen').city.name).toBe('Munich')
  })

  it('narrows by state or country after a comma and handles saints', () => {
    expect(top('London, Canada').city.admin1).toBe('Ontario')
    expect(top('hyderabad, pak').city.country).toBe('Pakistan')
    expect(top('St Petersburg').city.country).toBe('Russia')
    expect(top('saint louis, missouri').city.name).toMatch(/^St\.? Louis/)
  })

  it('accepts everyday country short forms after the comma', () => {
    expect(top('new york, us').city.name).toBe('New York City')
    expect(top('london, uk').city.country).toBe('United Kingdom')
    expect(top('dubai, uae').city.country).toBe('United Arab Emirates')
  })

  it('does not repeat a division that equals the country', () => {
    const reunion = index.search('saint-louis, reunion')[0].city
    expect(cityRegion(reunion)).toBe('Reunion')
    expect(cityLabel(reunion)).toBe('Saint-Louis, Reunion')
  })

  it('finds later words and returns nothing for empty queries', () => {
    expect(index.search('delhi').map((m) => m.city.name)).toContain('New Delhi')
    expect(index.search('  ')).toEqual([])
    expect(index.search('zzzzqx')).toEqual([])
    expect(index.search('a', 5)).toHaveLength(5)
  })
})
