"""Explicit traditional strength and avastha calculations.

These are scores defined by texts, not forces, energies or physical quantities.
Sources and disagreements are recorded in RESOLUTION_LEDGER.md.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import math
from . import core as c
from .tajaka import DEEP_EXALT, uchcha_bala

MOOLA_ZONES={'Sun':(4,0,20),'Moon':(1,3,30),'Mars':(0,0,12),
    'Mercury':(5,15,20),'Jupiter':(8,0,10),'Venus':(6,0,15),'Saturn':(10,0,20)}
VIMSOPAKA_WEIGHTS={
    'shad':{1:6,2:2,3:4,9:5,12:2,30:1},
    'sapta':{1:5,2:2,3:3,7:2.5,9:4.5,12:2,30:1},
    'dasa':{1:3,2:1.5,3:1.5,7:1.5,9:1.5,10:1.5,12:1.5,16:1.5,30:1.5,60:5},
    'shodasa':{1:3.5,2:1,3:1,4:.5,7:.5,9:3,10:.5,12:.5,16:2,20:.5,24:.5,27:.5,30:1,40:.5,45:.5,60:4}}
VISWA={'own':20,'great_friend':18,'friend':15,'neutral':10,'enemy':7,'great_enemy':5}
SAPTA_POINTS={
    'bphs_translation':{'own':30,'great_friend':20,'friend':15,'neutral':10,'enemy':4,'great_enemy':2},
    'raman_sripati':{'own':30,'great_friend':22.5,'friend':15,'neutral':7.5,'enemy':3.75,'great_enemy':1.875}}
MINIMUM_VIRUPAS=dict(zip(c.SEVEN,(390,360,300,420,390,330,300)))
COMBUSTION_LIMITS={'Moon':12,'Mars':17,'Mercury':14,'Jupiter':11,'Venus':10,'Saturn':16}

def angular_distance(a,b):return abs((float(a)-float(b)+180)%360-180)

def degree_dignity(p,longitude):
    """Half-open degree intervals: a boundary belongs to the following zone."""
    out=c.dignity(p,longitude)
    if p not in c.SEVEN:
        return {**out,'degree_zone':None,'reason':'Node degree zones not specified by the source'}
    s=c.sign(longitude);d=float(c.within(longitude));ms,lo,hi=MOOLA_ZONES[p]
    moola=s==ms and lo<=d<hi
    if moola:zone='moolatrikona'
    elif (p=='Mercury' and s==5 and d<15) or (p=='Moon' and s==1 and d<3):zone='exaltation'
    elif c.LORDS[s]==p:zone='own'
    elif s==c.EXALT[p]:zone='exaltation'
    elif s==c.DEBIL[p]:zone='debilitation'
    else:zone='other'
    return {**out,'degree_zone':zone,'moolatrikona_degree_zone':moola,
        'distance_from_deep_exaltation':angular_distance(longitude,DEEP_EXALT[p])}

def combustion(p,longitude,sun,speed=0):
    if p not in COMBUSTION_LIMITS:return {'combust':False,'applicable':False}
    limit=12 if p=='Mercury' and speed<0 else 8 if p=='Venus' and speed<0 else COMBUSTION_LIMITS[p]
    distance=angular_distance(longitude,sun)
    return {'combust':distance<limit,'applicable':True,'separation_degrees':distance,'limit_degrees':limit}

def benefic_classification(longitudes,moon_policy='waxing',mercury_orb=None,
                           mercury_policy='any_malefic',mercury_tie='unresolved'):
    """Mercury's legacy any-malefic profile is retained for Raman strengths.
    The majority option follows Rao PDF34-35 and preserves undefined equal ties.
    The two Moon classifications are deliberately named; they are not synonyms.
    """
    if moon_policy not in ('waxing','raman_tithi8_to23'):raise ValueError('Unknown Moon classification')
    if mercury_policy not in ('any_malefic','majority'):raise ValueError('Unknown Mercury policy')
    if mercury_tie not in ('unresolved','benefic','malefic'):raise ValueError('Unknown Mercury tie policy')
    s=c.division(longitudes,1);elong=float(c.norm(longitudes['Moon']-longitudes['Sun']))
    moon_good=0<elong<180 if moon_policy=='waxing' else 84<=elong<276
    bad={'Sun','Mars','Saturn','Rahu','Ketu'}
    if not moon_good:bad.add('Moon')
    def joined(p):
        return s['Mercury']==s[p] if mercury_orb is None else angular_distance(longitudes['Mercury'],longitudes[p])<mercury_orb
    companions=[p for p in c.PLANETS if p!='Mercury' and p in longitudes and joined(p)]
    nbad=sum(p in bad for p in companions);ngood=len(companions)-nbad
    unknown=[]
    mercury_bad=nbad>0
    if mercury_policy=='majority':
        mercury_bad=nbad>ngood
        if nbad==ngood and nbad:
            mercury_bad=mercury_tie=='malefic'
            if mercury_tie=='unresolved':unknown=['Mercury']
    if mercury_bad:bad.add('Mercury')
    return {'benefics':[p for p in c.PLANETS if p in longitudes and p not in bad and p not in unknown],
        'malefics':[p for p in c.PLANETS if p in longitudes and p in bad],
        'unknown':unknown,'mercury_policy':mercury_policy,'mercury_tie':mercury_tie,
        'mercury_companions':{'benefic_count':ngood,'malefic_count':nbad},
        'moon_policy':moon_policy,'mercury_conjunction_orb':mercury_orb}

def vimsopaka(longitudes,group='shodasa',relationship_frame='rasi'):
    """BPHS chapter 7: weighted varga-viswa, maximum 20.
    Temporary relationships use D1 by default, or the current varga explicitly.
    Exaltation is not silently substituted for own-sign viswa.
    """
    if group not in VIMSOPAKA_WEIGHTS:raise ValueError('Unknown varga group')
    if relationship_frame not in ('rasi','varga'):raise ValueError('Choose rasi or varga relationship frame')
    d1=c.division(longitudes,1);out={}
    for p in c.SEVEN:
        rows=[]
        for n,w in VIMSOPAKA_WEIGHTS[group].items():
            sn=c.division(longitudes,n);owner=c.LORDS[sn[p]]
            rel=c.compound_relation(p,owner,d1 if relationship_frame=='rasi' else sn)
            score=c.q(w)*VISWA[rel]/20
            rows.append({'varga':n,'weight':w,'lord':owner,'relation':rel,'contribution':float(score)})
        out[p]={'total':sum(r['contribution'] for r in rows),'maximum':20,'components':rows}
    return {'group':group,'relationship_frame':relationship_frame,'planets':out}

def avasthas(longitudes,speeds=None,moon_policy='waxing',mudita_policy='literal_all'):
    if mudita_policy not in ('literal_all','any_condition'):raise ValueError('Unknown Mudita policy')
    s=c.division(longitudes,1);nature=benefic_classification(longitudes,moon_policy)
    good=set(nature['benefics']);bad=set(nature['malefics']);speeds=speeds or {};out={}
    for p in c.SEVEN:
        owner=c.LORDS[s[p]];rel=c.compound_relation(p,owner,s);dig=degree_dignity(p,longitudes[p])
        joined={o for o in c.PLANETS if o!=p and o in s and s[o]==s[p]}
        aspects={o for o in c.PLANETS if o!=p and o in s and s[p] in c.planetary_aspects(o,s[o])}
        friends={o for o in c.SEVEN if o!=p and c.compound_relation(p,o,s) in ('friend','great_friend')}
        enemies={o for o in c.SEVEN if o!=p and c.compound_relation(p,o,s) in ('enemy','great_enemy')}
        friendly=rel in ('friend','great_friend');enemy=rel in ('enemy','great_enemy')
        awake='Jaagrita' if dig['own_sign'] or dig['exalted_sign'] else 'Sushupta' if dig['debilitated_sign'] or enemy else 'Swapna'
        mood={'Deepta':dig['exalted_sign'],'Swastha':dig['own_sign'],'Mudita':rel=='great_friend',
            'Saanta':rel=='friend','Deena':rel=='neutral','Dukhita':enemy,'Vikala':bool(joined&bad),
            'Khala':owner in bad,'Kopita':combustion(p,longitudes[p],longitudes['Sun'],speeds.get(p,0))['combust']}
        mudita=[friendly,bool((joined|aspects)&friends),'Jupiter' in joined]
        extra={'Lajjita':c.count(s['Asc'],s[p])==5 and bool(joined&{'Sun','Mars','Saturn','Rahu','Ketu'}),
            'Garvita':dig['exalted_sign'] or dig['moolatrikona_sign'],
            'Kshudhita':enemy or bool((joined|aspects)&enemies) or 'Saturn' in joined,
            'Trishita':s[p] in (3,7,11) and bool(aspects&enemies) and not bool(aspects&good),
            'Mudita':all(mudita) if mudita_policy=='literal_all' else any(mudita),
            'Kshobhita':'Sun' in joined and bool(aspects&(bad|enemies))}
        out[p]={'alertness':awake,'moods':[k for k,v in mood.items() if v],
            'additional_moods':[k for k,v in extra.items() if v],
            'additional_conditions':extra,'conjoined':sorted(joined),'aspected_by':sorted(aspects)}
    return {'planets':out,'nature':nature,'mudita_policy':mudita_policy,
        'lajjita_policy':'any listed malefic; simultaneous Rahu and Ketu conjunction is impossible',
        'kopita_policy':'classical combustion threshold used to operationalize close to Sun'}

def drishti_value(angle,planet=None):
    """Sripati/Raman ordinary piecewise curve plus specified special intervals."""
    a=float(angle)%360
    if a<30 or a>=300:x=0
    elif a<60:x=(a-30)/2
    elif a<90:x=a-45
    elif a<120:x=(120-a)/2+30
    elif a<150:x=150-a
    elif a<180:x=(a-150)*2
    else:x=(300-a)/2
    if planet=='Mars' and (90<=a<120 or 210<=a<240):x+=15
    if planet=='Jupiter' and (120<=a<150 or 240<=a<270):x+=30
    if planet=='Saturn' and (60<=a<90 or 270<=a<300):x+=45
    return x

def raman_kranti(tropical_longitude):
    """Raman's six linear segments; an astrological approximation, not actual declination."""
    x=float(tropical_longitude)%360;b=min(x%180,180-x%180)
    increments=(362,341,299,236,150,52);n=min(int(b//15),5)
    value=(sum(increments[:n])+increments[n]*(b-n*15)/15)/60
    return value if x<180 else -value

def ayana_bala(planet,tropical_longitude):
    k=raman_kranti(tropical_longitude)
    k=abs(k) if planet=='Mercury' else -k if planet in ('Moon','Saturn') else k
    return (24+k)*1.25*(2 if planet=='Sun' else 1)

def chesta_bala(mean_longitude,true_longitude,seeghrochcha):
    """Circular midpoint prevents a spurious 180-degree jump at Aries zero."""
    delta=(float(true_longitude)-float(mean_longitude)+180)%360-180
    if math.isclose(abs(delta),180,abs_tol=1e-10):raise ValueError('Antipodal mean/true longitudes have no unique midpoint')
    midpoint=float(mean_longitude)+delta/2
    return angular_distance(seeghrochcha,midpoint)/3

def shadbala(longitudes,*,mc,tropical_longitudes,apparent_solar_hour,is_day,
             period_fraction,time_lords,chesta_inputs,profile='raman_sripati',moon_policy='raman_tithi8_to23',
             relationship_frame='rasi',war_policy='raman_longitude',minimum_profile='bphs_27'):
    """All six strengths and their components, given explicit astronomical inputs.

    time_lords requires year, month, weekday, hora. chesta_inputs requires
    mean_longitude and seeghrochcha for Mars..Saturn. A total is never emitted
    with a missing component. Sun/Moon motional terms are already counted by
    doubled Ayana/Paksha in this Raman profile and are not counted twice.
    The bphs_translation option changes only the saptavargaja point table.
    """
    if profile not in SAPTA_POINTS:raise ValueError('Unknown strength profile')
    if relationship_frame not in ('rasi','varga'):raise ValueError('Unknown relationship frame')
    if war_policy not in ('raman_longitude','none'):raise ValueError('Unknown planetary war policy')
    if minimum_profile not in ('bphs_27','raman'):raise ValueError('Unknown minimum-strength profile')
    minimum={**MINIMUM_VIRUPAS,**({'Sun':300} if minimum_profile=='raman' else {})}
    if not 0<=period_fraction<1:raise ValueError('period_fraction must lie in [0,1)')
    if not 0<=apparent_solar_hour<24:raise ValueError('apparent solar hour must lie in [0,24)')
    if set(time_lords)!=set(('year','month','weekday','hora')):raise ValueError('All four time lords required')
    if any(p not in c.SEVEN for p in time_lords.values()):raise ValueError('Invalid time lord')
    s=c.division(longitudes,1);nature=benefic_classification(longitudes,moon_policy)
    good=set(nature['benefics']);elong=angular_distance(longitudes['Moon'],longitudes['Sun'])/3
    out={};base={}
    for p in c.SEVEN:
        sapta=0;varga_rows=[]
        for n in (1,2,3,7,9,12,30):
            sn=c.division(longitudes,n);rel=c.compound_relation(p,c.LORDS[sn[p]],s if relationship_frame=='rasi' else sn)
            value=45 if n==1 and degree_dignity(p,longitudes[p])['moolatrikona_degree_zone'] else SAPTA_POINTS[profile][rel]
            sapta+=value;varga_rows.append({'varga':n,'relation':rel,'virupas':value})
        female=p in ('Moon','Venus');gender_decan=2 if female else 1 if p in ('Saturn','Mercury') else 0
        house=c.count(s['Asc'],s[p])
        sthana={'uchcha':uchcha_bala(p,longitudes[p],60),'saptavargaja':sapta,
            'ojhayugma':15*sum(c.varga_sign(longitudes[p],n)%2==int(female) for n in (1,9)),
            'kendradi':(60,30,15)[(house-1)%3],
            'drekkana':15*int(int(c.within(longitudes[p])//10)==gender_decan)}
        powerless=(mc+180)%360 if p in ('Sun','Mars') else (longitudes['Asc']+180)%360 if p in ('Jupiter','Mercury') else mc if p in ('Moon','Venus') else longitudes['Asc']
        dig=angular_distance(longitudes[p],powerless)/3
        day_strength=(12-abs(apparent_solar_hour-12))*5
        nath=60 if p=='Mercury' else day_strength if p in ('Sun','Jupiter','Venus') else 60-day_strength
        third=min(2,int(period_fraction*3));third_lord=(('Mercury','Sun','Saturn') if is_day else ('Moon','Venus','Mars'))[third]
        paksha=(elong if p in good else 60-elong)*(2 if p=='Moon' else 1)
        kala={'nathonnatha':nath,'paksha':paksha,'tribhaga':60*int(p in (third_lord,'Jupiter')),
            **{k:weight*int(time_lords[k]==p) for k,weight in (('year',15),('month',30),('weekday',45),('hora',60))},
            'ayana':ayana_bala(p,tropical_longitudes[p]),'yuddha':0}
        if p in ('Sun','Moon'):chesta=0
        else:
            if p not in chesta_inputs:raise ValueError(f'Missing traditional motional inputs for {p}')
            motion=chesta_inputs[p]
            chesta=chesta_bala(motion['mean_longitude'],longitudes[p],motion['seeghrochcha'])
        natural=60*{'Sun':7,'Moon':6,'Mars':2,'Mercury':3,'Jupiter':4,'Venus':5,'Saturn':1}[p]/7
        aspects={o:drishti_value(longitudes[p]-longitudes[o],o)*(1 if o in good else -1)/4 for o in c.SEVEN if o!=p}
        base[p]=sum(sthana.values())+dig+sum(v for k,v in kala.items() if k not in ('ayana','yuddha'))
        out[p]={'sthana_components':sthana,'saptavargaja_components':varga_rows,'sthana':sum(sthana.values()),
            'dig':dig,'kala_components':kala,'chesta':chesta,'naisargika':natural,'drik':sum(aspects.values()),'drik_components':aspects}
    wars=[]
    if war_policy=='raman_longitude':
        eligible=('Mars','Mercury','Jupiter','Venus','Saturn');diameters=dict(zip(eligible,(9.4,6.6,190.4,16.6,158.0)))
        for i,p in enumerate(eligible):
            for q in eligible[i+1:]:
                sep=angular_distance(longitudes[p],longitudes[q])
                if sep<1:
                    delta=(longitudes[q]-longitudes[p]+180)%360-180
                    if abs(delta)<1e-10:raise ValueError('Exactly tied war longitudes require a winner decision')
                    winner,loser=(p,q) if delta>0 else (q,p)
                    value=abs(base[p]-base[q])/abs(diameters[p]-diameters[q])
                    out[winner]['kala_components']['yuddha']+=value;out[loser]['kala_components']['yuddha']-=value
                    wars.append({'winner':winner,'loser':loser,'transfer_virupas':value})
    for p,row in out.items():
        row['kala']=sum(row['kala_components'].values())
        row['total_virupas']=sum(row[k] for k in ('sthana','dig','kala','chesta','naisargika','drik'))
        row['rupas']=row['total_virupas']/60
        row['required_virupas']=minimum[p];row['ratio_to_requirement']=row['total_virupas']/minimum[p]
    return {'profile':profile,'units':'virupas (traditional score)','planets':out,'planetary_wars':wars,
        'relationship_frame':relationship_frame,'moon_policy':moon_policy,'mercury_policy':nature['mercury_policy'],
        'war_policy':war_policy,'minimum_profile':minimum_profile,
        'war_multi_pair_policy':'sum pairwise transfers from the same pre-war totals',
        'sun_moon_chesta':'included in doubled Sun Ayana and Moon Paksha; separate Chesta=0',
        'time_lords':time_lords,'physical_interpretation':None}
