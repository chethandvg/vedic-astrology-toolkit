"""Book-defined amanta lunar months; exact phase roots with explicit conventions.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from . import core as c

MONTHS=('Chaitra','Vaisaakha','Jyeshtha','Aashaadha','Sraavana','Bhaadrapada',
        'Aaswayuja','Kaarteeka','Maargasira','Pushya','Maagha','Phaalguna')

def new_moons(ephemeris,start_jd,end_jd):
    if not 0<end_jd-start_jd<=400:raise ValueError('Search interval must be 0..400 days')
    def phase(t):return (ephemeris.body(t,1)['longitude']-ephemeris.sun(t)+180)%360-180
    roots=[];a=start_jd;fa=phase(a)
    while a<end_jd:
        b=min(a+1,end_jd);fb=phase(b)
        if fa<=0<fb and fb-fa<180:
            lo,hi=a,b
            for _ in range(40):
                mid=(lo+hi)/2
                if phase(mid)<0:lo=mid
                else:hi=mid
            roots.append((lo+hi)/2)
        a,fa=b,fb
    return roots

def lunar_month(ephemeris,jd):
    roots=new_moons(ephemeris,jd-65,jd+65)
    before=[r for r in roots if r<=jd];after=[r for r in roots if r>jd]
    if not before or len(after)<2:raise ArithmeticError('Cannot bracket lunar month')
    start,end=before[-1],after[0]
    sun0=ephemeris.sun(start);sun1=ephemeris.sun(end)
    sign0=c.sign(sun0);crossings=(c.sign(sun1)-sign0)%12
    previous_same=len(before)>1 and c.sign(ephemeris.sun(before[-2]))==sign0
    return {'system':'amanta; book PDF23-24','name':MONTHS[(sign0+1)%12],
        'type':'adhika' if crossings==0 else 'nija_after_adhika' if previous_same else 'regular',
        'start_jd_ut1':start,'end_jd_ut1':end,'sun_sign_at_conjunction':c.SIGNS[sign0],
        'solar_ingresses_in_month':crossings,'kshaya_detected':crossings==2,
        'omitted_month':MONTHS[(sign0+2)%12] if crossings==2 else None,
        'regional_festival_rules_applied':False,
        'note':'Instantaneous lunar month; civil-day observance requires local sunrise and regional rules.'}
