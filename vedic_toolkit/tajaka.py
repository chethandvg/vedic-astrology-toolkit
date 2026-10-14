"""Tajaka arithmetic from PDF 337-368; interpretive choices remain explicit.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from fractions import Fraction as F
from . import core as c
from . import dashas as d

DEEP_EXALT=dict(zip(c.SEVEN,(10,33,298,165,95,357,200)))
ORBS=dict(zip(c.SEVEN,(15,12,8,7,9,7,9)))
HADDA=(
 ((6,12,20,25,30),('Jupiter','Venus','Mercury','Mars','Saturn')),
 ((8,14,22,27,30),('Venus','Mercury','Jupiter','Saturn','Mars')),
 ((6,12,17,24,30),('Mercury','Venus','Jupiter','Mars','Saturn')),
 ((7,13,19,26,30),('Mars','Venus','Mercury','Jupiter','Saturn')),
 ((6,11,18,24,30),('Jupiter','Venus','Saturn','Mercury','Mars')),
 ((7,17,21,28,30),('Mercury','Venus','Jupiter','Mars','Saturn')),
 ((6,14,21,28,30),('Saturn','Mercury','Jupiter','Venus','Mars')),
 ((7,11,19,24,30),('Mars','Venus','Mercury','Jupiter','Saturn')),
 ((12,17,21,26,30),('Jupiter','Venus','Mercury','Mars','Saturn')),
 ((7,14,22,26,30),('Mercury','Jupiter','Venus','Saturn','Mars')),
 ((7,13,20,25,30),('Mercury','Venus','Jupiter','Mars','Saturn')),
 ((12,16,19,28,30),('Venus','Jupiter','Mercury','Mars','Saturn')))
TRIRASI_DAY=('Sun','Venus','Saturn','Venus','Jupiter','Moon','Mercury','Mars','Saturn','Mars','Jupiter','Moon')
TRIRASI_NIGHT=('Jupiter','Moon','Mercury','Mars','Sun','Venus','Saturn','Venus','Saturn','Mars','Jupiter','Moon')
TAJIKA_FRIENDS={p:set(('Sun','Moon','Mars','Jupiter') if p in ('Sun','Moon','Mars','Jupiter') else ('Mercury','Venus','Saturn'))-{p} for p in c.SEVEN}
CHALDEAN=('Mars','Sun','Venus','Mercury','Moon','Saturn','Jupiter')

def pancha_with_profile(longitudes,profile='pvr_tajikasara'):
    """Hayanaratna 2.4-2.5 distinguishes constant twofold, aspect threefold,
    and aspect fivefold relationships. PVR uses its own Parasari D3 ruler.
    Historical profiles use Chaldean decan rulers. No neutral is guessed.
    """
    if profile not in ('pvr_tajikasara','hayanaratna_twofold','hayanaratna_threefold','hayanaratna_fivefold'):
        raise ValueError('Unknown Tajaka strength profile')
    s=c.division(longitudes,1);out={}
    def relation(p,owner):
        if p==owner:return 'own'
        if profile in ('pvr_tajikasara','hayanaratna_twofold'):return 'friend' if owner in TAJIKA_FRIENDS[p] else 'enemy'
        h=c.count(s[p],s[owner])
        if profile=='hayanaratna_threefold':return 'friend' if h in (3,5,9,11) else 'neutral' if h in (2,6,8,12) else 'enemy'
        return 'great_friend' if h in (5,9) else 'friend' if h in (3,11) else 'neutral' if h in (2,6,8,12) else 'enemy' if h in (4,10) else 'great_enemy'
    fractions=({'own':1,'friend':.5,'enemy':.25} if profile in ('pvr_tajikasara','hayanaratna_twofold') else
        {'own':1,'friend':.75,'neutral':.5,'enemy':.25} if profile=='hayanaratna_threefold' else
        {'own':1,'great_friend':.75,'friend':.5,'neutral':.25,'enemy':.125,'great_enemy':.0625})
    for p in c.SEVEN:
        v=longitudes[p]
        decan=c.LORDS[c.varga_sign(v,3)] if profile=='pvr_tajikasara' else CHALDEAN[(c.sign(v)*3+int(c.within(v)//10))%7]
        pieces={'uchcha':uchcha_bala(p,v)};relations={}
        for name,owner,maximum in [('kshetra',c.LORDS[s[p]],30),('hadda',hadda_lord(v),15),('drekkana',decan,10),('navamsa',c.LORDS[c.varga_sign(v,9)],5)]:
            rel=relation(p,owner);pieces[name]=maximum*fractions[rel];relations[name]={'owner':owner,'relation':rel}
        total=sum(pieces.values())/4
        out[p]={**pieces,'total':total,'relations':relations,'category':'weak' if total<5 else 'ordinary' if total<10 else 'strong' if total<15 else 'very_strong'}
    return {'profile':profile,'maximum':20,'planets':out,
        'source':'PVR PDF339-341; Balabhadra Hayanaratna 2.4-2.5, Gansten translation'}

def dwadasa_vargeeya(longitudes):
    """PVR's D1..D12 count, constant Tajikasara friendship; own/exalt wins overlap."""
    out={}
    for p in c.SEVEN:
        rows=[]
        for n in range(1,13):
            sign=c.varga_sign(longitudes[p],n);owner=c.LORDS[sign]
            value=1 if sign==c.EXALT[p] or owner==p else -1 if sign==c.DEBIL[p] else 1 if owner in TAJIKA_FRIENDS[p] else -1
            rows.append({'varga':n,'value':value})
        out[p]={'total':sum(r['value'] for r in rows),'components':rows}
    return out

