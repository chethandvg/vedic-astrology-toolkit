# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Regenerate non-personal examples from Rao's Example 118, plus a sign-only Moola fixture."""
from pathlib import Path
import json
from vedic_toolkit import analysis, moola, electional, decision_rules, cohort_validation
from vedic_toolkit.astronomy import dated

ROOT=Path(__file__).resolve().parent

def save(name,data):
    path=ROOT/'examples'/name
    path.write_text(json.dumps(analysis.clean(data),indent=2,allow_nan=False)+'\n')
    print(path.name)

if __name__=='__main__':
    spec=json.loads((ROOT/'examples/book_example_118.json').read_text())
    chart=analysis.chart(spec)
    save('book_example_118_chart.json',chart)
    annual=analysis.solar_return(spec,33)
    save('book_example_118_annual_2000.json',annual)
    dt,jd,lat,lon,eph=analysis.load_birth(spec)
    ll={p:r['longitude'] for p,r in chart['positions'].items()}
    result=moola.calculate(ll);pp=result.pop('periods')
    result.update(year_model='solar_arc',calendar_year_convention='Project choice, not specified by the Rath article',
                  periods=dated(pp,jd,eph,'solar_arc',dt.tzinfo))
    save('book_example_118_moola.json',result)
    # The same book instant is used only to demonstrate the interface.
    # It is not a recommended election or a real event for the native.
    example=electional.comprehensive(spec,'house_entry',natal_spec=spec,duration_days=360)
    example['example_status']='Format demonstration using the book chart as both natal and task input; not a recommendation'
    save('election_review_demo.json',example)
    signs={'Asc':3,'Sun':0,'Moon':3,'Mars':9,'Mercury':1,'Jupiter':3,'Venus':11,'Saturn':6,'Rahu':8,'Ketu':2}
    order=['Jupiter','Moon','Mars','Saturn','Sun','Venus','Rahu','Ketu','Mercury']
    fixture=moola.calculate({p:s*30 for p,s in signs.items()},order_override=order)
    fixture['fixture_scope']='Traditional illustrative chart: source signs and explicitly printed sequence only. Zero degrees are placeholders, not reported birth positions or historical evidence.'
    fixture['published_durations']=[10,10,3,14,1,12,17,3,13]
    save('moola_rath_1999_fixture.json',fixture)
    experimental=moola.calculate({p:s*30 for p,s in signs.items()},order_override=order,
        depth=1,subperiod_policy='experimental_cycle1_weights')
    experimental['fixture_scope']='Synthetic extension of the sign/order fixture. The subperiods are an experimental software convention, not a published Rath worked example.'
    save('moola_experimental_subperiods.json',experimental)
    save('book_example_118_moola_experimental_input.json',{**spec,
        'moola_options':{'subperiod_policy':'experimental_cycle1_weights'}})
    decision=json.loads((ROOT/'examples/interpretation_conflict_demo.json').read_text())
    save('interpretation_conflict_result.json',decision_rules.resolve(**decision))
    cohort=json.loads((ROOT/'examples/synthetic_cohort_demo.json').read_text())
    scored=cohort_validation.evaluate(**cohort)
    scored['example_status']='Entirely invented software-test observations; this is NOT an astrology experiment.'
    save('synthetic_cohort_result.json',scored)
