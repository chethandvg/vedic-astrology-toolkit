"""All 16 named Tajaka configurations as auditable structural candidates.

The PVR profile intentionally differs from historical translation-of-light
Nakta. Angular perfection and post-ingress conditions need future ephemerides.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from itertools import combinations
from . import core as c,tajaka as t
from .strengths import combustion
from .yogas import all3,any3

def evaluate(longitudes,speeds,pancha=None,nakta_mode='pvr_applying_both',
             duhphali_mode='historical_slower_strong',durupha_mode='pvr_literal',future_positions=None):
    """future_positions maps planet to a complete chart immediately after its
    next ingress, with {longitudes,speeds}; callers must calculate, not guess it.
    """
    if nakta_mode not in ('pvr_applying_both','historical_translation'):raise ValueError('Unknown Nakta mode')
    if duhphali_mode not in ('historical_slower_strong','pvr_literal_faster_strong'):raise ValueError('Unknown Duhphali mode')
    if durupha_mode not in ('pvr_literal','pvr_example_impairment'):raise ValueError('Unknown Durupha mode')
    if any(p not in speeds for p in c.SEVEN):raise ValueError('All actual planetary speeds required')
    s=c.division(longitudes,1);house=lambda p:c.count(s['Asc'],s[p]);future_positions=future_positions or {}
    scores=pancha.get('planets',pancha) if pancha else {}
    dignified=lambda p:c.LORDS[s[p]]==p or s[p]==c.EXALT[p]
    weak_dignity=lambda p:s[p]==c.DEBIL[p] or (c.LORDS[s[p]]!=p and c.LORDS[s[p]] not in t.TAJIKA_FRIENDS[p])
    strong=lambda p:any3([dignified(p),scores[p]['total']>=10 if p in scores else None])
    weak=lambda p:any3([weak_dignity(p),scores[p]['total']<5 if p in scores else None])
    impaired=lambda p:s[p]==c.DEBIL[p] or speeds[p]<0 or combustion(p,longitudes[p],longitudes['Sun'],speeds[p])['combust']
    def details(p,q,values=longitudes,velocity=speeds):return t.aspect(p,values[p],q,values[q],velocity[p],velocity[q])
    def applies(p,q,values=longitudes,velocity=speeds):return bool(details(p,q,values,velocity).get('candidate_ithasala'))
    def separates(p,q):return bool(details(p,q).get('candidate_eesarpha'))
    names=('Ishkavala','Induvara','Ithasala','Eesarpha','Nakta','Yamaya','Manahoo','Kamboola','Gairi-Kamboola',
        'Khallasara','Radda','Duhphali-Kutta','Duttota','Thambira','Kutta','Durupha')
    found={name:[] for name in names};pending=[];future_ithasala=[]
    def record(name,participants,value,conditions):
        if value is True:found[name].append({'planets':list(participants),'conditions':conditions,'status':'structural_candidate'})
        elif value is None:pending.append({'name':name,'planets':list(participants),'conditions':conditions})
    record('Ishkavala',c.SEVEN,all(house(p) not in (3,6,9,12) for p in c.SEVEN),{'cadent_houses_empty':True})
    record('Induvara',c.SEVEN,all(house(p) in (3,6,9,12) for p in c.SEVEN),{'only_cadent_houses':True})
    for p,q in combinations(c.SEVEN,2):
        detail=details(p,q);app=applies(p,q);sep=separates(p,q)
        if app:detail['ithasala_type']='poorna' if detail['within_one_degree'] else 'vartamaana'
        elif detail.get('locally_applying') and detail.get('degree_difference',99)-detail.get('mutual_orb',0)<=1:
            detail['bhavishya_candidate']=True
            future_ithasala.append({'planets':[p,q],'conditions':dict(detail),
                'status':'static_orb_candidate','limitation':'One-degree gap uses the book\'s fixed-partner approximation; actual future motion must be checked.'})
        fast,slow=sorted((p,q),key=lambda a:abs(speeds[a]),reverse=True)
        record('Ithasala',(p,q),app,detail);record('Eesarpha',(p,q),sep,detail)
        # Nakta/Yamaya permit no direct aspect, resolving the text/example conflict.
        if not app and not sep:
            for r in c.SEVEN:
                if r in (p,q):continue
                if abs(speeds[r])>max(abs(speeds[p]),abs(speeds[q])):
                    condition=(applies(r,p) and applies(r,q)) if nakta_mode=='pvr_applying_both' else ((applies(r,p) and separates(r,q)) or (applies(r,q) and separates(r,p)))
                    record('Nakta',(p,q,r),condition,{'mode':nakta_mode,'faster_intermediary':True})
                if abs(speeds[r])<min(abs(speeds[p]),abs(speeds[q])):
                    record('Yamaya',(p,q,r),applies(p,r) and applies(q,r),{'slower_intermediary':True})
        if app:
            for r in ('Mars','Saturn'):
                record('Manahoo',(p,q,r),r not in (p,q) and s[r]==s[fast] and abs(float(c.within(longitudes[r])-c.within(longitudes[fast])))<=t.ORBS[fast],{'conjunction_only':True})
            record('Kamboola',(p,q,'Moon'),'Moon' not in (p,q) and (applies('Moon',p) or applies('Moon',q)),{'lunar_application':True})
            record('Radda',(p,q),any3([impaired(p),impaired(q),weak(p),weak(q)]),{'impairment_p':impaired(p),'impairment_q':impaired(q),'weak_p':weak(p),'weak_q':weak(q)})
            big,small=(slow,fast) if duhphali_mode=='historical_slower_strong' else (fast,slow)
            value=all3([strong(big),not dignified(small),weak(small)])
            record('Duhphali-Kutta',(p,q),value,{'mode':duhphali_mode,'strong_planet':big,'weak_planet':small})
            for r in c.SEVEN:
                if r not in (p,q):record('Duttota',(p,q,r),all3([weak(p),weak(q),strong(r),applies(r,p) or applies(r,q)]),{'both_weak':all3([weak(p),weak(q)]),'strong_helper':strong(r)})
            # The uploaded definition requires both dusthana placement and impairment;
            # its illustration drops the house requirement. Preserve that distinction.
            dur=impaired(p) and impaired(q)
            if durupha_mode=='pvr_literal':dur=dur and house(p) in (6,8,12) and house(q) in (6,8,12)
            record('Durupha',(p,q),dur,{'mode':durupha_mode})
            if 'Moon' not in (p,q) and c.within(longitudes['Moon'])>=29:
                moon_eligible=s['Moon'] not in (c.EXALT['Moon'],c.DEBIL['Moon']) and all(c.LORDS[c.varga_sign(longitudes['Moon'],n)]!='Moon' for n in (3,9)) and t.hadda_lord(longitudes['Moon'])!='Moon'
                if moon_eligible:
                    future=future_positions.get('Moon');future_ok=None
                    if future:
                        future_ok=any(applies('Moon',r,future['longitudes'],future['speeds']) for r in (p,q))
                    if future:
                        future_signs=c.division(future['longitudes'],1)
                        future_pancha=future.get('pancha',{});future_scores=future_pancha.get('planets',future_pancha)
                        def future_strong(r):
                            return any3([c.LORDS[future_signs[r]]==r or future_signs[r]==c.EXALT[r],
                                future_scores[r]['total']>=10 if r in future_scores else None])
                        helper=any3(all3([future_strong(r),applies('Moon',r,future['longitudes'],future['speeds'])]) for r in c.SEVEN if r!='Moon')
                    else:helper=None
                    record('Gairi-Kamboola',(p,q,'Moon'),all3([future_ok,helper]),{'post_ingress_application':future_ok,'strong_helper_after_ingress':helper})
        for moving,other in ((p,q),(q,p)):
            if c.within(longitudes[moving])>=29 and speeds[moving]>0 and abs(speeds[moving])>abs(speeds[other]) and not app:
                future=future_positions.get(moving)
                value=applies(moving,other,future['longitudes'],future['speeds']) if future else None
                record('Thambira',(moving,other),value,{'post_ingress_application':value})
        for occupant,source in ((p,q),(q,p)):
            record('Kutta',(occupant,source),house(occupant)==1 and dignified(source) and house(source) not in (3,6,9,12) and detail['kind'] is not None,{'dignified_source_aspect_by_sign':True})
    lagna_lord=c.LORDS[s['Asc']]
    for x in c.SEVEN:
        if x in ('Moon',lagna_lord):continue
        # PVR example: three consecutive signs, lagna lord in the middle.
        middle=(s[lagna_lord]-s['Moon'])%12==1 and (s[x]-s[lagna_lord])%12==1
        record('Khallasara',('Moon',lagna_lord,x),middle and not applies(lagna_lord,'Moon') and not applies(lagna_lord,x),{'between_policy':'consecutive signs in zodiacal order'})
    return {'configurations':found,'future_ithasala_candidates':future_ithasala,'pending_conditions':pending,'names_checked':len(names),
        'profiles':{'nakta':nakta_mode,'duhphali':duhphali_mode,'durupha':durupha_mode},
        'perfection_verified':False,'meaning':'Local structural candidates; inspect track_perfection before treating application as future angular perfection.'}

def qualify(configurations,perfection_tracking=None):
    """PDF352-355: retain each base pair and explain modifying configurations.
    Duttota expressly follows Radda in the example. No generic weighted score
    decides all other competing doctrines or predicts an outcome.
    """
    tracking={frozenset(x['planets']):x for x in (perfection_tracking or [])}
    rows=[]
    adverse=('Manahoo','Radda','Durupha')
    helpful=('Kamboola','Gairi-Kamboola','Duhphali-Kutta','Duttota')
    for base in configurations['Ithasala']:
        pair=frozenset(base['planets'])
        hits=lambda names:[name for name in names if any(frozenset(x['planets'][:2])==pair for x in configurations[name])]
        bad=hits(adverse);good=hits(helpful)
        restored='Radda' in bad and 'Duttota' in good and not any(x in bad for x in ('Manahoo','Durupha'))
        state='radda_counteracted_by_duttota' if restored else 'competing_modifiers_need_review' if bad and good else 'adverse_modification' if bad else 'reinforced_candidate' if good else 'base_candidate'
        motion=tracking.get(pair)
        if motion and motion['status'] in ('sign_change_before_detected_perfection','not_found_in_window'):
            state='angular_perfection_not_established'
        rows.append({'planets':base['planets'],'adverse_modifiers':bad,'supporting_modifiers':good,
            'textual_cancellation_rules':bad,'explicit_override':'Duttota over Radda' if restored else None,
            'status':state,'perfection_check':motion,'source_pdf_pages':[352,353,354,355]})
    return {'pairs':rows,'rule':'Specific textual overrides only; unresolved simultaneous modifiers stay visible.',
        'outcome_prediction':None}
