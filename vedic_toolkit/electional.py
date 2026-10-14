"""Transparent screening of sampled electional times using Table 79.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from . import core as c
from .astronomy import from_jd
from .strengths import benefic_classification

COMMON=(1,4,5,7,8,12,13,14,15,17,21,22,23,24,26,27)
WEEK=(1,3,4,5)
GUIDELINES={
 'house_construction':{'tithis':(2,3,5,7,11,13,15),'weekdays':WEEK,'ascendants':(1,2,5,8,10,11),'optional_ascendants':(4,7),'nakshatras':tuple(n for n in COMMON if n!=8)},
 'house_entry':{'tithis':(2,3,5,7,10,11,13,15),'weekdays':WEEK,'ascendants':(1,2,4,5,7,8,10,11),'nakshatras':(4,5,12,14,17,21,23,24,26,27)},
 'naming_child':{'tithis':(2,3,5,7,10,11,13),'weekdays':(0,1,3,4,6),'ascendants':'benefic_owned','nakshatras':COMMON},
 'first_rice':{'tithis':(2,3,5,7,10,13,15),'weekdays':(0,1,3,4,5),'ascendants':'benefic_owned','nakshatras':COMMON},
 'alphabet':{'tithis':(2,3,5,7,10,11,12),'weekdays':WEEK,'ascendants':(2,5,8,11),'nakshatras':(1,7,13,14,15,17,22,27),'optional_nakshatras':(5,6,23,24)},
 'sacred_thread':{'tithis':(2,3,5,10,11),'optional_tithis':(6,12),'weekdays':WEEK,'ascendants':'benefic_owned','nakshatras':COMMON},
 'wedding':{'tithis':(2,3,5,7,10,11,12,13,15),'weekdays':WEEK,'ascendants':'benefic_owned','nakshatras':(4,5,10,12,13,15,17,19,21,26,27)},
 'placing_idols':{'tithis':(2,3,5,7,8,10,11,12,13),'weekdays':(0,1,3,4,5),'ascendants':(1,2,4,5,7,8,10,11),'nakshatras':COMMON}}

def assess(longitudes,weekday_sunday0,task,natal_moon=None,include_optional=False):
    if task not in GUIDELINES:raise ValueError('Choose a Table 79 task')
    g=GUIDELINES[task];s=c.division(longitudes,1);pp=c.panchanga(longitudes['Sun'],longitudes['Moon'])
    nak=c.nakshatra(longitudes['Moon'])['index'];tithi=(pp['tithi']-1)%15+1
    def allowed(k):return set(g[k])|set(g.get('optional_'+k,()) if include_optional else ())
    good=benefic_classification(longitudes)['benefics']
    asc_ok=c.LORDS[s['Asc']] in good if g['ascendants']=='benefic_owned' else s['Asc'] in allowed('ascendants')
    conditions={'tithi':tithi in allowed('tithis'),'weekday':weekday_sunday0 in g['weekdays'],
        'ascendant':asc_ok,'nakshatra':nak in allowed('nakshatras')}
    tara=None if natal_moon is None else (nak-c.nakshatra(natal_moon)['index'])%27%9+1
    return {'task':task,'conditions':conditions,'all_table_guidelines_met':all(conditions.values()),
        'tithi_in_paksha':tithi,'paksha':pp['paksha'],'nakshatra_index':nak,'ascendant':c.SIGNS[s['Asc']],
        'tara_number':tara,'natal_hora_lord_assessment':'requires natal task-specific judgment',
        'optional_table_entries_included':include_optional,
        'meaning':'Table screening only; natal promise, strength and task-specific factors remain separate.'}

def search(spec,task,start,end,step_minutes=5,include_optional=False,natal_moon=None):
    from .analysis import load_birth
    from .astronomy import local_time,to_jd
    dt,_,lat,lon,eph=load_birth(spec)
    a=to_jd(local_time(start,spec.get('timezone')));b=to_jd(local_time(end,spec.get('timezone')))
    if not 0<b-a<=31 or not 1<=step_minutes<=60:raise ValueError('Window 0..31 days; step 1..60 minutes')
    rows=[];failures=[];count=0
    for i in range(int((b-a)*1440/step_minutes)+1):
        t=a+i*step_minutes/1440
        if t>=b:break
        count+=1
        try:
            context=eph.sunrise_context(t,lat,lon,dt.tzinfo)
            ll={p:v['longitude'] for p,v in eph.positions(t,lat,lon).items()}
            result=assess(ll,context['weekday_sunday0'],task,natal_moon,include_optional)
            if result['all_table_guidelines_met']:rows.append({'local_datetime':from_jd(t,dt.tzinfo).isoformat(),**result})
        except ValueError as ex:failures.append({'jd_ut1':t,'reason':str(ex)})
    return {'task':task,'step_minutes':step_minutes,'samples_checked':count,'matching_samples':rows,'unavailable_samples':failures,
        'limitation':'These are sampled instants, not continuous certified windows or an optimal/success-guaranteeing time.'}

# Explicit examples in PDF420; wedding's D9 association is the book's general
# divisional mapping. Other Table79 tasks need a supplied subject-house choice.
TASK_CONTEXT={
    'job_start':{'vargas':(1,10),'houses':(1,6,10),'references':('Asc',),'topic_house':10},
    'education_start':{'vargas':(1,24),'houses':(1,2,4,5),'references':('Asc',),'topic_house':4},
    'alphabet':{'vargas':(1,24),'houses':(1,2,4,5),'references':('Asc',),'topic_house':4},
    'vehicle_purchase':{'vargas':(1,16),'houses':(1,4),'references':('Asc',),'topic_house':4,'arudha':'A4'},
    'house_entry':{'vargas':(1,4),'houses':(1,4),'references':('Asc','Venus'),'topic_house':4,'arudha':'A4'},
    'real_estate_purchase':{'vargas':(1,4),'houses':(1,4),'references':('Asc','Mars'),'topic_house':4,'arudha':'A4'},
    'wedding':{'vargas':(1,9),'houses':(1,7),'references':('Asc',),'topic_house':7,'arudha':'A12'}}
TARA_NAMES=('Janma','Sampat','Vipat','Kshema','Pratyak','Saadhana','Naidhana','Mitra','Parama Mitra')

def tara_assessment(moon,natal_moon):
    """Table64 PDF315: Janma mixed, 3/5/7 adverse, 2/4/6/8/9 good."""
    count=(c.nakshatra(moon)['index']-c.nakshatra(natal_moon)['index'])%27+1
    n=(count-1)%9+1
    return {'count_from_natal':count,'number':n,'name':TARA_NAMES[n-1],
        'classification':'mixed' if n==1 else 'adverse' if n in (3,5,7) else 'good',
        'good':n in (2,4,6,8,9),'not_adverse':n not in (3,5,7),'source_pdf_pages':[315,316,418]}

def task_dasha(moon,duration_days=None,depth=1,nakshatra_start=1):
    """PDF410-411/421: compressed first MD is FULL, not natal Moon balance.
    With no duration, return ordinary 120-year natal-style Vimshottari (360-day
    years here). Supplied duration is fixed elapsed days, never an inferred life.
    """
    import math
    from . import dashas
    if not 0<=depth<=2:raise ValueError('Depth must be 0..2')
    if nakshatra_start not in (1,4,5,8):raise ValueError('Invalid nakshatra start')
    if duration_days is None:
        pp=dashas.vimsottari(moon,nakshatra_start,depth=depth)
        factor=c.q(360);compressed=False
    else:
        if not math.isfinite(duration_days) or duration_days<=0:raise ValueError('Positive finite task duration required')
        first=c.VIM_ORDER[(c.nakshatra(moon)['index']-1+nakshatra_start-1)%9]
        seq=dashas.rotate(c.VIM_ORDER,first)
        pp=dashas.periods(seq,[c.VIM_YEARS[p] for p in seq])
        for row in pp:
            if depth:row['children']=dashas.weighted_children(row,c.VIM_ORDER,c.VIM_YEARS,depth=depth)
        factor=c.q(duration_days)/120;compressed=True
    def convert(row):
        out={'lord':row['lord'],'start_day':row['start_year']*factor,'end_day':row['end_year']*factor,'duration_days':row['duration_years']*factor}
        if 'children' in row:out['children']=[convert(r) for r in row['children']]
        return out
    return {'periods':[convert(p) for p in pp],'compressed':compressed,'duration_days':duration_days,
        'first_period':'full at task start' if compressed else 'balance from lunar nakshatra',
        'year_model':'120 units scaled to supplied elapsed days' if compressed else 'savana360',
        'nakshatra_start':nakshatra_start,'source_pdf_pages':[410,411,421]}

def comprehensive(spec,task,natal_spec=None,duration_days=None,include_optional=False,
                  allowed_yogas=None,allowed_karanas=None,natal_hora_judgments=None,task_context=None,nakshatra_start=1,
                  task_strength_judgment=None,first_dasa_judgment=None):
    """All calculable instructions in chapter36, with review gates for judgments
    for which the book provides no unique formula. Never declares guaranteed
    success or automatically approves an election. Yoga/karana eligibility lists
    are caller-declared because this PDF supplies no complete per-task lists.
    """
    from . import analysis
    from .interpretation import functional_nature
    from .yogas import all3
    dt,jd,lat,lon,eph=analysis.load_birth(spec)
    chart=analysis.chart(spec,False);ll={p:r['longitude'] for p,r in chart['positions'].items()}
    context=chart['sunrise_context'];pp=chart['panchanga'];s=c.division(ll,1)
    task_info=task_context or TASK_CONTEXT.get(task)
    if task not in GUIDELINES and task not in TASK_CONTEXT and task_context is None:raise ValueError('Unknown task')
    checks={};review=[]
    for key,value in [('task_chart_strength_favorable',task_strength_judgment),('first_dasa_favorable',first_dasa_judgment)]:
        if value is not None and type(value) is not bool:raise ValueError('Qualitative judgments must be Boolean or omitted')
        checks[key]=value
        if value is None:review.append(key+' requires review of the evidence; the PDF gives no unique numerical threshold')
    table=None
    if task in GUIDELINES and context:
        table=assess(ll,context['weekday_sunday0'],task,include_optional=include_optional)
        checks['table79']=table['all_table_guidelines_met']
    elif task in GUIDELINES:checks['table79']=None;review.append('Ordinary sunrise weekday unavailable')
    else:checks['table79']=None;review.append('This task has no Table79 row; no table eligibility invented')
    for field,allowed,value in [('yoga',allowed_yogas,pp['yoga']),('karana',allowed_karanas,pp['karana'])]:
        if allowed is not None and (not isinstance(allowed,(list,tuple)) or not allowed or not all(isinstance(x,str) for x in allowed)):
            raise ValueError('Eligibility lists must be nonempty lists of exact names')
        checks[field]=value in allowed if allowed is not None else None
        if allowed is None:review.append(field+' eligibility needs a declared per-task convention')
    caution=[]
    if pp['karana']=='Sakuna':caution.append({'source_pdf_page':422,'code':'sakuna_karana_caution_in_example141'})
    tara=None;hora=None
    if natal_spec:
        _,nj,nlat,nlon,ne=analysis.load_birth(natal_spec)
        nl={p:r['longitude'] for p,r in ne.positions(nj,nlat,nlon).items()};ns=c.division(nl,1)
        tara=tara_assessment(ll['Moon'],nl['Moon']);checks['tara_good']=tara['good']
        if context:
            ruler=pp['hora_lord'];wax=0<float(c.norm(nl['Moon']-nl['Sun']))<180
            f=functional_nature(ns,wax)
            owned=[h for h in range(1,13) if c.LORDS[(ns['Asc']+h-1)%12]==ruler]
            hora={'lord':ruler,'natal_functional_nature':next((k for k in ('benefics','neutrals','malefics') if ruler in f[k]),'unclassified'),
                'natal_owned_houses':owned,'natal_occupied_house':c.count(ns['Asc'],ns[ruler]),'source_pdf_page':418}
            try:ar=c.arudhas(ns,nl,natal_spec.get('colord_overrides'))
            except ValueError:ar={};review.append('Natal arudha requires a co-lord decision')
            if task_info:
                subject=task_info.get('topic_house');key=task_info.get('arudha')
                if subject:
                    eighth_sign=c.advance(c.advance(ns['Asc'],subject),8)
                    hora['owns_eighth_from_topic']=c.LORDS[eighth_sign]==ruler
                if key and key in ar:
                    hora['topic_arudha']=c.SIGNS[ar[key]]
                    hora['occupies_badhaka_from_topic_arudha']=ns[ruler]==c.badhaka(ar[key])
                if task=='house_entry':
                    danger=all3([hora.get('owns_eighth_from_topic'),hora.get('occupies_badhaka_from_topic_arudha')])
                    checks['house_entry_hora_example_guard']=None if danger is None else not danger
            if natal_hora_judgments is not None:
                if any(p not in c.SEVEN or type(v) is not bool for p,v in natal_hora_judgments.items()):raise ValueError('Hora judgments must map classical planets to Boolean decisions')
                checks['natal_hora_favorable']=natal_hora_judgments.get(ruler)
                hora['judgment_source']='caller-declared task-specific assessment'
            else:
                checks['natal_hora_favorable']=None
                review.append('Natal hora task suitability is shown as evidence; PDF leaves the final judgment qualitative')
        else:checks['natal_hora_favorable']=None
    else:
        checks['tara_good']=None;checks['natal_hora_favorable']=None
        review.append('Natal chart needed for personal tara and hora checks')
    strength_rows=[];arudha_rows=[]
    strong=chart.get('shadbala',{}).get('planets',{})
    if task_info:
        for n in task_info['vargas']:
            if n not in c.VARGAS:raise ValueError('Unsupported task varga')
            vs=c.division(ll,n)
            for ref in task_info.get('references',('Asc',)):
                for h in task_info['houses']:
                    if h not in range(1,13):raise ValueError('Invalid task house')
                    sign=c.advance(vs[ref],h);lord=c.LORDS[sign];occupants=[p for p in c.PLANETS if vs[p]==sign]
                    aspected=[p for p in c.PLANETS if sign in c.planetary_aspects(p,vs[p])]
                    strength_rows.append({'varga':n,'reference':ref,'house':h,'sign':c.SIGNS[sign],'lord':lord,
                        'lord_in_own_or_exaltation_sign':c.LORDS[vs[lord]]==lord or vs[lord]==c.EXALT[lord],
                        'lord_debilitated':vs[lord]==c.DEBIL[lord],'occupants':occupants,'aspected_by':aspected,
                        'physical_chart_shadbala_ratio':strong.get(lord,{}).get('ratio_to_requirement')})
            if 'arudha' in task_info:
                key=task_info['arudha'];ad=chart['divisional_charts']['D'+str(n)]['arudhas']
                arudha_rows.append({'varga':n,'name':key,'sign':ad.get(key),'status':ad.get('status','calculated')})
    else:review.append('Topic houses/divisions require a supplied task_context for this Table79-only activity')
    schedule=task_dasha(ll['Moon'],duration_days,nakshatra_start=nakshatra_start)
    first=schedule['periods'][0]['lord'];first_evidence=[]
    for n in task_info['vargas'] if task_info else (1,):
        vs=c.division(ll,n);fn=functional_nature(vs,0<float(c.norm(ll['Moon']-ll['Sun']))<180)
        first_evidence.append({'varga':n,'lord':first,'owns_eighth':c.LORDS[c.advance(vs['Asc'],8)]==first,
            'functional_nature':next((k for k in ('benefics','neutrals','malefics') if first in fn[k]),'node_not_classified')})
    if task=='job_start':
        bad=next(r['owns_eighth'] for r in first_evidence if r['varga']==10)
        checks['first_dasa_not_D10_eighth_lord']=not bad
    wedding=None
    if task=='wedding':
        seventh=[p for p in c.PLANETS if c.count(s['Asc'],s[p])==7]
        natural=benefic_classification(ll)
        only_benefics=bool(seventh) and all(p in natural['benefics'] for p in seventh)
        wedding={'seventh_house_empty':not seventh,'occupants':seventh,'only_natural_benefics':only_benefics,
            'source_pdf_page':420,'exception':'Benefic occupants with strong yogas require review; occupancy is not an automatic veto.',
            'natal_style_yoga_evidence':chart['yogas'],'yoga_qualification':chart['yoga_review']}
    def date_rows(rows):
        for row in rows:
            row['start_local']=from_jd(jd+float(row['start_day']),dt.tzinfo).isoformat()
            row['end_local']=from_jd(jd+float(row['end_day']),dt.tzinfo).isoformat()
            if 'children' in row:date_rows(row['children'])
    date_rows(schedule['periods'])
    return analysis.clean({'task':task,'local_datetime':dt.isoformat(),'input':spec,'panchanga':pp,
        'table79':table,'tara':tara,'natal_hora':hora,'task_context':task_info,
        'task_house_evidence':strength_rows,'arudha_evidence':arudha_rows,
        'first_dasa_assessment':first_evidence,'task_dasha':schedule,'wedding_seventh_house':wedding,
        'checks':checks,'all_declared_checks_met':all3(checks.values()),'review_items':review,
        'caller_judgments':{'task_chart_strength_favorable':task_strength_judgment,'first_dasa_favorable':first_dasa_judgment},
        'cautions':caution,'status':'evidence_for_review','source_pdf_pages':[418,419,420,421,422],
        'limitation':'No continuous-window or success guarantee. Favorable yoga/karana, house strength and natal hora need declared judgments where the book supplies no unique formula.'})
