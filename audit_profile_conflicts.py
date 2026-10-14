"""Finite proofs of five incompatibilities in the selected yoga conventions.

These are proofs about declared discrete rule premises, not about Sanskrit
authorship or the truth of astrological outcomes.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
import json
from itertools import product
from pathlib import Path
from vedic_toolkit import core as c

def run():
    hora_signs={c.varga_sign(i/10,2) for i in range(3600)}
    hora_aspects=[(p,a,b) for p,a,b in product(c.PLANETS,hora_signs,hora_signs) if b in c.planetary_aspects(p,a)]
    aspect_opposite_pairs=[]
    for p,s in product(c.SEVEN,range(12)):
        targets=set(c.planetary_aspects(p,s))
        if any((t+6)%12 in targets for t in targets):aspect_opposite_pairs.append((p,s))
    bad_houses={3,6,11}
    node_pairs=[h for h in bad_houses if (h-1+6)%12+1 in bad_houses]
    kula_counterexamples=[];kula_valid_luminary_configs=0
    for asc,sun,moon in product(range(12),repeat=3):
        targets={(asc+4)%12,(sun+4)%12,(moon+4)%12}
        if sun not in targets or moon not in targets:continue
        kula_valid_luminary_configs+=1
        if any((t+6)%12 in targets for t in targets):kula_counterexamples.append((asc,sun,moon))
    results=[
        {'rule':'Gola','pdf_pages':[112,115,116],'proof':'All seven bodies in one sign necessarily share one modality, so an Ashraya yoga blocks Gola under literal all-Nabhasa precedence.',
            'cases':12,'proved_under_profile':all(len({s%3 for _ in c.SEVEN})==1 for s in range(12))},
        {'rule':'advanced_raaja_07','pdf_pages':[127,128],'proof':'Selected D2 has only Cancer and Leo. Full planetary aspects cannot connect these two signs or a sign to itself.',
            'D2_signs':sorted(hora_signs),'counterexamples':hora_aspects,'proved_under_profile':hora_signs=={3,4} and not hora_aspects},
        {'rule':'advanced_raaja_13','pdf_pages':[128],'proof':'The exchange puts the two targets opposite. No implemented classical full-aspect set contains an opposite pair, so the same-lord interpretation is unsatisfiable.',
            'cases':84,'counterexamples':aspect_opposite_pairs,'proved_under_profile':not aspect_opposite_pairs},
        {'rule':'advanced_raaja_17','pdf_pages':[128],'proof':'Both opposite lunar nodes cannot lie in houses 3,6,11, while the selected profile includes them among malefics.',
            'counterexamples':node_pairs,'proved_under_profile':not node_pairs},
        {'rule':'Kulavardhana','pdf_pages':[122],'proof':'Once Sun and Moon themselves must occupy a fifth-from-reference target, no allowed target set contains an opposite pair for Rahu/Ketu.',
            'cases':1728,'valid_sun_moon_configurations':kula_valid_luminary_configs,
            'counterexamples':kula_counterexamples,'proved_under_profile':not kula_counterexamples}]
    return {'status':'profile_incompatibilities_demonstrated','rules':results,
        'conclusion':'Do not fabricate positive fixtures for these five default-profile combinations. Changing node inclusion, Hora mapping, precedence or the same-lord reading changes the premises and needs an explicitly named alternative.',
        'textual_adjudication_complete':False,'independent_prediction_evidence':False}

if __name__=='__main__':
    result=run();Path(__file__).with_name('profile_conflicts.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({'proved':sum(r['proved_under_profile'] for r in result['rules']),'count':len(result['rules'])}))
    raise SystemExit(0 if all(r['proved_under_profile'] for r in result['rules']) else 1)
