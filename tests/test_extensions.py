# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Independent text fixtures, boundary cases and consequential integration checks."""
import json
from pathlib import Path
from datetime import date
import unittest
from fractions import Fraction as F
from vedic_toolkit import core as c,ashtakavarga as av,dashas as d,tajaka as t
from vedic_toolkit import strengths as st, strength_context as sc, yogas, tajaka_yogas as ty
from vedic_toolkit import analysis,calendar,electional,validation
from vedic_toolkit.astronomy import Ephemeris,local_time,to_jd

ROOT=Path(__file__).resolve().parents[1]
SPEC=json.loads((ROOT/'examples/book_example_118.json').read_text())

def sample(**changes):
    result=dict(zip(c.PLANETS,(10,42,78,95,139,173,211,244,64)));result['Asc']=15
    result.update(changes);return result

def raman_fixture():
    # Raman, Graha and Bhava Balas, printed pp2-3 and 77: independent printed inputs.
    values=((180,53,55),(311,17,19),(229,30,34),(181,31,34),(84,0,49),(171,9,56),(124,22,41),(234,23,47),(54,23,47))
    ll={p:c.deg(*v) for p,v in zip(c.PLANETS,values)};ll['Asc']=c.deg(298,27)
    motion={p:{'mean_longitude':m,'seeghrochcha':q} for p,m,q in
        [('Mars',266.34,181.23),('Mercury',181.23,174.49),('Jupiter',66.91,181.23),('Venus',181.23,158.35),('Saturn',111.23,181.23)]}
    kwargs=dict(mc=216.5,tropical_longitudes={p:float(v)+21+16/60 for p,v in ll.items()},apparent_solar_hour=14+20/60,
        is_day=True,period_fraction=(20+32/60)/(29+20/60),time_lords={'year':'Saturn','month':'Mercury','weekday':'Mercury','hora':'Moon'},chesta_inputs=motion)
    return ll,kwargs