def select_year_lord(candidates,longitudes,pancha,tie_tolerance=0.0):
    """PVR PDF342. Similar strength is operationalized by a declared tolerance.
    Unbroken ties are returned as ties; no arbitrary planet-order winner.
    """
    if not candidates or any(p not in c.SEVEN for p in candidates):raise ValueError('Classical candidates required')
    if tie_tolerance<0:raise ValueError('Nonnegative tie tolerance required')
    s=c.division(longitudes,1);scores=pancha.get('planets',pancha)
    def nature(p):
        h=c.count(s[p],s['Asc'])
        return 'benefic' if h in (3,5,9,11) else 'malefic' if h in (1,4,7,10) else 'neutral_or_none'
    unique=list(dict.fromkeys(candidates));pool=[p for p in unique if nature(p)=='benefic'];reason='benefic_aspect'
    if not pool:pool=[p for p in unique if nature(p)=='malefic'];reason='malefic_aspect_fallback'
    if not pool:pool=[p for p in unique if scores[p]['total']>=15];reason='very_strong_without_aspect'
    if not pool:pool=[candidates[0]];reason='first_candidate_fallback'
    best=max(scores[p]['total'] for p in pool);tied=[p for p in pool if best-scores[p]['total']<=tie_tolerance]
    multiplicity=max(candidates.count(p) for p in tied);tied=[p for p in tied if candidates.count(p)==multiplicity]
    return {'lord':tied[0] if len(tied)==1 else None,'tied_candidates':tied if len(tied)>1 else [],
        'selection_reason':reason,'tie_tolerance':tie_tolerance,
        'candidates':[{'planet':p,'candidacies':candidates.count(p),'aspect':nature(p),'pancha':scores[p]['total']} for p in unique]}

