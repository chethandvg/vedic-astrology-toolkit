"""Generate golden fixtures from the Python toolkit for the web engine's parity tests.

Run from the repository root with the toolkit's dependencies installed:
    python web/scripts/gen_fixtures.py
Writes web/tests/fixtures/*.json. Births are book examples plus seeded synthetic
cases; none is a real person's private data.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from __future__ import annotations

import json
import random
import sys
import zoneinfo
from pathlib import Path

import tzdata

# Use the tzdata package on every platform. Linux system zone files include
# 'backzone' history (e.g. Norway 1959 summer time) that the package and
# browsers' ICU data leave out, which would change pre-1970 fixtures.
zoneinfo.reset_tzpath(to=[])

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

import swisseph as swe  # noqa: E402
from vedic_toolkit import analysis, ashtakavarga as av, core as c, dashas, electional  # noqa: E402
from vedic_toolkit.astronomy import Ephemeris, Settings, local_time, to_jd  # noqa: E402

OUT = ROOT / 'web' / 'tests' / 'fixtures'
SIDM = {'lahiri': swe.SIDM_LAHIRI, 'raman': swe.SIDM_RAMAN, 'krishnamurti': swe.SIDM_KRISHNAMURTI}
ZONES = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Australia/Sydney', 'America/Sao_Paulo',
         'Asia/Tokyo', 'Africa/Johannesburg', 'Pacific/Auckland', 'Europe/Berlin', 'America/Los_Angeles',
         'Asia/Dubai', 'America/Anchorage', 'Asia/Kathmandu', 'Europe/Oslo']

BOOK = [
    {'id': 'book_example_118', 'datetime': '1967-03-08T17:40:00', 'timezone': 'UTC+05:30', 'latitude': 26.3, 'longitude': 73.06666666666666},
    {'id': 'book_example_50', 'datetime': '2000-04-28T05:50:00', 'timezone': 'UTC-04:00', 'latitude': 40.7128, 'longitude': -74.006},
    {'id': 'raman_1918', 'datetime': '1918-10-16T14:20:00', 'timezone': 'UTC+05:30', 'latitude': 12.9716, 'longitude': 77.5946},
]
EDGE = [
    # Ambiguous New York wall time on 2021-11-07 (fold 0 = EDT, fold 1 = EST).
    {'id': 'dst_ambiguous_fold0', 'datetime': '2021-11-07T01:30:00', 'timezone': 'America/New_York', 'fold': 0, 'latitude': 40.7128, 'longitude': -74.006},
    {'id': 'dst_ambiguous_fold1', 'datetime': '2021-11-07T01:30:00', 'timezone': 'America/New_York', 'fold': 1, 'latitude': 40.7128, 'longitude': -74.006},
    # India war time (+06:30) via the IANA zone.
    {'id': 'india_war_time', 'datetime': '1943-06-15T09:00:00', 'timezone': 'Asia/Kolkata', 'latitude': 19.076, 'longitude': 72.8777},
    # Local mean time given as an ISO offset with seconds.
    {'id': 'lmt_offset', 'datetime': '1901-02-03T06:15:00+05:10:20', 'latitude': 12.2958, 'longitude': 76.6394},
    # Southern hemisphere and high latitude (summer, sun still rises).
    {'id': 'south_sydney', 'datetime': '1985-07-20T23:15:00', 'timezone': 'Australia/Sydney', 'latitude': -33.87, 'longitude': 151.21},
    {'id': 'north_oslo', 'datetime': '1999-05-01T04:00:00', 'timezone': 'Europe/Oslo', 'latitude': 59.91, 'longitude': 10.75},
]
NONEXISTENT = {'id': 'dst_gap', 'datetime': '2021-03-14T02:30:00', 'timezone': 'America/New_York', 'latitude': 40.7, 'longitude': -74}
VARIANTS = [{'ayanamsa': 'raman', 'node': 'mean'}, {'ayanamsa': 'krishnamurti', 'node': 'true'}, {'ayanamsa': 'lahiri', 'node': 'true'}]


def synthetic(n: int, seed: int = 20261014) -> list[dict]:
    rng = random.Random(seed)
    out = []
    while len(out) < n:
        y = rng.randint(1900, 2100)
        spec = {
            'id': f'synthetic_{len(out):02d}',
            'datetime': f'{y:04d}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}T{rng.randint(0, 23):02d}:{rng.randint(0, 59):02d}:{rng.randint(0, 59):02d}',
            'timezone': rng.choice(ZONES),
            'latitude': round(rng.uniform(-60, 65), 4),
            'longitude': round(rng.uniform(-179.9, 179.9), 4),
        }
        try:
            local_time(spec['datetime'], spec['timezone'])
        except ValueError:
            continue  # skip nonexistent or ambiguous wall times
        out.append(spec)
    return out


def toolkit_spec(case: dict, settings: dict | None = None) -> dict:
    spec = {k: v for k, v in case.items() if k != 'id'}
    spec['settings'] = {'engine': 'moshier', 'ayanamsa': 'lahiri', 'node': 'mean', **(settings or {})}
    return spec


def dasha_rows(periods: list, birth_jd: float, days: float, depth: int) -> list:
    rows = []
    for p in periods:
        row = {'lord': p['lord'], 'start_jd': birth_jd + float(p['start_year']) * days, 'end_jd': birth_jd + float(p['end_year']) * days}
        if depth > 0 and p.get('children'):
            row['children'] = dasha_rows(p['children'], birth_jd, days, depth - 1)
        rows.append(row)
    return rows


def chart_fixture(case: dict, settings: dict | None, dasha_depth: int) -> dict:
    spec = toolkit_spec(case, settings)
    ch = analysis.chart(spec)
    jd = ch['julian_day_ut1']
    lon = {p: v['longitude'] for p, v in ch['positions'].items()}
    swe.set_sid_mode(SIDM[spec['settings']['ayanamsa']])
    ayan = swe.get_ayanamsa_ex_ut(jd, swe.FLG_MOSEPH)[1]
    vim = dashas.vimsottari(lon['Moon'], depth=dasha_depth)
    d1 = c.division(lon, 1)
    avk = av.calculate(d1)
    return {
        'id': case['id'] + ('' if not settings else '__' + '_'.join(settings.values())),
        'input': {k: v for k, v in case.items() if k != 'id'},
        'settings': spec['settings'],
        'jd': jd,
        'local_datetime': ch['local_datetime'],
        'ayanamsa_degrees': ayan,
        'positions': {p: {'longitude': v['longitude'], 'speed': v.get('speed_deg_day', 0.0), 'retrograde': v.get('retrograde', False),
                          'nakshatra': c.nakshatra(v['longitude'])} for p, v in ch['positions'].items()},
        'panchanga': {k: ch['panchanga'][k] for k in ('tithi', 'paksha', 'tithi_in_paksha', 'elongation', 'yoga_index', 'yoga', 'karana')},
        'nakshatra': ch['panchanga']['nakshatra'],
        'vargas': {n: c.division(lon, int(n[1:])) for n in ch['divisional_charts']},
        'sunrise_context': ch.get('sunrise_context'),
        'warnings': ch['warnings'],
        'vimsottari': {
            'savana': dasha_rows(vim, jd, 360.0, dasha_depth),
            'solar': dasha_rows(vim, jd, 365.2425, dasha_depth),
        },
        'ashtakavarga': {'BAV': {k: v for k, v in avk['BAV'].items() if k != 'Asc'}, 'SAV': avk['SAV']},
    }


def time_fixtures(cases: list[dict]) -> list[dict]:
    rows = []
    for case in cases + [NONEXISTENT]:
        try:
            dt = local_time(case['datetime'], case.get('timezone'), case.get('fold'))
            rows.append({'id': case['id'], 'input': {k: v for k, v in case.items() if k not in ('id', 'latitude', 'longitude')},
                         'utc_offset_minutes': dt.utcoffset().total_seconds() / 60, 'jd': to_jd(dt), 'error': None})
        except ValueError as e:
            rows.append({'id': case['id'], 'input': {k: v for k, v in case.items() if k not in ('id', 'latitude', 'longitude')}, 'error': str(e)})
    return rows


def tara_fixtures() -> list[dict]:
    rng = random.Random(7)
    rows = []
    for _ in range(60):
        moon, natal = rng.uniform(0, 360), rng.uniform(0, 360)
        t = electional.tara_assessment(moon, natal)
        rows.append({'moon': moon, 'natal_moon': natal, **t})
    return rows


def strength_and_yoga_fixtures(cases: list[dict]) -> tuple[list[dict], list[dict]]:
    """Natal strengths for every case; full yoga results for the first 30 (size)."""
    strengths, yogas = [], []
    for i, case in enumerate(cases):
        ch = analysis.chart(toolkit_spec(case))
        vim = ch['vimsopaka']
        strengths.append({
            'id': case['id'],
            'shadbala': ch['shadbala'],
            'vimsopaka': {g: {p: v['total'] for p, v in vim[g]['planets'].items()} for g in vim if isinstance(vim[g], dict) and 'planets' in vim[g]},
            'dignities': ch['dignities'],
            'combustion': ch['combustion'],
            'compound_relationships': ch['compound_relationships'],
            'functional_nature': ch['yoga_review'].get('functional_nature'),
        })
        if i < 30:
            yogas.append({'id': case['id'], 'rules': [{k: r[k] for k in ('name', 'pdf_page', 'category', 'status', 'conditions', 'participants') if k in r} for r in ch['yogas']['rules']]})
    return strengths, yogas


TAJAKA_KEYS = ('julian_day_ut1', 'local_datetime', 'return_details', 'muntha_sign', 'year_lord', 'year_lord_candidates', 'harsha_bala',
               'pancha_vargeeya', 'dwadasa_vargeeya', 'sahams', 'tajaka_yogas', 'mudda', 'patyayini')


def tajaka_fixtures(cases: list[dict]) -> list[dict]:
    """Annual (Tajaka) charts: book Example 118 (years 33 and 59) and three synthetic births."""
    picks = [(cases[0], 33), (cases[0], 59)] + [(c, 30) for c in cases[9:12]]
    rows = []
    for case, years in picks:
        r = analysis.solar_return(toolkit_spec(case), years)
        rows.append({'id': case['id'], 'completed_years': years, 'input': {k: v for k, v in case.items() if k != 'id'},
                     'positions': {p: v['longitude'] for p, v in r['positions'].items()},
                     **{k: r[k] for k in TAJAKA_KEYS if k in r}})
    return rows


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    cases = BOOK + EDGE + synthetic(40)
    charts = []
    for i, case in enumerate(cases):
        charts.append(chart_fixture(case, None, 2 if i < 8 else 1))
    for case in BOOK + EDGE[:2]:
        for v in VARIANTS:
            charts.append(chart_fixture(case, v, 0))
    meta = {'toolkit_version': '0.4.0', 'swisseph': swe.version, 'tzdata': tzdata.IANA_VERSION, 'generator': 'web/scripts/gen_fixtures.py', 'count': len(charts)}
    (OUT / 'charts.json').write_text(json.dumps({'meta': meta, 'charts': charts}, default=str, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n')
    (OUT / 'time.json').write_text(json.dumps({'meta': meta, 'cases': time_fixtures(cases)}, indent=1, default=str) + '\n', encoding='utf-8', newline='\n')
    (OUT / 'tara.json').write_text(json.dumps({'meta': meta, 'cases': tara_fixtures()}, indent=1, default=str) + '\n', encoding='utf-8', newline='\n')
    strengths, yogas = strength_and_yoga_fixtures(cases)
    compact = {'default': str, 'separators': (',', ':')}
    (OUT / 'strengths.json').write_text(json.dumps({'meta': meta, 'charts': strengths}, **compact) + '\n', encoding='utf-8', newline='\n')
    (OUT / 'yogas.json').write_text(json.dumps({'meta': meta, 'charts': yogas}, **compact) + '\n', encoding='utf-8', newline='\n')
    (OUT / 'tajaka.json').write_text(json.dumps({'meta': meta, 'returns': tajaka_fixtures(cases)}, **compact) + '\n', encoding='utf-8', newline='\n')
    print(f'wrote {len(charts)} chart fixtures to {OUT}')


if __name__ == '__main__':
    main()
