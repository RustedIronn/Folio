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
    pdf = PdfReader(root / filename)
    assert len(pdf.pages) == 6, filename
    for index, page in enumerate(pdf.pages):
        assert (float(page.mediabox.width), float(page.mediabox.height)) == (612, 792)
        assert len(page.images) >= 1, (filename, index, 'missing watermark')
        text = page.extract_text()
        normalized = normalize(text)
        for value in expected[index]:
            assert normalize(value) in normalized, (filename, index + 1, 'missing text', value)
        assert 'undefined' not in text and 'null' not in text
        if index > 0:
            assert 'Executive Signature:' in text and 'Customer Signature:' in text
    assert len(pdf.pages[0].images) >= 2, 'Missing cover emblem'
    print(f'{filename}: six Letter pages; branding, dynamic fields and all contract text verified')
