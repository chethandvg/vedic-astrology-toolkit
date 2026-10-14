# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Consequential source corrections, uncertainty and validation leakage checks."""
import json
import math
from pathlib import Path
import subprocess
import sys
import unittest
from fractions import Fraction as F
from vedic_toolkit import core as c, yogas, strengths, moola, decision_rules as dr
from vedic_toolkit import cohort_validation as cv, interpretation
from tests.test_extensions import sample
from tests.test_completion import RATH_LL,RATH_ORDER

ROOT=Path(__file__).resolve().parents[1]
def rule(ll,name,**kw):return next(r for r in yogas.evaluate(ll,**kw)['rules'] if r['name']==name)

class SourceCorrections(unittest.TestCase):
    def test_maalaa_malefic_weakens_without_cancelling_pdf112(self):
        ll=sample(Asc=5,Jupiter=97,Venus=277,Mercury=187,Sun=5,Moon=220)
        r=rule(ll,'Maalaa')
        self.assertEqual(r['status'],'conditions_met');self.assertFalse(r['qualifications']['no_angular_malefic'])
    def test_sarpa_benefic_weakens_without_cancelling_pdf112(self):
        ll=sample(Asc=215,Mars=37,Rahu=127,Ketu=307,Jupiter=217)
        r=rule(ll,'Sarpa')
        self.assertEqual(r['status'],'conditions_met');self.assertFalse(r['qualifications']['no_angular_benefic'])
    def test_vasumati_presence_separate_from_full_results_pdf122(self):
        ll=sample(Asc=5,Sun=1,Moon=250,Mercury=65,Jupiter=155,Venus=275,Mars=70,Saturn=100,Rahu=190,Ketu=10)
        r=rule(ll,'Vasumati',mercury_policy='any_malefic')
        self.assertEqual(r['status'],'conditions_met');self.assertFalse(r['qualifications']['no_malefic_upachaya'])
        self.assertIsNone(r['qualifications']['benefics_strong'])
    def test_advanced_raaja_requires_aspect_not_conjunction_pdf127(self):
        ll=sample(Asc=5,Jupiter=10,Sun=25,Venus=14,Mercury=97,Moon=210,Mars=100,Saturn=150,Rahu=45,Ketu=225)
        self.assertEqual(rule(ll,'advanced_raaja_03')['status'],'conditions_not_met')
        ll['Venus']=195
        self.assertEqual(rule(ll,'advanced_raaja_03')['status'],'conditions_met')
    def test_unknown_ak_does_not_become_absent_pdf129(self):
        ll=sample(Asc=5,Sun=10,Moon=40,Mars=70,Mercury=100,Jupiter=130,Venus=160,Saturn=190,Rahu=230,Ketu=50)
        self.assertEqual(rule(ll,'raaja_sambandha_15')['status'],'conditions_pending')
    def test_gola_literal_precedence_conflict(self):
        for sign in range(12):
            ll=sample(**{p:sign*30+i+1 for i,p in enumerate(c.SEVEN)})
            r=rule(ll,'Gola')
            self.assertTrue(r['conditions']['distinct_sign_count'])
            self.assertFalse(r['conditions']['no_other_nabhasa'])
    def test_five_profile_incompatibilities_by_finite_enumeration(self):
        from audit_profile_conflicts import run
        self.assertTrue(all(r['proved_under_profile'] for r in run()['rules']))
    def test_mercury_majority_pdf34_35(self):
        ll=sample(Mercury=10,Jupiter=12,Venus=14,Sun=16,Moon=210,Mars=90,Saturn=150,Rahu=240,Ketu=60)
        a=strengths.benefic_classification(ll,mercury_policy='majority')
        self.assertIn('Mercury',a['benefics'])
        self.assertIn('Mercury',strengths.benefic_classification(ll)['malefics'])
    def test_mercury_equal_counts_remain_unknown(self):
        ll=sample(Mercury=10,Jupiter=12,Sun=16,Venus=80,Moon=210,Mars=90,Saturn=150,Rahu=240,Ketu=60)
        result=yogas.evaluate(ll)
        self.assertEqual(result['nature']['unknown'],['Mercury'])
        self.assertEqual(interpretation.review(ll,result)['status'],'pending_mercury_nature')
    def test_catalog_review_covers_all_rules_without_invented_strength(self):
        result=dr.catalog_review(yogas.evaluate(sample()))
        self.assertEqual(result['rule_count'],170)
        self.assertTrue(all(r['predictive_confidence'] is None for r in result['rules']))

