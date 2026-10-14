"""Rath's published 1999 Mula Dasa, with the table/prose conflict exposed.

Source: https://srath.com/jyoti%E1%B9%A3a/dasa/mula-dasa/
This is a Lagna-based profile, not a claim that all Moola schools coincide.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from . import core as c, dashas as d

SOURCE='https://srath.com/jyoti%E1%B9%A3a/dasa/mula-dasa/'
MOOLA={**c.MOOLA,'Rahu':10,'Ketu':7}

def years(planet,occupied_sign,profile='rath_1999_table'):
    """The worked table subtracts dignity from the Vimshottari allotment.
    Prose Rider 1 adds it instead. Absolute value and zero reset follow notes.
    No silent clipping is used when a second-cycle complement would be negative.
    """
    if profile not in ('rath_1999_table','rath_1999_prose'):
        raise ValueError('Choose rath_1999_table or rath_1999_prose')
    if planet not in c.PLANETS or occupied_sign not in range(12):raise ValueError('Invalid planet/sign')
    reduction=(MOOLA[planet]-occupied_sign)%12
    dignity=int(occupied_sign==c.EXALT[planet])-int(occupied_sign==c.DEBIL[planet])
    raw=c.VIM_YEARS[planet]-reduction+(-dignity if profile=='rath_1999_table' else dignity)
    result=abs(raw)
    if result==0:result=c.VIM_YEARS[planet]
    return {'years':result,'vimshottari_allotment':c.VIM_YEARS[planet],
        'count_minus_one':reduction,'dignity_adjustment':dignity,'raw_years':raw,
        'moolatrikona_target':c.SIGNS[MOOLA[planet]],'zero_reset':raw==0}

def calculate(longitudes,cycles=2,profile='rath_1999_table',order_override=None,
              exception_precedence=None,depth=0,subperiod_policy=None):
    """Complete mahadasas in this article's scope. The article gives no AD rule.

    Order: occupied angular signs first; remaining groups depend on Asc parity
    or Saturn/Ketu. Rank signs by occupancy, best dignity, modality, greatest
    advancement. Rank planets within a sign by dignity then advancement.
    Dispositor dignity resolves a remaining sign tie (the article's node example).
    Unbroken ties require an explicit full order; no stable-sort winner is hidden.
    """
    if type(depth) is not int or not 0<=depth<=3:raise ValueError('depth must be an integer in 0..3')
    if subperiod_policy not in (None,'experimental_cycle1_weights'):
        raise ValueError('Unknown Moola subperiod policy')
    if depth and subperiod_policy is None:
        raise ValueError('The Rath article specifies mahadasas only; explicitly choose experimental_cycle1_weights for the separately sourced software convention')
    if cycles not in (1,2):raise ValueError('Moola supports one or two cycles')
    if any(p not in longitudes for p in (*c.PLANETS,'Asc')):raise ValueError('All nine planets and Asc required')
    s=c.division(longitudes,1);asc=s['Asc']
    def advance(p):return float(30-c.within(longitudes[p]) if p in ('Rahu','Ketu') else c.within(longitudes[p]))
    def dignity(p):
        if s[p]==c.EXALT[p]:return 5
        if s[p]==MOOLA[p]:return 4
        if c.LORDS[s[p]]==p:return 3
        if s[p]==c.DEBIL[p]:return 0
        if p not in c.SEVEN:return 2 # source supplies no natural node friendship
        owner=c.LORDS[s[p]]
        rel='friend' if owner in c.FRIENDS[p] else 'enemy' if owner in c.ENEMIES[p] else 'neutral'
        return 2 if rel=='friend' else 1 if rel=='neutral' else .5
    def sign_key(sign):
        occupants=[p for p in c.PLANETS if s[p]==sign]
        return (len(occupants),max(dignity(p) for p in occupants),sign%3,
                max(advance(p) for p in occupants),dignity(c.LORDS[sign]))
    odd=asc%2==0
    sat=s['Saturn']==asc;ket=s['Ketu']==asc
    if exception_precedence not in (None,'Saturn','Ketu'):raise ValueError('Invalid exception precedence')
    if sat and ket:
        if exception_precedence is None:
            # Step 2 says higher longitude, not reversed karaka advancement.
            if c.within(longitudes['Saturn'])==c.within(longitudes['Ketu']):
                raise ValueError('Saturn/Ketu longitude tie needs explicit exception_precedence')
            exception_precedence=max(('Saturn','Ketu'),key=lambda p:c.within(longitudes[p]))
        odd=exception_precedence=='Saturn'
    elif sat:odd=True
    elif ket:odd=False
    group_houses=((1,4,7,10),(2,5,8,11),(3,6,9,12))
    groups=group_houses if odd else (group_houses[0],group_houses[2],group_houses[1])
    group_for={p:i for i,hs in enumerate(groups) for p in c.PLANETS if c.count(asc,s[p]) in hs}
    tie_details=[];sequence=[];sign_ranks=[]
    for hs in groups:
        occupied={s[p] for p in c.PLANETS if c.count(asc,s[p]) in hs}
        ranked=sorted(occupied,key=sign_key,reverse=True)
        for a,b in zip(ranked,ranked[1:]):
            if sign_key(a)==sign_key(b):tie_details.append({'signs':[c.SIGNS[a],c.SIGNS[b]]})
        for sign in ranked:
            ps=sorted((p for p in c.PLANETS if s[p]==sign),key=lambda p:(dignity(p),advance(p)),reverse=True)
            for a,b in zip(ps,ps[1:]):
                if (dignity(a),advance(a))==(dignity(b),advance(b)):tie_details.append({'planets':[a,b]})
            sequence.extend(ps);sign_ranks.append({'sign':c.SIGNS[sign],'key':sign_key(sign),'planets':ps})
    if order_override is not None:
        if len(order_override)!=9 or set(order_override)!=set(c.PLANETS):raise ValueError('order_override must contain all nine planets exactly once')
        if [group_for[p] for p in order_override]!=sorted(group_for.values()):raise ValueError('order_override violates angular/panapara/apoklima group order')
        sequence=list(order_override)
    elif tie_details:raise ValueError(f'Unresolved Moola ordering tie; supply reviewed order_override: {tie_details}')
    rows={p:years(p,s[p],profile) for p in c.PLANETS}
    second={p:c.VIM_YEARS[p]-rows[p]['years'] for p in c.PLANETS}
    if cycles==2 and any(v<0 for v in second.values()):
        raise ValueError('This source profile yields a negative second-cycle complement; use cycles=1 or adjudicate the source conflict')
    lengths=[rows[p]['years'] for p in sequence]
    if cycles==2:lengths += [second[p] for p in sequence]
    pp=d.periods(sequence*cycles,lengths)
    for i,r in enumerate(pp):
        r['cycle']=1+i//9
        if depth:r['children']=d.weighted_children(r,sequence,{p:rows[p]['years'] for p in sequence},depth=depth)
    return {'system':'moola','profile':profile,'source':SOURCE,'seed':'Asc','order':sequence,
        'group_houses':groups,'ordering_evidence':sign_ranks,'order_override_used':order_override is not None,
        'ordering_ties':tie_details,'duration_evidence':rows,'first_cycle_years':sum(r['years'] for r in rows.values()),
        'second_cycle_years':sum(second.values()) if cycles==2 else None,'periods':pp,
        'scope':'Mahadasas from the Rath profile; optional experimental subperiods have separate software provenance.',
        'subperiod_policy':subperiod_policy,'subperiod_depth':depth,
        'subperiod_provenance':None if subperiod_policy is None else {
            'source':'https://github.com/naturalstupid/PyJHora/blob/main/src/jhora/horoscope/dhasa/graha/moola.py',
            'inspected_version':'4.8.7','rule':'Rotate the full first-cycle order to the parent; split by first-cycle durations divided by their sum, in both cycles.',
            'status':'experimental_hybrid','traditional_authority_verified':False,
            'note':'This imports only the documented subdivision convention, not PyJHora mahadasa order/durations; it is not claimed equivalent to Jagannatha Hora or Rath subperiods.'},
        'source_conflicts':['The worked duration table reverses the prose exaltation/debilitation adjustment; the named profile records which is used.',
            'The worked sequence starts Jupiter, although one prose sentence says Moon; the worked sequence is followed.',
            'Some equal-status and friendship rankings require disclosed operational choices or an explicit reviewed order.'],
        'policies':{'dignity_conflict':profile,'negative_first_period':'absolute value','zero_period':'full Vimshottari allotment',
                    'degree_ranking':'reversed nodes except explicit Saturn/Ketu lagna precedence',
                    'friendship_rank':'natural relationship; neutral rank for otherwise undignified nodes',
                    'same_status_multioccupancy':'best occupant dignity then maximum advancement'},
        'interpretation':'Traditional timing intervals only; no claim about lifespan, curses or verified events.'}
