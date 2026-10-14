"""Deterministic execution/condition coverage for every D1 catalog entry.

Synthetic charts are software probes, often not realizable planetary positions.
Coverage is NOT independent source verification or prediction validation.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import argparse
import hashlib
import json
import random
from pathlib import Path
from vedic_toolkit import core as c, yogas
from vedic_toolkit.analysis import clean
from tests.test_extensions import sample

ROOT=Path(__file__).resolve().parent

def run(count=500,seed=20261014):
    rng=random.Random(seed);cases=[]
    # Eight source prose illustrations, with invented filler for unspecified bodies.
    illustrations=[
        ('Vesi',107,{'Sun':65,'Jupiter':97,'Mercury':99}),
        ('Vosi',107,{'Sun':5,'Jupiter':337,'Venus':339}),
        ('Ubhayachara',107,{'Sun':95,'Mars':127,'Venus':67}),
        ('Sunaphaa',108,{'Moon':65,'Jupiter':97,'Mercury':99}),
        ('Anaphaa',108,{'Moon':5,'Jupiter':337,'Venus':339}),
        ('Duradhara',108,{'Moon':95,'Mars':127,'Venus':67}),
        ('Maalaa',112,{'Asc':5,'Jupiter':97,'Venus':277,'Mercury':187}),
        ('Sarpa',112,{'Asc':215,'Mars':37,'Rahu':127,'Ketu':307})]
    for name,page,positions in illustrations:
        cases.append({'id':'source_'+name,'kind':'source_placement_with_synthetic_filler',
            'source_pdf_page':page,'expected_met':name,'longitudes':sample(**positions),'options':{}})
    # Deliberately constructed examples of the source definitions, not examples
    # independently published by the author. They are never counted above.
    directed=[
        ('Adhi',dict(Moon=5,Mercury=155,Jupiter=187,Venus=217,Sun=65)),
        ('Sreenaatha',dict(Asc=245,Mercury=165,Sun=155)),
        ('Khadga',dict(Asc=5,Venus=245,Jupiter=35,Mars=15)),
        ('Kusuma',dict(Asc=35,Venus=37,Moon=155,Jupiter=157,Saturn=305,Sun=5)),
        ('Hara',dict(Asc=5,Venus=5,Mercury=95,Jupiter=245,Moon=215,Sun=125)),
        ('Brahma',dict(Asc=5,Mars=5,Mercury=95,Jupiter=275,Venus=305)),
        ('Siva',dict(Asc=5,Sun=245,Jupiter=275,Saturn=125)),
        ('Gouri',dict(Asc=245,Mercury=167,Jupiter=158)),
        ('Chandikaa',dict(Asc=35,Venus=220,Saturn=181,Sun=222)),
        ('Saarada',dict(Asc=5,Saturn=125,Sun=128,Mercury=95,Moon=335,Mars=305)),
        ('Devendra',dict(Asc=35,Mercury=305,Saturn=65,Venus=335,Jupiter=35)),
        ('Indra',dict(Asc=5,Sun=305,Saturn=125,Moon=128)),
        ('Ravi',dict(Asc=5,Sun=275,Saturn=65)),
        ('Gandharva',dict(Asc=125,Venus=185,Sun=10,Jupiter=250,Moon=10)),
        ('Go',dict(Asc=125,Mercury=245,Jupiter=247,Sun=10)),
        ('Vidyut',dict(Asc=35,Jupiter=95,Venus=99)),
        ('Chapa',dict(Asc=5,Moon=275,Saturn=95,Mars=298)),
        ('Pushkala',dict(Asc=5,Mars=185,Moon=187,Venus=195,Jupiter=5)),
        ('Makuta',dict(Asc=5,Jupiter=245,Saturn=275,Venus=125)),
        ('Jaya',dict(Asc=5,Saturn=200,Mercury=335))]
    directed += [
        ('Vajra',dict(Asc=5,Sun=95,Mars=275,Saturn=100,Moon=280,Mercury=10,Venus=190,Jupiter=15,Rahu=35,Ketu=215)),
        ('Yava',dict(Asc=5,Sun=10,Moon=5,Mars=185,Saturn=190,Mercury=95,Venus=275,Jupiter=100,Rahu=35,Ketu=215)),
        ('Makuta',dict(Asc=35,Saturn=305,Jupiter=185,Venus=65)),
        ('advanced_raaja_02',dict(Asc=5,Sun=28,Moon=12,Mars=145,Mercury=27,Jupiter=26.5,Venus=26,Saturn=70,Rahu=115,Ketu=295)),
        ('advanced_raaja_04',dict(Asc=5,Mars=269,Mercury=275,Venus=335,Jupiter=5)),
        ('advanced_raaja_15',dict(Asc=35,Moon=1,Sun=190,Mercury=185,Venus=180,Saturn=305,Mars=275,Jupiter=245)),
        ('daridra_02',dict(Asc=65,Mercury=215,Mars=65,Moon=217,Jupiter=245)),
        ('daridra_05',dict(Asc=65,Venus=215,Saturn=35,Moon=40,Jupiter=155)),
        ('Koorma',dict(Asc=5,Sun=41,Moon=191,Mars=11,Mercury=71,Jupiter=131,Venus=161,Saturn=311,Rahu=71,Ketu=251))]
    for name,positions in directed:
        cases.append({'id':'directed_'+name,'kind':'synthetic_rule_probe','longitudes':sample(**positions),
            'options':{'strong':{p:True for p in c.SEVEN}}})
    fifth=[('Sun',['Saturn','Moon','Jupiter']),('Mercury',['Moon','Mars','Jupiter']),('Venus',['Mars']),
        ('Mars',['Venus']),('Jupiter',['Mercury']),('Saturn',['Sun','Moon']),('Saturn',['Sun','Moon']),
        ('Jupiter',['Mercury']),('Mars',['Venus']),('Venus',['Mars']),('Mercury',['Moon','Mars','Jupiter']),('Moon',['Saturn'])]
    required={'Sun':['Mars','Jupiter'],'Moon':['Mercury','Jupiter'],'Mars':['Mercury','Venus','Saturn'],
        'Mercury':['Jupiter','Saturn'],'Jupiter':['Mars','Mercury'],'Venus':['Mercury','Saturn'],'Saturn':['Mars','Jupiter']}
    for asc,(p,others) in enumerate(fifth):
        ll=sample(Asc=asc*30+3,**{p:((asc+4)%12)*30+5},**{q:((asc+10)%12)*30+8+j for j,q in enumerate(others)})
        cases.append({'id':f'directed_dhana_{asc}_5_11','kind':'synthetic_rule_probe','longitudes':ll,'options':{}})
        owner=c.LORDS[asc];ll=sample(Asc=asc*30+3,**{q:asc*30+6+j for j,q in enumerate([owner]+required[owner])})
        cases.append({'id':f'directed_dhana_{asc}_asc','kind':'synthetic_rule_probe','longitudes':ll,'options':{}})
    # Shape and occupancy probes cover rare geometry that random draws miss.
    shapes=[(1,7),(4,10),(1,5,9),(2,6,10),(1,4),(4,7),(7,10),(10,1),
        (1,4,7,10),(2,5,8,11),(3,6,9,12),(1,2,3,4),(4,5,6,7),(7,8,9,10),
        (10,11,12,1),(1,2,3,4,5,6,7),(4,5,6,7,8,9,10),(7,8,9,10,11,12,1),
        (10,11,12,1,2,3,4),(2,3,4,5,6,7,8),(1,3,5,7,9,11),(2,4,6,8,10,12),
        (1,),(1,2),(1,2,3),(1,2,3,5),(1,2,3,5,6),(1,2,3,5,6,8),(1,2,3,5,6,8,10)]
    for i,hs in enumerate(shapes):
        ll=sample(**{p:30*(hs[j%len(hs)]-1)+j+1 for j,p in enumerate(c.SEVEN)})
        cases.append({'id':f'shape_{i}','kind':'synthetic_geometry','longitudes':ll,'options':{}})
    # For every ascendant: own/exalted lord configurations and random degrees.
    for i in range(count):
        asc=i%12;ll={'Asc':asc*30+rng.uniform(1,29)}
        for j,p in enumerate(c.PLANETS):
            sign=rng.randrange(12)
            if i%5==0:sign=c.EXALT[p]
            elif i%5==1:sign=rng.choice([s for s in range(12) if c.LORDS[s]==p]) if p in c.SEVEN else sign
            ll[p]=sign*30+rng.uniform(.01,29.99)
        ll['Ketu']=(ll['Rahu']+180)%360
        opts={'strong':{p:bool(i%2) for p in c.SEVEN}} if i%3 else {}
        if i%4:opts['points']={'HL':rng.uniform(0,360),'GL':rng.uniform(0,360)}
        if i%11==0:
            for p in c.SEVEN:ll[p]=30*c.sign(ll[p])+10 # force karaka tie
        if i%13==0:ll['Saturn']=c.sign(ll['Saturn'])*30+20 # deep exaltation opportunities
        cases.append({'id':f'synthetic_{i}','kind':'synthetic','longitudes':ll,'options':opts})
    inventory={};source_checks=[];failures=[]
    for case in cases:
        result=yogas.evaluate(case['longitudes'],**case['options'])
        for r in result['rules']:
            item=inventory.setdefault(r['name'],{'name':r['name'],'pdf_page':r['pdf_page'],'category':r['category'],
                'status_witnesses':{},'conditions':{},'independent_complete_fixture':False})
            item['status_witnesses'].setdefault(r['status'],case['id'])
            for field in ('conditions','qualifications'):
                for key,value in r.get(field,{}).items():
                    if value is not None and type(value) is not bool:failures.append([case['id'],r['name'],key,'non_boolean'])
                    item['conditions'].setdefault(field+'.'+key,{}).setdefault(str(value),case['id'])
            if r['name']==case.get('expected_met'):
                source_checks.append({'case':case['id'],'rule':r['name'],'pdf_page':case['source_pdf_page'],
                    'expected':'conditions_met','observed':r['status'],'passed':r['status']=='conditions_met'})
        if result['rules_checked']!=170 or len({r['name'] for r in result['rules']})!=170:
            failures.append([case['id'],'catalog_inventory'])
    for item in inventory.values():
        item['both_met_and_not_met_observed']=all(s in item['status_witnesses'] for s in ('conditions_met','conditions_not_met'))
        item['condition_branches_without_both_true_false']=[k for k,v in item['conditions'].items() if not {'True','False'}<=set(v)]
        if item['name']=='Gola':
            item['logical_profile_conflict']='With seven-body Ashraya and literal all-Nabhasa precedence, one occupied sign always triggers Rajju/Musala/Nala; Gola cannot become operative. Count is still reported.'
        if item['name']=='advanced_raaja_07':
            item['logical_profile_conflict']='The selected Parashari D2 maps Asc and every planet only to Cancer/Leo. No implemented full graha aspect reaches the same or adjacent sign, so six-chart aspect conjunction including D2 cannot be met.'
        if item['name']=='advanced_raaja_13':
            item['logical_profile_conflict']='Exchange places fourth/tenth lords opposite each other. No classical full graha-aspect set contains an opposite pair. The same 5th/9th lord cannot aspect both; the wording may instead permit different aspecting lords, which is not selected silently.'
        if item['name']=='advanced_raaja_17':
            item['logical_profile_conflict']='With opposite Rahu/Ketu included as malefics, both cannot occupy the set of houses {3,6,11}; no two members are opposite. Seven-body interpretation is a different option.'
        if item['name']=='Kulavardhana':
            item['logical_profile_conflict']='Including Sun and Moon constrains allowable fifth-from-reference signs to a subset of a trine set. Opposite Rahu/Ketu cannot both belong to it. Seven-body interpretation is a different option.'
    payload={'seed':seed,'random_case_count':count,'cases_executed':len(cases),
        'rule_evaluations':170*len(cases),'rules_inventoried':len(inventory),
        'rules_with_both_met_and_not_met':sum(r['both_met_and_not_met_observed'] for r in inventory.values()),
        'source_placement_checks':source_checks,'source_placement_checks_passed':sum(x['passed'] for x in source_checks),
        'failures':failures,'rules':list(inventory.values()),'cases':cases,
        'scope':'Complete inventory and reproducible execution coverage; not exhaustive branch coverage. Eight partial source illustrations use synthetic filler. Other cases are not independent expected answers.',
        'uncovered_conditions_are_not_waived':True,'predictive_validation':False}
    payload['case_manifest_sha256']=hashlib.sha256(json.dumps(cases,sort_keys=True).encode()).hexdigest()
    return payload

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--count',type=int,default=500)
    args=parser.parse_args()
    if not 1<=args.count<=10000:parser.error('count must be 1..10000')
    result=run(args.count)
    (ROOT/'yoga_audit_results.json').write_text(json.dumps(clean(result),indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:result[k] for k in ('cases_executed','rule_evaluations','rules_inventoried','rules_with_both_met_and_not_met','source_placement_checks_passed','failures')},indent=2))
    raise SystemExit(0 if not result['failures'] and result['source_placement_checks_passed']==8 else 1)
