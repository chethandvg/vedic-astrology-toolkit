"""Structural rule checks for PVR's chapter 11, with explicit unknowns.

No personality, wealth, disease, death or life-event conclusion follows from a hit.
Strength judgments are supplied separately; None never masquerades as False/True.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from itertools import combinations
from . import core as c
from .strengths import benefic_classification,combustion,angular_distance
from .tajaka import DEEP_EXALT

def all3(values):
    values=list(values)
    return False if any(v is False for v in values) else None if any(v is None for v in values) else True

def any3(values):
    values=list(values)
    return True if any(v is True for v in values) else None if any(v is None for v in values) else False

def evaluate(longitudes,varga=1,strong=None,speeds=None,points=None,colord_overrides=None,
             deep_exaltation_orb=0.0,include_nodes=True,mercury_policy='majority',mercury_tie='unresolved'):
    """Whole-sign structural detection; 'strong' must be a declared planet->bool map.
    Undefined strength or missing special points returns conditions_pending.
    Rasi relationships are used for friendship; varga controls occupied houses.
    Close/deep thresholds are caller-visible, never chosen from desired outcomes.
    """
    if deep_exaltation_orb<0:raise ValueError('Nonnegative deep-exaltation tolerance required')
    if varga!=1:raise ValueError('This catalog is defined for D1; higher-chart reinterpretation requires separately defined nested divisional rules')
    s=c.division(longitudes,varga);s1=c.division(longitudes,1);sn=c.division(longitudes,9)
    planets=tuple(p for p in (c.PLANETS if include_nodes else c.SEVEN) if p in s)
    strong=strong or {};speeds=speeds or {};points=points or {};asc=s['Asc']
    nature=benefic_classification(longitudes,mercury_policy=mercury_policy,mercury_tie=mercury_tie)
    if nature['unknown']:
        options=dict(varga=varga,strong=strong,speeds=speeds,points=points,colord_overrides=colord_overrides,
            deep_exaltation_orb=deep_exaltation_orb,include_nodes=include_nodes,mercury_policy=mercury_policy)
        a=evaluate(longitudes,**options,mercury_tie='benefic')
        b=evaluate(longitudes,**options,mercury_tie='malefic')
        for ra,rb in zip(a['rules'],b['rules']):
            if ra['status']!=rb['status']:ra['status']='conditions_pending'
            for field in ('conditions','qualifications'):
                for key,value in ra.get(field,{}).items():
                    if value!=rb[field][key]:ra[field][key]=None
        a['nature']=nature
        a['assumptions']['mercury_tie']='unresolved; both classifications evaluated'
        return a
    good=set(nature['benefics'])&set(planets);bad=set(nature['malefics'])&set(planets)
    lord={h:c.LORDS[(asc+h-1)%12] for h in range(1,13)}
    h=lambda p:c.count(asc,s[p]);relative=lambda p,q:c.count(s[q],s[p])
    joint=lambda p,q:p!=q and s[p]==s[q]
    aspect=lambda p,q:p!=q and s[q] in c.planetary_aspects(p,s[p])
    influence=lambda p,q:joint(p,q) or aspect(p,q)
    occupy=lambda hs,ps=planets,ref=asc:all(any(c.count(ref,s[p])==hh for p in ps) for hh in hs)
    own=lambda p:c.LORDS[s[p]]==p
    ex=lambda p:s[p]==c.EXALT[p]
    deb=lambda p:s[p]==c.DEBIL[p]
    oe=lambda p:own(p) or ex(p)
    relation=lambda p:c.compound_relation(p,c.LORDS[s[p]],s1) if p in c.SEVEN else None
    friend=lambda p:relation(p) in ('friend','great_friend')
    enemy=lambda p:relation(p) in ('enemy','great_enemy')
    comb=lambda p:combustion(p,longitudes[p],longitudes['Sun'],speeds.get(p,0))['combust']
    kendra=lambda p:h(p) in (1,4,7,10)
    trikona=lambda p:h(p) in (1,5,9)
    exchange=lambda a,b:lord[a]!=lord[b] and h(lord[a])==b and h(lord[b])==a
    mutual=lambda p,q:aspect(p,q) and aspect(q,p)
    association=lambda p,q:p!=q and (joint(p,q) or mutual(p,q) or (c.LORDS[s[p]]==q and c.LORDS[s[q]]==p))
    nd=lambda p:c.LORDS[sn[p]]
    deep=lambda p:angular_distance(longitudes[p],DEEP_EXALT[p])<=deep_exaltation_orb
    uniq=lambda *ps:tuple(dict.fromkeys(ps))
    rows=[]
    def add(name,page,conditions,category='popular',participants=()):
        value=all3(conditions.values())
        rows.append({'name':name,'pdf_page':page,'category':category,
            'status':'conditions_met' if value is True else 'conditions_not_met' if value is False else 'conditions_pending',
            'conditions':conditions,'participants':list(participants)})
    # Solar and lunar combinations; luminaries never count as their own companions.
    for ref,excluded,names,page in [('Sun',{'Sun','Moon'},('Vesi','Vosi','Ubhayachara'),107),('Moon',{'Sun','Moon'},('Sunaphaa','Anaphaa','Duradhara'),108)]:
        other=[p for p in planets if p not in excluded]
        a=occupy([2],other,s[ref]);b=occupy([12],other,s[ref])
        for name,condition in zip(names,(a,b,a and b)):add(name,page,{'placement':condition},'luminary')
    add('Budha-Aaditya',107,{'conjunction':joint('Sun','Mercury')},participants=('Sun','Mercury'))
    add('Kemadruma',109,{'no_lunar_companions':not any(relative(p,'Moon') in (1,2,12) for p in planets if p not in ('Sun','Moon')),
        'no_angular_planets_other_than_moon':not any(kendra(p) for p in planets if p!='Moon')},'lunar',('Moon',))
    add('Chandra-Mangala',109,{'conjunction':joint('Moon','Mars')},participants=('Moon','Mars'))
    add('Adhi',109,{'benefics_in_each_of_6_7_8':occupy((6,7,8),good-{'Moon'},s['Moon'])})
    for p,name in [('Mars','Ruchaka'),('Mercury','Bhadra'),('Saturn','Sasa'),('Venus','Maalavya'),('Jupiter','Hamsa')]:
        add(name,110 if p in ('Mars','Mercury','Saturn') else 111,{'angular':kendra(p),'own_or_exalted':oe(p)},'mahapurusha',(p,))
    # Nabhasa geometry uses exactly the seven classical bodies for shapes/counts.
    occupied={h(p) for p in c.SEVEN};signset={s[p] for p in c.SEVEN}
    for i,name in enumerate(('Rajju','Musala','Nala')):add(name,112,{'all_same_modality':all(x%3==i for x in signset)},'nabhasa')
    quadrants=(1,4,7,10)
    # Book convention (PDF 112): natural malefics include the nodes; its Sarpa example is Mars, Rahu
    # and Ketu in angles. BPHS-based tools count only Sun, Mars and Saturn; the web app notes this.
    add('Maalaa',112,{'benefics_in_at_least_three_quadrants':len({h(p) for p in good}&set(quadrants))>=3},'nabhasa')
    rows[-1]['qualifications']={'no_angular_malefic':not any(kendra(p) for p in bad)}
    add('Sarpa',112,{'malefics_in_at_least_three_quadrants':len({h(p) for p in bad}&set(quadrants))>=3},'nabhasa')
    rows[-1]['qualifications']={'no_angular_benefic':not any(kendra(p) for p in good)}
    def shape(name,groups,page):add(name,page,{'occupied_house_set':any(occupied==set(g) for g in groups)},'nabhasa')
    shape('Gadaa',[(a,(a+2)%12+1) for a in quadrants],112)
    shape('Sakata',[(1,7)],113);shape('Vihanga',[(4,10)],113);shape('Sringaataka',[(1,5,9)],113)
    shape('Hala',[(2,6,10),(3,7,11),(4,8,12)],113)
    for name,gh,bh in [('Vajra',(1,7),(4,10)),('Yava',(4,10),(1,7))]:
        add(name,113,{'benefic_positions':all(h(p) in gh for p in good if p in c.SEVEN) and occupy(gh,good),
            'malefic_positions':all(h(p) in bh for p in bad if p in c.SEVEN) and occupy(bh,bad)},'nabhasa')
    shape('Kamala',[(1,4,7,10)],113);shape('Vaapi',[(2,5,8,11),(3,6,9,12)],113)
    for name,start in [('Yoopa',1),('Sara',4),('Sakti',7),('Danda',10)]:shape(name,[[(start-1+i)%12+1 for i in range(4)]],114)
    for name,start in [('Naukaa',1),('Koota',4),('Chatra',7),('Chaapa',10)]:shape(name,[[(start-1+i)%12+1 for i in range(7)]],114)
    shape('Ardha Chandra',[[(start-1+i)%12+1 for i in range(7)] for start in (2,3,5,6,8,9,11,12)],114)
    shape('Chakra',[(1,3,5,7,9,11)],114);shape('Samudra',[(2,4,6,8,10,12)],115)
    higher=any(r['category']=='nabhasa' and r['status']=='conditions_met' for r in rows)
    for i,name in enumerate(('Gola','Yuga','Soola','Kedaara','Paasa','Daama','Veenaa'),1):
        add(name,115,{'distinct_sign_count':len(signset)==i,'no_other_nabhasa':not higher},'sankhya')
    add('Subha',116,{'benefic_in_lagna_or_flanks':occupy([1],good) or occupy([2,12],good)})
    add('Asubha',116,{'malefic_in_lagna_or_flanks':occupy([1],bad) or occupy([2,12],bad)})
    add('Gaja-Kesari',116,{'jupiter_angular_from_moon':relative('Jupiter','Moon') in quadrants,
        'other_benefic_influence':any(influence(p,'Jupiter') for p in good-{'Jupiter'}),
        'not_debilitated_combust_or_inimical':not (deb('Jupiter') or comb('Jupiter') or enemy('Jupiter'))},participants=('Jupiter','Moon'))
    add('Guru-Mangala',116,{'conjunction_or_opposition':relative('Mars','Jupiter') in (1,7)},participants=('Jupiter','Mars'))
    amala=any(occupy([10],good,s[ref]) and not occupy([10],bad,s[ref]) for ref in ('Asc','Moon'))
    add('Amala',117,{'tenth_only_benefics':amala})
    add('Parvata',117,{'angular_benefic':any(kendra(p) for p in good),'no_angular_malefic':not any(kendra(p) for p in bad),
        'no_malefic_in_7_8':not any(h(p) in (7,8) for p in bad)})
    add('Kaahala',117,{'either_definition':any3([all3([relative(lord[4],'Jupiter') in quadrants,strong.get(lord[1])]),oe(lord[4]) and joint(lord[4],lord[10])])})
    add('Chaamara',117,{'either_definition':(ex(lord[1]) and kendra(lord[1]) and aspect('Jupiter',lord[1])) or any(sum(h(p)==hh for p in good)>=2 for hh in (7,9,10))})
    add('Sankha',117,{'either_definition':any3([all3([strong.get(lord[1]),relative(lord[5],lord[6]) in quadrants]),all3([joint(lord[1],lord[10]),s[lord[1]]%3==0,strong.get(lord[9])])])})
    add('Bheri',117,{'ninth_lord_strong':strong.get(lord[9]),'placement':occupy((1,2,7,12)) or (relative('Jupiter',lord[1]) in quadrants and relative('Venus',lord[1]) in quadrants)})
    add('Mridanga',117,{'lagna_lord_strong':strong.get(lord[1]),'dignified_angular_or_trinal_planet':any(oe(p) and (kendra(p) or trikona(p)) for p in c.SEVEN)})
    add('Sreenaatha',118,{'seventh_lord_exalted_in_10':ex(lord[7]) and h(lord[7])==10,'ninth_tenth_conjunction':joint(lord[9],lord[10])})
    add('Matsya',118,{'benefics_1_9':occupy((1,9),good),'planet_5':occupy([5]),'malefics_4_8':occupy((4,8),bad)})
    add('Koorma',118,{'benefics_5_6_7_dignified':occupy((5,6,7),[p for p in good if p in c.SEVEN and (oe(p) or friend(p))]),
        'malefics_1_3_11_dignified':occupy((1,3,11),[p for p in bad if oe(p)])})
    add('Khadga',118,{'exchange_2_9':exchange(2,9),'lagna_lord_angular_or_trinal':kendra(lord[1]) or trikona(lord[1])},participants=uniq(lord[2],lord[9],lord[1]))
    add('Kusuma',118,{'fixed_asc':asc%3==1,'angular_venus':kendra('Venus'),'moon_trinal_with_benefic':trikona('Moon') and any(joint('Moon',p) for p in good-{'Moon'}),'saturn_10':h('Saturn')==10})
    add('Kalaanidhi',118,{'jupiter_2_or_5':h('Jupiter') in (2,5),'mercury_venus_influence':all(influence(p,'Jupiter') for p in ('Mercury','Venus'))})
    a=lord[1];b=c.LORDS[s[a]];chain=(a,b,c.LORDS[s[b]],nd(b))
    add('Kalpadruma',118,{'four_dignified_or_angular_trinal':all(kendra(p) or trikona(p) or ex(p) for p in chain)},participants=chain)
    targets=[p for p in good if h(p) in (7,8)]
    add('Lagnaadhi',120,{'benefics_7_8':occupy((7,8),good),'unafflicted':not any(influence(q,p) for p in targets for q in bad)})
    for name,ref,hs in [('Hari',lord[2],(2,12,8)),('Hara',lord[7],(4,9,8)),('Brahma',lord[1],(4,10,11))]:add(name,120,{'benefic_placements':occupy(hs,good,s[ref])})
    add('Brahma_alternative',120,{'jupiter_from_9lord':relative('Jupiter',lord[9]) in quadrants,'venus_from_11lord':relative('Venus',lord[11]) in quadrants,'mercury_from_1_or_10lord':any(relative('Mercury',lord[x]) in quadrants for x in (1,10))})
    add('Vishnu',121,{'three_planets_in_2':all(h(p)==2 for p in (lord[9],lord[10],nd(lord[9])))})
    add('Siva',121,{'cyclic_lords':h(lord[5])==9 and h(lord[9])==10 and h(lord[10])==5})
    add('Trilochana',121,{'three_distinct_trines':len({s[p] for p in ('Sun','Moon','Mars')})==3 and all(relative(p,'Sun') in (1,5,9) for p in ('Moon','Mars'))})
    g=nd(lord[10]);add('Gouri',121,{'navamsa_dispositor_exalted_in_10':ex(g) and h(g)==10,'lagna_lord_joining':joint(lord[1],g)})
    add('Chandikaa',121,{'fixed_asc':asc%3==1,'sixth_lord_aspects_asc':asc in c.planetary_aspects(lord[6],s[lord[6]]),'sun_joins_dispositors':all(joint('Sun',nd(lord[x])) for x in (6,9))})
    add('Lakshmi',121,{'ninth_lord_angular_dignified':kendra(lord[9]) and oe(lord[9]),'lagna_lord_strong':strong.get(lord[1])})
    add('Saarada',121,{'tenth_lord_5':h(lord[10])==5,'angular_mercury':kendra('Mercury'),'sun_leo':s['Sun']==4,'sun_strong':strong.get('Sun'),
        'mercury_or_jupiter_trinal_moon':any(relative(p,'Moon') in (1,5,9) for p in ('Mercury','Jupiter')),'mars_11':h('Mars')==11})
    add('Bhaarathi',121,{'exalted_dispositor_joins_9lord':any(ex(nd(lord[x])) and joint(nd(lord[x]),lord[9]) for x in (2,5,11))})
    add('Saraswathi',122,{'three_benefic_placements':all(h(p) in (1,2,4,5,7,9,10) for p in ('Mercury','Jupiter','Venus')),'jupiter_dignity':oe('Jupiter') or friend('Jupiter')})
    add('Amsaavatara',122,{'angular_jupiter_venus_saturn':all(kendra(p) for p in ('Jupiter','Venus','Saturn')),'saturn_exalted':ex('Saturn')})
    add('Devendra',122,{'fixed_asc':asc%3==1,'exchange_2_10':exchange(2,10),'exchange_1_11':exchange(1,11)},participants=uniq(lord[2],lord[10],lord[1],lord[11]))
    add('Indra',122,{'exchange_5_11':exchange(5,11),'moon_5':h('Moon')==5},participants=uniq(lord[5],lord[11],'Moon'))
    add('Ravi',122,{'sun_10':h('Sun')==10,'tenth_lord_saturn_3':h(lord[10])==h('Saturn')==3})
    add('Bhaaskara',122,{'moon_12_from_sun':relative('Moon','Sun')==12,'mercury_2_from_sun':relative('Mercury','Sun')==2,'jupiter_trinal_moon':relative('Jupiter','Moon') in (5,9)})
    add('Kulavardhana',122,{'all_planets_fifth_from_any_reference':all(any(c.count(s[ref],s[p])==5 for ref in ('Asc','Moon','Sun')) for p in planets)})
    up=(3,6,10,11)
    add('Vasumati',122,{'benefics_upachaya':bool(good) and all(h(p) in up for p in good)})
    rows[-1]['qualifications']={'no_malefic_upachaya':not any(h(p) in up for p in bad),'benefics_strong':all3(strong.get(p) for p in good)}
    add('Gandharva',123,{'tenth_lord_trinal_7':h(lord[10]) in (3,7,11),'jupiter_influences_lagna_lord':influence('Jupiter',lord[1]),'sun_exalted':ex('Sun'),'sun_strong':strong.get('Sun'),'moon_9':h('Moon')==9})
    add('Go',123,{'jupiter_moola':s['Jupiter']==c.MOOLA['Jupiter'],'jupiter_strong':strong.get('Jupiter'),'second_lord_joins_jupiter':joint(lord[2],'Jupiter'),'lagna_lord_exalted':ex(lord[1])})
    add('Vidyut',123,{'eleventh_lord_deep_exaltation':deep(lord[11]),'joins_venus':joint(lord[11],'Venus'),'angular_from_lagna_lord':relative(lord[11],lord[1]) in quadrants})
    add('Chapa',123,{'exchange_4_10':exchange(4,10),'lagna_lord_exalted':ex(lord[1])},participants=uniq(lord[4],lord[10],lord[1]))
    md=c.LORDS[s['Moon']]
    add('Pushkala',123,{'lagna_lord_joins_moon':joint(lord[1],'Moon'),'moon_dispositor_angular_or_great_friend':kendra(md) or relation(md)=='great_friend','moon_dispositor_aspects_asc':asc in c.planetary_aspects(md,s[md]),'planet_in_asc':occupy([1])})
    add('Makuta',123,{'jupiter_ninth_from_9lord':relative('Jupiter',lord[9])==9,'benefic_ninth_from_jupiter':occupy([9],good,s['Jupiter']),'saturn_10':h('Saturn')==10})
    add('Jaya',123,{'tenth_lord_deep_exaltation':deep(lord[10]),'sixth_lord_debilitated':deb(lord[6])})
    for name,house in [('Harsha',6),('Sarala',8),('Vimala',12)]:add(name,123,{'lord_in_own_house':h(lord[house])==house},participants=(lord[house],))
    # Raja relationships and magnitude evidence, never deterministic outcomes.
    pairs=set()
    for a in quadrants:
        for b in (1,5,9):
            p,q=lord[a],lord[b]
            if p!=q and association(p,q):pairs.add(tuple(sorted((p,q))))
    add('Basic_Raaja',124,{'quadrant_trine_lord_association':bool(pairs)},'raaja',tuple(p for p in c.PLANETS if any(p in x for x in pairs)))
    add('Dharma_Karmadhipati',124,{'ninth_tenth_lord_association':association(lord[9],lord[10])},'raaja',uniq(lord[9],lord[10]))
    dustlords=uniq(lord[6],lord[8],lord[12])
    add('Vipareeta_Raaja_base',124,{'dusthana_lord_in_dusthana':any(h(p) in (6,8,12) for p in dustlords)},'raaja',tuple(p for p in dustlords if h(p) in (6,8,12)))
    add('Vipareeta_Raaja_ideal',124,{'three_lords_together':len({s[p] for p in dustlords})==1,'allowed_house':h(lord[6]) in (3,6,8,11,12),
        'no_other_planet':not any(s[p]==s[lord[6]] for p in planets if p not in dustlords)},'raaja',dustlords)
    # Twelve specific ascendant wealth combinations. Pisces missing Saturn repaired from BPHS 41.8.
    fifth=(('Sun',('Saturn','Moon','Jupiter')),('Mercury',('Moon','Mars','Jupiter')),('Venus',('Mars',)),('Mars',('Venus',)),
        ('Jupiter',('Mercury',)),('Saturn',('Sun','Moon')),('Saturn',('Sun','Moon')),('Jupiter',('Mercury',)),('Mars',('Venus',)),
        ('Venus',('Mars',)),('Mercury',('Moon','Mars','Jupiter')),('Moon',('Saturn',)))
    influencers={'Sun':('Mars','Jupiter'),'Moon':('Mercury','Jupiter'),'Mars':('Mercury','Venus','Saturn'),
        'Mercury':('Jupiter','Saturn'),'Jupiter':('Mars','Mercury'),'Venus':('Mercury','Saturn'),'Saturn':('Mars','Jupiter')}
    for a in range(12):
        p,others=fifth[a];l=c.LORDS[a]
        add('Dhana_'+c.SIGNS[a]+'_5_11',130 if a<9 else 131,{'ascendant':asc==a,'fifth_planet':h(p)==5,'eleventh_planets':all(h(q)==11 for q in others)},'dhana')
        add('Dhana_'+c.SIGNS[a]+'_asc',130 if a<9 else 131,{'ascendant':asc==a,'own_lord_in_asc':h(l)==1,'all_required_influences':all(influence(q,l) for q in influencers[l])},'dhana')
    # The source's numbered advanced combinations are returned by the supplement.
    supplement=_advanced(s,sn,longitudes,planets,good,bad,lord,strong,comb,points,colord_overrides)
    rows.extend(supplement)
    notices={
        'Gola':'Seven-body Ashraya plus literal all-Nabhasa precedence suppresses every one-sign Gola arrangement.',
        'advanced_raaja_07':'The selected two-sign D2 makes the required full aspect in all six charts impossible.',
        'advanced_raaja_13':'The same-lord reading requires one full-aspect set to reach opposite signs, which none does.'}
    if include_nodes:
        notices.update(Kulavardhana='Opposite nodes cannot both occupy the resulting trine-set targets.',
            advanced_raaja_17='Opposite nodes cannot both occupy houses 3,6,11.')
    for row in rows:
        if row['name'] in notices:row['profile_notice']={'status':'incompatible_under_selected_conventions','reason':notices[row['name']],
            'research_record':'profile_conflicts.json','textual_reading_uniquely_resolved':False}
    return {'varga':varga,'rules_checked':len(rows),'rules':rows,'nature':nature,'raaja_pairs':[list(x) for x in sorted(pairs)],
        'assumptions':{'friendship_frame':'rasi','deep_exaltation_orb':deep_exaltation_orb,'include_nodes_outside_nabhasa_shapes':include_nodes,
            'nabhasa_shapes':'every listed house occupied; Sankhya suppressed by another Nabhasa',
            'strength_map_supplied':bool(strong),'adhi_definition':'6/7/8 rule; inconsistent Leo/Virgo example not used',
            'mercury_policy':mercury_policy,'mercury_tie':mercury_tie},
        'meaning':'geometric/traditional rule conditions only; no event prediction'}

def _advanced(s,sn,longitudes,planets,good,bad,lord,strong,comb,points,overrides):
    """Numbered sections 11.7.3, 11.8 and 11.10; pending inputs stay explicit."""
    asc=s['Asc'];quad=(1,4,7,10);tri=(1,5,9)
    h=lambda p:c.count(asc,s[p]);rel=lambda p,q:c.count(s[q],s[p])
    joins=lambda p,q:p!=q and s[p]==s[q]
    asp=lambda p,q:p!=q and s[q] in c.planetary_aspects(p,s[p])
    inf=lambda p,q:joins(p,q) or asp(p,q)
    hit=lambda p,sign:sign in c.planetary_aspects(p,s[p])
    ownex=lambda p:c.LORDS[s[p]]==p or s[p]==c.EXALT[p]
    deb=lambda p:s[p]==c.DEBIL[p]
    enemy=lambda p:p in c.SEVEN and c.compound_relation(p,c.LORDS[s[p]],c.division(longitudes,1)) in ('enemy','great_enemy')
    occ=lambda hs,ps,ref:all(any(c.count(ref,s[p])==hh for p in ps) for hh in hs)
    benefic_aspect=lambda p:any(asp(q,p) for q in good if q!=p)
    ck=c.chara_karakas(longitudes)
    roles={role:next(p for p,v in ck.items() if v['karaka']==role) for role in ('AK','PK','AmK') if sum(v['karaka']==role for v in ck.values())==1}
    # Tied karakas may be lists/None: do not force an arbitrary winner.
    ak=roles.get('AK');pk=roles.get('PK');amk=roles.get('AmK')
    try:ar=c.arudhas(s,longitudes,overrides)
    except ValueError:ar={}
    out=[]
    def add(cat,n,conditions,page):
        value=all3(conditions.values());out.append({'name':f'{cat}_{n:02d}','pdf_page':page,'category':cat,
            'status':'conditions_met' if value is True else 'conditions_not_met' if value is False else 'conditions_pending','conditions':conditions})
    adv={
      1:{'AK_PK_conjunction':joins(ak,pk) if ak and pk else None,'lagna_fifth_conjunction':joins(lord[1],lord[5])},
      2:{'exchange_1_5':h(lord[1])==5 and h(lord[5])==1,'karakas_in_1_5':all(h(p) in (1,5) for p in (ak,pk)) if ak and pk else None,
         'participating_dignities':all(ownex(p) or c.LORDS[sn[p]]==p or benefic_aspect(p) for p in {lord[1],lord[5],ak,pk}) if ak and pk else None},
      3:{'ninth_lord_and_AK_1_5_7':h(lord[9]) in (1,5,7) and h(ak) in (1,5,7) if ak else None,'both_benefic_aspected':benefic_aspect(lord[9]) and benefic_aspect(ak) if ak else None},
      4:{'benefics_2_4_5_from_both':all(occ((2,4,5),good,s[p]) for p in (lord[1],ak)) if ak else None},
      5:{'malefics_3_6_from_both':all(all(any(s[q]==c.advance(s[p],hh) or hit(q,c.advance(s[p],hh)) for q in bad) for hh in (3,6)) for p in (lord[1],ak)) if ak else None},
      6:{'same_planet_joins_or_aspects_Asc_HL_GL':any(all(s[p]==t or hit(p,t) for t in (asc,c.sign(points['HL']),c.sign(points['GL']))) for p in planets) if all(x in points for x in ('HL','GL')) else None},
      7:{'same_planet_aspects_six_ascendants':any(all(c.varga_sign(longitudes['Asc'],n) in c.planetary_aspects(p,c.varga_sign(longitudes[p],n)) for n in (1,2,3,9,12,30)) for p in planets)},
      8:{'dignified_occupants_Asc_HL_GL':all(any(s[p]==t and ownex(p) for p in planets) for t in (asc,c.sign(points['HL']),c.sign(points['GL']))) if all(x in points for x in ('HL','GL')) else None},
      9:{'dignified_lagna_occupants_D1_D9_D3':all(any(c.varga_sign(longitudes[p],n)==c.varga_sign(longitudes['Asc'],n) and (c.LORDS[c.varga_sign(longitudes[p],n)]==p or c.varga_sign(longitudes[p],n)==c.EXALT[p]) for p in planets) for n in (1,9,3))},
      10:{'one_or_two_debilitated_in_3_6_8':1<=sum(h(p) in (3,6,8) and deb(p) for p in planets)<=2,'lagna_lord_dignified_aspecting_asc':ownex(lord[1]) and hit(lord[1],asc)},
      11:{'all_dusthana_lords_impaired':all(deb(lord[x]) or comb(lord[x]) or enemy(lord[x]) for x in (6,8,12)),'lagna_lord_dignified_aspecting_asc':ownex(lord[1]) and hit(lord[1],asc)},
      12:{'fifth_ninth_conjunction_or_mutual_aspect':joins(lord[5],lord[9]) or (asp(lord[5],lord[9]) and asp(lord[9],lord[5]))},
      13:{'exchange_4_10':h(lord[4])==10 and h(lord[10])==4,'both_aspected_by_5_or_9lord':any(all(asp(lord[x],lord[y]) for y in (4,10)) for x in (5,9))},
      14:{'fifth_lord_1_4_10':h(lord[5]) in (1,4,10),'joins_1_or_9lord':any(joins(lord[x],lord[5]) for x in (1,9))},
      15:{'moon_strong':strong.get('Moon'),'moon_vargottama':s['Moon']==sn['Moon'],'four_aspecting_planets':sum(asp(p,'Moon') for p in planets if p!='Moon')>=4},
      16:{'four_moola_or_exalted':sum(s[p] in (c.MOOLA[p],c.EXALT[p]) for p in planets)>=4},
      17:{'benefics_angular':bool(good) and all(h(p) in quad for p in good),'malefics_3_6_11':all(h(p) in (3,6,11) for p in bad)},
      18:{'AL_A7_support':c.count(ar['AL'],ar['A7']) not in (2,12,6,8) if 'AL' in ar and 'A7' in ar else None}}
    for n,conditions in adv.items():add('advanced_raaja',n,conditions,127 if n<=6 else 128)
    sambandha={
      1:{'AmK_or_dispositor_influences_10lord':any(inf(p,lord[10]) for p in (amk,c.LORDS[s[amk]])) if amk else None},
      2:{'11lord_aspects_11':hit(lord[11],c.advance(asc,11)),'10_11_no_malefics':not any(s[p]==c.advance(asc,hh) or hit(p,c.advance(asc,hh)) for p in bad for hh in (10,11))},
      3:{'AK_AmK_conjoin':joins(ak,amk) if ak and amk else None},
      4:{'AmK_dignified':ownex(amk) if amk else None,'AmK_strong':strong.get(amk)},
      5:{'AmK_trinal':h(amk) in tri if amk else None},
      6:{'AmK_angular_or_trinal_AK':rel(amk,ak) in (1,4,5,7,9,10) if ak and amk else None},
      7:{'malefics_3_6_from_Asc_AL_AK':all(occ((3,6),bad,r) for r in (asc,ar['AL'],s[ak])) if ak and 'AL' in ar else None},
      8:{'AK_dignified_angular_or_trinal':ownex(ak) and h(ak) in (1,4,5,7,9,10) if ak else None,'AK_influences_9lord':inf(ak,lord[9]) if ak else None},
      9:{'AK_moon_dispositor_in_asc_with_benefic':ak==c.LORDS[s['Moon']] and h(ak)==1 and any(joins(ak,p) for p in good if p!=ak) if ak else None},
      10:{'AK_5_7_9_10_with_benefic':h(ak) in (5,7,9,10) and any(joins(ak,p) for p in good if p!=ak) if ak else None},
      11:{'A9_in_asc_or_AK_9':any3([ar['A9']==asc if 'A9' in ar else None,h(ak)==9 if ak else None])},
      12:{'11lord_11_unafflicted':h(lord[11])==11 and not any(asp(p,lord[11]) for p in bad),'AK_with_benefic':any(joins(ak,p) for p in good if p!=ak) if ak else None},
      13:{'exchange_1_10':h(lord[1])==10 and h(lord[10])==1},
      14:{'moon_venus_fourth_AK':all(rel(p,ak)==4 for p in ('Moon','Venus')) if ak else None},
      15:{'1lord_or_AK_joins_5lord_angular_trinal':all3([h(lord[5]) in (1,4,5,7,9,10),any3([joins(lord[1],lord[5]),joins(ak,lord[5]) if ak else None])])}}
    for n,conditions in sambandha.items():add('raaja_sambandha',n,conditions,129)
    maraka={lord[2],lord[7]}|{p for p in bad if h(p) in (2,7) or any(inf(p,lord[x]) or inf(lord[x],p) for x in (2,7))}
    mi=lambda p:any(inf(q,p) for q in maraka if q!=p)
    dispos=[c.LORDS[s[lord[x]]] for x in (6,8,12)]
    dnmoon=c.LORDS[sn['Moon']];dnasc=c.LORDS[sn['Asc']]
    daridra={1:{'exchange_1_12':h(lord[1])==12 and h(lord[12])==1,'both_maraka_influenced':mi(lord[1]) and mi(lord[12])},
      2:{'exchange_1_6':h(lord[1])==6 and h(lord[6])==1,'both_maraka_influenced':mi(lord[1]) and mi(lord[6])},
      3:{'ketu_with_asc_or_moon':s.get('Ketu') in (asc,s['Moon']),'lagna_lord_8':h(lord[1])==8,'maraka_influence':mi(lord[1])},
      4:{'lagna_lord_in_dusthana_with_malefic':h(lord[1]) in (6,8,12) and any(joins(lord[1],p) for p in bad if p!=lord[1]),'second_lord_impaired':deb(lord[2]) or enemy(lord[2])},
      5:{'fifth_lord_6_ninth_lord_12':h(lord[5])==6 and h(lord[9])==12,'maraka_aspects':all(any(asp(p,lord[x]) for p in maraka) for x in (5,9))},
      6:{'malefic_asc_without_9_10lords':any(h(p)==1 for p in bad) and all(h(lord[x])!=1 for x in (9,10)),'maraka_influence_on_asc_malefic':any(mi(p) for p in bad if h(p)==1)},
      7:{'dusthana_dispositors_in_dusthanas':all(h(p) in (6,8,12) for p in dispos),'all_malefic_influenced':all(any(inf(q,p) for q in bad if q!=p) for p in dispos)},
      8:{'moon_D9_dispositor_maraka_condition':h(dnmoon) in (2,7) or any(joins(dnmoon,p) for p in maraka if p!=dnmoon)},
      9:{'D1_D9_lagna_lords_maraka_influenced':mi(lord[1]) and mi(dnasc)},
      10:{'benefics_in_malefic_owned_signs':bool(good) and all(c.LORDS[s[p]] in bad for p in good),'malefics_in_benefic_owned_signs':all(c.LORDS[s[p]] in good for p in bad)},
      11:{'planet_joins_dusthana_lord_without_trinal_relief':any(any(joins(p,lord[x]) for x in (6,8,12)) and not any(inf(lord[x],p) for x in (1,5,9)) for p in planets)},
      12:{'mars_saturn_2':h('Mars')==h('Saturn')==2,'no_mercury_aspect_to_either':not any(asp('Mercury',p) for p in ('Mars','Saturn'))},
      13:{'sun_2':h('Sun')==2,'saturn_aspects_sun':asp('Saturn','Sun')}}
    for n,conditions in daridra.items():add('daridra',n,conditions,131 if n<=11 else 132)
    return out