class StrengthTests(unittest.TestCase):
    def test_mercury_degree_zone_boundaries(self):
        self.assertEqual([st.degree_dignity('Mercury',x)['degree_zone'] for x in (164.999,165,169.999,170,179.999)],['exaltation','moolatrikona','moolatrikona','own','own'])
    def test_moon_and_mars_degree_zones(self):
        self.assertEqual(st.degree_dignity('Moon',33)['degree_zone'],'moolatrikona')
        self.assertEqual(st.degree_dignity('Mars',12)['degree_zone'],'own')
        self.assertEqual(st.degree_dignity('Mars',5)['degree_zone'],'moolatrikona')
    def test_no_invented_node_degree_zone(self):self.assertIsNone(st.degree_dignity('Rahu',70)['degree_zone'])
    def test_retrograde_combustion_limits(self):
        self.assertTrue(st.combustion('Mercury',13,0,1)['combust'])
        self.assertFalse(st.combustion('Mercury',13,0,-1)['combust'])
        self.assertFalse(st.combustion('Venus',8,0,-1)['combust'])
    def test_chesta_raman_examples_49_51(self):
        for mean,true,seeghra,expected in [(266.34,229.50,181.23,22.23),(181.23,181.52,174.49,2.30),(66.91,84.01,181.23,35.26),(181.23,171.16,158.35,5.95),(111.23,124.39,181.23,21.14)]:
            with self.subTest(mean=mean,true=true):self.assertAlmostEqual(st.chesta_bala(mean,true,seeghra),expected,delta=.006)
    def test_chesta_wrap_and_origin_invariance(self):
        self.assertAlmostEqual(st.chesta_bala(359,1,90),30)
        self.assertAlmostEqual(st.chesta_bala(359+42,1+42,90+42),30)
        with self.assertRaises(ValueError):st.chesta_bala(0,180,100)
    def test_raman_all_seven_saptavargaja_fixtures(self):
        ll,kw=raman_fixture();r=st.shadbala(ll,**kw)['planets']
        for p,want in zip(c.SEVEN,(90,48.75,90,135,71.25,116.25,97.5)):
            self.assertEqual(r[p]['sthana_components']['saptavargaja'],want,p)
    def test_raman_all_seven_drik_fixtures(self):
        ll,kw=raman_fixture();r=st.shadbala(ll,**kw)['planets']
        for p,want in zip(c.SEVEN,(15.86,-21.73,.95,15.64,-16.03,18.47,7.21)):
            self.assertAlmostEqual(r[p]['drik'],want,delta=.02,msg=p)
    def test_raman_dig_uses_actual_mc(self):
        ll,kw=raman_fixture();r=st.shadbala(ll,**kw)['planets']
        self.assertAlmostEqual(r['Sun']['dig'],48.10,delta=.04)
        self.assertAlmostEqual(r['Saturn']['dig'],58.02,delta=.01)
    def test_sun_ayana_doubling_and_mercury_symmetry(self):
        self.assertEqual(st.ayana_bala('Sun',90),120)
        self.assertEqual(st.ayana_bala('Sun',270),0)
        self.assertEqual(st.ayana_bala('Mercury',90),st.ayana_bala('Mercury',270))
    def test_raman_epoch_time_lords(self):
        r=sc.raman_time_lords(date(1918,10,16),3,True,(20+32/60)/(29+20/60))
        self.assertEqual(r,{'year':'Saturn','month':'Mercury','weekday':'Mercury','hora':'Moon'})
    def test_missing_motion_never_produces_total(self):
        ll,kw=raman_fixture();kw['chesta_inputs'].pop('Mars')
        with self.assertRaises(ValueError):st.shadbala(ll,**kw)
    def test_totals_are_six_components_and_separate_minimum_profiles(self):
        ll,kw=raman_fixture();a=st.shadbala(ll,**kw);b=st.shadbala(ll,**kw,minimum_profile='raman')
        self.assertEqual(a['planets']['Sun']['required_virupas'],390);self.assertEqual(b['planets']['Sun']['required_virupas'],300)
        for row in a['planets'].values():self.assertEqual(row['total_virupas'],sum(row[k] for k in ('sthana','dig','kala','chesta','naisargika','drik')))
    def test_shadbala_war_transfer_conserves_total(self):
        ll,kw=raman_fixture();ll['Mars']=100;ll['Mercury']=100.4
        a=st.shadbala(ll,**kw);b=st.shadbala(ll,**kw,war_policy='none')
        self.assertEqual(a['planetary_wars'][0]['winner'],'Mars')
        self.assertAlmostEqual(sum(r['total_virupas'] for r in a['planets'].values()),sum(r['total_virupas'] for r in b['planets'].values()))
    def test_vimsopaka_all_groups_are_bounded(self):
        for group in ('shad','sapta','dasa','shodasa'):
            out=st.vimsopaka(sample(),group)
            self.assertTrue(all(0<=p['total']<=20 for p in out['planets'].values()))
            self.assertEqual(sum(st.VIMSOPAKA_WEIGHTS[group].values()),20)
    def test_avastha_mudita_policies_are_explicit(self):
        a=st.avasthas(sample());b=st.avasthas(sample(),mudita_policy='any_condition')
        self.assertEqual(a['mudita_policy'],'literal_all');self.assertEqual(b['mudita_policy'],'any_condition')
        for p in c.SEVEN:
            if a['planets'][p]['additional_conditions']['Mudita']:self.assertTrue(b['planets'][p]['additional_conditions']['Mudita'])

class ResolutionTests(unittest.TestCase):
    def test_kalachakra_bphs_26_and_27(self):
        self.assertEqual(d.kalachakra(25*F(40,3),0)['periods'][0]['lord'],'Sc')
        self.assertEqual(d.kalachakra(26*F(40,3),0)['periods'][0]['lord'],'Ar')
    def test_mercury_virgo_twelve_year_cap(self):self.assertEqual(c.dasa_years(5,'Mercury',{'Mercury':5}),12)
    def test_unestablished_subperiods_require_explicit_policy(self):
        ll=sample();s=c.division(ll,1)
        with self.assertRaisesRegex(ValueError,'subperiod'):d.rasi_dasa('kendradi',s,ll,seed=0)
        self.assertEqual(len(d.rasi_dasa('kendradi',s,ll,seed=0,subperiod_policy='narayana_extension')['periods'][0]['children']),12)
    def test_ashtakavarga_equality_source_resolution(self):
        row=[0]*12;row[0]=row[7]=3
        self.assertEqual(av.ekadhipatya(row,{0})[7],0)
        self.assertEqual(av.ekadhipatya(row,{0},equal_one_occupied='unchanged')[7],3)
    def test_ashtakavarga_genuinely_different_formulas(self):
        row=[0]*12;row[0]=2;row[7]=5
        self.assertEqual(av.ekadhipatya(row,{0},'pvr_2001')[7],2)
        self.assertEqual(av.ekadhipatya(row,{0},'bphs_translation')[7],3)
    def test_tajaka_neutral_is_defined_only_in_matching_profile(self):
        ll=sample(Sun=32,Jupiter=15,Venus=62)
        a=t.pancha_with_profile(ll,'pvr_tajikasara')['planets']['Sun']
        b=t.pancha_with_profile(ll,'hayanaratna_threefold')['planets']['Sun']
        self.assertEqual(a['kshetra'],7.5);self.assertEqual(b['kshetra'],15)
    def test_book_example120_year_lord_and_mars_strength(self):
        result=analysis.solar_return(SPEC,33)
        self.assertEqual(result['year_lord']['lord'],'Mars')
        self.assertAlmostEqual(result['pancha_vargeeya']['planets']['Mars']['total'],13.7,delta=.05)
    def test_year_lord_tie_is_preserved(self):
        ll=sample(Asc=0,Mars=60,Jupiter=120)
        out=t.select_year_lord(['Mars','Jupiter'],ll,{'Mars':{'total':12},'Jupiter':{'total':12}})
        self.assertIsNone(out['lord']);self.assertEqual(set(out['tied_candidates']),{'Mars','Jupiter'})
    def test_station_can_prevent_local_application_from_perfecting(self):
        class SyntheticEphemeris:
            def body(self,jd,body):
                x=jd-1000
                if body==2:return {'longitude':18+x-.5*x*x,'speed_deg_day':1-x}
                return {'longitude':138.75+.01*x,'speed_deg_day':.01}
        out=t.track_perfection(SyntheticEphemeris(),1000,'Mercury','Mars',2,.125)
        self.assertEqual(out['status'],'not_found_in_window');self.assertTrue(out['stations'])
    def test_equal_speeds_are_neither_applying_nor_separating(self):
        result=t.aspect('Mercury',18,'Mars',138.75,.5,.5)
        self.assertFalse(result['candidate_ithasala']);self.assertFalse(result['candidate_eesarpha'])

