"""Reproducible geocentric astronomy; Swiss Ephemeris is a required dependency.

SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
No location or time zone is guessed. Longitude is east-positive.
"""
from __future__ import annotations
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from threading import RLock
import math
import re
from importlib.metadata import version
import swisseph as swe
from . import core as c

_LOCK=RLock()

def zone(name):
    if name in ('UTC','Z'):return timezone.utc
    m=re.fullmatch(r'(?:UTC)?([+-])(\d{2}):(\d{2})',name)
    if m:
        hh,mm=int(m[2]),int(m[3])
        if hh>23 or mm>59:raise ValueError('Invalid UTC offset')
        return timezone(timedelta(minutes=(hh*60+mm)*(1 if m[1]=='+' else -1)))
    return ZoneInfo(name)

def local_time(value,time_zone=None,fold=None):
    """Parse ISO time, rejecting nonexistent or unresolved ambiguous wall times."""
    dt=datetime.fromisoformat(value.replace('Z','+00:00'))
    if dt.tzinfo is not None:
        if time_zone and dt.utcoffset()!=dt.astimezone(zone(time_zone)).utcoffset():
            raise ValueError('ISO UTC offset disagrees with supplied time zone')
        return dt if not time_zone else dt.astimezone(zone(time_zone))
    if not time_zone:raise ValueError('A naive local time requires an explicit time zone')
    tz=zone(time_zone);valid=[]
    for f in (0,1):
        candidate=dt.replace(tzinfo=tz,fold=f)
        back=candidate.astimezone(timezone.utc).astimezone(tz)
        if back.replace(tzinfo=None)==dt and back.fold==f:valid.append(candidate)
    if not valid:raise ValueError('Nonexistent local time during a clock change')
    if len(valid)>1 and fold is None:raise ValueError('Ambiguous local time: supply fold=0 or fold=1')
    if fold not in (None,0,1):raise ValueError('fold must be 0 or 1')
    return next((d for d in valid if fold is None or d.fold==fold),valid[0])

def to_jd(dt):
    if dt.tzinfo is None:raise ValueError('Timezone-aware datetime required')
    t=dt.astimezone(timezone.utc)
    return swe.utc_to_jd(t.year,t.month,t.day,t.hour,t.minute,t.second+t.microsecond/1e6,swe.GREG_CAL)[1]

def from_jd(jd,tz=timezone.utc):
    y,m,d,h,mi,sec=swe.jdut1_to_utc(jd,swe.GREG_CAL)
    return (datetime(y,m,d,h,mi,tzinfo=timezone.utc)+timedelta(seconds=sec)).astimezone(tz)

@dataclass(frozen=True)
class Settings:
    ayanamsa:str='lahiri'
    node:str='mean'
    engine:str='moshier'
    ephemeris_path:str|None=None
    pressure_hpa:float=1013.25
    temperature_c:float=15.0
    altitude_m:float=0.0
    sunrise_disc:str='upper_limb'
    refraction:bool=True

    def __post_init__(self):
        if self.ayanamsa not in ('lahiri','raman','krishnamurti'):raise ValueError('Unsupported ayanamsa')
        if self.node not in ('mean','true'):raise ValueError('node must be mean or true')
        if self.engine not in ('moshier','swiss'):raise ValueError('engine must be moshier or swiss')
        if self.engine=='swiss' and not self.ephemeris_path:raise ValueError('Swiss mode requires ephemeris_path')
        if self.sunrise_disc not in ('upper_limb','center'):raise ValueError('Unsupported solar disc convention')
        for v in (self.pressure_hpa,self.temperature_c,self.altitude_m):
            if not math.isfinite(v):raise ValueError('Atmospheric inputs must be finite')
        if self.pressure_hpa<0:raise ValueError('Pressure cannot be negative')

