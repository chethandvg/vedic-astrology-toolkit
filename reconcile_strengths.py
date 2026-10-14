"""Attribute native PyJHora 4.8.7 differences without modifying its code.

This is a diagnostic decomposition, not a new independent validation claim.
Run with requirements-audit.txt installed: python reconcile_strengths.py
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import contextlib
import hashlib
import io
import json
from pathlib import Path
from importlib.metadata import version
from vedic_toolkit import analysis, core as c, strengths as st
from audit_strengths import COMPONENTS

ROOT=Path(__file__).resolve().parent

def run():
    with contextlib.redirect_stdout(io.StringIO()):
        from jhora import utils, const
        from jhora.panchanga import drik
        from jhora.horoscope.chart import strength, charts
        utils.set_language('en')
    if version('PyJHora')!='4.8.7':
        raise ValueError('This audit pins private functions to PyJHora 4.8.7')
    baseline=json.loads((ROOT/'strength_audit_results.json').read_text())
    source=Path(strength.__file__)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=baseline['external_reference']['strength_module_sha256']:
        raise ValueError('Reference source differs from the recorded native audit')
    cases=[]
    for old in baseline['cases']:
        spec=old['input']; own=analysis.chart(spec,False)['shadbala']
        dt,_,lat,lon,_=analysis.load_birth(spec)
        hour=dt.hour+dt.minute/60+(dt.second+dt.microsecond/1e6)/3600
        jd=utils.julian_day_number((dt.year,dt.month,dt.day),(hour,0,0))
        place=drik.Place(old['case'],lat,lon,dt.utcoffset().total_seconds()/3600)
        with contextlib.redirect_stdout(io.StringIO()):
            drik.set_ayanamsa_mode(spec['settings']['ayanamsa'].upper())
            native=strength.shad_bala(jd,place)
            pp=charts.rasi_chart(jd,place)[:const._pp_count_upto_ketu]
            d9=charts.divisional_chart(jd,place,divisional_chart_factor=9)[:const._pp_count_upto_ketu]
            pos={c.SEVEN[p]:h*30+deg for p,(h,deg) in pp[1:8]}
            sthana={
                'uchcha':strength._uchcha_bala(pp),
                'saptavargaja':strength._sapthavargaja_bala1(jd,place),
                'ojhayugma':strength._ojayugama_bala(pp,d9),
                'kendradi':strength._kendra_bala(pp),
                'drekkana':strength._dreshkon_bala(pp)}
            kala={key:getattr(strength,fn)(jd,place) for key,fn in {
                'nathonnatha':'_nathonnath_bala','paksha':'_paksha_bala','tribhaga':'_tribhaga_bala',
                'year':'_abdadhipathi','month':'_masadhipathi','weekday':'_vaaradhipathi',
                'hora':'_hora_bala','ayana':'_ayana_bala','yuddha':'_yuddha_bala'}.items()}
            circular_dig=strength._dig_bala_another(jd,place)
            ayan=drik.get_ayanamsa_value(jd)
            tropical_unwrapped={p:pos[p]+ayan for p in c.SEVEN}
            # Same raw inputs as the native use_epoch_table=True motional call.
            sun_mean=strength.get_planet_mean_longitude(jd,place,0)
            motions={}
            for i,p in enumerate(c.SEVEN[2:],2):
                m=strength.get_planet_mean_longitude_using_epoch_table(jd,place,i)
                mean,seeghra=(sun_mean,m) if p in ('Mercury','Venus') else (m,sun_mean)
                circular=st.chesta_bala(mean,pos[p],seeghra)
                motions[p]={'external_mean':mean,'external_true':pos[p],'external_seeghrochcha':seeghra,
                    'external_native':native[3][i],'our_circular_formula_on_external_inputs':circular,
                    'native_minus_circular':native[3][i]-circular,
                    'circular_minus_our_chart':circular-own['planets'][p]['chesta']}
        detail=[]
        for i,p in enumerate(c.SEVEN):
            ours=own['planets'][p]
            sub=[]
            for family,data in [('sthana',sthana),('kala',kala)]:
                for key,values in data.items():
                    sub.append({'family':family,'term':key,'ours':ours[family+'_components'][key],
                        'external':float(values[i]),'difference':ours[family+'_components'][key]-float(values[i])})
            differences={k:ours[k]-native[j][i] for j,k in enumerate(COMPONENTS)}
            total_difference=ours['total_virupas']-native[6][i]
            residual=total_difference-sum(differences.values())
            external_subtotal_residuals={family:float(native[j][i])-sum(float(v[i]) for v in data.values())
                for j,family,data in [(0,'sthana',sthana),(1,'kala',kala)]}
            # Diagnostic only: changing two formulas does not validate all others.
            corrected_chesta=motions[p]['our_circular_formula_on_external_inputs'] if p in motions else native[3][i]
            angle_adjusted=native[6][i]-native[2][i]-native[3][i]+circular_dig[i]+corrected_chesta
            detail.append({'planet':p,'subcomponents':sub,'component_differences':differences,
                'native_total_difference':total_difference,'decomposition_residual':residual,
                'decomposition_closes_within_0_011':abs(residual)<=.011,
                'external_subtotal_rounding_residuals':external_subtotal_residuals,
                'angle_adjusted_diagnostic_total':angle_adjusted,
                'our_total_minus_angle_adjusted':ours['total_virupas']-angle_adjusted,
                'angle_adjusted_is_independent_validation':False})
        cases.append({'case':old['case'],'input':spec,'planets':detail,'motion_diagnostics':motions,
            'our_wars':own['planetary_wars'],
            'external_war_recipients':[c.SEVEN[i] for i,v in enumerate(kala['yuddha']) if v],
            'external_ayana_longitudes_requiring_wrap':{p:x for p,x in tropical_unwrapped.items() if not 0<=x<360},
            'external_paksha_outside_range':[c.SEVEN[i] for i,v in enumerate(kala['paksha']) if not 0<=v<=(120 if i==1 else 60)]})
    allrows=[r for case in cases for r in case['planets']]
    return {'version':'0.4.0','external_reference':baseline['external_reference'],
        'cases':cases,'total_differences_decomposed':len(allrows),
        'decompositions_closed':sum(r['decomposition_closes_within_0_011'] for r in allrows),
        'kala_subcomponent_comparisons':len(allrows)*9,'sthana_subcomponent_comparisons':len(allrows)*5,
        'interpretation':'Every native total difference is attributed to explicit component deltas, allowing rounded external sums. Attribution is not proof that either complete total is correct.',
        'findings':[
            {'term':'Dig','classification':'reference_angle_error','evidence':'Native absolute longitude subtraction can exceed 180 degrees; its built-in circular alternative is reported separately.'},
            {'term':'Cheshta','classification':'reference_angle_error_and_input_difference','evidence':'Native midpoint is linear and final angle unwrapped. Separate circular-formula output retains external historical mean-motion inputs.'},
            {'term':'Hora','classification':'different_convention','evidence':'Our 12 daytime/12 nighttime temporal hours differ from external elapsed civil-hour arithmetic.'},
            {'term':'Ayana','classification':'reference_wrap_error_and_different_interpolation','evidence':'External declination_of_planets tests north/south before normalizing sidereal longitude plus ayanamsa; values >=360 receive the wrong hemisphere. Its inverse-Lagrange interpolation also differs from our six piecewise linear segments. Neither is modern physical declination.'},
            {'term':'Yuddha','classification':'different_pair_selection','evidence':'Our eligible pairs require <1 degree; native closest-pair routine has no 1-degree cutoff and can discard all wars if a luminary is closest.'},
            {'term':'Paksha','classification':'reference_angle_risk_and_nature_convention','evidence':'Native Sun-Moon absolute subtraction is unwrapped. Actual range violations and signed classifications are not silently corrected.'},
            {'term':'Sthana','classification':'inspect_subcomponent_residuals','evidence':'Degree-zone, varga and rounding policies are visible term by term; no aggregate match is asserted.'}],
        'full_independent_equivalence_established':False}

if __name__=='__main__':
    result=run()
    (ROOT/'strength_reconciliation.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:result[k] for k in ('total_differences_decomposed','decompositions_closed',
        'kala_subcomponent_comparisons','sthana_subcomponent_comparisons','full_independent_equivalence_established')},indent=2))
    raise SystemExit(0 if result['decompositions_closed']==result['total_differences_decomposed'] else 1)
