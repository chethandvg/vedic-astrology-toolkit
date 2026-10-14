# SPDX-FileCopyrightText: 2026 Chethan (chethandvg)
# SPDX-License-Identifier: AGPL-3.0-or-later
# Additional terms under AGPL section 7 apply; see NOTICE.
"""Index the user's PDF, retaining PDF-page references and extraction warnings.
Optional dependency: PyMuPDF. Does not mistake text extraction for visual reading.
Usage: python index_book.py BOOK.pdf --output extracted_book [--text] [--render 48 58]
"""
import argparse
import hashlib
import json
from pathlib import Path

def main():
    import fitz
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf',type=Path);parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--text',action='store_true',help='Also save complete extracted text locally')
    parser.add_argument('--render',type=int,nargs='*',default=[],help='Render selected 1-based PDF pages for visual review')
    args=parser.parse_args();args.output.mkdir(parents=True,exist_ok=True)
    doc=fitz.open(args.pdf);pages=[];chunks=[]
    for i,page in enumerate(doc,1):
        text=page.get_text(sort=True)
        pages.append({'pdf_page':i,'characters':len(text),'image_objects':len(page.get_images()),
            'low_text_requires_review':len(text.strip())<150})
        chunks.append(f'\n[PDF PAGE {i}]\n{text}')
    data={'source_filename':args.pdf.name,'sha256':hashlib.sha256(args.pdf.read_bytes()).hexdigest(),
      'page_count':len(doc),'pdf_metadata':doc.metadata,'outline':doc.get_toc(),'pages':pages,
      'warning':'Metadata author may name a digitizer. Low-text checks do not detect all image-only charts or table extraction errors.'}
    (args.output/'book_index.json').write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n')
    if args.text:(args.output/'book_text.txt').write_text(''.join(chunks))
    for n in args.render:
        if not 1<=n<=len(doc):raise ValueError(f'Invalid PDF page {n}')
        doc[n-1].get_pixmap(matrix=fitz.Matrix(2,2)).save(args.output/f'page_{n:03d}.png')
    print(args.output.resolve())

if __name__=='__main__':main()
