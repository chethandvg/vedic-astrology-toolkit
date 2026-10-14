# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Run verification and write a machine-readable report; exits nonzero on failure."""
from pathlib import Path
import unittest
import json
import platform
from datetime import datetime,timezone
import sys
from importlib.metadata import version

class Recorded(unittest.TextTestResult):
    def startTest(self,test):super().startTest(test);self.records=getattr(self,'records',[])
    def addSuccess(self,test):super().addSuccess(test);self.records.append({'test':test.id(),'status':'pass'})
    def addFailure(self,test,err):super().addFailure(test,err);self.records.append({'test':test.id(),'status':'fail','detail':self._exc_info_to_string(err,test)})
    def addError(self,test,err):super().addError(test,err);self.records.append({'test':test.id(),'status':'error','detail':self._exc_info_to_string(err,test)})
    def addSubTest(self,test,subtest,err):
        super().addSubTest(test,subtest,err)
        if err:self.records.append({'test':str(subtest),'status':'fail','detail':self._exc_info_to_string(err,test)})

if __name__=='__main__':
    root=Path(__file__).resolve().parent
    suite=unittest.defaultTestLoader.discover(str(root/'tests'),top_level_dir=str(root))
    result=unittest.TextTestRunner(verbosity=2,resultclass=Recorded).run(suite)
    import swisseph
    report={'generated_utc':datetime.now(timezone.utc).isoformat(),'python':platform.python_version(),
      'pyswisseph':version('pyswisseph'),'swisseph':swisseph.version,'tests_run':result.testsRun,
      'failures':len(result.failures),'errors':len(result.errors),'successful':result.wasSuccessful(),
      'tests':result.records,'scope':'Arithmetic/book fixtures, boundaries, timezone, astronomy, and CLI integration. Not validation of predictive claims.'}
    target=root/'verification_results.json';target.write_text(json.dumps(report,indent=2)+'\n')
    print(f'Verification report: {target}')
    sys.exit(0 if result.wasSuccessful() else 1)
