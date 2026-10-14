"""Auditable rectification support and prospective forecast scoring.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import hashlib
import json
import math
from . import core as c,dashas
from .astronomy import local_time,to_jd,from_jd

def rectify(spec,events,rules,minutes=10,step_seconds=30):
    """Rank candidates against explicitly supplied hypotheses; never infer truth.

    Rule: {id,event_type,varga,activated_houses,weight}; an event matches if its
    Vimsottari MD lord occupies one of those houses in that candidate's varga.
    This simple evidence feature is declared, not claimed empirically valid.
    Events require {id,type,datetime,split:train|holdout}. Only train ranks times.
    """
    from .analysis import load_birth
    if not events or not rules:raise ValueError('Dated events and predeclared rules are required; no events are invented')
    if not 0<minutes<=120 or not 1<=step_seconds<=300:raise ValueError('Invalid candidate interval/resolution')
    if len({e['id'] for e in events})!=len(events):raise ValueError('Duplicate event IDs')
    if len({r['id'] for r in rules})!=len(rules):raise ValueError('Duplicate rule IDs')
    if any(e.get('split') not in ('train','holdout') for e in events):raise ValueError('Each event needs an explicit split')
    if not any(e['split']=='train' for e in events):raise ValueError('Training events required to rank candidates')
    for r in rules:
        if r['varga'] not in c.VARGAS or not r['activated_houses'] or any(h not in range(1,13) for h in r['activated_houses']):raise ValueError('Invalid rule chart/houses')
        if not math.isfinite(r.get('weight',1)) or r.get('weight',1)<=0:raise ValueError('Weights must be finite and positive')
    dt,jd,lat,lon,eph=load_birth(spec)
    event_times={e['id']:to_jd(local_time(e['datetime'],spec.get('timezone'))) for e in events}
    extent=int(minutes*60);offsets=sorted(set(range(-extent,extent+1,step_seconds))|{0,-extent,extent})
    rows=[]
    for offset in offsets:
        t=jd+offset/86400;ll={p:v['longitude'] for p,v in eph.positions(t,lat,lon).items()}
        pp=dashas.vimsottari(ll['Moon'],cycles=2,depth=0);evidence=[];score={'train':0,'holdout':0};maximum={'train':0,'holdout':0}
        for event in events:
            elapsed=(event_times[event['id']]-t)/360
            active=dashas.active(pp,elapsed)
            if elapsed<0 or not active:raise ValueError('Event falls outside the supported post-birth dasha interval')
            for rule in rules:
                if rule['event_type']!=event['type']:continue
                ss=c.division(ll,rule['varga']);house=c.count(ss['Asc'],ss[active[0]])
                match=house in rule['activated_houses'];weight=rule.get('weight',1)
                score[event['split']]+=weight*match;maximum[event['split']]+=weight
                evidence.append({'event_id':event['id'],'rule_id':rule['id'],'split':event['split'],
                    'md_lord':active[0],'natal_varga_house':house,'matched':match,'weight':weight})
        rows.append({'offset_seconds':offset,'datetime':from_jd(t,dt.tzinfo).isoformat(),
            'train_score':score['train'],'holdout_score':score['holdout'],'maximum_scores':maximum,'evidence':evidence})
    if not any(r['maximum_scores']['train'] for r in rows):raise ValueError('No training event matches a rule type')
    rows.sort(key=lambda r:(-r['train_score'],r['offset_seconds']))
    best=rows[0]['train_score'];ties=[r['datetime'] for r in rows if r['train_score']==best]
    manifest={'rules':rules,'events':events,'input':spec,'minutes':minutes,'step_seconds':step_seconds}
    return {'manifest_sha256':hashlib.sha256(json.dumps(manifest,sort_keys=True).encode()).hexdigest(),
        'candidates':rows,'highest_training_score_times':ties,'unique_best_training_score':len(ties)==1,
        'holdout_used_for_ranking':False,'year_model':'savana360','resolution_seconds':step_seconds,
        'status':'hypothesis_fit_only','conclusion':'No verified birth time or probability is inferred from these scores.'}

def evaluate_predictions(predictions,observations,baseline_probability):
    """Brier score on predeclared binary outcomes; requires all outcomes supplied.
    No claims of timestamp authenticity: stored declarations alone are not proof
    that predictions were actually issued before events.
    """
    if not predictions:raise ValueError('No predictions supplied')
    if not math.isfinite(baseline_probability) or not 0<=baseline_probability<=1:raise ValueError('Invalid fixed baseline')
    if len({p['id'] for p in predictions})!=len(predictions):raise ValueError('Duplicate prediction IDs')
    rows=[]
    for p in predictions:
        prob=p['probability']
        if not math.isfinite(prob) or not 0<=prob<=1:raise ValueError('Probabilities must be finite and in [0,1]')
        registered=local_time(p['registered_at']);start=local_time(p['window_start']);end=local_time(p['window_end'])
        if not registered<start<end:raise ValueError('Prediction must be declared before a valid future window')
        if p['id'] not in observations:raise ValueError('Unscored outcome; cannot silently omit a prediction')
        y=observations[p['id']]
        if type(y) not in (int,bool) or y not in (0,1):raise ValueError('Binary observed outcomes required')
        rows.append({'id':p['id'],'brier':(prob-y)**2,'baseline_brier':(baseline_probability-y)**2})
    model=sum(r['brier'] for r in rows)/len(rows);base=sum(r['baseline_brier'] for r in rows)/len(rows)
    return {'n':len(rows),'brier_score':model,'baseline_brier_score':base,'brier_skill_score':None if base==0 else 1-model/base,
        'rows':rows,'timestamp_authenticity_verified':False,'interpretation':'Descriptive evaluation; sample size, selection and independent replication still matter.'}
