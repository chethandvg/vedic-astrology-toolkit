# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Command-line interface; run python -m vedic_toolkit --help."""
import argparse
import json
import sys
from pathlib import Path
from . import analysis as a, core as c, dashas as d, electional, validation, moola, decision_rules, cohort_validation
from .astronomy import dated

def main():
    parser=argparse.ArgumentParser(description='Auditable calculations for the supplied P.V.R. Narasimha Rao textbook.')
    sub=parser.add_subparsers(dest='command',required=True)
    for name in ('chart','dasha','return','transits','sensitivity','strengths','yogas','election','rectify','evaluate','election-review','decide','evaluate-cohort'):
        p=sub.add_parser(name);p.add_argument('input',type=Path,help='JSON input for this command (see INPUT_FORMATS.md)')
        p.add_argument('--output',type=Path,help='Write JSON here; otherwise print to stdout')
        if name=='dasha':
            p.add_argument('--system',choices=('vimsottari','ashtottari','kalachakra','moola','narayana','kendradi','sudasa','drig','niryana_shoola','shoola','sudarsana'),default='vimsottari')
            p.add_argument('--depth',type=int,default=None,help='0=MD, 1=MD+AD, 2=MD+AD+PD')
            p.add_argument('--year-model',choices=('savana360','365.2425','solar_arc'),help='Default follows the book for this system')
            p.add_argument('--varga',type=int,default=1);p.add_argument('--seed',choices=c.SIGNS)
            p.add_argument('--nakshatra-start',type=int,choices=(1,4,5,8),default=1)
            p.add_argument('--exception-precedence',choices=('Saturn','Ketu'))
            p.add_argument('--subperiod-policy',choices=('strict','narayana_extension'),default='strict')
        elif name=='return':
            p.add_argument('--years',type=int,required=True);p.add_argument('--month',type=int,default=0);p.add_argument('--submonth',type=int,default=0)
        elif name=='transits':p.add_argument('--at',required=True);p.add_argument('--varga',type=int,default=1)
        elif name=='sensitivity':p.add_argument('--minutes',type=float,default=5);p.add_argument('--step-seconds',type=int,default=30)
        elif name=='election':
            p.add_argument('--task',choices=tuple(electional.GUIDELINES),required=True)
            p.add_argument('--start',required=True);p.add_argument('--end',required=True)
            p.add_argument('--step-minutes',type=int,default=5);p.add_argument('--include-optional',action='store_true')
        elif name=='election-review':
            p.add_argument('--task',choices=tuple(sorted(set(electional.GUIDELINES)|set(electional.TASK_CONTEXT))),required=True)
            p.add_argument('--natal',type=Path);p.add_argument('--duration-days',type=float)
            p.add_argument('--include-optional',action='store_true')
        elif name=='rectify':
            p.add_argument('--evidence',type=Path,required=True,help='JSON with events and predeclared rules')
            p.add_argument('--minutes',type=float,default=10);p.add_argument('--step-seconds',type=int,default=30)
    args=parser.parse_args()
    try:
        spec=json.loads(args.input.read_text())
        if args.command=='dasha' and args.depth is None:args.depth=0 if args.system=='moola' else 1
        if args.command=='chart':result=a.chart(spec)
        elif args.command=='decide':result=decision_rules.resolve(**spec)
        elif args.command=='evaluate-cohort':result=cohort_validation.evaluate(**spec)
        elif args.command=='strengths':
            chart=a.chart(spec,False);result={k:chart[k] for k in ('shadbala','vimsopaka','dignities','combustion','avasthas')}
        elif args.command=='yogas':
            calculated=a.chart(spec,False);result={**calculated['yogas'],'review':calculated['yoga_review']}
        elif args.command=='election':result=electional.search(spec,args.task,args.start,args.end,args.step_minutes,args.include_optional)
        elif args.command=='election-review':
            natal=json.loads(args.natal.read_text()) if args.natal else None
            result=electional.comprehensive(spec,args.task,natal,args.duration_days,args.include_optional,**spec.get('electional_options',{}))
        elif args.command=='rectify':
            evidence=json.loads(args.evidence.read_text());result=validation.rectify(spec,evidence['events'],evidence['rules'],args.minutes,args.step_seconds)
        elif args.command=='evaluate':result=validation.evaluate_predictions(spec['predictions'],spec['observations'],spec['baseline_probability'])
        elif args.command=='return':result=a.solar_return(spec,args.years,args.month,args.submonth)
        elif args.command=='transits':result=a.transits(spec,args.at,args.varga)
        elif args.command=='sensitivity':result=a.sensitivity(spec,args.minutes,args.step_seconds)
        else:
            dt,jd,lat,lon,eph=a.load_birth(spec);ll={p:v['longitude'] for p,v in eph.positions(jd,lat,lon).items()}
            info={};nak_system=args.system in ('vimsottari','ashtottari','kalachakra')
            model=args.year_model or ('savana360' if nak_system else 'solar_arc')
            if args.system=='vimsottari':pp=d.vimsottari(ll['Moon'],args.nakshatra_start,depth=args.depth)
            elif args.system=='ashtottari':pp=d.ashtottari(ll['Moon'],depth=args.depth)
            elif args.system=='kalachakra':info=d.kalachakra(ll['Moon'],depth=args.depth);pp=info.pop('periods')
            elif args.system=='moola':
                if args.varga!=1:raise ValueError('The published Rath Moola profile is D1; no unlabelled divisional extension')
                info=moola.calculate(ll,depth=args.depth,exception_precedence=args.exception_precedence,**spec.get('moola_options',{}));pp=info.pop('periods')
                info['calendar_year_convention']='Caller-selected or project default; the 1999 article does not specify civil-year conversion.'
            elif args.system=='sudarsana':pp=d.sudarsana(c.sign(ll['Asc']),depth=args.depth);info['reference']='Asc'
            else:
                options={'depth':args.depth,'colord_overrides':spec.get('colord_overrides'),
                    'subperiod_policy':args.subperiod_policy,
                    'exception_precedence':args.exception_precedence,'ad_seeds':{k:c.SIGNS.index(v) for k,v in spec.get('ad_seeds',{}).items()}}
                if args.seed:options['seed']=c.SIGNS.index(args.seed)
                if args.system=='narayana' and args.varga!=1:
                    if args.seed:raise ValueError('Varga Narayana derives its seed; omit --seed')
                    info=d.divisional_narayana(ll,args.varga,**options)
                else:
                    if args.varga!=1:raise ValueError('Varga option is currently for Narayana only')
                    if args.system=='sudasa':options['sree_lagna']=(c.norm(ll['Asc'])+(c.norm(ll['Moon'])%c.Fraction(40,3))*27)%360
                    info=d.rasi_dasa(args.system,c.division(ll,1),ll,**options)
                pp=info.pop('periods')
            result={**info,'system':args.system,'year_model':model,'calculation_settings':eph.metadata(),
                    'periods':dated(pp,jd,eph,model,dt.tzinfo)}
        content=json.dumps(a.clean(result),indent=2,allow_nan=False)+'\n'
        if args.output:
            args.output.parent.mkdir(parents=True,exist_ok=True)
            tmp=args.output.with_suffix(args.output.suffix+'.tmp');tmp.write_text(content);tmp.replace(args.output)
            print(str(args.output.resolve()),file=sys.stderr)
        else:print(content,end='')
    except (ValueError,KeyError,RuntimeError,OSError) as e:
        parser.exit(2,f'Calculation stopped: {e}\n')

if __name__=='__main__':main()
