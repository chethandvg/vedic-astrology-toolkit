# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""v0.3 source fixtures and failure cases for the four requested work items."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from datetime import datetime
from fractions import Fraction as F
from unittest.mock import patch
from vedic_toolkit import core as c, moola, interpretation as ip, yogas, electional as el
from vedic_toolkit import tajaka_yogas as ty, analysis, strengths
from tests.test_extensions import sample, raman_fixture
from audit_strengths import arithmetic_checks, printed_reference_audit

ROOT=Path(__file__).resolve().parents[1]
SPEC=json.loads((ROOT/'examples/book_example_118.json').read_text())
# Source supplies signs and the explicit order, not exact longitudes.
RATH_SIGNS={'Asc':3,'Sun':0,'Moon':3,'Mars':9,'Mercury':1,'Jupiter':3,'Venus':11,'Saturn':6,'Rahu':8,'Ketu':2}
RATH_ORDER=['Jupiter','Moon','Mars','Saturn','Sun','Venus','Rahu','Ketu','Mercury']
RATH_LL={p:30*s for p,s in RATH_SIGNS.items()} # placeholders: only sign/duration fixture

def reviewed(ll,**kwargs):
    return ip.review(ll,yogas.evaluate(ll),**kwargs)
def interaction(out,name):return next(r for r in out['interactions'] if r['name']==name)

class MoolaTests(unittest.TestCase):
    def test_nine_published_table_durations(self):
        wanted=[10,10,3,14,1,12,17,3,13]
        for p,w in zip(RATH_ORDER,wanted):
            with self.subTest(planet=p):self.assertEqual(moola.years(p,RATH_SIGNS[p])['years'],w)
    def test_published_sequence_and_cycle_complements(self):
        r=moola.calculate(RATH_LL,order_override=RATH_ORDER)
        self.assertEqual(r['order'],RATH_ORDER)
        self.assertEqual(r['first_cycle_years'],83);self.assertEqual(r['second_cycle_years'],37)
        self.assertEqual(r['periods'][-1]['end_year'],120)
        self.assertEqual([x['end_year'] for x in r['periods'][:9]],[10,20,23,37,38,50,67,70,83])
        self.assertEqual(r['periods'][10]['duration_years'],0) # Moon has no second-cycle balance
    def test_table_prose_conflict_is_explicit(self):
        self.assertEqual(moola.years('Jupiter',3,'rath_1999_table')['years'],10)
        self.assertEqual(moola.years('Jupiter',3,'rath_1999_prose')['years'],12)
    def test_zero_reset_and_negative_absolute(self):
        self.assertTrue(moola.years('Moon',3)['zero_reset'])
        self.assertEqual(moola.years('Moon',3)['years'],10)
        r=moola.years('Sun',8);self.assertEqual(r['raw_years'],-2);self.assertEqual(r['years'],2)
    def test_negative_second_cycle_is_never_clipped(self):
        ll=sample(Mercury=165)
        r=moola.calculate(ll,cycles=1,profile='rath_1999_prose')
        self.assertEqual(r['duration_evidence']['Mercury']['years'],18)
        with self.assertRaisesRegex(ValueError,'negative second-cycle'):moola.calculate(ll,profile='rath_1999_prose')
    def test_saturn_ketu_precedence_needs_decision_on_tie(self):
        ll=sample(Asc=90,Saturn=95,Ketu=95,Mercury=97)
        with self.assertRaisesRegex(ValueError,'Saturn/Ketu longitude tie'):moola.calculate(ll,cycles=1)
        a=moola.calculate(ll,cycles=1,exception_precedence='Saturn')
        b=moola.calculate(ll,cycles=1,exception_precedence='Ketu')
        self.assertEqual(a['group_houses'][1],(2,5,8,11));self.assertEqual(b['group_houses'][1],(3,6,9,12))
    def test_single_saturn_or_ketu_overrides_parity(self):
        a=moola.calculate(sample(Asc=90,Saturn=95,Mercury=97),cycles=1)
        b=moola.calculate(sample(Asc=0,Ketu=5),cycles=1)
        self.assertEqual(a['group_houses'][1],(2,5,8,11));self.assertEqual(b['group_houses'][1],(3,6,9,12))
    def test_automatic_strength_ranking_with_synthetic_degrees(self):
        ll={p:x+1+i for i,(p,x) in enumerate(RATH_LL.items())}
        r=moola.calculate(ll)
        self.assertEqual(r['order'][:2],['Jupiter','Moon']) # two occupants; exaltation outranks own
        self.assertEqual(r['order'][-1],'Mercury')
        self.assertFalse(r['order_override_used'])
    def test_unsupported_subperiods_and_bad_override_rejected(self):
        with self.assertRaisesRegex(ValueError,'mahadasas only'):moola.calculate(RATH_LL,depth=1)
        with self.assertRaises(ValueError):moola.calculate(RATH_LL,order_override=['Sun']*9)
        with self.assertRaisesRegex(ValueError,'group order'):moola.calculate(RATH_LL,order_override=list(reversed(RATH_ORDER)))
    def test_unbroken_planet_tie_stays_unresolved(self):
        # Both are neutral in Mars's Scorpio and have identical advancement.
        ll=sample(Asc=90,Mercury=215,Venus=215)
        with self.assertRaisesRegex(ValueError,'ordering tie'):moola.calculate(ll,cycles=1)