class ExperimentalSubperiods(unittest.TestCase):
    def calc(self,**kw):return moola.calculate(RATH_LL,order_override=RATH_ORDER,subperiod_policy='experimental_cycle1_weights',**kw)
    def test_hand_computed_weights_use_83_not_120(self):
        r=self.calc(depth=1);child=r['periods'][0]['children']
        self.assertEqual(child[0]['duration_years'],F(100,83))
        self.assertEqual(child[2]['duration_years'],F(30,83))
        self.assertEqual(child[-1]['end_year'],10)
    def test_second_cycle_reuses_first_cycle_weights(self):
        child=self.calc(depth=1)['periods'][9]['children']
        self.assertEqual(child[0]['duration_years'],F(60,83))
        self.assertEqual(child[-1]['end_year'],89)
    def test_recursive_conservation_zero_parent_and_rotation(self):
        r=self.calc(depth=2)
        def check(parent):
            if 'children' not in parent:return
            kids=parent['children']
            self.assertEqual(kids[0]['lord'],parent['lord'])
            self.assertEqual(kids[0]['start_year'],parent['start_year'])
            self.assertEqual(kids[-1]['end_year'],parent['end_year'])
            self.assertEqual(sum(x['duration_years'] for x in kids),parent['duration_years'])
            for a,b in zip(kids,kids[1:]):self.assertEqual(a['end_year'],b['start_year'])
            for kid in kids:check(kid)
        for parent in r['periods']:check(parent)
        self.assertTrue(all(x['duration_years']==0 for x in r['periods'][10]['children']))
    def test_experimental_provenance_and_strict_default(self):
        r=self.calc(depth=1)
        self.assertFalse(r['subperiod_provenance']['traditional_authority_verified'])
        with self.assertRaises(ValueError):moola.calculate(RATH_LL,depth=1,order_override=RATH_ORDER)
    def test_bad_policy_and_depth_rejected(self):
        with self.assertRaises(ValueError):self.calc(depth=4)
        with self.assertRaises(ValueError):self.calc(depth=-1)
        with self.assertRaises(ValueError):moola.calculate(RATH_LL,subperiod_policy='invented')

class DecisionPolicy(unittest.TestCase):
    def evidence(self):return [{'id':'a','polarity':'supportive','met':True,'source':'declared test hypothesis'},
        {'id':'b','polarity':'adverse','met':True,'source':'declared test hypothesis'}]
    def call(self,e,**kw):return dr.resolve(e,topic='test topic',window='declared window',**kw)
    def test_contradictory_evidence_stays_mixed(self):
        r=self.call(self.evidence());self.assertEqual(r['classification'],'mixed');self.assertTrue(r['needs_review'])
        self.assertIsNone(r['probability'])
    def test_only_explicit_sourced_override_suppresses(self):
        r=self.call(self.evidence(),overrides=[{'by':'a','target':'b','source':'explicit test policy'}])
        self.assertEqual(r['classification'],'supportive');self.assertEqual(r['suppressed'],{'b':['a']})
    def test_pending_override_never_suppresses(self):
        e=self.evidence();e[0]['met']=None
        r=self.call(e,overrides=[{'by':'a','target':'b','source':'test policy'}])
        self.assertEqual(r['classification'],'adverse');self.assertTrue(r['needs_review']);self.assertEqual(r['suppressed'],{})
    def test_cycles_and_unsourced_overrides_rejected(self):
        with self.assertRaises(ValueError):self.call(self.evidence(),overrides=[{'by':'a','target':'b'}])
        with self.assertRaises(ValueError):self.call(self.evidence(),overrides=[{'by':'a','target':'b','source':'x'},{'by':'b','target':'a','source':'x'}])
    def test_suppressed_exception_cannot_suppress_another_rule(self):
        e=self.evidence()+[{'id':'c','polarity':'adverse','met':True,'source':'x'}]
        r=self.call(e,overrides=[{'by':'a','target':'b','source':'x'},{'by':'b','target':'c','source':'x'}])
        self.assertEqual(r['classification'],'mixed');self.assertNotIn('c',r['suppressed'])
    def test_invalid_truth_and_duplicate_ids_rejected(self):
        e=self.evidence();e[0]['met']=1
        with self.assertRaises(ValueError):self.call(e)
        with self.assertRaises(ValueError):self.call(self.evidence()*2)

