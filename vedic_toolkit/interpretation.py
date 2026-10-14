"""Source-explicit qualification evidence, not event or personality conclusions.
PDF 108, 115-116, 124-126, 131-132, 152-154.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from . import core as c, strengths as st
from .yogas import all3,any3
from .decision_rules import catalog_review

# Transcribed from the image of Table 30, PDF153. Moon varies for Ar/Li/Cp.
_FUNCTIONAL=(
 (('Sun','Mars','Jupiter'),(),('Mercury','Venus','Saturn'),()),
 (('Sun','Mercury','Saturn'),('Mars',),('Moon','Jupiter','Venus'),('Saturn',)),
 (('Venus',),('Moon','Mercury','Saturn'),('Sun','Mars','Jupiter'),()),
 (('Moon','Mars','Jupiter'),('Sun','Saturn'),('Mercury','Venus'),('Mars',)),
 (('Sun','Mars','Jupiter'),('Moon',),('Mercury','Venus','Saturn'),('Mars',)),
 (('Mercury','Venus'),('Sun','Saturn'),('Moon','Mars','Jupiter'),()),
 (('Mercury','Venus','Saturn'),(),('Sun','Mars','Jupiter'),('Saturn',)),
 (('Moon','Jupiter'),('Sun','Mars'),('Mercury','Venus','Saturn'),()),
 (('Sun','Mars'),('Moon','Mercury','Jupiter'),('Venus','Saturn'),()),
 (('Venus','Mercury','Saturn'),('Sun',),('Mars','Jupiter'),('Venus',)),
 (('Venus','Saturn'),('Sun','Mercury'),('Moon','Mars','Jupiter'),('Venus',)),
 (('Moon','Mars'),('Jupiter',),('Sun','Mercury','Venus','Saturn'),()))

def functional_nature(signs,moon_waxing=None):
    good,neutral,bad,karaka=map(list,_FUNCTIONAL[signs['Asc']])
    pending=[]
    if signs['Asc'] in (0,6,9):
        if moon_waxing is None:pending.append('Moon')
        elif moon_waxing:bad.append('Moon')
        else:neutral.append('Moon')
    return {'benefics':good,'neutrals':neutral,'malefics':bad,'yogakarakas':karaka,
        'unclassified':pending+['Rahu','Ketu'],'source_pdf_pages':[152,153],
        'note':'Classical functional table; no independent node functional classification is invented.'}

def review(longitudes,catalog,strong=None,speeds=None,is_day=None,close_orb=6,points=None):
    """Report the book's exceptions and magnitude factors without a net score.
    Close means <=6 degrees by default, following the author's approximate guide.
    A bad-avastha Boolean is deliberately decomposed into named states.
    """
    if not 0<=close_orb<=30:raise ValueError('Close orb must be in [0,30]')
    if catalog.get('nature',{}).get('unknown'):
        from copy import deepcopy
        branches={}
        for tie in ('benefic','malefic'):
            branch=deepcopy(catalog)
            branch['nature']=st.benefic_classification(longitudes,mercury_policy='majority',mercury_tie=tie)
            branches[tie]=review(longitudes,branch,strong,speeds,is_day,close_orb,points)
        return {'status':'pending_mercury_nature','nature_scenarios':branches,
            'catalog_review':catalog_review(catalog),'interactions':[],
            'scope':'The source does not decide an equal benefic/malefic Mercury tie. Both interpretations are retained; neither is selected.'}
    strong=strong or {};speeds=speeds or {};points=points or {}
    s=c.division(longitudes,1);sn=c.division(longitudes,9);asc=s['Asc']
    h=lambda p:c.count(asc,s[p]);lord=lambda house:c.LORDS[(asc+house-1)%12]
    asp=lambda p,q:p!=q and s[q] in c.planetary_aspects(p,s[p])
    join=lambda p,q:p!=q and s[p]==s[q]
    inf=lambda p,q:join(p,q) or asp(p,q)
    waxing=0<float(c.norm(longitudes['Moon']-longitudes['Sun']))<180
    fn=functional_nature(s,waxing);mal=set(fn['malefics'])
    av=st.avasthas(longitudes,speeds);counts=c.amsa_counts(longitudes)
    def planet_evidence(p):
        rel=c.compound_relation(p,c.LORDS[s[p]],s)
        return {'planet':p,'strong_under_supplied_profile':strong.get(p),
            'combust':st.combustion(p,longitudes[p],longitudes['Sun'],speeds.get(p,0))['combust'],
            'debilitated':s[p]==c.DEBIL[p],'inimical_sign':rel in ('enemy','great_enemy'),
            'age_avastha':c.age_avastha(longitudes[p]),'alertness':av['planets'][p]['alertness'],
            'moods':av['planets'][p]['moods'],'functional_malefic_influences':[q for q in c.SEVEN if q in mal and inf(q,p)],
            'dasa_varga_favorable_count':counts[p]['dasavarga']}
    magnitude=[]
    for p,q in catalog['raaja_pairs']:
        exchange=c.LORDS[s[p]]==q and c.LORDS[s[q]]==p
        conjunction=join(p,q);mutual=asp(p,q) and asp(q,p)
        # Degree advancement measures deviation from the exact sign aspect.
        gap=abs(float(c.within(longitudes[p])-c.within(longitudes[q])))
        data=[planet_evidence(p),planet_evidence(q)]
        weaknesses=[]
        if (conjunction or mutual) and gap>close_orb:weaknesses.append('wide_association')
        for row in data:
            for key in ('combust','debilitated','inimical_sign','functional_malefic_influences'):
                if row[key]:weaknesses.append(row['planet']+':'+key)
        magnitude.append({'planets':[p,q],'source_pdf_pages':[124,125,126],
            'association_types':[k for k,v in [('conjunction',conjunction),('mutual_aspect',mutual),('exchange',exchange)] if v],
            'degree_gap':gap if conjunction or mutual else None,
            'close_association':gap<=close_orb if conjunction or mutual else None,
            'planet_evidence':data,'weakening_factors':weaknesses,
            'status':'qualified_with_weakening_factors' if weaknesses else 'no_listed_geometric_weakness_found',
            'partial_strength_status':all3(strong.get(x) for x in (p,q)),
            'note':'Wide/afflicted associations remain present. No arbitrary cancellation or emperor prediction follows from an amsa count.'})
    byname={r['name']:r for r in catalog['rules']}
    base_kema=byname['Kemadruma']['conditions']['no_lunar_companions']
    angular=[p for p in c.PLANETS if p!='Moon' and h(p) in (1,4,7,10)]
    up=(3,6,10,11);natural=catalog.get('nature') or st.benefic_classification(longitudes);good=natural['benefics'];bad=natural['malefics']
    vas_base=bool(good) and all(h(p) in up for p in good)
    vas_no_bad=not any(h(p) in up for p in bad)
    vas_strong=all3(strong.get(p) for p in good)
    both_second=h('Mars')==h('Saturn')==2
    merc_both=asp('Mercury','Mars') and asp('Mercury','Saturn')
    trinal_lords={lord(x) for x in (1,5,9)};dust_lords={lord(x) for x in (6,8,12)}
    relief=[]
    for p in c.PLANETS:
        causes=[q for q in dust_lords if join(p,q)]
        saving=[q for q in trinal_lords if inf(q,p)]
        if causes:relief.append({'planet':p,'dusthana_lords_joining':causes,'trinal_lord_influences':saving,'condition_applies':not bool(saving)})
    j='Jupiter'
    gj_lagna=h(j) in (1,4,7,10)
    gj_unimpaired=not (s[j]==c.DEBIL[j] or st.combustion(j,longitudes[j],longitudes['Sun'],speeds.get(j,0))['combust'] or c.compound_relation(j,c.LORDS[s[j]],s) in ('enemy','great_enemy'))
    moon_d9_lord=c.LORDS[sn['Moon']]
    moon_d9_relation=c.compound_relation('Moon',moon_d9_lord,s)
    moon_d9_good=moon_d9_lord=='Moon' or moon_d9_relation=='great_friend'
    lunar={'source_pdf_page':108,'moon_house_from_sun':c.count(s['Sun'],s['Moon']),
        'moon_own_or_great_friend_navamsa':moon_d9_good,'jupiter_aspects_moon':asp('Jupiter','Moon'),
        'venus_aspects_moon':asp('Venus','Moon'),'is_day':is_day,
        'favored_aspect_under_day_night_rule':None if is_day is None else moon_d9_good and asp('Jupiter' if is_day else 'Venus','Moon'),
        'contrary_aspect_under_day_night_rule':None if is_day is None else moon_d9_good and asp('Venus' if is_day else 'Jupiter','Moon'),
        'benefics_in_upachayas_from_moon':[p for p in good if c.count(s['Moon'],s[p]) in up]}
    witnesses={
        'Budha-Aaditya':['Sun','Mercury'],'Chandra-Mangala':['Moon','Mars'],
        'Gaja-Kesari':['Moon','Jupiter']+[p for p in good if inf(p,'Jupiter')],
        'Guru-Mangala':['Jupiter','Mars'],'Sreenaatha':[lord(7),lord(9),lord(10)],
        'Khadga':[lord(1),lord(2),lord(9)],'Kusuma':['Venus','Moon','Saturn']+[p for p in good if join(p,'Moon')],
        'Kalaanidhi':['Jupiter','Mercury','Venus'],'Lakshmi':[lord(1),lord(9)],
        'Saarada':[lord(10),'Mercury','Sun','Mars','Moon']+['Jupiter'],
        'Saraswathi':['Mercury','Jupiter','Venus'],'Amsaavatara':['Jupiter','Venus','Saturn'],
        'Devendra':[lord(x) for x in (1,2,10,11)],'Indra':[lord(5),lord(11),'Moon'],
        'Ravi':['Sun',lord(10),'Saturn'],'Bhaaskara':['Sun','Moon','Mercury','Jupiter'],
        'Vasumati':good,'Gandharva':[lord(1),lord(10),'Jupiter','Sun','Moon'],
        'Go':['Jupiter',lord(1),lord(2)],'Vidyut':[lord(11),'Venus',lord(1)],
        'Chapa':[lord(1),lord(4),lord(10)],'Jaya':[lord(10),lord(6)],
        'Harsha':[lord(6)],'Sarala':[lord(8)],'Vimala':[lord(12)]}
    qualification=[]
    for row in catalog['rules']:
        ps=set(row.get('participants',()))|set(witnesses.get(row['name'],()))
        if ps and row['status']!='conditions_not_met':
            qualification.append({'name':row['name'],'participants':[planet_evidence(p) for p in sorted(ps) if p in c.SEVEN],
                'all_named_participants_strong':all3(strong.get(p) for p in ps),'source_pdf_page':116,
                'status':'strength_evidence_only','note':'Do not turn this summary into automatic cancellation; branch-specific interpretation can require review.'})
    return {'functional_nature':fn,'raaja_magnitude':magnitude,'planet_qualification':qualification,
        'catalog_review':catalog_review(catalog),
        'lunar_general_guidelines':lunar,'interactions':[
            {'name':'Kemadruma_angular_exception','source_pdf_page':109,'base_isolation':base_kema,'angular_planets':angular,'exception_applies':base_kema and bool(angular)},
            {'name':'Sankhya_subordination','source_pdf_page':115,'overriding_nabhasa':[r['name'] for r in catalog['rules'] if r['category']=='nabhasa' and r['status']=='conditions_met']},
            {'name':'Gaja_Kesari_alternative','source_pdf_page':116,'lagna_quadrant':gj_lagna,'unimpaired':gj_unimpaired,'strong':strong.get(j),
                'alternative_conditions_met':all3([gj_lagna,gj_unimpaired,strong.get(j)]),'profile':'lagna-quadrant alternative with strong Jupiter; impairment retained'},
            {'name':'Vasumati_full_results','source_pdf_page':122,'base_placement':vas_base,'no_malefics_in_upachayas':vas_no_bad,'benefics_strong':vas_strong,
                'full_conditions_met':all3([vas_base,vas_no_bad,vas_strong])},
            {'name':'Daridra_11_trinal_relief','source_pdf_pages':[131,132],'planet_cases':relief},
            {'name':'Daridra_12_reversal','source_pdf_page':132,'mars_saturn_in_second':both_second,'mercury_aspects_both':merc_both,'exception_applies':both_second and merc_both},
            {'name':'Daridra_13_alternative','source_pdf_page':132,'sun_in_second':h('Sun')==2,'saturn_aspects_sun':asp('Saturn','Sun'),'favorable_alternative':h('Sun')==2 and not asp('Saturn','Sun')}
        ],'close_orb_degrees':close_orb,
        'scope':'Explicit source exceptions and qualification evidence; no universal numerical cancellation hierarchy or event forecast is asserted.'}
