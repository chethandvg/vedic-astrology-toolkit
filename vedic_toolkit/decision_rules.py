"""Explicit, unweighted interpretation policy with retained conflicts.

This is a project decision convention, not a classical formula or probability.
Evidence must concern the same declared topic and time window. Rule identifiers
are caller-selected; source citations and overrides are retained for review.
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""

def resolve(evidence, *, topic, window, overrides=()):
    """Evidence: id, polarity (supportive/adverse), met (bool/None), source.
    Override: by, target, source. Only a definitely met overriding rule suppresses
    its target. Unknown overrides leave a review flag. Cycles are rejected.
    No vote-counting: one adverse and ten supportive rules still mean mixed.
    """
    if not isinstance(topic,str) or not topic.strip() or not isinstance(window,str) or not window.strip():
        raise ValueError('A nonempty topic and window are required')
    rows=[dict(r) for r in evidence]
    if any(not isinstance(r.get('id'),str) or not r['id'] for r in rows):
        raise ValueError('Each evidence row needs an ID')
    byid={r['id']:r for r in rows}
    if len(byid)!=len(rows):raise ValueError('Duplicate evidence IDs')
    for row in rows:
        if row.get('polarity') not in ('supportive','adverse'):raise ValueError('Invalid polarity')
        if 'met' not in row:raise ValueError('met must be explicitly supplied, including None for unknown')
        if row.get('met') is not None and type(row['met']) is not bool:raise ValueError('met must be Boolean or None')
        if not row.get('source'):raise ValueError('Evidence source required')
    graph={k:[] for k in byid}; edges=list(overrides)
    for edge in edges:
        if edge.get('by') not in byid or edge.get('target') not in byid or not edge.get('source'):
            raise ValueError('Override needs existing IDs and a source')
        graph[edge['by']].append(edge['target'])
    visited=set(); visiting=set(); order=[]
    def visit(k):
        if k in visiting:raise ValueError('Cyclic overrides are not permitted')
        if k in visited:return
        visiting.add(k)
        for target in graph[k]:visit(target)
        visiting.remove(k);visited.add(k);order.append(k)
    for k in byid:visit(k)
    suppressed={};pending_overrides=[]
    # A suppressed exception cannot itself suppress another rule.
    for k in reversed(order):
        if k in suppressed:continue
        for target in graph[k]:
            if byid[k]['met'] is True:suppressed.setdefault(target,[]).append(k)
            elif byid[k]['met'] is None:pending_overrides.append({'by':k,'target':target})
    active=[r for r in rows if r['met'] is True and r['id'] not in suppressed]
    signs={r['polarity'] for r in active}
    classification='mixed' if len(signs)==2 else next(iter(signs)) if signs else 'no_active_evidence'
    pending=[r['id'] for r in rows if r['met'] is None and r['id'] not in suppressed]
    return {'policy':'retain_conflicts_v1','topic':topic,'window':window,'classification':classification,
        'active_evidence':active,'suppressed':suppressed,'pending_evidence':pending,
        'pending_overrides':pending_overrides,'needs_review':bool(pending or pending_overrides or len(signs)==2),
        'evidence':rows,'overrides':edges,'probability':None,
        'meaning':'Traditional evidence classification under a declared project policy; no event forecast or calibrated confidence follows.'}

def catalog_review(catalog):
    """A review row for every catalog rule; missing qualification stays visible."""
    result=[]
    for row in catalog['rules']:
        q=row.get('qualifications',{})
        failed=[k for k,v in q.items() if v is False]
        unknown=[k for k,v in q.items() if v is None]
        result.append({'name':row['name'],'source_pdf_page':row['pdf_page'],
            'structural_status':row['status'],'weakening_factors':failed,
            'pending_qualifications':unknown,
            'qualification_model':'explicit_rule_qualifications' if q else 'not_complete',
            'review_status':'not_present' if row['status']=='conditions_not_met' else
                'pending' if row['status']=='conditions_pending' or unknown else
                'present_with_weakening' if failed else 'present_requires_interpretation',
            'predictive_confidence':None})
    return {'policy':'structure_before_qualification_v1','rules':result,
        'rule_count':len(result),'scope':'Every rule is inventoried; full participant qualification is not implied.'}