class CohortScoring(unittest.TestCase):
    def rows(self):return [
        {'id':'t1','person_id':'t1','split':'train','outcome':0,'probability':.5},
        {'id':'t2','person_id':'t2','split':'train','outcome':1,'probability':.5},
        {'id':'h1','person_id':'h1','split':'holdout','outcome':1,'probability':.8},
        {'id':'h2','person_id':'h2','split':'holdout','outcome':0,'probability':.2}]
    def test_hand_computed_brier_and_fixed_training_baseline(self):
        r=cv.evaluate(self.rows(),bootstrap_replicates=100)
        self.assertAlmostEqual(r['brier_score'],.04);self.assertEqual(r['baseline_brier_score'],.25)
        self.assertAlmostEqual(r['brier_skill_score'],.84)
        self.assertFalse(r['predictive_validity_established'])
    def test_holdout_labels_do_not_set_baseline(self):
        rows=self.rows();rows[-1]['outcome']=1
        self.assertEqual(cv.evaluate(rows,bootstrap_replicates=100)['baseline_probability_from_training'],.5)
    def test_same_person_cannot_leak_across_splits(self):
        rows=self.rows();rows[-1]['person_id']='t1'
        with self.assertRaises(ValueError):cv.evaluate(rows)
    def test_repeated_windows_have_equal_person_weight(self):
        rows=self.rows();rows.append({**rows[-1],'id':'h3','probability':1.0})
        r=cv.evaluate(rows,bootstrap_replicates=100)
        self.assertAlmostEqual(r['brier_score'],.28);self.assertEqual(r['holdout_people'],2)
    def test_missing_outcome_invalid_probability_and_duplicates_rejected(self):
        for key,value in [('outcome',None),('probability',math.nan),('id','t1')]:
            rows=self.rows();rows[-1][key]=value
            with self.assertRaises(ValueError):cv.evaluate(rows)
    def test_zero_baseline_skill_is_undefined(self):
        rows=self.rows()
        for row in rows:row['outcome']=0
        self.assertIsNone(cv.evaluate(rows,bootstrap_replicates=100)['brier_skill_score'])
    def test_sample_size_declares_assumptions(self):
        r=cv.sample_size(.1,.2)
        self.assertEqual(r['approximate_independent_people'],32);self.assertFalse(r['guaranteed_power'])
    def test_cli_examples(self):
        for command,name in [('decide','interpretation_conflict_demo.json'),('evaluate-cohort','synthetic_cohort_demo.json')]:
            p=subprocess.run([sys.executable,'-m','vedic_toolkit',command,str(ROOT/'examples'/name)],cwd=ROOT,capture_output=True,text=True)
            self.assertEqual(p.returncode,0,p.stderr);self.assertIsInstance(json.loads(p.stdout),dict)

if __name__=='__main__':unittest.main()
