"""Reproducible full-strength audit; optional comparison with PyJHora 4.8.7.

Run: python audit_strengths.py --external
The external package is executed unchanged. A comparison is not a declaration
that different computational profiles are mathematically equivalent.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import argparse
import contextlib
from decimal import Decimal
import hashlib
from importlib.metadata import version
import io
import json
from pathlib import Path
from datetime import datetime, timezone
from vedic_toolkit import analysis, core as c

ROOT = Path(__file__).resolve().parent
COMPONENTS = ('sthana', 'kala', 'dig', 'chesta', 'naisargika', 'drik')
# Direct transcription of Raman, Graha and Bhava Balas, printed pp89-90.
# Deliberately retain the printed inconsistencies for independent arithmetic.
RAMAN_PRINTED = {
    'Sun': ['198', '102.98', '48.10', '0', '60', '15.86', '424.24'],
    'Moon': ['126.50', '202.04', '31.56', '0', '51.43', '-21.73', '389.80'],
    'Mars': ['172.06', '33.06', '55.70', '22.23', '17.14', '.95', '298.14'],
    'Mercury': ['279.50', '192.79', '21.09', '2.30', '25.70', '15.64', '537.02'],
    'Jupiter': ['157.58', '211.18', '11.50', '35.26', '34.28', '-16.03', '433.71'],
    'Venus': ['178.20', '115.53', '15.15', '5.95', '42.85', '18.47', '376.15'],
    'Saturn': ['177.30', '116.97', '58.02', '21.14', '8.37', '7.21', '389.21'],
}

def arithmetic_checks(result):
    rows = result['planets']; checks = []
    def check(name, observed, expected):
        checks.append({'check': name, 'observed': observed, 'expected': expected,
                       'passed': abs(observed-expected) <= 1e-9})
    for p, r in rows.items():
        check(p+':sthana_sum', sum(r['sthana_components'].values()), r['sthana'])
        check(p+':kala_sum', sum(r['kala_components'].values()), r['kala'])
        check(p+':six_component_sum', sum(r[k] for k in COMPONENTS), r['total_virupas'])
        check(p+':rupas', r['total_virupas']/60, r['rupas'])
        check(p+':required_ratio', r['total_virupas']/r['required_virupas'], r['ratio_to_requirement'])
        for k in ('dig', 'chesta'):
            checks.append({'check': p+':'+k+'_range', 'observed': r[k],
                           'expected_range': [0, 60], 'passed': 0 <= r[k] <= 60})
    check('natural_strength_sum', sum(r['naisargika'] for r in rows.values()), 240)
    check('war_transfer_conservation', sum(r['kala_components']['yuddha'] for r in rows.values()), 0)
    return checks

def printed_reference_audit():
    rows = []
    for p, raw in RAMAN_PRINTED.items():
        values = list(map(Decimal, raw)); total = sum(values[:6])
        rows.append({'planet': p, 'printed_components': dict(zip(COMPONENTS, raw)),
                     'printed_total': raw[6], 'sum_of_printed_components': str(total),
                     'difference_sum_minus_printed': str(total-values[6])})
    return {'source': 'B. V. Raman, Graha and Bhava Balas, 13th edition (1992)',
            'printed_pages': [89, 90], 'rows': rows,
            'adjudications': [
                'Sun: printed component sum 424.94 differs from total 424.24.',
                'Mars: final Kala 33.06 conflicts with earlier 30.06; 30.06 gives printed total 298.14.',
                'Saturn: natural strength is 60/7, approximately 8.57, not printed 8.37; 8.57 gives 389.21.',
                'Jupiter: displayed components total 433.77, not 433.71.',
                'Mercury: 537.02/60 = 8.950333... rupas, not printed 8.85.',
                'Rounding, historical inputs and other formula differences are retained, not fitted away.']}

def run(external=False):
    book = json.loads((ROOT/'examples/book_example_118.json').read_text())
    cases = [
        ('raman_1918', {'datetime': '1918-10-16T14:22:16+05:30', 'latitude': 13,
         'longitude': 77+35/60, 'settings': {'ayanamsa': 'raman', 'node': 'mean', 'engine': 'moshier'}}),
        ('rao_example118', book),
        ('rao_example118_return', {**book, 'datetime': '2000-03-08T04:41:11.969815+05:30'}),
    ]
    reference = None
    if external:
        with contextlib.redirect_stdout(io.StringIO()):
            from jhora import utils
            from jhora.panchanga import drik
            from jhora.horoscope.chart import strength
            utils.set_language('en')
        source = Path(strength.__file__)
        reference = {'name': 'PyJHora', 'version': version('PyJHora'),
                     'source_url': 'https://github.com/naturalstupid/PyJHora',
                     'strength_module_sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
                     'external_code_modified': False,
                     'astronomy_independent': False,
                     'note': 'Independent strength implementation; both engines use Swiss Ephemeris astronomy.'}
    results = []
    for name, spec in cases:
        own = analysis.chart(spec, False)['shadbala']
        record = {'case': name, 'input': spec, 'our_profile': own['profile'],
                  'arithmetic_checks': arithmetic_checks(own),
                  'our_totals': {p: r['total_virupas'] for p, r in own['planets'].items()}}
        if external:
            dt, _, lat, lon, _ = analysis.load_birth(spec)
            hour = dt.hour+dt.minute/60+(dt.second+dt.microsecond/1e6)/3600
            local_jd = utils.julian_day_number((dt.year, dt.month, dt.day), (hour, 0, 0))
            place = drik.Place(name, lat, lon, dt.utcoffset().total_seconds()/3600)
            with contextlib.redirect_stdout(io.StringIO()):
                drik.set_ayanamsa_mode(spec['settings']['ayanamsa'].upper())
                external_values = strength.shad_bala(local_jd, place)
                alternate_dig = strength._dig_bala_another(local_jd, place)
            comparisons = []
            for i, key in enumerate((*COMPONENTS, 'total_virupas')):
                for j, p in enumerate(c.SEVEN):
                    value = own['planets'][p][key]; other = float(external_values[i][j])
                    comparisons.append({'planet': p, 'component': key, 'ours': value,
                        'external': other, 'difference': value-other,
                        'within_0_05_virupa': abs(value-other) <= .05})
            record.update(comparisons=comparisons,
                external_dig_outside_formula_range=[c.SEVEN[i] for i,v in enumerate(external_values[2]) if not 0 <= v <= 60],
                external_chesta_outside_formula_range=[c.SEVEN[i] for i,v in enumerate(external_values[3]) if not 0 <= v <= 60],
                alternative_circular_dig_comparisons=[{'planet':p,'ours':own['planets'][p]['dig'],
                    'external_alternative':float(alternate_dig[i]),
                    'within_0_01_virupa':abs(own['planets'][p]['dig']-float(alternate_dig[i]))<=.01}
                    for i,p in enumerate(c.SEVEN)],
                external_alternative_circular_dig=dict(zip(c.SEVEN, map(float, alternate_dig))))
        results.append(record)
    checks = [r for case in results for r in case['arithmetic_checks']]
    total_comparisons = [r for case in results for r in case.get('comparisons', []) if r['component']=='total_virupas']
    alternatives = [r for case in results for r in case.get('alternative_circular_dig_comparisons', [])]
    return {'generated_utc': datetime.now(timezone.utc).isoformat(), 'status': 'audit_complete',
        'arithmetic_checks': len(checks), 'arithmetic_passed': sum(r['passed'] for r in checks),
        'external_reference': reference, 'external_total_comparisons': len(total_comparisons),
        'external_totals_within_0_05': sum(r['within_0_05_virupa'] for r in total_comparisons),
        'external_all_totals_agree': all(r['within_0_05_virupa'] for r in total_comparisons) if external else None,
        'alternative_circular_dig_comparisons':len(alternatives),
        'alternative_circular_dig_within_0_01':sum(r['within_0_01_virupa'] for r in alternatives),
        'printed_reference_audit': printed_reference_audit(), 'cases': results,
        'conclusion': 'Arithmetic and source audit completed. Full independent numerical equivalence is not established.',
        'comparison_limits': [
            'The 0.05-virupa threshold is a diagnostic display threshold, not an adjusted acceptance criterion.',
            'PyJHora native Dig uses an unwrapped longitude difference; its alternative circular routine is reported separately, never substituted into its totals.',
            'Native Cheshta also uses a linear longitude average and unwrapped difference; its out-of-range results are retained as failures of that reference formula.',
            'Hora, declination/Ayana, historical motional formulae, epoch and planetary-war policies can differ.',
            'Source errors and convention differences cannot be resolved by forcing one total to match another.',
            'These scores do not measure physical forces or demonstrate predictive accuracy.']}

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--external', action='store_true')
    args = parser.parse_args(); result = run(args.external)
    (ROOT/'strength_audit_results.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps({k: result[k] for k in ('status','arithmetic_checks','arithmetic_passed',
        'external_total_comparisons','external_totals_within_0_05','external_all_totals_agree')}, indent=2))
    raise SystemExit(0 if result['arithmetic_checks']==result['arithmetic_passed'] else 1)
