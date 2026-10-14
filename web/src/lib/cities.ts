// Birth-place search over the bundled GeoNames table (public/data/cities.json,
// built by scripts/build_cities.py; data CC BY 4.0). The table is fetched from
// the app's own origin on first use, so no search ever leaves the device.
// SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
// SPDX-License-Identifier: AGPL-3.0-or-later
// Additional terms under AGPL section 7 apply; see NOTICE.

export interface City {
  name: string
  /** Other searchable spellings: ASCII form, former, English and local names. */
  alternates: string[]
  /** First-level division (state, province), when GeoNames has one. */
  admin1: string | null
  country: string
  latitude: number
  longitude: number
  /** IANA time zone, e.g. "Asia/Kolkata". */
  timeZone: string
  /** GeoNames population in thousands, used only for ranking. */
  populationK: number
}

export interface CityMatch {
  city: City
  /** The alternate spelling that matched, when the main name did not. */
  via: string | null
}

export interface CityIndex {
  readonly cities: readonly City[]
  search(query: string, limit?: number): CityMatch[]
}

/** The JSON layout written by scripts/build_cities.py (format version 1). */
export interface RawCities {
  v: 1
  countries: string[]
  admin1: string[]
  zones: string[]
  regions: [admin1: number, country: number, zone: number][]
  cities: [names: string, region: number, lat: number, lon: number, thousands: number][]
}

// Letters that Unicode decomposition does not reduce to ASCII.
const LETTERS: Record<string, string> = { ø: 'o', đ: 'd', ł: 'l', ß: 'ss', æ: 'ae', œ: 'oe', ı: 'i', þ: 'th', ð: 'd', ħ: 'h' }

/** Lower-case, accent-free, punctuation-light form used for matching ("São Paulo" -> "sao paulo"). */
export function foldName(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[øđłßæœıþðħ]/g, (c) => LETTERS[c])
    .replace(/[’'`.]/g, '')
    .replace(/[\s\-‐–,/()]+/g, ' ')
    .trim()
}

/** "St Petersburg" and "Saint Petersburg" should find each other. */
function saintVariants(key: string): string[] {
  const st = /(^| )st( |$)/, saint = /(^| )saint( |$)/
  if (st.test(key)) return [key, key.replace(st, '$1saint$2')]
  if (saint.test(key)) return [key, key.replace(saint, '$1st$2')]
  return [key]
}

interface Entry {
  city: City
  keys: string[]
  /** For each key, the index of its spelling in [name, ...alternates]. */
  owner: number[]
  region: string
}

/** "Karnataka, India"; the division is left out when it repeats the city or country name ("Saint-Louis, Reunion"). */
export function cityRegion(city: City): string {
  return city.admin1 && city.admin1 !== city.name && city.admin1 !== city.country ? `${city.admin1}, ${city.country}` : city.country
}

export function cityLabel(city: City): string {
  return `${city.name}, ${cityRegion(city)}`
}

/**
 * Everyday short forms people type after the comma ("New York, US"), keyed by
 * the folded GeoNames country name. Longer forms already match as prefixes.
 */
const COUNTRY_ALIASES: Record<string, string> = {
  'united states': 'us usa america',
  'united kingdom': 'uk gb britain',
  'united arab emirates': 'uae',
  'the netherlands': 'holland',
  czechia: 'czech republic',
  turkey: 'turkiye',
  myanmar: 'burma',
  'ivory coast': 'cote divoire',
}

export function buildCityIndex(raw: RawCities): CityIndex {
  const entries: Entry[] = raw.cities.map(([names, region, latitude, longitude, populationK]) => {
    const [a1, c, z] = raw.regions[region]
    const [name, ...alternates] = names.split('|')
    const city: City = {
      name, alternates, admin1: a1 >= 0 ? raw.admin1[a1] : null, country: raw.countries[c],
      latitude, longitude, timeZone: raw.zones[z], populationK,
    }
    const spellings = [name, ...alternates]
    const keys: string[] = [], owner: number[] = []
    spellings.forEach((spelling, i) => {
      for (const key of saintVariants(foldName(spelling))) {
        keys.push(key)
        owner.push(i)
      }
    })
    const country = foldName(city.country)
    return { city, keys, owner, region: `${foldName(city.admin1 ?? '')} ${country} ${COUNTRY_ALIASES[country] ?? ''}`.trim() }
  })

  function search(query: string, limit = 8): CityMatch[] {
    // "Mysore, Karnataka" narrows by state or country after the comma.
    const [placePart, ...rest] = query.split(',')
    const q = foldName(placePart)
    if (!q) return []
    const qualifiers = rest.map(foldName).filter(Boolean)
    const found: { entry: Entry; tier: number; owner: number }[] = []
    for (const entry of entries) {
      // Tier 0: whole name; 1: start of a name; 2: start of a later word ("delhi" -> "New Delhi").
      let tier = 3, owner = 0
      for (let k = 0; k < entry.keys.length && tier > 0; k++) {
        const key = entry.keys[k]
        const t = key === q ? 0 : key.startsWith(q) ? 1 : q.length >= 3 && key.includes(` ${q}`) ? 2 : 3
        if (t < tier) [tier, owner] = [t, entry.owner[k]]
      }
      if (tier < 3 && qualifiers.every((w) => entry.region.startsWith(w) || entry.region.includes(` ${w}`))) {
        found.push({ entry, tier, owner })
      }
    }
    // Entries are stored largest first and sort() is stable, so ties rank by population.
    found.sort((a, b) => a.tier - b.tier)
    return found.slice(0, limit).map(({ entry, owner }) => ({
      city: entry.city,
      via: owner === 0 ? null : entry.city.alternates[owner - 1],
    }))
  }

  return { cities: entries.map((e) => e.city), search }
}

let loading: Promise<CityIndex> | null = null

/** Fetch and index the city table once; a failed load can be retried. */
export function loadCities(url = `${import.meta.env.BASE_URL}data/cities.json`): Promise<CityIndex> {
  if (!loading) {
    loading = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`Could not load the place list (${response.status})`)
        return response.json() as Promise<RawCities>
      })
      .then(buildCityIndex)
    loading.catch(() => {
      loading = null
    })
  }
  return loading
}
