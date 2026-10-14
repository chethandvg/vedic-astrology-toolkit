"""Parasara variant in Tables 19-26, PDF 134-138 (visually transcribed).
SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
SPDX-License-Identifier: AGPL-3.0-or-later
Additional terms under AGPL section 7 apply; see NOTICE.
"""
from .core import SEVEN, advance, within, sign

REFERENCES=SEVEN+('Asc',)
# Rows: relative houses 1..12. Columns: Sun Moon Mars Mercury Jupiter Venus Saturn Asc.
ROWS={
 'Sun':('10100010','10100010','01010001','10100011','00011000','01011101','10100110','10100010','10111010','11110011','11111011','00010101'),
 'Moon':('01011000','00101000','11110111','00011100','00110110','11100011','11011100','10011000','01000100','11111101','11111111','00000000'),
 'Mars':('00100011','00100000','11010001','00100010','10010000','11011101','00100010','00100110','00000010','10101011','11111111','00001100'),
 'Mercury':('00110111','01100111','00010100','01100111','10010100','11011001','00100010','01101111','10110110','01110011','11111111','10011000'),
 'Jupiter':('10111001','11111101','10001010','10111001','01010111','00010111','11101001','10101000','11010101','10111101','11111101','00000010'),
 'Venus':('01000101','01000101','01110111','01100111','01011111','00110000','00000000','11001111','01111111','00001110','11111111','11100000'),
 'Saturn':('10000001','10000000','01100011','10000001','00101010','01111111','10000000','10010000','00010000','10110001','11111111','00111100'),
 'Asc':('00111110','00011100','11100111','10011110','00001100','11111011','00001000','00010100','00001100','11111011','11111011','11000000')}
RASI_MULTIPLIERS=(7,10,8,4,10,6,7,8,9,5,11,12)
GRAHA_MULTIPLIERS=dict(zip(SEVEN,(5,5,8,5,10,7,5)))

def prastara(planet,signs):
    """One array per reference, absolute signs Aries..Pisces; 1=benefic rekha."""
    out={}
    for j,ref in enumerate(REFERENCES):
        out[ref]=[0]*12
        for h,row in enumerate(ROWS[planet],1):out[ref][advance(signs[ref],h)]=int(row[j])
    return out

def bhinna(planet,signs):
    a=prastara(planet,signs)
    return [sum(a[p][s] for p in REFERENCES) for s in range(12)]

def trikona(values):
    if len(values)!=12:raise ValueError('12 values required')
    out=list(values)
    for i in range(4):
        m=min(values[j] for j in (i,i+4,i+8))
        for j in (i,i+4,i+8):out[j]-=m
    return out

def ekadhipatya(values,occupied,profile='pvr_2001',equal_one_occupied='zero'):
    """Named alternatives: PVR p145 uses the occupied number as replacement;
    BPHS ch68 translation subtracts it. Equal full/empty is zero in BPHS.
    The old unresolved behavior remains available as 'unchanged', never hidden.
    """
    if profile not in ('pvr_2001','bphs_translation'):raise ValueError('Unknown reduction profile')
    if equal_one_occupied not in ('zero','unchanged'):raise ValueError('Unknown equality rule')
    if len(values)!=12 or any(x<0 for x in values):raise ValueError('Twelve nonnegative values required')
    out=list(values);occupied=set(occupied)
    for a,b in ((0,7),(1,6),(2,5),(8,11),(9,10)):
        if min(out[a],out[b])==0 or (a in occupied and b in occupied):continue
        if a not in occupied and b not in occupied:
            if out[a]==out[b]:out[a]=out[b]=0
            else:out[a]=out[b]=min(out[a],out[b])
        else:
            empty,full=(a,b) if a not in occupied else (b,a)
            if out[empty]<out[full]:out[empty]=0
            elif out[empty]>out[full]:out[empty]=out[full] if profile=='pvr_2001' else out[empty]-out[full]
            elif equal_one_occupied=='zero':out[empty]=0
    return out

def pindas(reduced,signs):
    r=sum(x*m for x,m in zip(reduced,RASI_MULTIPLIERS))
    g=sum(reduced[signs[p]]*GRAHA_MULTIPLIERS[p] for p in SEVEN)
    return {'rasi':r,'graha':g,'sodhya':r+g}

def calculate(signs,profile='pvr_2001',include_nodes=False,equal_one_occupied='zero'):
    bav={p:bhinna(p,signs) for p in REFERENCES}
    # Sun..Saturn contribute to SAV. Rahu/Ketu and lagna do not.
    sav=[sum(bav[p][i] for p in SEVEN) for i in range(12)]
    occupied={signs[p] for p in SEVEN}
    if include_nodes:occupied.update(signs[p] for p in ('Rahu','Ketu'))
    so={p:ekadhipatya(trikona(bav[p]),occupied,profile,equal_one_occupied) for p in SEVEN}
    return {'variant':'book_Parasara','BAV':bav,'SAV':sav,'SoAV':so,
            'reduction_profile':profile,'include_nodes_in_occupancy':include_nodes,
            'equal_one_occupied':equal_one_occupied,
            'pindas':{p:pindas(so[p],signs) for p in SEVEN}}

def kakshya(longitude):
    """Eight 3d45m portions, PDF 299-300; return the reference to use in PAV."""
    return ('Saturn','Jupiter','Mars','Sun','Venus','Mercury','Moon','Asc')[int(within(longitude)*8//30)]

def transit_support(planet,longitude,natal_signs):
    p=prastara(planet,natal_signs);s=sign(longitude);k=kakshya(longitude)
    return {'BAV_points':sum(v[s] for v in p.values()),'kakshya_lord':k,
            'kakshya_benefic':bool(p[k][s]),'supporting_references':[ref for ref,v in p.items() if v[s]]}
