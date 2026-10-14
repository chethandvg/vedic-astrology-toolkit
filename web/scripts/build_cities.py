"""Build web/public/data/cities.json from the GeoNames gazetteer.

Downloads cities15000.zip, admin1CodesASCII.txt and countryInfo.txt from
https://download.geonames.org/export/dump/ into a fresh web/.cache-cities/
directory (gitignored) and writes a compact table for the birth-place search
(src/lib/cities.ts). Keeps every place of at least 15,000 people plus every
Indian place in the file.

GeoNames data is licensed CC BY 4.0 (https://www.geonames.org/); the app
credits it on the About page and in public/data/ATTRIBUTION.md.

Output format, version 1. Repeated strings are interned to keep it small:
    {"v": 1, "source": "...",
     "countries": ["India", ...], "admin1": ["Karnataka", ...], "zones": ["Asia/Kolkata", ...],
     "regions": [[admin1, country, zone], ...],
     "cities": [[names, region, lat, lon, thousands], ...]}
    names       "|"-separated: the GeoNames name first, then the ASCII name when it
                differs from the diacritic-folded name, then selected alternates
    admin1      index into "admin1", or -1 when GeoNames has no first-level division
    country     index into "countries"; zone: index into "zones" (IANA)
    region      index into "regions"
    lat, lon    degrees rounded to 4 decimals (about 11 m)
    thousands   GeoNames population in thousands (rounded; ranking only);
                rows are sorted by population, largest first

Run from the repository root (add --cached to reuse an earlier download):
    python -I web/scripts/build_cities.py
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import gzip
import json
import shutil
import sys
import unicodedata
import urllib.request
import zipfile
from pathlib import Path

BASE_URL = 'https://download.geonames.org/export/dump/'
FILES = ('cities15000.zip', 'admin1CodesASCII.txt', 'countryInfo.txt')
WEB = Path(__file__).resolve().parent.parent
CACHE = WEB / '.cache-cities'
OUT = WEB / 'public' / 'data' / 'cities.json'
MIN_POPULATION = 15000
# Every listed place is kept for these countries: the app's main audience is in India.
KEEP_ALL = {'IN'}
# GeoNames alternates carry no language or popularity flags, so widely used
# former, English and local names are listed here and always kept, with this
# display spelling, when GeoNames has them for a place. Both directions of each
# Indian renaming appear because GeoNames uses the new name for some cities and
# the old one for others.
WELL_KNOWN_SPELLINGS = (
    'Allahabad', 'Alleppey', 'Ballari', 'Banaras', 'Bangalore', 'Baroda', 'Belagavi', 'Belgaum', 'Bellary',
    'Benares', 'Bengaluru', 'Bezwada', 'Bhubaneshwar', 'Bijapur', 'Bombay', 'Calcutta', 'Calicut', 'Cannanore',
    'Cawnpore', 'Chennai', 'Cochin', 'Gauhati', 'Gulbarga', 'Gurgaon', 'Gurugram', 'Hubballi', 'Hubli',
    'Jubbulpore', 'Kalaburagi', 'Kashi', 'Kochi', 'Kolkata', 'Kozhikode', 'Madras', 'Mangalore', 'Mangaluru',
    'Mumbai', 'Mysore', 'Mysuru', 'Ooty', 'Palghat', 'Pondicherry', 'Poona', 'Prayagraj', 'Puducherry', 'Quilon',
    'Shimoga', 'Shivamogga', 'Simla', 'Tanjore', 'Thiruvananthapuram', 'Trichur', 'Trichy', 'Trivandrum',
    'Tumakuru', 'Tumkur', 'Varanasi', 'Vijayapura', 'Vizag', 'Waltair',
    'Antwerpen', 'Beograd', 'Brussel', 'Bruxelles', 'București', 'Canton', 'Den Haag', 'Firenze', 'Genève',
    'Genova', 'Kiev', 'København', 'Köln', 'Kyiv', 'Lisboa', 'Milano', 'Moskva', 'München', 'Napoli', 'Peking',
    'Praha', 'Rangoon', 'Roma', 'Saigon', 'Torino', 'Venezia', 'Warszawa', 'Wien',
)
# Letters that Unicode decomposition leaves alone, as LETTERS in src/lib/cities.ts.
LETTERS = {'ø': 'o', 'đ': 'd', 'ł': 'l', 'ß': 'ss', 'æ': 'ae', 'œ': 'oe', 'ı': 'i', 'þ': 'th', 'ð': 'd', 'ħ': 'h'}


def alternate_budget(population, country):
    """How many alternate names a place may carry, sized to keep the file
    under 1.5 MB. Indian cities get the most; elsewhere the GeoNames name is
    already the English one and only big cities need more."""
    if country in KEEP_ALL:
        return 6 if population >= 100_000 else 2
    if population >= 1_000_000:
        return 3
    return 1 if population >= 300_000 else 0


def fold(text):
    """Lower-case without diacritics, as foldName() in src/lib/cities.ts (which
    also normalises punctuation; that difference only affects de-duplication)."""
    decomposed = unicodedata.normalize('NFKD', text)
    plain = ''.join(ch for ch in decomposed if not unicodedata.combining(ch)).lower().strip()
    return ''.join(LETTERS.get(ch, ch) for ch in plain)


WELL_KNOWN = {fold(s): s for s in WELL_KNOWN_SPELLINGS}


def is_plain_name(text):
    """A capitalised Latin-script name of at most two words. This drops airport
    codes, consonant-only transliterations ("bmbyy") and phrases such as
    "Lungsod ng Mumbai" ("City of Mumbai") that GeoNames lists as alternates."""
    if not 3 <= len(text) <= 32 or not text[0].isupper() or len(text.split()) > 2:
        return False
    if text.isupper() and len(text) <= 5:
        return False
    return all(unicodedata.combining(ch) or ch in " -'." or 'a' <= ch.lower() <= 'z' or ch.lower() in LETTERS
               for ch in unicodedata.normalize('NFKD', text))


def select_alternates(name_keys, alternates, budget):
    """Alternates that widen a prefix search, best first: well-known names, then
    spellings GeoNames also lists in plain ASCII (English-style romanisations
    rather than minor-language forms), then the most corroborated (most raw
    alternates they extend), then the shortest. A spelling that is a prefix of
    another kept spelling or of the name adds nothing to a prefix search, so
    only the longest of each chain is kept unless the shorter one is well known."""
    forms = {}
    for alt in alternates:
        if is_plain_name(alt):
            key = fold(alt)
            # Display the well-known spelling, else prefer plain ASCII (Bombejus over Bombėjus).
            if key in WELL_KNOWN:
                forms[key] = WELL_KNOWN[key]
            elif key not in forms or (alt.isascii() and not forms[key].isascii()):
                forms[key] = alt
    keys = [k for k in forms if not any(n.startswith(k) or k.startswith(n) for n in name_keys)]
    famous = [k for k in keys if k in WELL_KNOWN]
    kept = famous + [k for k in keys if k not in WELL_KNOWN and not any(k.startswith(f) for f in famous)
                     and not any(o != k and o.startswith(k) for o in keys)]
    support = {k: sum(1 for o in keys if k.startswith(o)) for k in kept}
    kept.sort(key=lambda k: (k not in WELL_KNOWN, not forms[k].isascii(), -support[k], len(k), k))
    return [forms[k] for k in kept[:budget]]


def download():
    if CACHE.exists():
        shutil.rmtree(CACHE)
    CACHE.mkdir(parents=True)
    for name in FILES:
        request = urllib.request.Request(BASE_URL + name, headers={'User-Agent': 'jyotish-daily-build/1.0'})
        with urllib.request.urlopen(request, timeout=120) as response:
            (CACHE / name).write_bytes(response.read())
        print(f'downloaded {name}: {(CACHE / name).stat().st_size:,} bytes')


def read_countries():
    names = {}
    for line in (CACHE / 'countryInfo.txt').read_text(encoding='utf-8').splitlines():
        if line and not line.startswith('#'):
            cols = line.split('\t')
            names[cols[0]] = cols[4]
    return names


def read_admin1():
    names = {}
    for line in (CACHE / 'admin1CodesASCII.txt').read_text(encoding='utf-8').splitlines():
        if line:
            code, name = line.split('\t')[:2]
            names[code] = name
    return names


def read_cities():
    with zipfile.ZipFile(CACHE / 'cities15000.zip') as archive:
        text = archive.read('cities15000.txt').decode('utf-8')
    for line in text.splitlines():
        cols = line.split('\t')
        if len(cols) >= 19:
            yield cols


class Interner:
    def __init__(self):
        self.values, self.index = [], {}

    def __call__(self, value):
        if value not in self.index:
            self.index[value] = len(self.values)
            self.values.append(value)
        return self.index[value]


def build():
    countries, admin1 = read_countries(), read_admin1()
    country_ids, admin_ids, zone_ids, region_ids = Interner(), Interner(), Interner(), Interner()
    rows = []
    for cols in read_cities():
        name, ascii_name, alt_text = cols[1], cols[2], cols[3]
        cc, a1, tz, pop = cols[8], cols[10], cols[17], int(cols[14] or 0)
        if not tz or cc not in countries or (pop < MIN_POPULATION and cc not in KEEP_ALL):
            continue
        names = [name] if fold(ascii_name) == fold(name) else [name, ascii_name]
        names += select_alternates([fold(n) for n in names], alt_text.split(','), alternate_budget(pop, cc))
        admin_name = admin1.get(f'{cc}.{a1}')
        region = (admin_ids(admin_name) if admin_name else -1, country_ids(countries[cc]), zone_ids(tz))
        rows.append((pop, ['|'.join(names), region_ids(region), round(float(cols[4]), 4), round(float(cols[5]), 4), round(pop / 1000)]))
    rows.sort(key=lambda r: (-r[0], r[1][0]))
    return {
        'v': 1,
        'source': 'GeoNames cities15000, admin1CodesASCII and countryInfo (https://www.geonames.org/), CC BY 4.0',
        'countries': country_ids.values,
        'admin1': admin_ids.values,
        'zones': zone_ids.values,
        'regions': [list(r) for r in region_ids.values],
        'cities': [row for _, row in rows],
    }


def main():
    if '--cached' not in sys.argv[1:] or not CACHE.exists():
        download()
    data = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        # One city per line keeps diffs reviewable at a small size cost.
        head = {k: v for k, v in data.items() if k != 'cities'}
        f.write(json.dumps(head, ensure_ascii=False, separators=(',', ':'))[:-1] + ',"cities":[\n')
        f.write(',\n'.join(json.dumps(r, ensure_ascii=False, separators=(',', ':')) for r in data['cities']))
        f.write('\n]}\n')
    raw = OUT.stat().st_size
    packed = len(gzip.compress(OUT.read_bytes(), compresslevel=9))
    indian = sum(1 for r in data['cities'] if data['countries'][data['regions'][r[1]][1]] == 'India')
    print(f'{len(data["cities"]):,} places ({indian:,} in India), {len(data["regions"]):,} regions, {len(data["zones"])} zones')
    print(f'wrote {OUT.relative_to(WEB).as_posix()}: {raw:,} bytes raw, {packed:,} bytes gzip')
    if raw > 1_500_000:
        print('warning: above the 1.5 MB raw target', file=sys.stderr)


if __name__ == '__main__':
    main()