def track_perfection(ephemeris,jd,p,q,max_days=60,step_days=.125):
    """Find this sign-based aspect's angular perfection before either sign changes.
    Checks actual ephemeris motion, including stations. Finite search, not a
    promise of an event. A missing root means not found within this sampling.
    """
    import swisseph as swe
    ids=dict(zip(c.SEVEN,(swe.SUN,swe.MOON,swe.MARS,swe.MERCURY,swe.JUPITER,swe.VENUS,swe.SATURN)))
    if p==q or p not in ids or q not in ids:raise ValueError('Two distinct classical bodies required')
    if not 0<step_days<=.25 or not 0<max_days<=366:raise ValueError('Invalid search window or step')
    def pair(t):return ephemeris.body(t,ids[p]),ephemeris.body(t,ids[q])
    a,b=pair(jd);s0=(c.sign(a['longitude']),c.sign(b['longitude']))
    initial=aspect(p,a['longitude'],q,b['longitude'],a['speed_deg_day'],b['speed_deg_day'])
    if initial['kind'] is None:return {'status':'no_initial_aspect'}
    target=((s0[1]-s0[0])*30)%360
    def residual(a,b):return (b['longitude']-a['longitude']-target+180)%360-180
    prev=jd;r0=residual(a,b);stations=[];last_speeds=(a['speed_deg_day'],b['speed_deg_day'])
    if abs(r0)<1e-9:return {'status':'perfect_at_start','jd_ut1':jd}
    for i in range(1,int(max_days/step_days)+2):
        t=min(jd+max_days,jd+i*step_days);a,b=pair(t);r=residual(a,b)
        for name,old,new in zip((p,q),last_speeds,(a['speed_deg_day'],b['speed_deg_day'])):
            if old*new<0 or (old!=0 and new==0):stations.append({'planet':name,'jd_bracket':[prev,t]})
        changed=(c.sign(a['longitude']),c.sign(b['longitude']))!=s0
        if r*r0<=0 and abs(r-r0)<180:
            lo,hi=prev,t
            for _ in range(40):
                mid=(lo+hi)/2;aa,bb=pair(mid)
                if residual(aa,bb)*r0>0:lo=mid
                else:hi=mid
            root=(lo+hi)/2;aa,bb=pair(root)
            if (c.sign(aa['longitude']),c.sign(bb['longitude']))==s0:
                return {'status':'perfects_before_sign_change','jd_ut1':root,'residual_degrees':residual(aa,bb),'stations':stations}
        if changed:return {'status':'sign_change_before_detected_perfection','jd_bracket':[prev,t],'stations':stations}
        if t>=jd+max_days:break
        prev,r0,last_speeds=t,r,(a['speed_deg_day'],b['speed_deg_day'])
    return {'status':'not_found_in_window','window_days':max_days,'sample_step_days':step_days,'stations':stations}

def next_ingress(ephemeris,jd,planet,max_days=60,step_days=.125):
    """Next detected sign change in either direction; numerical boundary root."""
    ids=dict(zip(c.SEVEN,(0,1,4,2,5,3,6)))
    if planet not in ids:raise ValueError('Classical planet required')
    if not 0<max_days<=366 or not 0<step_days<=.25:raise ValueError('Invalid search limits')
    initial=c.sign(ephemeris.body(jd,ids[planet])['longitude']);a=jd
    for i in range(1,int(max_days/step_days)+2):
        b=min(jd+i*step_days,jd+max_days)
        if c.sign(ephemeris.body(b,ids[planet])['longitude'])!=initial:
            lo,hi=a,b
            for _ in range(40):
                mid=(lo+hi)/2
                if c.sign(ephemeris.body(mid,ids[planet])['longitude'])==initial:lo=mid
                else:hi=mid
            return {'jd_ut1':(lo+hi)/2,'from_sign':initial,
                'to_sign':c.sign(ephemeris.body(hi+1e-7,ids[planet])['longitude'])}
        if b>=jd+max_days:break
        a=b
    return None

def muntha(natal_asc,completed_years):
    if not isinstance(completed_years,int) or completed_years<0:raise ValueError('Nonnegative completed solar years required')
    return (c.sign(natal_asc)+completed_years)%12

def aspect(p1,l1,p2,l2,speed1=None,speed2=None):
    """PDF 338, 348-351. Actual relative speeds describe local application only;
    stations/sign changes require ephemeris tracking before declaring perfection.
    Mutual orb uses BOTH individual orbs (the smaller), as in this book.
    """
    h=c.count(c.sign(l1),c.sign(l2))
    kinds={1:('conjunction','malefic','strong'),2:('semi_sextile','neutral','neutral'),
      3:('sextile','benefic','weak'),4:('square','malefic','weak'),5:('trine','benefic','strong'),
      7:('opposition','malefic','strong'),9:('trine','benefic','strong'),10:('square','malefic','weak'),
      11:('sextile','benefic','weak'),12:('semi_sextile','neutral','neutral')}
    if h not in kinds:return {'kind':None,'house':h}
    kind,nature,strength=kinds[h];diff=float(c.within(l2)-c.within(l1))
    orb=min(ORBS[p1],ORBS[p2]);out={'kind':kind,'nature_in_book':nature,'strength_in_book':strength,
        'house':h,'degree_difference':abs(diff),'mutual_orb':orb,'within_mutual_orb':abs(diff)<=orb,
        'within_one_degree':abs(diff)<=1}
    if speed1 is not None and speed2 is not None:
        closing=diff*(speed2-speed1)<0
        separating=diff*(speed2-speed1)>0
        out.update(locally_applying=closing,locally_separating=separating,
                   candidate_ithasala=closing and abs(diff)<=orb,
                   candidate_eesarpha=separating and abs(diff)<=orb,
                   perfection_requires_tracking=True)
    return out

