"""Book-based arithmetic. Signs are zero-based: Aries=0, Pisces=11.

Source: P.V.R. Narasimha Rao, Vedic Astrology: An Integrated Approach,
uploaded 442-page edition. Page references below refer to PDF pages.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from __future__ import annotations
from fractions import Fraction
import math

SIGNS = ('Ar','Ta','Ge','Cn','Le','Vi','Li','Sc','Sg','Cp','Aq','Pi')
PLANETS = ('Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu')
SEVEN = PLANETS[:7]
LORDS = ('Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter')
EXALT = dict(zip(PLANETS, (0,1,9,5,3,11,6,2,8)))
DEBIL = {p:(s+6)%12 for p,s in EXALT.items()}
MOOLA = dict(zip(PLANETS, (4,1,0,5,8,6,10,5,11)))
NAKSHATRAS = ('Aswini','Bharani','Krittika','Rohini','Mrigasira','Aardra','Punarvasu','Pushyami','Aasresha','Makha','Poorva Phalguni','Uttara Phalguni','Hasta','Chitra','Swaati','Visaakha','Anooraadha','Jyeshtha','Moola','Poorvaashaadha','Uttaraashaadha','Sravanam','Dhanishtha','Satabhishak','Poorvaabhaadra','Uttaraabhaadra','Revati')
VIM_ORDER = ('Ketu','Venus','Sun','Moon','Mars','Rahu','Jupiter','Saturn','Mercury')
VIM_YEARS = dict(zip(VIM_ORDER,(7,20,6,10,7,18,16,19,17)))
VARGAS = (1,2,3,4,5,6,7,8,9,10,11,12,16,20,24,27,30,40,45,60)
ODD_FOOTED = {0,1,2,6,7,8}
FRIENDS = {
 'Sun':{'Moon','Mars','Jupiter'}, 'Moon':{'Sun','Mercury'},
 'Mars':{'Sun','Moon','Jupiter'}, 'Mercury':{'Sun','Venus'},
 'Jupiter':{'Sun','Moon','Mars'}, 'Venus':{'Mercury','Saturn'},
 'Saturn':{'Mercury','Venus'}}
ENEMIES = {'Sun':{'Venus','Saturn'},'Moon':set(),'Mars':{'Mercury'},
 'Mercury':{'Moon'},'Jupiter':{'Mercury','Venus'},'Venus':{'Sun','Moon'},
 'Saturn':{'Sun','Moon','Mars'}}

def q(value):
    """Exact decimal/ratio input; refuse nonfinite values."""
    if isinstance(value,Fraction): return value
    return Fraction(str(value))

def deg(d=0,m=0,s=0):
    return q(d)+q(m)/60+q(s)/3600

def norm(longitude): return q(longitude)%360
def sign(longitude): return int(norm(longitude)//30)
def within(longitude): return norm(longitude)%30
def lon(sign_name, d=0,m=0,s=0):
    si=SIGNS.index(sign_name) if isinstance(sign_name,str) else sign_name
    if not isinstance(si,int) or not 0<=si<12: raise ValueError('Invalid sign')
    a=deg(d,m,s)
    if not 0<=a<30: raise ValueError('Degree in sign must be in [0,30)')
    return si*30+a

def position(longitude):
    x=norm(longitude); si=sign(x); sec=(x%30)*3600
    dd=int(sec//3600); mm=int((sec%3600)//60); ss=float(sec%60)
    return {'longitude':float(x),'sign':SIGNS[si],'sign_index':si,
            'degrees':dd,'minutes':mm,'seconds':round(ss,6)}

def count(reference, target, direction=1):
    """Inclusive sign/whole-sign house count, PDF 16-17."""
    if direction not in (-1,1): raise ValueError('Direction must be +/-1')
    return ((target-reference)*direction)%12+1

def advance(reference, houses, direction=1):
    return (reference+direction*(houses-1))%12

def nakshatra(longitude):
    x=norm(longitude); length=Fraction(40,3); n=int(x//length)
    f=(x%length)/length
    return {'index':n+1,'name':NAKSHATRAS[n],'pada':int(f*4)+1,
            'lord':VIM_ORDER[n%9],'elapsed_fraction':float(f),'remaining_fraction':float(1-f)}

def panchanga(sun,moon):
    """Angular limbs, PDF 19-26. Weekday/hora require actual sunrise."""
    delta=(norm(moon)-norm(sun))%360
    ti=int(delta//12)+1; half=int(delta//6)
    ks=('Bava','Balava','Kaulava','Taitula','Garija','Vanija','Vishti')
    karana='Kimstughna' if half==0 else ks[(half-1)%7] if half<=56 else ('Sakuna','Chatushpada','Naga')[half-57]
    yn=('Vishkambha','Preeti','Aayushmaan','Saubhaagya','Sobhana','Atiganda','Sukarman','Dhriti','Shoola','Ganda','Vriddhi','Dhruva','Vyaaghaata','Harshana','Vajra','Siddhi','Vyatipaata','Variyan','Parigha','Shiva','Siddha','Saadhya','Subha','Sukla','Brahma','Indra','Vaidhriti')
    yi=int(((norm(sun)+norm(moon))%360)//Fraction(40,3))
    return {'tithi':ti,'paksha':'Sukla' if ti<=15 else 'Krishna','tithi_in_paksha':(ti-1)%15+1,
            'elongation':float(delta),'nakshatra':nakshatra(moon),'yoga_index':yi+1,
            'yoga':yn[yi],'karana':karana}

def varga_sign(longitude,n):
    """All 20 mappings in chapter 6, PDF 53-60; D-30 is UNEQUAL.
    D-8 and D-60 follow this edition, not unlabelled alternative traditions.
    Exact boundaries belong to the next segment.
    """
    if n not in VARGAS: raise ValueError(f'Unsupported division D-{n}')
    s=sign(longitude); d=within(longitude); k=int(d*n//30)
    odd=s%2==0; mode=s%3; element=s%4
    if n==1:return s
    if n==2:return (4 if k==0 else 3) if odd else (3 if k==0 else 4)
    if n==3:return (s+4*k)%12
    if n==4:return (s+3*k)%12
    if n==5:return ((0,10,8,2,6) if odd else (1,5,11,9,7))[k]
    if n==6:return ((0 if odd else 6)+k)%12
    if n==7:return (s+(0 if odd else 6)+k)%12
    if n==8:return ((0,8,4)[mode]+k)%12
    if n==9:return ((0,9,6,3)[element]+k)%12
    if n==10:return (s+(0 if odd else 8)+k)%12
    if n==11:return (-s+k)%12
    if n in (12,60):return (s+k)%12
    if n in (16,45):return ((0,4,8)[mode]+k)%12
    if n==20:return ((0,8,4)[mode]+k)%12
    if n==24:return ((4 if odd else 3)+k)%12
    if n==27:return ((0,3,6,9)[element]+k)%12
    if n==30:
        ends=(5,10,18,25,30) if odd else (5,12,20,25,30)
        signs=(0,10,8,2,6) if odd else (1,5,11,9,7)
        return next(ss for end,ss in zip(ends,signs) if d<end)
    if n==40:return ((0 if odd else 6)+k)%12
    raise AssertionError(n)

def division(longitudes,n): return {p:varga_sign(v,n) for p,v in longitudes.items()}

def sun_upagrahas(sun):
    """PDF 44-47; exercise 7 has an inconsistent printed Upaketu answer."""
    dh=(norm(sun)+deg(133,20))%360
    vy=(-dh)%360; pa=(vy+180)%360; ind=(-pa)%360
    return dict(Dhuma=dh,Vyatipaata=vy,Parivesha=pa,Indrachaapa=ind,Upaketu=(ind+deg(16,40))%360)

def special_lagnas(sun_at_sunrise,elapsed_minutes,moon,asc):
    """PDF 48-52. BL uses the stated 1 degree/4 min rate, fixing Example 7."""
    t=q(elapsed_minutes)
    if t<0: raise ValueError('Use the last sunrise preceding birth')
    sl=(norm(asc)+(norm(moon)%Fraction(40,3))*27)%360
    return {'BL':(norm(sun_at_sunrise)+t/4)%360,
            'HL':(norm(sun_at_sunrise)+t/2)%360,
            'GL':(norm(sun_at_sunrise)+t*5/4)%360,'SL':sl}

def hora_lord(weekday_sunday0,elapsed_minutes,day_length_minutes=1440):
    """24 equal sunrise-to-sunrise horas, PDF 25-26."""
    if not 0<=weekday_sunday0<7 or day_length_minutes<=0 or not 0<=elapsed_minutes<day_length_minutes:
        raise ValueError('Invalid weekday or time interval')
    order=('Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon')
    start=order.index(SEVEN[weekday_sunday0])
    return order[(start+int(q(elapsed_minutes)*24/q(day_length_minutes)))%7]

def upagraha_segments(weekday_sunday0,night=False):
    """Eight rulers: weekday order plus lordless part after Saturn, PDF 46."""
    start=(weekday_sunday0+4)%7 if night else weekday_sunday0
    ring=SEVEN+(None,)
    return [ring[(start+i)%8] for i in range(8)]

def planetary_aspects(planet,s):
    houses={'Mars':(4,7,8),'Jupiter':(5,7,9),'Saturn':(3,7,10)}.get(planet,(7,))
    return tuple(advance(s,h) for h in houses)

def rasi_aspects(s):
    mode=s%3
    if mode==2:return tuple(i for i in range(12) if i%3==2 and i!=s)
    targets=1 if mode==0 else 0
    adjacent=(s+1)%12 if mode==0 else (s-1)%12
    return tuple(i for i in range(12) if i%3==targets and i!=adjacent)

def arudha(house_sign,lord_sign):
    """PDF 82-84, including the 1st/7th exception."""
    a=(2*lord_sign-house_sign)%12
    return (a+9)%12 if (a-house_sign)%12 in (0,6) else a

def chara_karakas(longitudes):
    """Eight karakas, Rahu reversed, Ketu omitted; retain exact ties."""
    labels=('AK','AmK','BK','MK','PiK','PK','GK','DK')
    vals={p:(30-within(longitudes[p]) if p=='Rahu' else within(longitudes[p])) for p in PLANETS[:8]}
    ordered=sorted(vals,key=lambda p:vals[p],reverse=True)
    out={}; last=None; rank=0
    for i,p in enumerate(ordered):
        if vals[p]!=last:rank=i
        out[p]={'karaka':labels[rank],'advancement':float(vals[p]),'rank':rank+1}
        last=vals[p]
    return out

def compound_relation(planet,other,signs):
    if planet not in SEVEN or other not in SEVEN:raise ValueError('Natural node relationships are not specified by Table 7')
    if planet==other:return 'own'
    nat=1 if other in FRIENDS[planet] else -1 if other in ENEMIES[planet] else 0
    temp=1 if count(signs[planet],signs[other]) in (2,3,4,10,11,12) else -1
    return {-2:'great_enemy',-1:'enemy',0:'neutral',1:'friend',2:'great_friend'}[nat+temp]

def dignity(planet,longitude):
    s=sign(longitude);d=within(longitude)
    own=s in ([10] if planet=='Rahu' else [7] if planet=='Ketu' else [i for i,p in enumerate(LORDS) if p==planet])
    return {'exalted_sign':s==EXALT[planet],'debilitated_sign':s==DEBIL[planet],
            'own_sign':own,'moolatrikona_sign':s==MOOLA[planet],
            'degree_in_sign':float(d)}

def age_avastha(longitude):
    k=int(within(longitude)//6)
    if sign(longitude)%2:k=4-k
    return ('Saisava','Kumaara','Yuva','Vriddha','Mrita')[k]

def activity_avastha(planet,longitude,moon,asc,elapsed_minutes,name_sound_number=None):
    """PDF 175-176; require explicit sound code instead of guessing Sanskrit phonetics."""
    c=nakshatra(longitude)['index']; p=PLANETS.index(planet)+1
    a=int(within(longitude)*9//30)+1;m=nakshatra(moon)['index']
    g=int(q(elapsed_minutes)//24)+1; l=sign(asc)+1
    idx=(c*p*a+m+g+l-1)%12+1
    names=('Sayana','Upavesana','Netrapaani','Prakaasana','Gamana','Aagamana','Sabhaa','Aagama','Bhojana','Nrityalipsaa','Kautuka','Nidraa')
    result={'index':idx,'name':names[idx-1]}
    if name_sound_number is not None:
        if not isinstance(name_sound_number,int) or name_sound_number<1:raise ValueError('Invalid sound number')
        adj=5 if planet in ('Sun','Jupiter') else 2 if planet in ('Moon','Mars') else 4 if planet in ('Rahu','Ketu') else 3
        strength=((idx*idx+name_sound_number)%12+adj)%3
        result['activity_strength']={0:'Vicheshta',1:'Drishti',2:'Cheshta'}[strength]
    return result

def argalas(target,signs):
    """PDF 99-100. Return evidence/counts; equal counts need strength judgment."""
    direction=-1 if signs.get('Ketu')==target else 1
    out=[]
    for h,block in ((2,12),(4,10),(11,3),(5,9)):
        a=advance(target,h,direction);v=advance(target,block,direction)
        ap=[p for p in PLANETS if signs.get(p)==a];vp=[p for p in PLANETS if signs.get(p)==v]
        out.append({'house':h,'blocking_house':block,'planets':ap,'blocking_planets':vp,
                    'count_balance':len(ap)-len(vp),'equal_counts_need_strength':len(ap)==len(vp)>0})
    third=advance(target,3,direction)
    out.append({'special_third_house_malefics':[p for p in ('Sun','Mars','Saturn','Rahu','Ketu') if signs.get(p)==third],
                'note':'Multiple malefics in the third can form argala; not reduced to a numeric score.'})
    return out

def badhaka(s): return advance(s,(11,9,7)[s%3])

def _adv(p,longitudes):return 30-within(longitudes[p]) if p in ('Rahu','Ketu') else within(longitudes[p])

def _influence_count(s,signs,lords):
    # Roles counted independently: Mercury as dispositor counts twice (PDF 184).
    return sum(signs[p]==s or s in rasi_aspects(signs[p]) for p in ['Jupiter','Mercury']+list(lords))

def dasa_years(s,lord,signs,own_sign_priority=True):
    direction=1 if s in ODD_FOOTED else -1
    # Sanjay Rath, Narayana Dasa (2004), p39, explicitly caps the Mercury/Virgo
    # overlap at 12. own_sign_priority retains the earlier API's strict mode.
    if signs[lord]==s and own_sign_priority:return 12
    n=(count(s,signs[lord],direction)-1) or 12
    n+=int(signs[lord]==EXALT[lord])-int(signs[lord]==DEBIL[lord])
    if not 0<=n<=12:raise ValueError('Dasa duration outside 0..12; review convention')
    return n

def stronger_colord(s,signs,longitudes,purpose='arudha'):
    if s not in (7,10):return LORDS[s]
    a,b=('Mars','Ketu') if s==7 else ('Saturn','Rahu')
    if (signs[a]==s)!=(signs[b]==s):return b if signs[a]==s else a
    def key(p):
        t=signs[p]
        return (sum(signs[x]==t for x in PLANETS),
                _influence_count(t,signs,[LORDS[t]]),int(t==EXALT[p]),t%3,
                dasa_years(s,p,signs) if purpose=='dasa' else _adv(p,longitudes))
    ka,kb=key(a),key(b)
    if ka==kb:
        # Same-sign co-lords give identical durations, AD starts and sign parity.
        # Use the classical name as a numerical-equivalence convention, not a
        # claim that its astrological strength is greater.
        if purpose=='dasa' and signs[a]==signs[b]:return a
        raise ValueError(f'Unresolved co-lord tie in {SIGNS[s]}; specify an override')
    return a if ka>kb else b

def primary_lords(signs,longitudes,purpose='arudha',overrides=None):
    overrides=overrides or {};result={i:LORDS[i] for i in range(12)}
    for s in (7,10):
        key=SIGNS[s]
        if key in overrides:
            if overrides[key] not in (('Mars','Ketu') if s==7 else ('Saturn','Rahu')):raise ValueError('Invalid co-lord override')
            result[s]=overrides[key]
        else:result[s]=stronger_colord(s,signs,longitudes,purpose)
    return result

def stronger_sign(a,b,signs,longitudes,lords=None):
    """Sequential hierarchy, PDF 185-187. Exact unresolved ties are explicit."""
    if a==b:return a
    lords=lords or primary_lords(signs,longitudes,'dasa')
    def key(s):
        owns=[LORDS[s]]+(['Ketu'] if s==7 else ['Rahu'] if s==10 else [])
        return (sum(signs[p]==s for p in PLANETS),_influence_count(s,signs,owns),
                any(signs[p]==s==EXALT[p] for p in PLANETS),
                int(signs[lords[s]]%2!=s%2),s%3,_adv(lords[s],longitudes))
    ka,kb=key(a),key(b)
    if ka==kb:raise ValueError(f'Unresolved sign strength: {SIGNS[a]}, {SIGNS[b]}')
    return a if ka>kb else b

def arudhas(signs,longitudes,overrides=None):
    lords=primary_lords(signs,longitudes,'arudha',overrides)
    asc=signs['Asc'];out={}
    for h in range(1,13):
        s=advance(asc,h);out['AL' if h==1 else 'UL' if h==12 else f'A{h}']=arudha(s,signs[lords[s]])
    return out

def graha_arudhas(signs,longitudes):
    """PDF 89-90: projection from the planet to its stronger owned sign."""
    out={};ls=primary_lords(signs,longitudes)
    for p in PLANETS:
        owned=([10] if p=='Rahu' else [7] if p=='Ketu' else [i for i,pl in enumerate(LORDS) if pl==p])
        s=owned[0] if len(owned)==1 else stronger_sign(*owned,signs,longitudes,ls)
        out[p]=arudha(signs[p],s)
    return out

def amsa_counts(longitudes):
    """Favorable division counts, PDF 63-65; excludes unprovided Vimsopaka weights."""
    groups={'shadvarga':(1,2,3,9,12,30),'saptavarga':(1,2,3,7,9,12,30),
            'dasavarga':(1,2,3,7,9,10,12,16,30,60),
            'shodasavarga':(1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60)}
    return {p:{g:sum(varga_sign(longitudes[p],n) in {EXALT[p],MOOLA[p]} or LORDS[varga_sign(longitudes[p],n)]==p for n in ns) for g,ns in groups.items()} for p in SEVEN}
