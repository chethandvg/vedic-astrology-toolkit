"""Independent Skyfield/JPL DE440s comparison; run with --kernel PATH.

The kernel is not bundled. Get de440s.bsp from NASA JPL's public SSD server.
Optional dependencies: skyfield==1.55, jplephem==2.24.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import swisseph as swe
from skyfield.api import load, load_file, wgs84
from skyfield.framelib import ecliptic_frame
from skyfield.nutationlib import mean_obliquity, iau2000a_radians
from skyfield import almanac
from vedic_toolkit.astronomy import Ephemeris, Settings, local_time, to_jd

def difference(a, b):
    return (float(a)-float(b)+180)%360-180

def independent_ascendant(t, latitude, longitude):
    """Intersect ecliptic with eastern horizon using independent Earth orientation."""
    theta=math.radians(t.gast*15+longitude)
    phi=math.radians(latitude)
    eps=math.radians(float(mean_obliquity(t.tt))/3600)+float(iau2000a_radians(t)[1])
    a=math.cos(phi)*math.cos(theta)
    b=math.cos(phi)*math.sin(theta)*math.cos(eps)+math.sin(phi)*math.sin(eps)
    lam=math.atan2(-a,b)
    # A rising point has increasing altitude as sidereal time advances.
    rising=math.cos(phi)*(-math.sin(theta)*math.cos(lam)+math.cos(theta)*math.sin(lam)*math.cos(eps))
    if rising<0:lam+=math.pi
    return math.degrees(lam)%360

def run(kernel):
    ts=load.timescale(builtin=True);jpl=load_file(str(kernel));earth=jpl['earth']
    eph=Ephemeris();geometric=Ephemeris(Settings(sunrise_disc='center',refraction=False))
    bodies={'Sun':(swe.SUN,'sun'),'Moon':(swe.MOON,'moon'),
        'Mars':(swe.MARS,'mars barycenter'),'Mercury':(swe.MERCURY,'mercury'),
        'Jupiter':(swe.JUPITER,'jupiter barycenter'),'Venus':(swe.VENUS,'venus'),
        'Saturn':(swe.SATURN,'saturn barycenter')}
    dates=['1900-01-01T00:00:00Z','1967-03-08T12:10:00Z','2000-01-01T12:00:00Z',
           '2020-06-21T06:00:00Z','2026-10-13T12:00:00Z']
    locations=[('Jodhpur',26.3,73.0666666667),('London',51.5074,-.1278),
               ('Sydney',-33.8688,151.2093),('Quito',-.1807,-78.4678)]
    positions=[];ascendants=[];sunrises=[]
    # Declared before comparison: tolerances allow different dynamical models,
    # Earth-orientation series, and barycentre/centre differences; not observation error bounds.
    limits={'Moon_arcsec':30,'other_bodies_arcsec':10,'ascendant_arcsec':2,'geometric_sunrise_seconds':5}
    for date in dates:
        jd=to_jd(local_time(date));t=ts.ut1_jd(jd)
        for p,(idx,key) in bodies.items():
            app=earth.at(t).observe(jpl[key]).apparent()
            lat,lon,_=app.frame_latlon(ecliptic_frame)
            swiss=eph.body(jd,idx,sidereal=False)
            err=difference(swiss['longitude'],lon.degrees)*3600
            limit=limits['Moon_arcsec' if p=='Moon' else 'other_bodies_arcsec']
            positions.append({'utc_label':date,'jd_ut1':jd,'planet':p,'jpl_target':key,
                'swiss_degrees':swiss['longitude'],'jpl_degrees':float(lon.degrees),
                'difference_arcsec':err,'tolerance_arcsec':limit,'passed':abs(err)<=limit})
        for name,lat,lon in locations:
            sw=swe.houses_ex(jd,lat,lon,b'W',0)[1][0]
            ind=independent_ascendant(t,lat,lon);err=difference(sw,ind)*3600
            ascendants.append({'utc_label':date,'location':name,'swiss_degrees':sw,
                'independent_degrees':ind,'difference_arcsec':err,'passed':abs(err)<=limits['ascendant_arcsec']})
    for date in ('2000-03-08T00:00:00Z','2026-06-21T00:00:00Z','2026-12-21T00:00:00Z'):
        jd=to_jd(local_time(date))
        for name,lat,lon in locations:
            obs=earth+wgs84.latlon(lat,lon)
            times,real=almanac.find_risings(obs,jpl['sun'],ts.ut1_jd(jd),ts.ut1_jd(jd+1.2),horizon_degrees=0)
            valid=[float(x.ut1) for x,ok in zip(times,real) if ok]
            if not valid:raise AssertionError('No independent geometric sunrise found')
            sw=geometric.next_solar_event(jd,lat,lon);err=(sw-valid[0])*86400
            sunrises.append({'utc_label':date,'location':name,'swiss_jd_ut1':sw,'jpl_jd_ut1':valid[0],
                'difference_seconds':err,'passed':abs(err)<=limits['geometric_sunrise_seconds']})
    rows=positions+ascendants+sunrises
    return {'reference':'Skyfield 1.55 / JPL DE440s','swiss_engine':'Moshier',
        'kernel_sha256':hashlib.sha256(Path(kernel).read_bytes()).hexdigest(),
        'comparison_frame':'tropical apparent geocentric ecliptic/equinox of date; same UT1',
        'time_note':'Each implementation uses its own TT-minus-UT1 model; polar motion omitted.',
        'limitations':['Finite modern/historical fixtures, not validation of every epoch.',
          'Ascendant is geometry, independent of ayanamsa choice.',
          'Sunrise compares solar centre at geometric horizon; observed refraction and terrain are not tested.',
          'Mars, Jupiter and Saturn use JPL system barycentres.',
          'Astronomical agreement does not validate astrological interpretation.'],
        'tolerances':limits,'positions':positions,'ascendants':ascendants,'sunrises':sunrises,
        'checks':len(rows),'passed':sum(r['passed'] for r in rows),
        'maximum_absolute_errors':{'planet_longitude_arcsec':max(abs(r['difference_arcsec']) for r in positions),
          'ascendant_arcsec':max(abs(r['difference_arcsec']) for r in ascendants),
          'sunrise_seconds':max(abs(r['difference_seconds']) for r in sunrises)}}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--kernel',required=True)
    parser.add_argument('--output',default='independent_astronomy_results.json');args=parser.parse_args()
    result=run(args.kernel);Path(args.output).write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({k:result[k] for k in ('checks','passed','maximum_absolute_errors')}))
    raise SystemExit(0 if result['passed']==result['checks'] else 1)
