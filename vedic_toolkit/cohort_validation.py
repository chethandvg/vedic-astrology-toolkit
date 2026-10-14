"""Grouped holdout scoring for a declared binary prediction study.

No human observations are bundled. Synthetic fixtures test arithmetic only.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import hashlib
import json
import math
import random
from statistics import NormalDist

def _quantile(values,q):
    values=sorted(values);x=(len(values)-1)*q;i=int(x);f=x-i
    return values[i]*(1-f)+values[min(i+1,len(values)-1)]*f

def evaluate(rows, *, bootstrap_replicates=2000,seed=20261014):
    """Rows: id, person_id, split=train|holdout, outcome=0|1, probability.

    Fixed baseline = TRAIN prevalence, never holdout prevalence. Aggregate each
    person's forecast losses first, then average people equally and bootstrap
    people, so repeated windows do not masquerade as independent participants.
    Only a diagnostic CI is returned; no automatic validation/success label.
    """
    if type(bootstrap_replicates) is not int or not 100<=bootstrap_replicates<=100000:
        raise ValueError('bootstrap_replicates must be an integer in 100..100000')
    if not rows:raise ValueError('No observations supplied')
    seen=set();people={'train':set(),'holdout':set()}
    for r in rows:
        if not r.get('id') or not r.get('person_id'):raise ValueError('Record and person IDs required')
        if r['id'] in seen:raise ValueError('Duplicate record ID')
        seen.add(r['id'])
        if r.get('split') not in people:raise ValueError('Explicit train/holdout split required')
        people[r['split']].add(r['person_id'])
        if type(r.get('outcome')) not in (bool,int) or r['outcome'] not in (0,1):
            raise ValueError('Every outcome must be observed; missing is not zero')
        p=r.get('probability')
        if type(p) not in (float,int) or not math.isfinite(p) or not 0<=p<=1:
            raise ValueError('Probability must be a finite number in [0,1]')
    if people['train']&people['holdout']:raise ValueError('A person cannot cross train/holdout splits')
    if not people['train'] or len(people['holdout'])<2:raise ValueError('Training data and at least two holdout people required')
    # Match the person-weighted estimand in both training and holdout.
    train_by_person={p:[] for p in people['train']}
    for r in rows:
        if r['split']=='train':train_by_person[r['person_id']].append(r['outcome'])
    baseline=sum(sum(v)/len(v) for v in train_by_person.values())/len(train_by_person)
    group={p:[] for p in sorted(people['holdout'])};scored=[]
    for r in rows:
        if r['split']!='holdout':continue
        model=(r['probability']-r['outcome'])**2;base=(baseline-r['outcome'])**2
        group[r['person_id']].append((model,base))
        scored.append({'id':r['id'],'person_id':r['person_id'],'brier':model,'baseline_brier':base})
    averages=[(sum(t[0] for t in v)/len(v),sum(t[1] for t in v)/len(v)) for v in group.values()]
    n=len(averages);model=sum(t[0] for t in averages)/n;base=sum(t[1] for t in averages)/n
    diffs=[b-m for m,b in averages];rng=random.Random(seed)
    bootstrap=[sum(diffs[rng.randrange(n)] for _ in range(n))/n for _ in range(bootstrap_replicates)]
    return {'status':'descriptive_holdout_evaluation','estimand':'equal weight per person; equal window weight within person',
        'training_people':len(people['train']),'holdout_people':n,'holdout_predictions':len(scored),
        'baseline_probability_from_training':baseline,'brier_score':model,'baseline_brier_score':base,
        'improvement':base-model,'brier_skill_score':None if base==0 else 1-model/base,
        'improvement_percentile_interval_95':[_quantile(bootstrap,.025),_quantile(bootstrap,.975)],
        'bootstrap_unit':'person','bootstrap_replicates':bootstrap_replicates,'seed':seed,'scores':scored,
        'input_sha256':hashlib.sha256(json.dumps(rows,sort_keys=True,allow_nan=False).encode()).hexdigest(),
        'preregistration_authenticated':False,'predictive_validity_established':False,
        'limits':['A local split/hash cannot prove blinding or prior registration.',
                  'Small or selected cohorts, many hypotheses, and nonrepresentative controls can invalidate generalization.',
                  'The bootstrap interval is approximate; it is not a probability that astrology is true.']}

def sample_size(mean_improvement,sd_person_difference,alpha=.05,power=.8):
    """Normal-approximation TWO-SIDED paired-mean planning, independent people.
    Inputs require an external pilot or predeclared sensitivity assumptions.
    """
    if not all(math.isfinite(x) for x in (mean_improvement,sd_person_difference,alpha,power)):
        raise ValueError('Finite planning assumptions required')
    if mean_improvement<=0 or sd_person_difference<=0 or not 0<alpha<1 or not .5<power<1:
        raise ValueError('Invalid effect, SD, alpha or power')
    z=NormalDist().inv_cdf(1-alpha/2)+NormalDist().inv_cdf(power)
    return {'approximate_independent_people':math.ceil((z*sd_person_difference/mean_improvement)**2),
        'assumptions':{'mean_improvement':mean_improvement,'sd_person_difference':sd_person_difference,'alpha':alpha,'power':power},
        'method':'two-sided normal approximation to paired mean loss differences',
        'guaranteed_power':False}