class Ephemeris:
    def __init__(self,settings=None):self.settings=settings or Settings()
    def _configure(self):
        modes={'lahiri':swe.SIDM_LAHIRI,'raman':swe.SIDM_RAMAN,'krishnamurti':swe.SIDM_KRISHNAMURTI}
        swe.set_sid_mode(modes[self.settings.ayanamsa])
        if self.settings.engine=='swiss':swe.set_ephe_path(self.settings.ephemeris_path)
    @property
    def engine_flag(self):return swe.FLG_MOSEPH if self.settings.engine=='moshier' else swe.FLG_SWIEPH
    def body(self,jd,body,sidereal=True):
        flags=self.engine_flag|swe.FLG_SPEED|(swe.FLG_SIDEREAL if sidereal else 0)
        with _LOCK:
            self._configure();xx,returned=swe.calc_ut(jd,body,flags)
        if returned & 7 != self.engine_flag:raise RuntimeError('Ephemeris silently fell back to a different engine; refusing result')
        return {'longitude':xx[0],'latitude':xx[1],'distance_au':xx[2],
                'speed_deg_day':xx[3],'retrograde':xx[3]<0,'returned_flags':returned}
    def sun(self,jd):return self.body(jd,swe.SUN)['longitude']
    def ascendant(self,jd,latitude,longitude):
        self.validate_location(latitude,longitude)
        with _LOCK:
            self._configure();cusps,axes=swe.houses_ex(jd,latitude,longitude,b'W',swe.FLG_SIDEREAL)
        return axes[0]
    @staticmethod
    def validate_location(latitude,longitude):
        if not math.isfinite(latitude) or not -90<latitude<90:raise ValueError('Latitude must be strictly between -90 and 90')
        if not math.isfinite(longitude) or not -180<=longitude<=180:raise ValueError('Longitude must be in [-180,180]')
    def positions(self,jd,latitude,longitude):
        self.validate_location(latitude,longitude)
        ids=(swe.SUN,swe.MOON,swe.MARS,swe.MERCURY,swe.JUPITER,swe.VENUS,swe.SATURN,
             swe.MEAN_NODE if self.settings.node=='mean' else swe.TRUE_NODE)
        out={p:self.body(jd,b) for p,b in zip(c.PLANETS,ids)}
        out['Ketu']={**out['Rahu'],'longitude':(out['Rahu']['longitude']+180)%360,'latitude':-out['Rahu']['latitude']}
        out['Asc']={'longitude':self.ascendant(jd,latitude,longitude)}
        return out
    def next_solar_event(self,jd,latitude,longitude,rising=True):
        self.validate_location(latitude,longitude)
        mode=swe.CALC_RISE if rising else swe.CALC_SET
        if self.settings.sunrise_disc=='center':mode|=swe.BIT_DISC_CENTER
        if not self.settings.refraction:mode|=swe.BIT_NO_REFRACTION
        with _LOCK:
            self._configure()
            result,times=swe.rise_trans(jd,swe.SUN,mode,(longitude,latitude,self.settings.altitude_m),
                self.settings.pressure_hpa,self.settings.temperature_c,self.engine_flag)
        if result!=0:raise ValueError('Sunrise/sunset is unavailable here on this date (polar day/night)')
        return times[0]
    def sunrise_context(self,jd,latitude,longitude,tz=timezone.utc):
        # Search successive events; midnight is not a Vedic weekday boundary.
        sr=self.next_solar_event(jd-1.5,latitude,longitude)
        if sr>jd:raise ValueError('No preceding sunrise in the normal daily cycle')
        for _ in range(4):
            nxt=self.next_solar_event(sr+1e-5,latitude,longitude)
            if nxt>jd:break
            sr=nxt
        else:raise ValueError('Cannot bracket the sunrise day')
        ss=self.next_solar_event(sr+1e-5,latitude,longitude,False)
        if not sr<ss<nxt or nxt-sr>1.5:raise ValueError('Ordinary sunrise/sunset partition unavailable')
        wd=(from_jd(sr,tz).weekday()+1)%7
        return {'sunrise_jd':sr,'sunset_jd':ss,'next_sunrise_jd':nxt,'weekday_sunday0':wd,
                'is_day':sr<=jd<ss,'elapsed_minutes':(jd-sr)*1440,
                'sunrise_local':from_jd(sr,tz).isoformat(),'sunset_local':from_jd(ss,tz).isoformat(),
                'next_sunrise_local':from_jd(nxt,tz).isoformat()}
    def timed_upagrahas(self,jd,latitude,longitude,context):
        day=context['is_day'];start=context['sunrise_jd'] if day else context['sunset_jd']
        end=context['sunset_jd'] if day else context['next_sunrise_jd']
        rulers=c.upagraha_segments(context['weekday_sunday0'],not day);out={}
        for name,p,offset in [('Kaala','Sun',.5),('Mrityu','Mars',.5),('Arthapraharaka','Mercury',.5),
                              ('Yamaghantaka','Jupiter',.5),('Gulika','Saturn',.5),('Maandi','Saturn',0)]:
            t=start+(rulers.index(p)+offset)*(end-start)/8
            out[name]={'longitude':self.ascendant(t,latitude,longitude),'event_jd':t}
        return out
    def solar_arc_date(self,birth_jd,years):
        """Exact sidereal solar arc; 1 year=360 degrees, NOT a fixed day count.
        PDF 229 and 331-335. Fractional years give solar months/days too.
        """
        years=float(years)
        if not math.isfinite(years) or abs(years)>500:raise ValueError('Solar arc solver supports +/-500 years')
        if years==0:return birth_jd
        target=(self.sun(birth_jd)+360*years)%360
        guess=birth_jd+365.25636*years
        def residual(j):return (self.sun(j)-target+180)%360-180
        lo,hi=guess-8,guess+8
        if not residual(lo)<0<residual(hi):raise ValueError('Solar return not bracketed')
        for _ in range(55):
            mid=(lo+hi)/2
            if residual(mid)>0:hi=mid
            else:lo=mid
            if hi-lo<1e-8:break
        answer=(lo+hi)/2
        if abs(residual(answer))>1e-6:raise ArithmeticError('Solar return failed precision check')
        return answer
    def panchanga_ends(self,jd):
        """Numerically locate the next angular boundary of each panchanga limb.
        Search uses positive lunar motion, short brackets, then bisection.
        """
        def sunmoon(t):return self.sun(t),self.body(t,swe.MOON)['longitude']
        def angle(t,kind):
            sun,moon=sunmoon(t)
            return (moon-sun)%360 if kind in ('tithi','karana') else moon if kind=='nakshatra' else (moon+sun)%360
        out={}
        for kind,step in [('tithi',12),('karana',6),('nakshatra',360/27),('yoga',360/27)]:
            a0=angle(jd,kind);distance=step-a0%step
            def residual(t):return (angle(t,kind)-a0)%360-distance
            lo,hi=jd,jd+.1
            while residual(hi)<0 and hi<jd+3:hi+=.1
            if residual(hi)<0:raise ValueError('Panchanga boundary not found within three days')
            for _ in range(36):
                mid=(lo+hi)/2
                if residual(mid)>=0:hi=mid
                else:lo=mid
            out[kind]=(lo+hi)/2
        return out
    def metadata(self):
        return {**asdict(self.settings),'swisseph_version':swe.version,'pyswisseph_version':version('pyswisseph'),'pyswisseph_module_release':swe.__version__,
            'frame':'geocentric apparent ecliptic longitude; sidereal zodiac','houses':'whole sign',
            'time_scale':'UT1 from Swiss Ephemeris UTC conversion','coordinate_longitude':'east-positive',
            'calendar':'proleptic Gregorian','node_Ketu':'exact antipode of Rahu'}

def dated(periods,birth_jd,ephemeris,year_model='savana360',tz=timezone.utc):
    """Retain full first period before birth, essential for correct subperiods."""
    if year_model not in ('savana360','solar_arc','365.2425'):raise ValueError('Unknown year model')
    def when(y):
        jd=ephemeris.solar_arc_date(birth_jd,y) if year_model=='solar_arc' else birth_jd+float(y)*(360 if year_model=='savana360' else 365.2425)
        return from_jd(jd,tz).isoformat()
    out=[]
    for p in periods:
        d=dict(p);d.update(start=when(p['start_year']),end=when(p['end_year']),year_model=year_model)
        if 'children' in p:d['children']=dated(p['children'],birth_jd,ephemeris,year_model,tz)
        out.append(d)
    return out