class YogaTests(unittest.TestCase):
    def rules(self,ll,**kw):return {r['name']:r for r in yogas.evaluate(ll,**kw)['rules']}
    def test_hamsa_not_ruchaka_for_jupiter(self):
        out=self.rules(sample(Asc=250,Jupiter=340,Mars=60))
        self.assertEqual(out['Hamsa']['status'],'conditions_met');self.assertEqual(out['Ruchaka']['status'],'conditions_not_met')
    def test_pisces_wealth_missing_saturn_restored(self):
        ll=sample(Asc=340,Moon=100,Saturn=280)
        self.assertEqual(self.rules(ll)['Dhana_Pi_5_11']['status'],'conditions_met')
        ll['Saturn']=310
        self.assertEqual(self.rules(ll)['Dhana_Pi_5_11']['status'],'conditions_not_met')
    def test_kaahala_strength_is_not_assumed(self):
        ll=sample(Asc=0,Moon=95,Jupiter=190)
        self.assertEqual(self.rules(ll)['Kaahala']['status'],'conditions_pending')
        self.assertEqual(self.rules(ll,strong={'Mars':True})['Kaahala']['status'],'conditions_met')
    def test_nabhasa_suppresses_sankhya(self):
        ll=sample();ll.update({p:5+i for i,p in enumerate(c.SEVEN)})
        out=self.rules(ll)
        self.assertEqual(out['Rajju']['status'],'conditions_met');self.assertEqual(out['Gola']['status'],'conditions_not_met')
    def test_self_conjunction_not_counted(self):
        ll=sample();ll['Asc']=120;ll['Sun']=125
        self.assertFalse(self.rules(ll)['Go']['conditions']['second_lord_joins_jupiter'])
    def test_tied_karakas_are_not_arbitrarily_selected(self):
        ll=sample(Sun=29,Moon=59,Mars=1,Rahu=240)
        out=self.rules(ll)
        # Rahu advancement=30, Sun and Moon tie for AmK; no arbitrary AmK.
        self.assertIsNone(out['raaja_sambandha_05']['conditions']['AmK_trinal'])
    def test_all_rule_names_unique_and_nonempty(self):
        out=yogas.evaluate(sample());names=[r['name'] for r in out['rules']]
        self.assertEqual(len(names),170);self.assertEqual(len(set(names)),170)
        self.assertTrue(all(r['conditions'] for r in out['rules']))
    def test_duhphali_source_resolves_slower_strong(self):
        ll=sample(Mars=78,Saturn=200);speed=dict(zip(c.SEVEN,(1,13,.5,1.4,.1,1.2,.03)))
        out=ty.evaluate(ll,speed)
        self.assertTrue(any(set(r['planets'])=={'Mars','Saturn'} for r in out['configurations']['Duhphali-Kutta']))
        self.assertEqual(out['names_checked'],16)
    def test_source_disagreement_preserved_in_nakta(self):
        ll=sample(Asc=30,Venus=73,Mars=225,Moon=101);speed=dict(zip(c.SEVEN,(1,13,.5,1.4,.1,1.2,.03)))
        a=ty.evaluate(ll,speed);b=ty.evaluate(ll,speed,nakta_mode='historical_translation')
        self.assertTrue(any(set(x['planets'])=={'Mars','Venus','Moon'} for x in a['configurations']['Nakta']))
        self.assertFalse(any(set(x['planets'])=={'Mars','Venus','Moon'} for x in b['configurations']['Nakta']))
    def test_bhavishya_example_remains_visible_outside_present_orb(self):
        ll=sample(Moon=120+13+35/60,Venus=180+21+20/60)
        speed=dict(zip(c.SEVEN,(1,13,.5,1.4,.1,1.2,.03)))
        out=ty.evaluate(ll,speed)
        self.assertTrue(any(set(x['planets'])=={'Moon','Venus'} for x in out['future_ithasala_candidates']))
        self.assertFalse(any(set(x['planets'])=={'Moon','Venus'} for x in out['configurations']['Ithasala']))

