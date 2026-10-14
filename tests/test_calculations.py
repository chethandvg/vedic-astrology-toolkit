# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Independent book fixtures plus numerical boundary and astronomy checks.
PDF page numbers refer to the supplied 442-page edition, not the web edition.
"""
import unittest
import math
from fractions import Fraction as F
from datetime import datetime,timedelta,timezone
from vedic_toolkit import core as c, dashas as d, tajaka as t, ashtakavarga as av
from vedic_toolkit.astronomy import Ephemeris,Settings,local_time,to_jd,from_jd,dated

class BookArithmetic(unittest.TestCase):
    def test_exercise1_dms(self):
        self.assertEqual(c.lon('Cn',4,19),c.deg(94,19))
        self.assertEqual(c.lon('Vi',17,45),5*30+c.deg(17,45))
    def test_house_counting(self):
        self.assertEqual([c.count(3,x) for x in (0,1,9)],[10,11,7])
    def test_example2_tithi(self):
        self.assertEqual(c.panchanga(c.lon('Sc',17,46),c.lon('Ge',24,12))['tithi'],19)
    def test_exercise3_tithi(self):
        self.assertEqual(c.panchanga(c.lon('Cp',28,13),c.lon('Le',14,43))['tithi'],17)
    def test_example3_yoga(self):
        self.assertEqual(c.panchanga(c.lon('Cp',23,50),c.lon('Li',17,20))['yoga'],'Ganda')
    def test_exercise4_yoga(self):
        self.assertEqual(c.panchanga(c.lon('Cp',28,13),c.lon('Le',14,43))['yoga'],'Atiganda')
    def test_karana_endpoints(self):
        self.assertEqual([c.panchanga(0,x)['karana'] for x in (0,6,342,348,354)],['Kimstughna','Bava','Sakuna','Chatushpada','Naga'])
    def test_hora_example(self):self.assertEqual(c.hora_lord(3,930),'Moon')
    def test_upagraha_example6(self):
        out=c.sun_upagrahas(c.lon('Sg',9,36))
        self.assertEqual(out['Dhuma'],c.lon('Ar',22,56));self.assertEqual(out['Vyatipaata'],c.lon('Pi',7,4))
        self.assertEqual(out['Parivesha'],c.lon('Vi',7,4));self.assertEqual(out['Indrachaapa'],c.lon('Li',22,56))
    def test_upaketu_erratum(self):self.assertEqual(c.sun_upagrahas(c.lon('Ta',13,19))['Upaketu'],c.lon('Ar',13,19))
    def test_night_upagraha_table10(self):
        self.assertEqual(c.upagraha_segments(4,True),['Moon','Mars','Mercury','Jupiter','Venus','Saturn',None,'Sun'])
    def test_examples7_8_9_special_lagnas(self):
        out=c.special_lagnas(c.lon('Cp',24,17),766,0,0)
        self.assertEqual(out['BL'],c.lon('Le',5,47)) # stated rate, printed example wrong
        self.assertEqual(out['HL'],c.lon('Aq',17,17));self.assertEqual(out['GL'],c.lon('Vi',21,47))
    def test_example10_sree_lagna(self):
        self.assertEqual(c.special_lagnas(0,0,c.lon('Li',13,6),c.lon('Vi',25,5))['SL'],c.lon('Pi',18,47))
    def test_exercise10_sree_lagna(self):
        self.assertEqual(c.special_lagnas(0,0,c.lon('Le',15,29),c.lon('Sc',14,19))['SL'],c.lon('Cp',12,22))
    def test_example28_karakas(self):
        ll=dict(zip(c.PLANETS[:8],[c.lon('Ge',12,47),c.lon('Ar',20,28),c.lon('Ge',13,51),c.lon('Ge',25,18),c.lon('Ta',5,40),c.lon('Ge',17,21),c.lon('Ta',2,28),c.lon('Cn',1,43)]))
        self.assertEqual({p:v['karaka'] for p,v in c.chara_karakas(ll).items()},dict(zip(('Rahu','Mercury','Moon','Venus','Mars','Sun','Jupiter','Saturn'),('AK','AmK','BK','MK','PiK','PK','GK','DK'))))
    def test_example29_arudhas(self):
        s={'Sun':11,'Moon':2,'Mars':0,'Mercury':11,'Jupiter':0,'Venus':11,'Saturn':0,'Rahu':6,'Ketu':0,'Asc':5}
        actual=c.arudhas(s,{p:30*x+1 for p,x in s.items()},{'Sc':'Mars','Aq':'Saturn'})
        self.assertEqual([c.SIGNS[x] for x in actual.values()],['Ge','Le','Vi','Le','Ar','Ge','Ta','Cp','Cp','Vi','Ta','Li'])
    def test_arudha_exceptions(self):
        self.assertEqual(c.arudha(0,0),9);self.assertEqual(c.arudha(0,3),3)
    def test_example34_aspects(self):
        self.assertEqual(c.planetary_aspects('Jupiter',2),(6,8,10))
        self.assertEqual(c.planetary_aspects('Mars',4),(7,10,11));self.assertEqual(c.planetary_aspects('Saturn',8),(10,2,5))
    def test_age_examples(self):
        self.assertEqual([c.age_avastha(c.lon(s,x)) for s,x in [('Ge',8),('Li',19),('Sg',14),('Pi',27)]],['Kumaara','Vriddha','Yuva','Saisava'])
    def test_example49_activity(self):
        for p,l,name,strength in [('Mercury',c.lon('Ar',3,8),'Gamana','Cheshta'),('Jupiter',c.lon('Li',9,46),'Nrityalipsaa','Drishti'),('Venus',c.lon('Ar',7,55),'Sabhaa','Cheshta')]:
            with self.subTest(planet=p):
                v=c.activity_avastha(p,l,c.lon('Aq',25),c.lon('Vi',10),710,1)
                self.assertEqual(v['name'],name);self.assertEqual(v['activity_strength'],strength)
    def test_d30_unequal_boundary(self):
        self.assertEqual(c.varga_sign(F(5)-F(1,10**8),30),0);self.assertEqual(c.varga_sign(5,30),10)
        self.assertEqual(c.varga_sign(c.lon('Ta',12),30),11)
    def test_exact_nakshatra_boundary(self):
        self.assertEqual(c.nakshatra(F(40,3))['name'],'Bharani');self.assertEqual(c.nakshatra(F(10,3))['pada'],2)
    def test_wrap_and_normalization(self):
        self.assertEqual(c.norm(-1),359);self.assertEqual(c.norm(360),0)
        self.assertEqual(c.varga_sign(360,60),0)
    def test_every_varga_range_and_periodicity(self):
        for n in c.VARGAS:
            for value in range(-360,721,7):
                v=c.varga_sign(value,n);self.assertTrue(0<=v<12);self.assertEqual(v,c.varga_sign(value+360,n))
    def test_rasi_aspects_reciprocal(self):
        for s in range(12):
            self.assertEqual(len(c.rasi_aspects(s)),3)
            for other in c.rasi_aspects(s):self.assertIn(s,c.rasi_aspects(other))
    def test_example27_amsa_counts(self):
        ll={p:c.lon('Sg',29,49) for p in c.SEVEN}
        self.assertEqual(list(c.amsa_counts(ll)['Jupiter'].values()),[3,3,4,7])
    def test_example26_d60(self):self.assertEqual(c.SIGNS[c.varga_sign(c.lon('Sc',12,58),60)],'Sg')
    def test_example27_all_sixteen_vargas(self):
        ns=(1,2,3,4,7,9,10,12,16,20,24,27,30,40,45,60)
        self.assertEqual([c.SIGNS[c.varga_sign(c.lon('Sg',29,49),n)] for n in ns],
            'Sg Cn Le Vi Ge Sg Vi Sc Pi Pi Cn Ge Li Cn Le Sc'.split()) # PDF 64 prints Li for D3; rule gives Le
    def test_d5_rule_odd_and_even(self):
        self.assertEqual([c.SIGNS[c.varga_sign(c.lon('Ar',x),5)] for x in (0,6,12,18,24)],['Ar','Aq','Sg','Ge','Li'])
        self.assertEqual([c.SIGNS[c.varga_sign(c.lon('Ta',x),5)] for x in (0,6,12,18,24)],['Ta','Vi','Pi','Cp','Sc'])

VARGA_CASES=[(3,'Ge',3,'Ge'),(3,'Ge',19,'Li'),(3,'Ge',21,'Aq'),(4,'Ta',3,'Ta'),(4,'Ta',14,'Le'),(4,'Ta',23,'Aq'),
 (6,'Ge',11,'Ge'),(6,'Sc',19,'Cp'),(7,'Ge',10,'Le'),(7,'Vi',19,'Cn'),(8,'Ge',10,'Li'),(8,'Sc',19,'Ta'),
 (9,'Ge',11,'Cp'),(9,'Sc',19,'Sg'),(10,'Ge',10,'Vi'),(10,'Sc',19,'Cp'),(11,'Ge',11,'Ge'),(11,'Sc',19,'Pi'),
 (12,'Ge',11,'Li'),(12,'Sc',19,'Ge'),(16,'Ge',11,'Ta'),(16,'Sc',19,'Ge'),(20,'Ge',11,'Pi'),(20,'Sc',19,'Sg'),
 (24,'Ge',11,'Ar'),(24,'Sc',19,'Li'),(27,'Ge',11,'Cn'),(27,'Sc',19,'Ge'),(40,'Ge',11,'Ge'),(40,'Sc',19,'Sc'),
 (45,'Ge',11,'Ar'),(45,'Sc',19,'Sg')]
for i,(n,s,degree,expected) in enumerate(VARGA_CASES):
    # Example 23 prints Leo; the stated 10th sign from Libra is Cancer.
    def check(self,n=n,s=s,degree=degree,expected=expected):self.assertEqual(c.SIGNS[c.varga_sign(c.lon(s,degree),n)],expected)
    setattr(BookArithmetic,f'test_book_varga_{i+1:02d}_D{n}',check)

class AshtakavargaTests(unittest.TestCase):
    signs=dict(zip(c.PLANETS+('Asc',),(2,11,2,2,4,0,4,6,0,5))) # Chart 6, PDF 101
    expected={
      'Sun':[5,3,5,3,4,4,2,3,5,4,5,5],'Moon':[3,2,5,3,6,3,4,5,5,5,3,5],
      'Mars':[4,3,4,3,4,3,2,5,1,3,3,4],'Mercury':[7,4,7,4,4,3,4,4,4,3,6,4],
      'Jupiter':[4,3,5,6,3,7,4,3,5,6,5,5],'Venus':[8,7,4,3,3,2,4,6,4,4,4,3],
      'Saturn':[3,3,4,3,2,3,2,3,4,5,3,4]}
    def test_all_seven_bav_pdf149(self):
        for p,expected in self.expected.items():
            with self.subTest(planet=p):self.assertEqual(av.bhinna(p,self.signs),expected)
    def test_sav_pdf149(self):self.assertEqual(av.calculate(self.signs)['SAV'],[34,25,34,25,26,25,22,29,28,30,29,30])
    def test_soav_mercury_pdf151(self):self.assertEqual(av.calculate(self.signs)['SoAV']['Mercury'],[3,1,3,0,0,0,0,0,0,0,2,0])
    def test_pindas_mercury(self):self.assertEqual(av.calculate(self.signs)['pindas']['Mercury'],{'rasi':77,'graha':75,'sodhya':152})
    def test_bav_invariant_totals(self):
        for offset in range(12):
            signs={p:(s+offset)%12 for p,s in self.signs.items()}
            self.assertEqual([sum(av.bhinna(p,signs)) for p in av.REFERENCES],[48,49,39,54,56,52,39,49])
            self.assertEqual(sum(av.calculate(signs)['SAV']),337)
    def test_kakshya_boundaries(self):
        self.assertEqual(av.kakshya(0),'Saturn');self.assertEqual(av.kakshya(c.deg(3,45)),'Jupiter')
        self.assertEqual(av.kakshya(24),'Moon')

class DasaTests(unittest.TestCase):
    def test_vimsottari_example50(self):
        p=d.vimsottari(c.lon('Aq',2,23))[0]
        self.assertEqual(p['lord'],'Mars');self.assertEqual(p['end_year'],F(8995,4000))
        self.assertEqual(p['end_year']*360,F(16191,20))
    def test_vimsottari_variants_example50(self):
        expected={4:('Saturn',F(257,800)*19),5:('Mercury',F(257,800)*17),8:('Sun',F(257,800)*6)}
        for start,(lord,balance) in expected.items():
            p=d.vimsottari(c.lon('Aq',2,23),start)[0];self.assertEqual((p['lord'],p['end_year']),(lord,balance))
    def test_subperiod_uses_full_not_balance(self):
        p=d.vimsottari(c.lon('Aq',2,23))[0]
        self.assertEqual(p['children'][0]['start_year'],p['start_year'])
        self.assertEqual(p['children'][0]['duration_years'],F(7*7,120));self.assertLess(p['start_year'],0)
    def test_nested_partition(self):
        for pp in (d.vimsottari(123,depth=2),d.ashtottari(123,depth=2),d.kalachakra(123,depth=2)['periods']):
            def verify(rows):
                for i,p in enumerate(rows):
                    if i:self.assertEqual(rows[i-1]['end_year'],p['start_year'])
                    if 'children' in p:
                        self.assertEqual(p['children'][0]['start_year'],p['start_year']);self.assertEqual(p['children'][-1]['end_year'],p['end_year'])
                        self.assertEqual(sum(x['duration_years'] for x in p['children']),p['duration_years']);verify(p['children'])
            verify(pp)
    def test_ashtottari_example59(self):
        p=d.ashtottari(c.lon('Le',24))[0];self.assertEqual((p['lord'],p['end_year']),('Moon',6))
        self.assertEqual(p['children'][0]['lord'],'Mars');self.assertEqual(p['children'][-1]['lord'],'Moon')
    def test_ashtottari_all_arcs_cover_once(self):
        for x in range(360):self.assertEqual(sum((F(x)-a)%360<b for a,b in zip(d.ASHT_START,d.ASHT_ARC)),1)
    def test_kalachakra_example95(self):
        v=d.kalachakra(c.lon('Ta',15,50));p=v['periods']
        self.assertEqual([x['lord'] for x in p],['Sc','Li','Vi','Le','Cn','Ge','Ta','Ar','Sg'])
        self.assertEqual(p[0]['end_year'],F(19,4));self.assertEqual([x['lord'] for x in p[0]['children']],['Sc','Li','Vi','Le','Cn','Ge','Ta','Ar','Sg'])
    def test_kalachakra_example96(self):
        p=d.kalachakra(c.lon('Cn',3))['periods'];self.assertEqual(p[0]['end_year'],F(43,5))
        self.assertEqual([x['lord'] for x in p],['Pi','Sc','Li','Vi','Cn','Le','Ge','Ta','Ar'])
    def test_kalachakra_exercise34(self):
        p=d.kalachakra(c.lon('Aq',5,50))['periods'];self.assertEqual(p[0]['end_year'],2)
        self.assertEqual([x['lord'] for x in p],['Ge','Ta','Ar','Sg','Cp','Aq','Pi','Ar','Ta'])
    def test_kalachakra_groups_repeat_correctly(self):
        for nak in (1,3,7,9,13,15,19,21,25,27):
            self.assertEqual(d.kalachakra((nak-1)*F(40,3),depth=0)['periods'][0]['lord'],'Ar')
        for nak in (2,8,14,20,26):self.assertEqual(d.kalachakra((nak-1)*F(40,3),depth=0)['periods'][0]['lord'],'Sc')
        for nak in (4,10,16,22):self.assertEqual(d.kalachakra((nak-1)*F(40,3),depth=0)['periods'][0]['lord'],'Sg')
        for nak in (5,6,11,12,17,18,23,24):self.assertEqual(d.kalachakra((nak-1)*F(40,3),depth=0)['periods'][0]['lord'],'Pi')
    def test_narayana_sequences63_65(self):
        s={'Saturn':1,'Ketu':1}
        for seed,expected in [(7,'Sc Ge Cp Le Pi Li Ta Sg Cn Aq Vi Ar'),(11,'Pi Cn Sc Sg Ar Le Vi Cp Ta Ge Li Aq'),(9,'Cp Sg Sc Li Vi Le Cn Ge Ta Ar Pi Aq')]:
            self.assertEqual([c.SIGNS[x] for x in d.narayana_sequence(seed,s)],expected.split())
    def test_narayana_durations_example66(self):
        s=dict(zip(c.PLANETS+('Asc',),(3,1,4,4,7,4,1,11,5,10)));ll={p:x*30+1 for p,x in s.items()}
        pp=d.rasi_dasa('narayana',s,ll,seed=4,cycles=2,depth=0,colord_overrides={'Sc':'Mars','Aq':'Saturn'})['periods']
        self.assertEqual([p['duration_years'] for p in pp[:12]],[1,8,2,9,4,1,9,3,11,3,10,4])
        self.assertEqual(pp[-1]['end_year'],144)
    def test_narayana_antardasa_example67(self):
        s={'Moon':1,'Saturn':4,'Ketu':5};ls={3:'Moon',9:'Saturn'}
        self.assertEqual([c.SIGNS[x] for x in d.narayana_antardasa_sequence(9,s,{},ls,seed=3)],'Ta Ar Pi Aq Cp Sg Sc Li Vi Le Cn Ge'.split())
    def test_saturn_ketu_conflict_requires_choice(self):
        with self.assertRaises(ValueError):d.narayana_sequence(4,{'Saturn':4,'Ketu':4})
    def test_zero_and_own_sign_duration(self):
        self.assertEqual(c.dasa_years(8,'Jupiter',{'Jupiter':9}),0)
        self.assertEqual(c.dasa_years(5,'Mercury',{'Mercury':5}),12)
        with self.assertRaises(ValueError):c.dasa_years(5,'Mercury',{'Mercury':5},False)
    def test_sudarsana_45th_year(self):
        p=d.sudarsana(11,45,depth=1)[44];self.assertEqual(p['lord'],'Sc');self.assertEqual(p['children'][1]['lord'],'Sg')
    def test_active_half_open(self):
        pp=d.periods(['A','B'],[1,1]);self.assertEqual(d.active(pp,1),['B']);self.assertEqual(d.active(pp,2),[])

class TajakaTests(unittest.TestCase):
    longitudes={'Sun':c.lon('Aq',23,50),'Moon':c.lon('Pi',15,14),'Mars':c.lon('Pi',24,58),'Mercury':c.lon('Aq',11,28),
      'Jupiter':c.lon('Ar',10),'Venus':c.lon('Cp',29),'Saturn':c.lon('Ar',19,10),'Asc':c.lon('Cp',10,50)}
    def test_muntha_example(self):self.assertEqual(t.muntha(c.lon('Sc'),31),2)
    def test_harsha_example119(self):self.assertEqual([x['total'] for x in t.harsha_bala(self.longitudes,False).values()],[0,15,0,10,5,10,5])
    def test_uchcha_example(self):self.assertAlmostEqual(t.uchcha_bala('Jupiter',c.lon('Vi',8,30)),12.94444444,places=6)
    def test_sahams_example121(self):
        v=t.sahams(self.longitudes,False)
        self.assertEqual(v['Artha'],c.lon('Sc',2,30));self.assertEqual(v['Samartha'],c.lon('Pi',5,2));self.assertEqual(v['Vanik'],c.lon('Sg',7,4));self.assertEqual(len(v),36)
    def test_patyayini_table75(self):
        ll=dict(zip(('Venus','Mercury','Moon','Saturn','Asc','Jupiter','Sun','Mars'),[c.deg(1,38),c.deg(4,47),c.deg(4,49),c.deg(6,30),c.deg(7,14),c.deg(10,59),c.deg(17,5),c.deg(23,53)]))
        p=t.patyayini(ll);self.assertAlmostEqual(float(p[0]['duration_years'])*365.2425,24.98,delta=.005)
        self.assertAlmostEqual(float(p[1]['duration_years'])*365.2425,48.17,delta=.005);self.assertEqual(p[-1]['end_year'],1)
    def test_mudda_example122(self):
        p=t.mudda(c.lon('Sg',29,28),21)[0];self.assertEqual(p['lord'],'Rahu')
        self.assertAlmostEqual(float(p['end_year'])*360,42.66,places=6)
    def test_ithasala_examples(self):
        v=t.aspect('Moon',c.lon('Le',14),'Venus',c.lon('Li',19),13,1)
        self.assertTrue(v['candidate_ithasala']);self.assertFalse(v['within_one_degree'])
        self.assertTrue(t.aspect('Moon',c.lon('Le',18,25),'Venus',c.lon('Li',19),13,1)['within_one_degree'])
        self.assertFalse(t.aspect('Mercury',c.lon('Ge',18),'Mars',c.lon('Li',18,10),-1,.5)['candidate_ithasala'])
    def test_hadda_boundaries(self):
        self.assertEqual(t.hadda_lord(c.lon('Ar',5,59)),'Jupiter');self.assertEqual(t.hadda_lord(c.lon('Ar',6)),'Venus')
    def test_pancha_requires_policy(self):
        with self.assertRaises(ValueError):t.pancha_vargeeya(self.longitudes,lambda *args:'neutral')

class AstronomyTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.eph=Ephemeris()
    def test_timezone_utc_conversion(self):
        dt=local_time('2000-01-01T17:30:00','UTC+05:30');self.assertEqual(dt.astimezone(timezone.utc).hour,12)
        self.assertLess(abs(to_jd(dt)-2451545),1/86400)
        self.assertLess(abs((from_jd(to_jd(dt))-dt).total_seconds()),.001)
    def test_dst_nonexistent_rejected(self):
        with self.assertRaises(ValueError):local_time('2024-03-10T02:30:00','America/New_York')
    def test_dst_ambiguous_requires_fold(self):
        with self.assertRaises(ValueError):local_time('2024-11-03T01:30:00','America/New_York')
        a=local_time('2024-11-03T01:30:00','America/New_York',0);b=local_time('2024-11-03T01:30:00','America/New_York',1)
        self.assertAlmostEqual((to_jd(b)-to_jd(a))*24,1,places=6)
    def test_input_validation(self):
        with self.assertRaises(ValueError):local_time('2000-01-01T12:00:00')
        with self.assertRaises(ValueError):Settings(node='guess')
        with self.assertRaises(ValueError):Settings(engine='swiss')
        with self.assertRaises(ValueError):self.eph.positions(2451545,100,0)
    def test_sun_independent_low_precision_formula(self):
        # Independent analytical solar approximation, not a second Swiss call.
        # Mean longitude/anomaly + equation of center + aberration/nutation.
        for jd in (2446895.5,2451545.,2460000.5):
            T=(jd-2451545.)/36525;L=(280.46646+36000.76983*T+.0003032*T*T)%360
            M=math.radians((357.52911+35999.05029*T-.0001537*T*T)%360)
            C=(1.914602-.004817*T-.000014*T*T)*math.sin(M)+(.019993-.000101*T)*math.sin(2*M)+.000289*math.sin(3*M)
            approx=(L+C-.00569-.00478*math.sin(math.radians(125.04-1934.136*T)))%360
            swiss=self.eph.body(jd,0,sidereal=False)['longitude']
            self.assertLess(abs((swiss-approx+180)%360-180),.02)
    def test_book118_sun_longitude(self):
        birth=to_jd(local_time('1967-03-08T17:40:00','UTC+05:30'))
        self.assertAlmostEqual(self.eph.sun(birth),float(c.lon('Aq',23,50,25)),delta=.02)
    def test_book118_solar_return(self):
        birth=to_jd(local_time('1967-03-08T17:40:00','UTC+05:30'))
        expected=to_jd(local_time('2000-03-08T04:41:21','UTC+05:30'))
        actual=self.eph.solar_arc_date(birth,33)
        self.assertLess(abs(actual-expected)*86400,300) # old book settings are not fully specified
        self.assertLess(abs((self.eph.sun(actual)-self.eph.sun(birth)+180)%360-180),1e-6)
    def test_solar_month_not_fixed_days(self):
        j=2451545.;a=self.eph.solar_arc_date(j,F(1,12));b=self.eph.solar_arc_date(j,F(2,12))
        self.assertLess(abs((self.eph.sun(a)-self.eph.sun(j))%360-30),1e-6)
        self.assertGreater(abs((a-j)-(b-a)),.01)
    def test_nodes_are_opposite(self):
        for node in ('mean','true'):
            p=Ephemeris(Settings(node=node)).positions(2451545,26.3,73.06)
            self.assertAlmostEqual((p['Ketu']['longitude']-p['Rahu']['longitude'])%360,180)
    def test_sunrise_precedes_birth_and_segments(self):
        dt=local_time('2024-01-02T03:00:00','UTC+05:30');jd=to_jd(dt);ctx=self.eph.sunrise_context(jd,26.3,73.06,dt.tzinfo)
        self.assertLess(ctx['sunrise_jd'],jd);self.assertGreater(ctx['next_sunrise_jd'],jd)
        self.assertEqual(ctx['weekday_sunday0'],1);self.assertFalse(ctx['is_day'])
        u=self.eph.timed_upagrahas(jd,26.3,73.06,ctx);self.assertEqual(len(u),6)
        self.assertGreater(u['Gulika']['event_jd'],u['Maandi']['event_jd'])
    def test_polar_day_is_explicit(self):
        with self.assertRaises(ValueError):self.eph.sunrise_context(to_jd(local_time('2024-06-21T12:00:00+00:00')),80,0)
    def test_panchanga_boundary_changes_tithi(self):
        j=2451545.;end=self.eph.panchanga_ends(j)['tithi']
        before=c.panchanga(self.eph.sun(end-1e-5),self.eph.body(end-1e-5,1)['longitude'])['tithi']
        after=c.panchanga(self.eph.sun(end+1e-5),self.eph.body(end+1e-5,1)['longitude'])['tithi']
        self.assertEqual(after,before%30+1)
    def test_example50_calendar_erratum(self):
        dt=local_time('2000-04-28T05:50:00-04:00')
        elapsed=dt+timedelta(days=809.55)
        self.assertEqual(elapsed.isoformat(),'2002-07-16T19:02:00-04:00')

if __name__=='__main__':unittest.main()
