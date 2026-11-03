"""Verify actual PDF objects and extracted text after render-quotation-samples.mjs.

Requires pypdf (available in the Codex bundled Python runtime).
Reads only synthetic verification outputs; does not read private customer records.
"""
import json
import re
from pathlib import Path
from pypdf import PdfReader

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'output/pdf/verification-data.json').read_text(encoding='utf-8'))

def normalize(value):
    return re.sub(r'[^\w]+', '', str(value or '')).lower()

for filename, expected in manifest.items():
    printable = filename.endswith('-print-friendly.pdf')
    pdf = PdfReader(root / filename)
    assert len(pdf.pages) == 6, filename
    for index, page in enumerate(pdf.pages):
        assert (float(page.mediabox.width), float(page.mediabox.height)) == (612, 792)
        assert len(page.images) == 0 if printable else len(page.images) >= 1, (filename, index, 'incorrect branding')
        runs = []
        text = page.extract_text(visitor_text=lambda value, cm, tm, font, size: runs.append((value, str(font.get('/BaseFont', '')) if font else '')))
        normalized = normalize(text)
        for value in expected[index]:
            assert normalize(value) in normalized, (filename, index + 1, 'missing text', value)
        assert 'undefined' not in text and 'null' not in text
        if printable:
            assert 'ISO 9001' not in text
        if index > 0:
            assert 'Executive Signature:' in text and 'Customer Signature:' in text
        if index == 2 and expected[index][2]:
            assert any(normalize(expected[index][2]) in normalize(value) and 'Times-Bold' in font for value, font in runs), (filename, 'price amount font')
    if not printable:
        assert len(pdf.pages[0].images) >= 2, 'Missing cover emblem'
    print(f'{filename}: six Letter pages; branding, dynamic fields and all contract text verified')
