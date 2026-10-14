"""Astronomical inputs for the explicitly named Raman/Sripati strength profile.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from datetime import datetime,timezone,timedelta
import math
import swisseph as swe
from .astronomy import Ephemeris,Settings,_LOCK,from_jd
from . import core as c
from .strengths import shadbala

def raman_motion_inputs(jd,year,longitude_offset=0,venus_secular_coefficient=.001):
    """Historical linear model, not JPL or a modern physical orbital solution.

    Raman ch VI, Tables IV-IX. Rates are reconstructed from mutually consistent
    table entries, not the erroneous first 10000-day Sun entry. Chapter text
    uses .001/year for Venus; table caption .0001/year is a separate option.
    All outputs receive the same longitude-origin shift to preserve invariance.
    """
    if not 1800<=year<=2100:raise ValueError('Historical approximation exposed only for 1800..2100')
    if venus_secular_coefficient not in (.001,.0001):raise ValueError('Choose the chapter or table Venus coefficient')
    interval=jd-(swe.julday(1900,1,1,0)-76/360)
    y=year-1900
    sun=(257.4568+interval*.98560265)%360
    mean={'Mars':(270.22+interval*.524019)%360,
          'Mercury':sun,'Venus':sun,
          'Jupiter':(220.04+interval*.0830956-3.33-.0067*y)%360,
          'Saturn':(236.74+interval*.033439+5+.001*y)%360}
    seeghra={'Mars':sun,'Jupiter':sun,'Saturn':sun,
             'Mercury':(164+interval*4.092318-0.00133*y+6.67)%360,
             'Venus':(328.51+interval*1.602146-5-venus_secular_coefficient*y)%360}
    return {p:{'mean_longitude':(mean[p]+longitude_offset)%360,
               'seeghrochcha':(seeghra[p]+longitude_offset)%360} for p in mean}

def raman_time_lords(civil_date,weekday_sunday0,is_day,period_fraction):
    """360-day/30-day cycles from Raman's condensed ahargana, not lunar months."""
    days=(civil_date-datetime(1900,1,1).date()).days+26543
    # Condensed epoch starts on Wednesday (index 3).
    year=c.SEVEN[(3*(days//360)+3)%7]
    month=c.SEVEN[(2*(days//30)+3)%7]
    order=('Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon')
    weekday=c.SEVEN[weekday_sunday0]
    hour=min(11,int(period_fraction*12))+(0 if is_day else 12)
    return {'year':year,'month':month,'weekday':weekday,'hora':order[(order.index(weekday)+hour)%7]}

def from_chart(jd,latitude,longitude,ephemeris,context,*,motion_model='raman_linear_chapter',motion_inputs=None):
    """A full total under one disclosed computational profile.

    Historical Cheshta approximation is separately identified and is NOT covered
    by the JPL validation of modern planetary positions. Exact reproduction of
    other software requires its own mean-motion and strength conventions.
    """
    positions=ephemeris.positions(jd,latitude,longitude)
    ll={p:v['longitude'] for p,v in positions.items()}
    tropical={p:ephemeris.body(jd,idx,False)['longitude'] for p,idx in zip(c.SEVEN,(0,1,4,2,5,3,6))}
    with _LOCK:
        ephemeris._configure()
        axes=swe.houses_ex(jd,latitude,longitude,b'W',swe.FLG_SIDEREAL)[1]
        ra=swe.calc_ut(jd,swe.SUN,ephemeris.engine_flag|swe.FLG_EQUATORIAL)[0][0]
        hour=((swe.sidtime(jd)*15+longitude-ra)/15+12)%24
    day=context['is_day'];start=context['sunrise_jd'] if day else context['sunset_jd']
    end=context['sunset_jd'] if day else context['next_sunrise_jd']
    fraction=(jd-start)/(end-start)
    # Birth's preceding sunrise supplies the traditional date and weekday.
    local_mean=timezone(timedelta(hours=longitude/15))
    civil=from_jd(context['sunrise_jd'],local_mean).date()
    year=from_jd(jd,local_mean).year
    if motion_inputs is None:
        if motion_model not in ('raman_linear_chapter','raman_linear_table'):raise ValueError('Unknown motion model')
        from dataclasses import replace
        raman=Ephemeris(replace(ephemeris.settings,ayanamsa='raman'))
        raman_sun=raman.sun(jd)
        # Translate historical Raman coordinates into the selected sidereal frame.
        offset=(ll['Sun']-raman_sun+180)%360-180
        motion_inputs=raman_motion_inputs(jd,year,offset,.001 if motion_model=='raman_linear_chapter' else .0001)
    else:motion_model='caller_supplied'
    result=shadbala(ll,mc=axes[1],tropical_longitudes=tropical,apparent_solar_hour=hour,
        is_day=day,period_fraction=fraction,time_lords=raman_time_lords(civil,context['weekday_sunday0'],day,fraction),
        chesta_inputs=motion_inputs)
    result.update(motion_model=motion_model,motion_inputs=motion_inputs,
        astronomical_inputs={'mc':axes[1],'apparent_solar_hour':hour,'period_fraction':fraction},
        status='complete_under_declared_profile',
        limitations=['Historical motional and Ayana formulae are approximations, not physical strengths.',
          'Full totals were compared with unmodified PyJHora 4.8.7; they do not all agree. See strength_audit_results.json.',
          'Tests validate components, sums and boundaries; external astronomy checks validate positions only.'])
    return result
