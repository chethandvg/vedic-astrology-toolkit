# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
import json
from pathlib import Path
import tempfile
import subprocess
import sys
import unittest
from vedic_toolkit import analysis as a, core as c, dashas as d

ROOT=Path(__file__).resolve().parents[1]
SPEC=json.loads((ROOT/'examples/book_example_118.json').read_text())

class Integration(unittest.TestCase):
    def test_chart_contains_all_divisions_and_points(self):
        out=a.chart(SPEC)
        self.assertEqual(len(out['divisional_charts']),20)
        self.assertEqual(len(out['derived_points']),15) # eleven upagrahas plus four lagnas
        self.assertEqual(len(out['sahams']),36)
        self.assertEqual(sum(out['ashtakavarga']['SAV']),337)
        self.assertEqual(out['warnings'],[])
    def test_narayana_same_sign_colords_are_numerically_equivalent(self):
        dt,jd,lat,lon,eph=a.load_birth(SPEC);ll={p:v['longitude'] for p,v in eph.positions(jd,lat,lon).items()}
        out=d.rasi_dasa('narayana',c.division(ll,1),ll)
        self.assertEqual(len(out['periods']),12);self.assertTrue(all(len(p['children'])==12 for p in out['periods']))
    def test_sensitivity_samples_both_ends_and_center(self):
        out=a.sensitivity(SPEC,minutes=1,step_seconds=40)
        self.assertEqual([x['offset_seconds'] for x in out['samples']],[-60,-20,0,20,60])
        self.assertEqual(out['sample_count'],5)
    def test_all_cli_commands_write_parseable_json(self):
        with tempfile.TemporaryDirectory() as td:
            commands=[['chart'],['dasha'],['dasha','--system','narayana'],['return','--years','33'],
              ['transits','--at','2000-03-08T04:41:21+05:30','--varga','10'],['sensitivity','--minutes','1']]
            for i,args in enumerate(commands):
                with self.subTest(command=args):
                    out=Path(td)/f'output_{i}.json'
                    process=subprocess.run([sys.executable,'-m','vedic_toolkit',args[0],str(ROOT/'examples/book_example_118.json'),*args[1:],'--output',str(out)],cwd=ROOT,capture_output=True,text=True)
                    self.assertEqual(process.returncode,0,process.stderr);self.assertIsInstance(json.loads(out.read_text()),dict)
    def test_bad_input_cli_fails_without_output(self):
        with tempfile.TemporaryDirectory() as td:
            src=Path(td)/'bad.json';src.write_text(json.dumps({**SPEC,'latitude':100}));out=Path(td)/'result.json'
            process=subprocess.run([sys.executable,'-m','vedic_toolkit','chart',str(src),'--output',str(out)],cwd=ROOT,capture_output=True,text=True)
            self.assertNotEqual(process.returncode,0);self.assertFalse(out.exists());self.assertIn('Latitude',process.stderr)
    def test_new_cli_workflows_preserve_evidence_and_limits(self):
        # Synthetic events exercise the interface; they are not this person's history.
        with tempfile.TemporaryDirectory() as td:
            td=Path(td);evidence=td/'evidence.json';predictions=td/'predictions.json'
            evidence.write_text(json.dumps({'rules':[{'id':'r1','event_type':'test','varga':9,'activated_houses':[1,5,9]}],
                'events':[{'id':'e1','type':'test','datetime':'2000-03-01T00:00:00+05:30','split':'train'}]}))
            predictions.write_text(json.dumps({'baseline_probability':.5,'observations':{'p1':1},'predictions':[
                {'id':'p1','probability':.8,'registered_at':'2020-01-01T00:00:00Z',
                 'window_start':'2020-02-01T00:00:00Z','window_end':'2020-03-01T00:00:00Z'}]}))
            birth=str(ROOT/'examples/book_example_118.json')
            commands=[['strengths',birth],['yogas',birth],['election',birth,'--task','house_entry',
                '--start','2000-03-08T06:00:00+05:30','--end','2000-03-08T06:10:00+05:30'],
                ['rectify',birth,'--evidence',str(evidence),'--minutes','1','--step-seconds','60'],
                ['evaluate',str(predictions)]]
            results=[]
            for i,args in enumerate(commands):
                with self.subTest(command=args[0]):
                    target=td/f'result_{i}.json'
                    run=subprocess.run([sys.executable,'-m','vedic_toolkit',*args,'--output',str(target)],
                        cwd=ROOT,capture_output=True,text=True)
                    self.assertEqual(run.returncode,0,run.stderr);results.append(json.loads(target.read_text()))
            self.assertEqual(len(results[0]['shadbala']['planets']),7)
            self.assertEqual(len(results[1]['rules']),170)
            self.assertEqual(results[2]['samples_checked'],2)
            self.assertEqual(len(results[3]['candidates']),3)
            self.assertFalse(results[3]['holdout_used_for_ranking'])
            self.assertAlmostEqual(results[4]['brier_score'],.04)

if __name__=='__main__':unittest.main()