def harsha_bala(longitudes,is_day):
    signs=c.division(longitudes,1);asc=signs['Asc'];female={'Moon','Mercury','Venus','Saturn'}
    prescribed=dict(zip(c.SEVEN,(9,3,6,1,11,5,12)));out={}
    for p in c.SEVEN:
        house=c.count(asc,signs[p]);f=p in female
        pieces={'prescribed_house':5*int(house==prescribed[p]),
          'own_or_exalted':5*int(c.LORDS[signs[p]]==p or signs[p]==c.EXALT[p]),
          'gender_house':5*int(house in ((1,2,3,7,8,9) if f else (4,5,6,10,11,12))),
          'day_night':5*int(f!=is_day)}
        out[p]={**pieces,'total':sum(pieces.values())}
    return out

def uchcha_bala(planet,longitude,max_units=20):
    delta=abs(float(c.norm(longitude))-((DEEP_EXALT[planet]+180)%360));delta=min(delta,360-delta)
    return max_units*delta/180

def hadda_lord(longitude):
    ends,lords=HADDA[c.sign(longitude)]
    return next(p for end,p in zip(ends,lords) if c.within(longitude)<end)

def pancha_vargeeya(longitudes,relation_resolver):
    """PDF 339-341. relation_resolver(planet, owner, varga)->friend/enemy.
    This edition gives no neutral score. Require a declared policy rather than
    silently treating neutral as friend. Own signs bypass the callback.
    """
    def points(p,owner,n,maximum):
        if p==owner:return maximum
        r=relation_resolver(p,owner,n)
        if r not in ('friend','enemy'):raise ValueError('Pancha Vargeeya requires an explicit friend/enemy relationship policy')
        return maximum/(2 if r=='friend' else 4)
    out={}
    for p in c.SEVEN:
        v=longitudes[p]
        pieces={'kshetra':points(p,c.LORDS[c.sign(v)],1,30),'uchcha':uchcha_bala(p,v),
          'hadda':points(p,hadda_lord(v),'hadda',15),'drekkana':points(p,c.LORDS[c.varga_sign(v,3)],3,10),
          'navamsa':points(p,c.LORDS[c.varga_sign(v,9)],9,5)}
        out[p]={**pieces,'total':sum(pieces.values())/4}
    return out

def year_lord_candidates(natal_asc,annual_longitudes,completed_years,is_day):
    s=c.division(annual_longitudes,1);m=muntha(natal_asc,completed_years)
    return [c.LORDS[s['Sun' if is_day else 'Moon']],c.LORDS[c.sign(natal_asc)],c.LORDS[m],
            c.LORDS[s['Asc']],(TRIRASI_DAY if is_day else TRIRASI_NIGHT)[s['Asc']]]

def saham(a,b,c_point):
    """A-B+C with +30 degrees if C is outside the forward B..A arc, PDF 343-346.
    Endpoint equality counts as inside; final result is normalized.
    """
    a,b,cc=map(c.norm,(a,b,c_point))
    return (a-b+cc+(30 if (cc-b)%360>(a-b)%360 else 0))%360

