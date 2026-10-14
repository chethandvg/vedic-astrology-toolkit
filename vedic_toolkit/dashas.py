"""Dasa arithmetic. All intervals are half-open [start, end), in relative years.

The first full mahadasa may start before birth. Never subdivide only its balance.
Calendar conversion lives in astronomy.dated; rasi systems use exact solar arcs.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from fractions import Fraction as F
from . import core as c

def rotate(seq,start):
    i=seq.index(start);return tuple(seq[i:])+tuple(seq[:i])

def periods(sequence,lengths,start=0):
    t=c.q(start);out=[]
    for name,duration in zip(sequence,lengths):
        duration=c.q(duration)
        if duration<0:raise ValueError('Negative period length')
        out.append({'lord':name,'start_year':t,'end_year':t+duration,'duration_years':duration})
        t+=duration
    return out

def weighted_children(parent,order,weights,start_next=False,depth=1):
    if depth<1:return []
    seq=rotate(order,parent['lord'])
    if start_next:seq=seq[1:]+seq[:1]
    den=sum(weights.values())
    out=periods(seq,[parent['duration_years']*c.q(weights[p])/den for p in seq],parent['start_year'])
    if depth>1:
        for p in out:p['children']=weighted_children(p,order,weights,start_next,depth-1)
    return out

def vimsottari(moon,nakshatra_start=1,cycles=1,depth=1):
    """PDF 189-194: starts 1 (Janma), 4 (Kshema), 5 (Utpanna), 8 (Adhana).
    depth=1 means mahadasa+antardasa; depth=2 adds pratyantardasa.
    """
    if nakshatra_start not in (1,4,5,8):raise ValueError('Supported nakshatra starts: 1,4,5,8')
    if not 1<=cycles<=5 or not 0<=depth<=3:raise ValueError('cycles=1..5, depth=0..3')
    x=c.norm(moon);length=F(40,3);idx=int(x//length)
    fraction=x%length/length;lord=c.VIM_ORDER[(idx+nakshatra_start-1)%9]
    seq=rotate(c.VIM_ORDER,lord)*cycles
    out=periods(seq,[c.VIM_YEARS[p] for p in seq],-fraction*c.VIM_YEARS[lord])
    for p in out:
        if depth:p['children']=weighted_children(p,c.VIM_ORDER,c.VIM_YEARS,depth=depth)
    return out

ASHT_ORDER=('Sun','Moon','Mars','Mercury','Saturn','Jupiter','Rahu','Venus')
ASHT_YEARS=dict(zip(ASHT_ORDER,(6,15,8,17,10,19,12,21)))
ASHT_START=(F(200,3),F(120),F(160),F(640,3),F(760,3),F(880,3),F(1000,3),F(80,3))
ASHT_ARC=(F(160,3),F(40),F(160,3),F(40),F(40),F(40),F(160,3),F(40))

def ashtottari(moon,cycles=1,depth=1):
    """PDF 203-207. Unequal Moon arcs include the Abhijit adjustment.
    Applicability is a separate interpretive decision; this function does not choose it.
    """
    if not 1<=cycles<=5 or not 0<=depth<=3:raise ValueError('cycles=1..5, depth=0..3')
    x=c.norm(moon)
    for p,start,arc in zip(ASHT_ORDER,ASHT_START,ASHT_ARC):
        elapsed=(x-start)%360
        if elapsed<arc:break
    else:raise ArithmeticError('Uncovered Ashtottari arc')
    seq=rotate(ASHT_ORDER,p)*cycles
    out=periods(seq,[ASHT_YEARS[p] for p in seq],-elapsed/arc*ASHT_YEARS[p])
    for row in out:
        if depth:row['children']=weighted_children(row,ASHT_ORDER,ASHT_YEARS,True,depth)
    return out

KCD_CYCLE={
 'savya':tuple(range(12))+(7,6,5,3,4,2,1,0,11,10,9,8),
 'apasavya':(8,9,10,11,0,1,2,4,3,5,6,7)+tuple(range(11,-1,-1))}
KCD_YEARS=(7,16,9,21,5,9,16,7,10,4,4,10)

def kalachakra(moon,depth=1,group_policy='bphs_confirmed'):
    """PDF 261-268. Derive all 27 assignments from Tables 42/43.
    Printed Tables 44/45 misassign Revati and omit Uttara Bhadrapada.
    Set group_policy='require_unambiguous' to reject those two nakshatras.
    Exactly nine mahadasas, as stated in the footnote to Example 95.
    """
    if not 0<=depth<=2:raise ValueError('depth=0..2')
    if group_policy not in ('bphs_confirmed','derived_cycle','require_unambiguous'):raise ValueError('Unknown Kalachakra group policy')
    x=c.norm(moon);nak=int(x//F(40,3));pada=int((x%F(40,3))//F(10,3))
    if group_policy=='require_unambiguous' and nak in (25,26):
        raise ValueError('Printed group table is inconsistent here; select derived_cycle explicitly')
    group='savya' if nak//3%2==0 else 'apasavya'
    # Group pattern repeats every six nakshatras: S1,S2,S1,A1,A2,A2.
    # Do not advance linearly through all group members: Tables 44-47 reset.
    subgroup_offset=(0,12,0,0,12,12)[nak%6]
    absolute=subgroup_offset+pada*9
    cycle=KCD_CYCLE[group]
    seq=[cycle[(absolute+i)%24] for i in range(9)]
    param=sum(KCD_YEARS[s] for s in seq)
    elapsed=(x%F(10,3))/F(10,3)*param
    consumed=0
    for i,s in enumerate(seq):
        if elapsed<consumed+KCD_YEARS[s]:break
        consumed+=KCD_YEARS[s]
    offset=absolute+i
    def children(parent,index,depth):
        ss=[cycle[(index+j)%24] for j in range(9)];total=sum(KCD_YEARS[s] for s in ss)
        pp=periods([c.SIGNS[s] for s in ss],[parent['duration_years']*F(KCD_YEARS[s],total) for s in ss],parent['start_year'])
        if depth>1:
            for j,p in enumerate(pp):p['children']=children(p,index+j,depth-1)
        return pp
    seq=[cycle[(offset+j)%24] for j in range(9)]
    out=periods([c.SIGNS[s] for s in seq],[KCD_YEARS[s] for s in seq],-(elapsed-consumed))
    for j,p in enumerate(out):
        p['cycle_index']=(offset+j)%24
        if depth:p['children']=children(p,offset+j,depth)
    deha,jeeva=(cycle[absolute%24],cycle[(absolute+8)%24])
    if group=='apasavya':deha,jeeva=jeeva,deha
    return {'group':group,'group_policy':group_policy,'group_source':'BPHS chapter 46, verses 56-65',
            'nakshatra':nak+1,'pada':pada+1,
            'deha':c.SIGNS[deha],'jeeva':c.SIGNS[jeeva],'paramayush_years':param,'periods':out}

KENDRA_OFFSETS=(0,3,6,9,1,4,7,10,2,5,8,11)

def _exception(seed,signs,normal,precedence=None):
    sat=signs.get('Saturn')==seed;ket=signs.get('Ketu')==seed
    if sat and ket:
        if precedence not in ('Saturn','Ketu'):raise ValueError('Saturn and Ketu both occupy seed: choose exception_precedence')
        sat=precedence=='Saturn';ket=precedence=='Ketu'
    return 1 if sat else -normal if ket else normal

def narayana_sequence(seed,signs,exception_precedence=None):
    normal=1 if (seed+8)%12 in c.ODD_FOOTED else -1
    direction=_exception(seed,signs,normal,exception_precedence)
    sat=signs.get('Saturn')==seed and (signs.get('Ketu')!=seed or exception_precedence=='Saturn')
    offsets=range(12) if sat or seed%3==0 else [5*i for i in range(12)] if seed%3==1 else (0,4,8,9,1,5,6,10,2,3,7,11)
    return [(seed+direction*i)%12 for i in offsets]

def narayana_antardasa_sequence(s,signs,longitudes,lords,seed=None,exception_precedence=None):
    seed=c.stronger_sign(s,(s+6)%12,signs,longitudes,lords) if seed is None else seed
    if seed not in (s,(s+6)%12):raise ValueError('AD seed must be dasa sign or its seventh')
    start=signs[lords[seed]]
    direction=_exception(seed,signs,1 if start%2==0 else -1,exception_precedence)
    return [(start+direction*i)%12 for i in range(12)]

def rasi_dasa(kind,signs,longitudes,seed=None,sree_lagna=None,cycles=1,depth=1,
              colord_overrides=None,exception_precedence=None,ad_seeds=None,own_sign_priority=True,
              subperiod_policy='strict'):
    """Narayana, Kendradi, Sudasa, Drig, Niryana Shoola and Shoola.
    Longevity systems require caller-chosen seed: this book warns their strength
    rules differ from the phalita hierarchy. No lifespan/event prediction is made.
    ad_seeds maps sign abbreviations to chosen seed sign indexes for reviewable overrides.
    """
    allowed=('narayana','kendradi','sudasa','drig','niryana_shoola','shoola')
    if kind not in allowed:raise ValueError(f'Choose {allowed}')
    if cycles not in (1,2) or not 0<=depth<=2:raise ValueError('cycles=1/2; depth=0..2')
    if cycles==2 and kind in ('niryana_shoola','shoola'):raise ValueError('Only the stated first cycle is provided for this system')
    if subperiod_policy not in ('strict','narayana_extension'):raise ValueError('Unknown subperiod policy')
    if depth and kind in ('kendradi','sudasa','drig') and subperiod_policy=='strict':
        raise ValueError('This book does not establish these subperiods: use depth=0 or explicitly select subperiod_policy=narayana_extension')
    ls=c.primary_lords(signs,longitudes,'dasa',colord_overrides);asc=signs['Asc'];ad_seeds=ad_seeds or {}
    if kind in ('narayana','kendradi') and seed is None:seed=c.stronger_sign(asc,(asc+6)%12,signs,longitudes,ls)
    if kind=='narayana':seq=narayana_sequence(seed,signs,exception_precedence)
    elif kind=='kendradi':
        direction=_exception(seed,signs,1 if asc%2==0 else -1,exception_precedence)
        seq=[(seed+direction*k)%12 for k in KENDRA_OFFSETS]
    elif kind=='sudasa':
        if sree_lagna is None:raise ValueError('Sudasa requires the exact Sree Lagna longitude')
        seed=c.sign(sree_lagna);direction=1 if seed%2==0 else -1
        seq=[(seed+direction*k)%12 for k in KENDRA_OFFSETS]
    elif kind=='drig':
        seq=[]
        for s in ((asc+8)%12,(asc+9)%12,(asc+10)%12):
            direction=1 if s in c.ODD_FOOTED else -1
            seq+=[s]+sorted(c.rasi_aspects(s),key=lambda t:(direction*(t-s))%12)
        seed=seq[0]
    else:
        candidates=((asc+1)%12,(asc+7)%12) if kind=='niryana_shoola' else (asc,(asc+6)%12)
        if seed not in candidates:raise ValueError(f'{kind} requires an explicit seed among {candidates}')
        direction=1 if kind=='shoola' or seed%2==0 else -1
        seq=[(seed+direction*i)%12 for i in range(12)]
    durations=[(7,8,9)[s%3] if kind=='niryana_shoola' else 9 if kind=='shoola' else c.dasa_years(s,ls[s],signs,own_sign_priority) for s in seq]
    start=-c.within(sree_lagna)/30*durations[0] if kind=='sudasa' else 0
    if cycles==2:seq=seq*2;durations=durations+[12-y for y in durations]
    out=periods([c.SIGNS[s] for s in seq],durations,start)
    def children(parent,depth):
        s=c.SIGNS.index(parent['lord'])
        if kind=='shoola':
            if c.SIGNS[s] not in ad_seeds:raise ValueError('Shoola AD requires explicit stronger-sign choices in ad_seeds')
            a=ad_seeds[c.SIGNS[s]]
            if a not in (s,(s+6)%12):raise ValueError('Invalid Shoola AD seed')
            ss=[(a+i)%12 for i in range(12)]
        else:ss=narayana_antardasa_sequence(s,signs,longitudes,ls,ad_seeds.get(c.SIGNS[s]),exception_precedence)
        pp=periods([c.SIGNS[s] for s in ss],[parent['duration_years']/12]*12,parent['start_year'])
        if depth>1:
            for p in pp:p['children']=children(p,depth-1)
        return pp
    for p in out:
        if depth:p['children']=children(p,depth)
    return {'system':kind,'seed':c.SIGNS[seed],'year_model':'solar_arc','lords':{c.SIGNS[s]:p for s,p in ls.items()},
            'own_sign_priority':own_sign_priority,'equal_same_sign_colords':'classical name; identical numeric result',
            'subperiod_convention':'Narayana rule (explicit extension for Kendradi/Sudasa/Drig)' if kind in ('kendradi','sudasa','drig') and depth else 'book',
            'periods':out}

def divisional_narayana(longitudes,n,**kwargs):
    """PDF 220-226. nth-house lord in D1 supplies the seed in Dn."""
    d1=c.division(longitudes,1);dn=c.division(longitudes,n)
    if n==1:return rasi_dasa('narayana',d1,longitudes,**kwargs)
    ls1=c.primary_lords(d1,longitudes,'dasa',kwargs.get('colord_overrides'))
    nth=(d1['Asc']+n-1)%12;candidate=dn[ls1[nth]]
    lsn=c.primary_lords(dn,longitudes,'dasa',kwargs.get('colord_overrides'))
    seed=c.stronger_sign(candidate,(candidate+6)%12,dn,longitudes,lsn)
    return rasi_dasa('narayana',dn,longitudes,seed=seed,**kwargs)

def sudarsana(reference_sign,years=12,depth=1):
    """PDF 367-368: 1 solar year/house, 12 equal AD, 12 equal PD."""
    if not 1<=years<=144 or not 0<=depth<=2:raise ValueError('years=1..144; depth=0..2')
    out=periods([c.SIGNS[(reference_sign+i)%12] for i in range(years)],[1]*years)
    def children(p,depth):
        s=c.SIGNS.index(p['lord'])
        pp=periods([c.SIGNS[(s+i)%12] for i in range(12)],[p['duration_years']/12]*12,p['start_year'])
        if depth>1:
            for item in pp:item['children']=children(item,depth-1)
        return pp
    for p in out:
        if depth:p['children']=children(p,depth)
    return out

def active(period_list,years_since_birth):
    t=c.q(years_since_birth)
    for p in period_list:
        if p['start_year']<=t<p['end_year']:
            return [p['lord']]+(active(p['children'],t) if 'children' in p else [])
    return []
