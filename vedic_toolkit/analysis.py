"""Build auditable chart/transit evidence for a human interpretation.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from datetime import timedelta
import hashlib
import json
from . import core as c, ashtakavarga as av, tajaka, dashas, strengths, yogas, strength_context, calendar, tajaka_yogas, interpretation
from .astronomy import Ephemeris,Settings,local_time,to_jd,from_jd,dated

def clean(obj):
    from fractions import Fraction
    if isinstance(obj,Fraction):return float(obj)
    if isinstance(obj,dict):return {str(k):clean(v) for k,v in obj.items()}
    if isinstance(obj,(list,tuple,set)):return [clean(v) for v in obj]
    return obj

def guarded(fn,*args,**kwargs):
    try:return fn(*args,**kwargs)
    except ValueError as e:return {'status':'needs_explicit_choice','reason':str(e)}

def load_birth(spec):
    required=('datetime','latitude','longitude')
    if any(k not in spec for k in required):raise ValueError('Birth JSON requires datetime, latitude, longitude, and a time zone or ISO offset')
    dt=local_time(spec['datetime'],spec.get('timezone'),spec.get('fold'))
    latitude=float(spec['latitude']);longitude=float(spec['longitude'])
    Ephemeris.validate_location(latitude,longitude)
    eph=Ephemeris(Settings(**spec.get('settings',{})))
    return dt,to_jd(dt),latitude,longitude,eph

def structural_features(longitudes):
    """Factual ingredients, not an exhaustive yoga or event-prediction engine."""
    s=c.division(longitudes,1);asc=s['Asc'];exchanges=[]
    for i,p in enumerate(c.SEVEN):
        for other in c.SEVEN[i+1:]:
            if c.LORDS[s[p]]==other and c.LORDS[s[other]]==p:exchanges.append([p,other])
    mahapurusha={}
    for p,name in [('Mars','Ruchaka'),('Mercury','Bhadra'),('Jupiter','Hamsa'),('Venus','Malavya'),('Saturn','Sasa')]:
        h=c.count(asc,s[p]);eligible=(c.LORDS[s[p]]==p or s[p]==c.EXALT[p]) and h in (1,4,7,10)
        if eligible:mahapurusha[name]={'planet':p,'whole_sign_house':h,'status':'base_placement_condition_only'}
    return {'sign_exchanges':exchanges,'mahapurusha_base_conditions':mahapurusha,
            'note':'These are structural conditions. Cancellations, strength, and life-event outcomes require interpretation.'}

def chart(spec,include_boundaries=True):
    dt,jd,lat,lon,eph=load_birth(spec);positions=eph.positions(jd,lat,lon)
    longitudes={p:v['longitude'] for p,v in positions.items()};s=c.division(longitudes,1)
    warnings=[];context=None
    try:context=eph.sunrise_context(jd,lat,lon,dt.tzinfo)
    except ValueError as e:warnings.append(str(e))
    pp=c.panchanga(longitudes['Sun'],longitudes['Moon'])
    points={**c.sun_upagrahas(longitudes['Sun'])}
    if context:
        points.update(c.special_lagnas(eph.sun(context['sunrise_jd']),context['elapsed_minutes'],longitudes['Moon'],longitudes['Asc']))
        up=eph.timed_upagrahas(jd,lat,lon,context);points.update({p:v['longitude'] for p,v in up.items()})
        pp.update(weekday_sunday0=context['weekday_sunday0'],weekday_lord=c.SEVEN[context['weekday_sunday0']],
            hora_lord=c.hora_lord(context['weekday_sunday0'],context['elapsed_minutes'],
                (context['next_sunrise_jd']-context['sunrise_jd'])*1440))
    else:
        up={};points['SL']=(c.norm(longitudes['Asc'])+(c.norm(longitudes['Moon'])%c.Fraction(40,3))*27)%360
    if include_boundaries:pp['end_times_local']={k:from_jd(v,dt.tzinfo).isoformat() for k,v in eph.panchanga_ends(jd).items()}
    divisions={}
    for n in c.VARGAS:
        ss=c.division(longitudes,n)
        divisions[f'D{n}']={'signs':{p:c.SIGNS[x] for p,x in ss.items()},
          'houses_from_asc':{p:c.count(ss['Asc'],x) for p,x in ss.items() if p!='Asc'},
          'arudhas':guarded(lambda:{a:c.SIGNS[x] for a,x in c.arudhas(ss,longitudes,spec.get('colord_overrides')).items()})}
    result={'schema_version':'2.0','label':spec.get('label','Chart'),'input':spec,
      'input_sha256':hashlib.sha256(json.dumps(spec,sort_keys=True).encode()).hexdigest(),
      'local_datetime':dt.isoformat(),'julian_day_ut1':jd,'calculation_settings':eph.metadata(),
      'positions':{p:{**v,**c.position(v['longitude']),**({'nakshatra':c.nakshatra(v['longitude'])} if p!='Asc' else {})} for p,v in positions.items()},
      'panchanga':pp,'sunrise_context':context,'derived_points':{p:c.position(v) for p,v in points.items()},
      'timed_upagraha_events':up,'divisional_charts':divisions,
      'houses_from_references':{ref:{p:c.count(s[ref],ss) for p,ss in s.items()} for ref in ('Asc','Moon','Sun')},
      'chara_karakas':c.chara_karakas(longitudes),
      'graha_aspects':{p:[c.SIGNS[x] for x in c.planetary_aspects(p,s[p])] for p in c.PLANETS},
      'rasi_aspects':{p:[c.SIGNS[x] for x in c.rasi_aspects(s[p])] for p in c.PLANETS},
      'argala_by_house':{str(h):c.argalas(c.advance(s['Asc'],h),s) for h in range(1,13)},
      'badhaka_sign':c.SIGNS[c.badhaka(s['Asc'])],
      'graha_arudhas':guarded(lambda:{p:c.SIGNS[x] for p,x in c.graha_arudhas(s,longitudes).items()}),
      'ashtakavarga':av.calculate(s,**spec.get('ashtakavarga_options',{})),
      'dignities':{p:strengths.degree_dignity(p,longitudes[p]) for p in c.PLANETS},
      'age_avasthas':{p:c.age_avastha(longitudes[p]) for p in c.PLANETS},
      'compound_relationships':{p:{o:c.compound_relation(p,o,s) for o in c.SEVEN} for p in c.SEVEN},
      'favorable_amsa_counts':c.amsa_counts(longitudes),'structural_features':structural_features(longitudes),
      'warnings':warnings,'interpretation_status':'calculated evidence; no event probabilities inferred'}
    speed={p:v.get('speed_deg_day',0) for p,v in positions.items()}
    result['vimsopaka']={g:strengths.vimsopaka(longitudes,g,spec.get('relationship_frame','rasi')) for g in strengths.VIMSOPAKA_WEIGHTS}
    result['avasthas']=strengths.avasthas(longitudes,speed,mudita_policy=spec.get('mudita_policy','literal_all'))
    result['combustion']={p:strengths.combustion(p,longitudes[p],longitudes['Sun'],speed[p]) for p in c.SEVEN}
    result['lunar_month']=calendar.lunar_month(eph,jd)
    strong={}
    if context:
        result['activity_avasthas']={p:c.activity_avastha(p,longitudes[p],longitudes['Moon'],longitudes['Asc'],context['elapsed_minutes'],spec.get('name_sound_number')) for p in c.PLANETS}
        result['sahams']={p:c.position(v) for p,v in tajaka.sahams(longitudes,context['is_day']).items()}
        result['shadbala']=guarded(strength_context.from_chart,jd,lat,lon,eph,context,
            motion_model=spec.get('strength_motion_model','raman_linear_chapter'),motion_inputs=spec.get('strength_motion_inputs'))
        if 'planets' in result['shadbala']:
            strong={p:r['ratio_to_requirement']>=1 for p,r in result['shadbala']['planets'].items()}
    else:result['shadbala']={'status':'unavailable','reason':'Ordinary sunrise/day-night partition unavailable'}
    result['yogas']=yogas.evaluate(longitudes,strong=strong,speeds=speed,points=points,colord_overrides=spec.get('colord_overrides'),
        mercury_policy=spec.get('yoga_mercury_policy','majority'),mercury_tie=spec.get('yoga_mercury_tie','unresolved'))
    result['yoga_review']=interpretation.review(longitudes,result['yogas'],strong,speed,context['is_day'] if context else None,
        close_orb=spec.get('yoga_close_orb',6),points=points)
    result['yogas']['strength_operationalization']='Shadbala >= stated minimum under the disclosed Raman/Sripati profile; not a universal definition'
    return clean(result)

def sensitivity(spec,minutes=5,step_seconds=30):
    """Recompute at each sampled birth time. This is sensitivity, NOT rectification.
    A finite sample can miss changes between samples; report the resolution.
    """
    if not 0<minutes<=120 or not 1<=step_seconds<=300:raise ValueError('minutes in (0,120], step_seconds in [1,300]')
    dt,jd,lat,lon,eph=load_birth(spec);offsets=list(range(-int(minutes*60),int(minutes*60)+1,int(step_seconds)))
    offsets=sorted(set(offsets+[-int(minutes*60),0,int(minutes*60)]));rows=[]
    for sec in offsets:
        t=jd+sec/86400;v=eph.positions(t,lat,lon);ll={p:x['longitude'] for p,x in v.items()}
        vim=dashas.vimsottari(ll['Moon'],depth=0)[0];kcd=dashas.kalachakra(ll['Moon'],depth=0)['periods'][0]
        rows.append({'offset_seconds':sec,'local_datetime':from_jd(t,dt.tzinfo).isoformat(),
          'ascendants':{f'D{n}':c.SIGNS[c.varga_sign(ll['Asc'],n)] for n in c.VARGAS},
          'all_varga_signs':{f'D{n}':{p:c.SIGNS[c.varga_sign(x,n)] for p,x in ll.items()} for n in c.VARGAS},
          'moon_nakshatra':c.nakshatra(ll['Moon']),'vim_first_lord':vim['lord'],
          'vim_balance_days':float(vim['end_year']*360),'kcd_first_lord':kcd['lord'],
          'kcd_balance_days':float(kcd['end_year']*360)})
    unstable={}
    for n in c.VARGAS:
        changes={p:sorted({r['all_varga_signs'][f'D{n}'][p] for r in rows},key=c.SIGNS.index) for p in c.PLANETS+('Asc',)}
        changes={p:vals for p,vals in changes.items() if len(vals)>1}
        if changes:unstable[f'D{n}']=changes
    return clean({'range_minutes':minutes,'sample_step_seconds':step_seconds,'sample_count':len(rows),
      'unstable_varga_placements':unstable,'samples':rows,
      'limitation':'Sampling identifies observed changes; stable samples do not prove no intervening boundary. No birth time is inferred.'})

def transits(spec,at,varga=1):
    dt,jd,lat,lon,eph=load_birth(spec);target=local_time(at,spec.get('timezone'))
    natal={p:v['longitude'] for p,v in eph.positions(jd,lat,lon).items()}
    trans={p:v['longitude'] for p,v in eph.positions(to_jd(target),lat,lon).items()}
    ns=c.division(natal,varga);ts=c.division(trans,1);table=av.calculate(ns);out={}
    for p in c.PLANETS:
        aspects=c.planetary_aspects(p,ts[p]);hits=[x for x in c.PLANETS if ns[x] in aspects]
        out[p]={'transit_position':c.position(trans[p]),'house_from_natal_varga_asc':c.count(ns['Asc'],ts[p]),
          'house_from_natal_varga_moon':c.count(ns['Moon'],ts[p]),'aspected_natal_planets':hits,
          'aspected_natal_houses':[c.count(ns['Asc'],s) for s in aspects],'SAV_points':table['SAV'][ts[p]]}
        if p in c.SEVEN:out[p]['ashtakavarga']=av.transit_support(p,trans[p],ns)
    return clean({'at':target.isoformat(),'natal_reference':f'D{varga}','transit_chart':'D1',
        'method':'Natal varga versus transit rasi, PDF 289-297','planets':out,'calculation_settings':eph.metadata()})

def solar_return(spec,completed_years,month=0,submonth=0):
    if completed_years<0 or not isinstance(completed_years,int) or not 0<=month<12 or not 0<=submonth<12:raise ValueError('Invalid year/month/submonth')
    dt,jd,lat,lon,eph=load_birth(spec);offset=c.q(completed_years)+c.q(month)/12+c.q(submonth)/144
    event=eph.solar_arc_date(jd,offset);event_dt=from_jd(event,dt.tzinfo)
    annual={**spec,'datetime':event_dt.isoformat(),'label':f'Solar return +{completed_years} years, month {month}, submonth {submonth}'}
    annual.pop('fold',None);result=chart(annual)
    natal=eph.positions(jd,lat,lon);l={p:v['longitude'] for p,v in result['positions'].items()}
    result['return_details']={'completed_years':completed_years,'month_index0':month,'submonth_index0':submonth,
      'solar_arc_degrees':float(offset*360),'birthplace_used':True,
      'residual_degrees':(eph.sun(event)-eph.sun(jd)-float(offset*360)+180)%360-180}
    if result['sunrise_context']:
        day=result['sunrise_context']['is_day']
        result['harsha_bala']=tajaka.harsha_bala(l,day)
        result['year_lord_candidates']=tajaka.year_lord_candidates(natal['Asc']['longitude'],l,completed_years,day)
        result['pancha_vargeeya']=tajaka.pancha_with_profile(l,spec.get('tajaka_profile','pvr_tajikasara'))
        result['dwadasa_vargeeya']=tajaka.dwadasa_vargeeya(l)
        candidates=result['year_lord_candidates']
        if month or submonth:
            # Monthly selection needs the separately selected annual ruler.
            annual_base=solar_return(spec,completed_years)
            annual_lord=annual_base.get('year_lord',{}).get('lord')
            if annual_lord:candidates=candidates+[annual_lord]
            else:result['warnings'].append('Annual lord is tied; monthly sixth candidate cannot be resolved.')
        result['year_lord']=tajaka.select_year_lord(candidates,l,result['pancha_vargeeya'],spec.get('year_lord_tie_tolerance',0))
        if month or submonth:
            result['month_lord']=result.pop('year_lord')
            if not annual_lord:result['month_lord']={'lord':None,'status':'unresolved_annual_candidate'}
        future={};ingresses={}
        if spec.get('track_tajaka',True):
            for p in c.SEVEN:
                if c.within(l[p])>=29 and result['positions'][p]['speed_deg_day']>0:
                    ingress=tajaka.next_ingress(eph,event,p)
                    if ingress and ingress['to_sign']==(c.sign(l[p])+1)%12:
                        fp=eph.positions(ingress['jd_ut1']+1e-7,lat,lon)
                        future[p]={'longitudes':{q:v['longitude'] for q,v in fp.items()},
                            'speeds':{q:v.get('speed_deg_day',0) for q,v in fp.items()}}
                        future[p]['pancha']=tajaka.pancha_with_profile(future[p]['longitudes'],spec.get('tajaka_profile','pvr_tajikasara'))
                        ingresses[p]=ingress
        result['tajaka_yogas']=tajaka_yogas.evaluate(l,{p:result['positions'][p]['speed_deg_day'] for p in c.SEVEN},result['pancha_vargeeya'],future_positions=future)
        result['tajaka_yogas']['ingress_checks']=ingresses
        if spec.get('track_tajaka',True):
            result['tajaka_yogas']['perfection_tracking']=[{'planets':row['planets'],
                **tajaka.track_perfection(eph,event,*row['planets'])} for row in result['tajaka_yogas']['configurations']['Ithasala']]
        result['tajaka_yogas']['qualification']=tajaka_yogas.qualify(
            result['tajaka_yogas']['configurations'],result['tajaka_yogas'].get('perfection_tracking'))
    result['muntha_sign']=c.SIGNS[tajaka.muntha(natal['Asc']['longitude'],completed_years)]
    if month==submonth==0:
        result['patyayini']=guarded(lambda:dated(tajaka.patyayini(l),event,eph,'365.2425',dt.tzinfo))
        result['mudda']=dated(tajaka.mudda(natal['Moon']['longitude'],completed_years),event,eph,'solar_arc',dt.tzinfo)
        result['varsha_narayana']=guarded(lambda:dated(tajaka.varsha_narayana(natal['Asc']['longitude'],l,completed_years)['periods'],event,eph,'solar_arc',dt.tzinfo))
    return clean(result)