class InterpretationTests(unittest.TestCase):
    def test_functional_table_covers_every_classical_planet(self):
        for asc in range(12):
            for waxing in (False,True):
                r=ip.functional_nature({'Asc':asc},waxing)
                self.assertEqual(sorted(r['benefics']+r['neutrals']+r['malefics']),sorted(c.SEVEN))
                self.assertEqual(r['unclassified'],['Rahu','Ketu'])
    def test_table30_capricorn_and_variable_moon(self):
        r=ip.functional_nature({'Asc':9},True)
        self.assertEqual(set(r['benefics']),{'Venus','Mercury','Saturn'})
        self.assertIn('Moon',r['malefics']);self.assertEqual(r['yogakarakas'],['Venus'])
        self.assertIn('Moon',ip.functional_nature({'Asc':9},False)['neutrals'])
        self.assertIn('Moon',ip.functional_nature({'Asc':9})['unclassified'])
    def test_pdf125_wide_pair_remains_present(self):
        ll=sample(Asc=275,Mercury=32,Venus=56)
        r=next(x for x in reviewed(ll)['raaja_magnitude'] if set(x['planets'])=={'Mercury','Venus'})
        self.assertEqual(r['degree_gap'],24);self.assertFalse(r['close_association'])
        self.assertIn('wide_association',r['weakening_factors'])
    def test_pdf125_close_pair_and_disclosed_six_degree_boundary(self):
        for venus,expected in [(33,True),(38,True),(38.01,False)]:
            ll=sample(Asc=275,Mercury=32,Venus=venus)
            r=next(x for x in reviewed(ll)['raaja_magnitude'] if set(x['planets'])=={'Mercury','Venus'})
            self.assertEqual(r['close_association'],expected)
            self.assertTrue(all('dasa_varga_favorable_count' in p for p in r['planet_evidence']))
    def test_kemadruma_angular_exception(self):
        ll=sample(Asc=0,Moon=100,Sun=10,Mars=170,Mercury=200,Jupiter=250,Venus=280,Saturn=310,Rahu=190,Ketu=10)
        r=interaction(reviewed(ll),'Kemadruma_angular_exception')
        self.assertTrue(r['base_isolation']);self.assertTrue(r['exception_applies'])
    def test_daridra_mercury_exception_is_reported(self):
        ll=sample(Asc=0,Mars=35,Saturn=45,Mercury=215)
        self.assertTrue(interaction(reviewed(ll),'Daridra_12_reversal')['exception_applies'])
        ll['Mercury']=185
        self.assertFalse(interaction(reviewed(ll),'Daridra_12_reversal')['exception_applies'])
    def test_daridra_sun_saturn_alternative(self):
        ll=sample(Asc=0,Sun=35,Saturn=310)
        self.assertTrue(interaction(reviewed(ll),'Daridra_13_alternative')['favorable_alternative'])
        ll['Saturn']=215
        self.assertFalse(interaction(reviewed(ll),'Daridra_13_alternative')['favorable_alternative'])
    def test_gajakesari_alternative_requires_actual_strength(self):
        ll=sample(Asc=90,Jupiter=95,Sun=20,Moon=270)
        self.assertIsNone(interaction(reviewed(ll),'Gaja_Kesari_alternative')['alternative_conditions_met'])
        self.assertTrue(interaction(reviewed(ll,strong={'Jupiter':True}),'Gaja_Kesari_alternative')['alternative_conditions_met'])
    def test_sankhya_hierarchy_retains_named_overriders(self):
        ll=sample(**{p:1+i for i,p in enumerate(c.PLANETS)})
        r=interaction(reviewed(ll),'Sankhya_subordination')
        self.assertIn('Rajju',r['overriding_nabhasa'])
        self.assertNotIn('Gola',r['overriding_nabhasa'])
    def test_lunar_day_night_evidence_is_not_assumed(self):
        ll=sample(Moon=10,Jupiter=250,Venus=190)
        r=reviewed(ll)['lunar_general_guidelines']
        self.assertIsNone(r['favored_aspect_under_day_night_rule'])
        self.assertEqual(reviewed(ll,is_day=True)['lunar_general_guidelines']['is_day'],True)
    def test_strength_evidence_does_not_invent_an_outcome(self):
        r=reviewed(sample(Sun=10,Mercury=11))
        budha=next(x for x in r['planet_qualification'] if x['name']=='Budha-Aaditya')
        self.assertIsNone(budha['all_named_participants_strong'])
        self.assertEqual(budha['status'],'strength_evidence_only')