def sahams(longitudes,is_day):
    """All 36 formulas in Table 74; house points retain the ascendant's degree.
    Seven classical sign lords, as in the book's Tajaka examples.
    """
    v={p:c.norm(longitudes[p]) for p in c.SEVEN+('Asc',)};asc=v['Asc'];s=c.sign(asc)
    for h in (2,6,8,9,11):v[f'H{h}']=(asc+(h-1)*30)%360;v[f'L{h}']=v[c.LORDS[(s+h-1)%12]]
    v['AscLord']=v[c.LORDS[s]];v['Cancer15']=c.q(105)
    forms=[('Punya','Moon','Sun','Asc'),('Vidya','Sun','Moon','Asc'),('Yasas','Jupiter','Punya','Asc'),
      ('Mitra','Jupiter','Punya','Venus'),('Mahatmya','Punya','Mars','Asc'),('Asha','Saturn','Mars','Asc'),
      ('Samartha','Jupiter' if c.LORDS[s]=='Mars' else 'Mars','Mars' if c.LORDS[s]=='Mars' else 'AscLord','Asc'),
      ('Bhratri','Jupiter','Saturn','Asc'),('Gaurava','Jupiter','Moon','Sun'),('Pitri','Saturn','Sun','Asc'),
      ('Rajya','Saturn','Sun','Asc'),('Matri','Moon','Venus','Asc'),('Putra','Jupiter','Moon','Asc'),
      ('Jeeva','Saturn','Jupiter','Asc'),('Karma','Mars','Mercury','Asc'),('Roga','Asc','Moon','Asc'),
      ('Kali','Jupiter','Mars','Asc'),('Sastra','Jupiter','Saturn','Mercury'),('Bandhu','Mercury','Moon','Asc'),
      ('Mrityu','H8','Moon','Asc'),('Paradesa','H9','L9','Asc'),('Artha','H2','L2','Asc'),
      ('Paradara','Venus','Sun','Asc'),('Vanik','Moon','Mercury','Asc'),
      ('Karyasiddhi','Saturn','Sun' if is_day else 'Moon',c.LORDS[c.sign(v['Sun' if is_day else 'Moon'])]),
      ('Vivaha','Venus','Saturn','Asc'),('Santapa','Saturn','Moon','H6'),('Sraddha','Venus','Mars','Asc'),
      ('Preeti','Sastra','Punya','Asc'),('Jadya','Mars','Saturn','Mercury'),('Vyapara','Mars','Saturn','Asc'),
      ('Satru','Mars','Saturn','Asc'),('Jalapatana','Cancer15','Saturn','Asc'),('Bandhana','Punya','Saturn','Asc'),
      ('Apamrityu','H8','Mars','Asc'),('Labha','H11','L11','Asc')]
    fixed={'Bhratri','Mrityu','Paradesa','Artha','Karyasiddhi','Vyapara','Labha'};out={}
    for name,a,b,cc in forms:
        if not is_day and name not in fixed:a,b=b,a
        value=saham(v[a],v[b],v[cc]);v[name]=value;out[name]=value
    return out

def patyayini(longitudes,depth=1):
    """PDF 358 Table 75. Fixed 365.2425-day year, unlike solar-arc Mudda."""
    values={p:c.within(longitudes[p]) for p in c.SEVEN+('Asc',)}
    order=tuple(sorted(values,key=values.get))
    if len(set(values.values()))!=8:raise ValueError('Equal Krisamsas need an explicit tie convention; not specified by this book')
    weights={p:values[p]-(values[order[i-1]] if i else 0) for i,p in enumerate(order)}
    total=sum(weights.values())
    if total==0:raise ValueError('Zero Patyamsa denominator')
    out=d.periods(order,[weights[p]/total for p in order])
    for p in out:
        if depth:p['children']=d.weighted_children(p,order,weights,depth=depth)
    return out

def mudda(natal_moon,completed_years,depth=1):
    """Progress natal nakshatra by one per completed year; compress 120:1.
    Includes the next first-lord period so the entire annual interval is covered.
    """
    if completed_years<0 or not isinstance(completed_years,int):raise ValueError('Integer completed years required')
    moon=(c.norm(natal_moon)+completed_years*F(40,3))%360
    pp=d.vimsottari(moon,cycles=2,depth=depth)
    return scale_periods(pp,F(1,120),keep_until=1)

def scale_periods(pp,factor,keep_until=None):
    out=[];factor=c.q(factor)
    for p in pp:
        row={**p,**{k:p[k]*factor for k in ('start_year','end_year','duration_years')}}
        if keep_until is not None and row['start_year']>=keep_until:break
        if 'children' in p:row['children']=scale_periods(p['children'],factor)
        out.append(row)
    return out

def varsha_narayana(natal_asc,annual_longitudes,completed_years,varga=1,depth=1,**kwargs):
    """PDF 360-365: use natal progressed lagna with annual planetary positions."""
    annual=dict(annual_longitudes)
    # Retain natal within-sign degree in the progressed D1 lagna; Dn's actual
    # lagna is irrelevant to the seed computation but remains in chart output.
    annual['Asc']=muntha(natal_asc,completed_years)*30+c.within(natal_asc)
    result=d.divisional_narayana(annual,varga,cycles=2,depth=depth,**kwargs)
    result['periods']=scale_periods(result['periods'],F(1,120),keep_until=1)
    result.update(system='varsha_narayana',varga=varga,year_model='solar_arc')
    return result