class CalendarAndEvaluationTests(unittest.TestCase):
    def test_book1999_two_jyeshtha_months(self):
        e=Ephemeris();a=calendar.lunar_month(e,to_jd(local_time('1999-05-20T12:00:00+05:30')))
        b=calendar.lunar_month(e,to_jd(local_time('1999-06-20T12:00:00+05:30')))
        self.assertEqual((a['name'],a['type']),('Jyeshtha','adhika'))
        self.assertEqual((b['name'],b['type']),('Jyeshtha','nija_after_adhika'))
        expected=to_jd(local_time('1999-05-15T17:35:32+05:30'))
        self.assertAlmostEqual((a['start_jd_ut1']-expected)*86400,0,delta=60)
    def test_table79_eligible_and_ineligible_weekday(self):
        ll=sample(Asc=32,Moon=42,Sun=18)
        self.assertTrue(electional.assess(ll,1,'house_construction')['all_table_guidelines_met'])
        self.assertFalse(electional.assess(ll,2,'house_construction')['all_table_guidelines_met'])
        self.assertEqual(len(electional.GUIDELINES),8)
    def test_optional_election_entries(self):
        ll=sample(Asc=122,Moon=42,Sun=18)
        self.assertFalse(electional.assess(ll,1,'house_construction')['conditions']['ascendant'])
        self.assertTrue(electional.assess(ll,1,'house_construction',include_optional=True)['conditions']['ascendant'])
    def test_rectification_needs_real_inputs(self):
        with self.assertRaises(ValueError):validation.rectify(SPEC,[],[])
    def test_rectification_holdout_never_ranks_candidates(self):
        rules=[{'id':'r1','event_type':'career','varga':60,'activated_houses':[1,5,9]}]
        events=[{'id':'e1','type':'career','datetime':'2000-03-01T00:00:00+05:30','split':'train'},
                {'id':'e2','type':'career','datetime':'2005-03-01T00:00:00+05:30','split':'holdout'}]
        a=validation.rectify(SPEC,events,rules,minutes=1,step_seconds=30)
        events[1]['datetime']='2012-03-01T00:00:00+05:30'
        b=validation.rectify(SPEC,events,rules,minutes=1,step_seconds=30)
        self.assertEqual([r['datetime'] for r in a['candidates']],[r['datetime'] for r in b['candidates']])
        self.assertFalse(a['holdout_used_for_ranking'])
    def forecasts(self):
        return [{'id':'p1','probability':.8,'registered_at':'2020-01-01T00:00:00Z','window_start':'2020-02-01T00:00:00Z','window_end':'2020-03-01T00:00:00Z'}]
    def test_brier_scoring(self):
        r=validation.evaluate_predictions(self.forecasts(),{'p1':1},.5)
        self.assertAlmostEqual(r['brier_score'],.04);self.assertAlmostEqual(r['brier_skill_score'],.84)
    def test_forecasts_after_window_start_rejected(self):
        p=self.forecasts();p[0]['registered_at']='2020-02-02T00:00:00Z'
        with self.assertRaises(ValueError):validation.evaluate_predictions(p,{'p1':1},.5)
    def test_missing_and_duplicate_outcomes_cannot_be_cherry_picked(self):
        with self.assertRaises(ValueError):validation.evaluate_predictions(self.forecasts(),{},.5)
        with self.assertRaises(ValueError):validation.evaluate_predictions(self.forecasts()*2,{'p1':1},.5)

if __name__=='__main__':unittest.main()