class TajakaInteractionTests(unittest.TestCase):
    @staticmethod
    def configurations():
        return {k:[] for k in ('Ithasala','Manahoo','Radda','Durupha','Kamboola','Gairi-Kamboola','Duhphali-Kutta','Duttota')}
    def test_pdf354_duttota_counteracts_radda(self):
        ll=sample(Asc=0,Saturn=20,Mars=199,Venus=348,Sun=120,Moon=260,Mercury=135,Jupiter=65)
        speeds=dict(zip(c.SEVEN,(1,13,.5,1.2,.08,1,.03)))
        found=ty.evaluate(ll,speeds)['configurations']
        row=next(r for r in ty.qualify(found)['pairs'] if set(r['planets'])=={'Saturn','Mars'})
        self.assertIn('Radda',row['adverse_modifiers']);self.assertIn('Duttota',row['supporting_modifiers'])
        self.assertEqual(row['status'],'radda_counteracted_by_duttota')
    def test_pdf352_manahoo_requires_conjunction(self):
        ll=sample(Moon=108,Jupiter=351,Saturn=109,Mars=5)
        sp=dict(zip(c.SEVEN,(1,13,.5,1.2,.08,1,.03)))
        r=ty.evaluate(ll,sp)['configurations']
        self.assertTrue(any(set(x['planets'][:2])=={'Moon','Jupiter'} for x in r['Manahoo']))
        ll['Saturn']=139
        r=ty.evaluate(ll,sp)['configurations']
        self.assertFalse(any(set(x['planets'][:2])=={'Moon','Jupiter'} for x in r['Manahoo']))
    def test_other_competing_modifiers_remain_for_review(self):
        r=self.configurations();pair={'planets':['Mars','Saturn']}
        r['Ithasala']=[pair];r['Manahoo']=[{**pair,'planets':['Mars','Saturn','Moon']}];r['Kamboola']=[pair]
        self.assertEqual(ty.qualify(r)['pairs'][0]['status'],'competing_modifiers_need_review')
    def test_motion_failure_is_not_overridden_by_positive_yoga(self):
        r=self.configurations();pair={'planets':['Mars','Jupiter']}
        r['Ithasala']=[pair];r['Kamboola']=[pair]
        out=ty.qualify(r,[{**pair,'status':'sign_change_before_detected_perfection'}])
        self.assertEqual(out['pairs'][0]['status'],'angular_perfection_not_established')
        self.assertIsNone(out['outcome_prediction'])

class ElectionCompletionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.chart=analysis.chart(SPEC,False)
    def review(self,task='house_entry',**kwargs):
        with patch('vedic_toolkit.analysis.chart',return_value=self.chart):return el.comprehensive(SPEC,task,**kwargs)
    def test_all_nine_tara_classes_and_wrap(self):
        for i in range(9):
            r=el.tara_assessment(F(40,3)*i+1,1)
            self.assertEqual(r['number'],i+1);self.assertEqual(r['good'],i+1 in (2,4,6,8,9))
        self.assertEqual(el.tara_assessment(1,350)['count_from_natal'],2)
    def test_janma_is_mixed_not_automatically_good(self):
        r=el.tara_assessment(1,1)
        self.assertFalse(r['good']);self.assertTrue(r['not_adverse']);self.assertEqual(r['classification'],'mixed')
    def test_pdf411_full_first_sun_dasa(self):
        for moon in (27,39): # both in Krittika; traversed fraction must not truncate it
            r=el.task_dasha(moon,360)
            self.assertEqual(r['periods'][0]['lord'],'Sun')
            self.assertEqual(r['periods'][0]['start_day'],0);self.assertEqual(r['periods'][0]['end_day'],18)
            self.assertEqual(r['periods'][-1]['end_day'],360)
    def test_compressed_nested_periods_partition_exactly(self):
        r=el.task_dasha(39,F(61,2),depth=2)
        for p in r['periods']:
            self.assertEqual(sum(x['duration_days'] for x in p['children']),p['duration_days'])
            self.assertEqual(p['children'][0]['start_day'],p['start_day'])
            self.assertEqual(p['children'][-1]['end_day'],p['end_day'])
    def test_uncompressed_retains_moon_balance(self):
        r=el.task_dasha(30)
        self.assertFalse(r['compressed']);self.assertLess(r['periods'][0]['start_day'],0)
    def test_invalid_task_duration_rejected(self):
        for v in (0,-1,float('nan'),float('inf')):
            with self.assertRaises(ValueError):el.task_dasha(30,v)
    def test_no_natal_or_eligibility_policy_yields_review(self):
        r=self.review(duration_days=360)
        for k in ('tara_good','natal_hora_favorable','yoga','karana','task_chart_strength_favorable','first_dasa_favorable'):self.assertIsNone(r['checks'][k])
        self.assertEqual(r['status'],'evidence_for_review');self.assertEqual(len(r['task_house_evidence']),8)
        delta=datetime.fromisoformat(r['task_dasha']['periods'][0]['start_local'])-datetime.fromisoformat(r['local_datetime'])
        self.assertLess(abs(delta.total_seconds()),.0001) # floating Julian-date round trip
    def test_explicit_yoga_karana_and_hora_decisions(self):
        p=self.chart['panchanga']
        r=self.review(natal_spec=SPEC,allowed_yogas=[p['yoga']],allowed_karanas=[p['karana']],natal_hora_judgments={p['hora_lord']:True})
        self.assertTrue(r['checks']['yoga']);self.assertTrue(r['checks']['karana']);self.assertTrue(r['checks']['natal_hora_favorable'])
        self.assertFalse(r['checks']['tara_good']) # same Moon produces mixed Janma
    def test_unprovided_table_row_is_not_invented(self):
        r=self.review('job_start')
        self.assertIsNone(r['table79']);self.assertIsNone(r['checks']['table79'])
        self.assertEqual({x['varga'] for x in r['task_house_evidence']},{1,10})
        d10=next(x for x in r['first_dasa_assessment'] if x['varga']==10)
        self.assertEqual(r['checks']['first_dasa_not_D10_eighth_lord'],not d10['owns_eighth'])
    def test_wedding_occupancy_is_evidence_not_automatic_veto(self):
        r=self.review('wedding')
        self.assertIsNotNone(r['wedding_seventh_house'])
        self.assertNotIn('seventh_house_empty',r['checks'])
    def test_invalid_policy_names_types_rejected(self):
        with self.assertRaises(ValueError):self.review(allowed_yogas='Siddha')
        with self.assertRaises(ValueError):self.review(natal_spec=SPEC,natal_hora_judgments={'Moon':'yes'})
    def test_final_qualitative_judgments_remain_attributed(self):
        r=self.review(task_strength_judgment=True,first_dasa_judgment=False)
        self.assertTrue(r['caller_judgments']['task_chart_strength_favorable'])
        self.assertFalse(r['all_declared_checks_met'])
        with self.assertRaises(ValueError):self.review(task_strength_judgment='strong')

class AuditAndCLITests(unittest.TestCase):
    def test_strength_audit_sums_and_physical_angle_ranges(self):
        ll,kw=raman_fixture();out=strengths.shadbala(ll,**kw)
        checks=arithmetic_checks(out);self.assertEqual(len(checks),51)
        self.assertTrue(all(x['passed'] for x in checks))
        out['planets']['Mars']['dig']=65
        self.assertTrue(any(not x['passed'] for x in arithmetic_checks(out)))
    def test_printed_arithmetic_mismatches_are_preserved(self):
        rows={x['planet']:x for x in printed_reference_audit()['rows']}
        self.assertEqual(rows['Sun']['sum_of_printed_components'],'424.94')
        self.assertEqual(rows['Mars']['difference_sum_minus_printed'],'3.00')
        self.assertEqual(rows['Jupiter']['difference_sum_minus_printed'],'0.06')
    def test_new_commands_and_explicit_moola_subperiod_rejection(self):
        with tempfile.TemporaryDirectory() as td:
            for i,args in enumerate((['dasha','--system','moola'],['election-review','--task','job_start','--duration-days','30'])):
                out=Path(td)/f'{i}.json'
                proc=subprocess.run([sys.executable,'-m','vedic_toolkit',args[0],str(ROOT/'examples/book_example_118.json'),*args[1:],'--output',str(out)],capture_output=True,text=True,cwd=ROOT)
                self.assertEqual(proc.returncode,0,proc.stderr)
                data=json.loads(out.read_text())
                if i==0:self.assertEqual(len(data['periods']),18);self.assertFalse(any('children' in p for p in data['periods']))
                else:self.assertEqual(data['status'],'evidence_for_review')
            proc=subprocess.run([sys.executable,'-m','vedic_toolkit','dasha',str(ROOT/'examples/book_example_118.json'),'--system','moola','--depth','1'],capture_output=True,text=True,cwd=ROOT)
            self.assertNotEqual(proc.returncode,0);self.assertIn('mahadasas only',proc.stderr)

if __name__=='__main__':unittest.main()
